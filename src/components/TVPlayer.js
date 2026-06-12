import { Lightning } from '@lightningjs/sdk';

export default class TVPlayer extends Lightning.Component {
    static _template() {
        return {
            w: 1920,
            h: 1080,
            rect: true,
            // El fondo debe ser transparente para poder ver el iframe en el DOM que estará detrás
            color: 0x00000000,

            // Nuestro botón visual (ahora es un elemento dibujado en el Canvas)
            Controls: {
                x: 60,
                y: 60,
                alpha: 1,
                rect: true,
                color: 0xb3000000, // Fondo negro semi-transparente
                w: 360,
                h: 60,
                Text: {
                    mount: 0.5,
                    x: 180,
                    y: 30,
                    text: {
                        text: 'Atrás / Esc para salir',
                        fontSize: 24,
                        fontFace: 'Regular',
                        textColor: 0xffffffff,
                    }
                }
            }
        };
    }

    _init() {
        this._timer = null;
        this._isClosing = false;
    }

    // Se ejecuta automáticamente cuando el componente se muestra en pantalla
    _active() {
        this._isClosing = false;
        this._createIframe();
        this._wakeUpControls();
    }

    // Se ejecuta automáticamente cuando el componente se oculta o destruye
    _inactive() {
        this._destroyIframe();
        this._clearTimer();
    }

    // Setters equivalentes a los Props de React
    set videoId(id) {
        this._videoId = id;
        // Si el video cambia mientras está reproduciendo, lo recargamos
        if (this.active) {
            this._destroyIframe();
            this._createIframe();
        }
    }

    set onClose(callback) {
        this._onCloseCallback = callback;
    }

    _createIframe() {
        if (this._iframe || !this._videoId) return;

        this._iframe = document.createElement('iframe');
        this._iframe.className = 'tv-iframe';
        this._iframe.src = `https://www.youtube-nocookie.com/embed/${this._videoId}?autoplay=1&fs=1&modestbranding=1&rel=0`;
        this._iframe.frameBorder = '0';
        this._iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        this._iframe.allowFullscreen = true;

        // Estilos para que ocupe toda la pantalla y quede por debajo del canvas de Lightning
        this._iframe.style.position = 'absolute';
        this._iframe.style.top = '0';
        this._iframe.style.left = '0';
        this._iframe.style.width = '100vw';
        this._iframe.style.height = '100vh';
        this._iframe.style.zIndex = '0';
        this._iframe.style.border = 'none';

        // Bloqueo total: Evitamos que YouTube pueda robarse el foco nativo 
        // del teclado o control remoto bajo ninguna circunstancia.
        this._iframe.style.pointerEvents = 'none';
        this._iframe.setAttribute('tabindex', '-1');

        document.body.appendChild(this._iframe);

        // Evitamos que el autoplay de YouTube le robe el foco a Lightning JS
        setTimeout(() => window.focus(), 500);
    }

    _destroyIframe() {
        if (this._iframe && this._iframe.parentNode) {
            this._iframe.parentNode.removeChild(this._iframe);
            this._iframe = null;
        }
    }

    _wakeUpControls() {
        this.tag('Controls').alpha = 1;
        this._clearTimer();

        this._timer = setTimeout(() => {
            this.tag('Controls').patch({
                smooth: { alpha: 0 } // Desvanecimiento suave en Lightning
            });
        }, 4000);
    }

    _clearTimer() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }

    // Este método intercepta la tecla Escape y Backspace (Atrás) por defecto en Lightning
    _handleBack() {
        if (this._isClosing) return true;
        this._isClosing = true;

        if (this._onCloseCallback) {
            this._onCloseCallback();
        }
        
        return true;
    }

    // Este método intercepta cualquier otra tecla (flechas, enter)
    _handleKey() {
        this._wakeUpControls();
        return false; // Retornar false permite que las teclas hagan otras cosas si es necesario
    }
}