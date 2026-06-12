import { Lightning, Utils } from '@lightningjs/sdk';

export default class StatusDisplay extends Lightning.Component {
    static _template() {
        return {
            w: 1920,
            h: 1080,
            alpha: 0, // Oculto por defecto (equivale a tu "return null")

            Container: {
                mount: 0.5,
                x: 960, // Centro de la pantalla en X
                y: 540, // Centro de la pantalla en Y

                Spinner: {
                    mount: 0.5,
                    x: 0,
                    y: -60,
                    alpha: 0,
                    // Si tienes un asset para el spinner, descomenta la siguiente línea:
                    // src: Utils.asset('images/spinner.png'),

                    // Mientras tanto, usamos un texto o icono temporal que girará
                    text: {
                        text: '↻',
                        fontSize: 64,
                        textAlign: 'center'
                    }
                },

                Message: {
                    mountX: 0.5,
                    x: 0,
                    y: 20,
                    text: {
                        text: '',
                        fontSize: 32,
                        fontFace: 'Regular',
                        textColor: 0xffffffff,
                        textAlign: 'center'
                    }
                }
            }
        };
    }

    _init() {
        // Creamos la animación de rotación infinita para el spinner
        this._spinnerAnim = this.tag('Spinner').animation({
            duration: 2,
            repeat: -1,
            actions: [
                { p: 'rotation', v: { 0: 0, 1: Math.PI * 2 } }
            ]
        });
        if (this._isLoadingFlag) {
            this._spinnerAnim.play();
        }
    }

    // Este setter equivale a recibir los "props" en React
    set status(data) {
        const { isFetching, isLoading, hasChannels, hasFilteredChannels, searchText, hasActiveFilters } = data;

        // Ocultamos el spinner por defecto en cada actualización
        this.tag('Spinner').alpha = 0;
        if (this._spinnerAnim) this._spinnerAnim.pause();
        this._isLoadingFlag = isFetching || isLoading;

        if (this._isLoadingFlag) {
            this.alpha = 1;
            this.tag('Spinner').alpha = 1;
            if (this._spinnerAnim) this._spinnerAnim.play();
            this.tag('Message').text.text = 'Conectando con el universo del stream argentino...';
        } else if (!hasChannels) {
            this.alpha = 1;
            this.tag('Message').text.text = 'No se encontraron canales configurados.';
        } else if (!hasFilteredChannels && (searchText || hasActiveFilters)) {
            this.alpha = 1;
            this.tag('Message').text.text = 'No hay resultados para la búsqueda actual.';
        } else {
            this.alpha = 0; // Ninguna condición se cumple, se oculta todo (return null)
        }
    }
}