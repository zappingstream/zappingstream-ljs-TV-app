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
                color: 0xff38b6ff, // Color celeste activo simulando que está "enfocado"
                shader: { type: Lightning.shaders.RoundedRectangle, radius: 8 },
                w: 650,
                h: 60,
                Text: {
                    mount: 0.5,
                    x: 325,
                    y: 30,
                    text: {
                        text: '‹ Atrás | OK: Pausa | ◂ 15s ▸',
                        fontSize: 24,
                        fontFace: 'Bold',
                        textColor: 0xff000000,
                    }
                }
            }
        };
    }

    _init() {
        this._timer = null;
        this._isClosing = false;
        this._focusInterval = null;
        this._isPlaying = true;
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
        this._clearFocusLock();
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

        this._currentTime = 0;
        this._duration = 0;

        // Escuchamos los mensajes de YouTube para mantener sincronizado el tiempo actual
        this._messageListener = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.event === 'infoDelivery' && data.info) {
                    if (data.info.currentTime !== undefined) this._currentTime = data.info.currentTime;
                    if (data.info.duration !== undefined) this._duration = data.info.duration;
                }
            } catch (e) {}
        };
        window.addEventListener('message', this._messageListener);

        this._iframe = document.createElement('iframe');
        this._iframe.className = 'tv-iframe';
        // Agregamos enablejsapi=1 para poder enviarle comandos mediante postMessage
        this._iframe.src = `https://www.youtube-nocookie.com/embed/${this._videoId}?autoplay=1&fs=1&modestbranding=1&rel=0&enablejsapi=1&origin=${window.location.origin}`;
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

        // Le indicamos a YouTube que nos empiece a enviar los reportes de tiempo
        this._iframe.onload = () => {
            if (this._iframe && this._iframe.contentWindow) {
                this._iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
            }
        };

        document.body.appendChild(this._iframe);
        this._isPlaying = true;
        this._updateControlsText();
    }

    _destroyIframe() {
        if (this._messageListener) {
            window.removeEventListener('message', this._messageListener);
            this._messageListener = null;
        }

        if (this._iframe) {
            // Forzamos un STOP nativo en el iframe antes de destruirlo
            // (evita el bug de Tizen donde el audio sigue sonando de fondo)
            if (this._iframe.contentWindow) {
                this._iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'stopVideo', args: [] }), '*');
            }
            
            if (this._iframe.parentNode) {
                this._iframe.parentNode.removeChild(this._iframe);
            }
            this._iframe = null;
        }
        this._clearFocusLock();
    }

    _clearFocusLock() {
        if (this._focusInterval) {
            clearInterval(this._focusInterval);
            this._focusInterval = null;
        }
    }

    _wakeUpControls() {
        this.tag('Controls').alpha = 1;
        this._clearTimer();

        this._timer = setTimeout(() => {
            this.tag('Controls').patch({
                smooth: { alpha: 0 } // Desvanecimiento suave en Lightning
            });
            this._timer = null; // Limpiamos la referencia para saber que está oculto
        }, 4000);
    }

    _clearTimer() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }

    _updateControlsText() {
        const textNode = this.tag('Controls.Text');
        if (this._isPlaying) {
            textNode.text.text = '‹ Atrás | OK: Pausa | ◂ 15s ▸';
        } else {
            textNode.text.text = '⏸ PAUSADO | OK: Reproducir | ‹ Atrás';
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

    // Interceptamos el botón OK/Enter del control remoto
    _handleEnter() {
        this._isPlaying = !this._isPlaying;
        
        // Enviar comando Play/Pause directo al Iframe usando postMessage
        if (this._iframe && this._iframe.contentWindow) {
            const command = this._isPlaying ? 'playVideo' : 'pauseVideo';
            this._iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: command,
                args: []
            }), '*');
        }
        
        this._updateControlsText();
        this._wakeUpControls();
        return true;
    }

    // --- Controles de Tiempo (Izquierda / Derecha) ---
    _handleLeft() {
        this._seek(-15);
        return true;
    }

    _handleRight() {
        this._seek(15);
        return true;
    }

    _seek(seconds) {
        if (this._iframe && this._iframe.contentWindow) {
            // Calculamos el nuevo tiempo asegurándonos de no ir a negativos ni pasarnos del final
            this._currentTime = Math.max(0, this._currentTime + seconds);
            if (this._duration > 0) {
                this._currentTime = Math.min(this._currentTime, this._duration);
            }
            
            // Le ordenamos a YouTube que salte a ese segundo (true permite hacer buffering anticipado)
            this._iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [this._currentTime, true] }), '*');
            this._wakeUpControls();
        }
    }

    // Este método intercepta cualquier otra tecla (flechas, enter)
    _handleKey() {
        this._wakeUpControls();
        return false; // Retornar false permite que las teclas hagan otras cosas si es necesario
    }
}