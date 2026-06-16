import { Lightning } from '@lightningjs/sdk';

export default class VideoCard extends Lightning.Component {
    static _template() {
        return {
            w: 280, // Candado base para grilla normal
            h: 175, // Aspect ratio 16:10
            rect: true,
            color: 0xff111111, // var(--bg-black)
            clipping: true, // Evita que la imagen se salga de los bordes
            shader: { type: Lightning.shaders.RoundedRectangle, radius: 8 },

            Fallback: {
                w: w => w - 24, // Achicamos 12px de cada lado
                h: h => h - 24,
                x: 12,
                y: 12,
                rect: true,
                color: 0xff333333, // Fondo gris del fallback
                shader: { type: Lightning.shaders.RoundedRectangle, radius: 6 }, // Le damos bordes redondeados internos
            },

            Image: {
                w: w => w - 24,
                h: h => h - 24,
                x: 12,
                y: 12,
                alpha: 1, // DEBE iniciar en 1 para que WebGL fuerce la descarga de la textura
                shader: { type: Lightning.shaders.RoundedRectangle, radius: 6 },
            },

            Badge: {
                mountX: 1,
                mountY: 1,
                x: w => w - 20, // Empujamos el cartelito de 'En Vivo' hacia adentro
                y: h => h - 20,
                rect: true,
                color: 0x00000000, // Transparente por defecto
                alpha: 0,
                shader: { type: Lightning.shaders.RoundedRectangle, radius: 4 },

                Dot: {
                    w: 6, h: 6,
                    x: 8, mountY: 0.5, y: 13,
                    rect: true,
                    color: 0xffffffff,
                    shader: { type: Lightning.shaders.RoundedRectangle, radius: 3 },
                    alpha: 0 // Oculto por defecto
                },
                Text: {
                    x: 8, // Dinámico si hay punto
                    mountY: 0.5, y: 14, // Compensación visual vertical
                    text: {
                        text: '',
                        fontSize: 14, // Equivalente a 0.75rem
                        fontFace: 'Regular',
                        textColor: 0xffffffff,
                    }
                }
            }
        };
    }

    _init() {
        // Escuchar error en la carga de la imagen
        this.tag('Image').on('txError', () => {
            this._handleImageError();
        });

        // Escuchar cuando la imagen carga exitosamente
        this.tag('Image').on('txLoaded', () => {
            // Si está todo bien, mostramos la imagen
            this.tag('Image').alpha = 1;
            this.tag('Fallback').alpha = 0;
        });
    }

    _handleImageError() {
        this.tag('Image').alpha = 0;
        this.tag('Fallback').alpha = 1;

        // Llama al callback de error si fue provisto
        if (this.onImageError) {
            this.onImageError();
        }
    }

    // Setter equivalente a pasarle "props" desde React
    set item(data) {
        const oldImageUrl = this._imageUrl;
        this._imageUrl = data.imageUrl;
        this._fallbackText = data.fallbackText;
        this.onClick = data.onClick;
        this.onImageError = data.onImageError;

        // Si hay imagen, asigarla para iniciar la carga
        if (this._imageUrl) {
            // Solo reiniciamos la carga si la URL es nueva. 
            // Lightning no dispara 'txLoaded' si se reasigna la misma URL, dejando la imagen en 0.001
            if (oldImageUrl !== this._imageUrl || !this.tag('Image').src) {
                this.tag('Fallback').alpha = 1; // Aseguramos que el fallback se vea mientras carga
                
                // TRUCO LIGHTNING: alpha debe ser > 0 para que el motor webGL NO la ignore y la descargue
                this.tag('Image').alpha = 0.001;

                // OPTIMIZACIÓN: Pedir miniatura de menor peso (mqdefault 320x180) de YouTube
                let finalSrc = this._imageUrl.replace(/(maxresdefault|hqdefault|sddefault)\.jpg/i, 'mqdefault.jpg');

                // --- SOLUCIÓN DEFINITIVA A CORS EN WEBGL ---
                if (finalSrc.includes('ytimg.com') || finalSrc.includes('youtube.com') || finalSrc.includes('ggpht.com')) {
                    finalSrc = `https://wsrv.nl/?url=${encodeURIComponent(finalSrc)}&w=400&output=webp`;
                }

                this.tag('Image').src = finalSrc;
            }
        } else {
            this._handleImageError();
        }

        this._updateBadge(data);
    }

    _updateBadge({ isLive, isPremiere, isPast, isUpcoming }) {
        const badge = this.tag('Badge');
        const label = this.tag('Badge.Text');
        const dot = this.tag('Badge.Dot');
        badge.alpha = 1;

        let text = '';
        let hasDot = false;
        let textColor = 0xffffffff;
        let strokeColor = 0x00000000;
        let strokeWidth = 0;

        // Colores base equivalentes a las variables de tu CSS original
        const PREMIERE_COLOR = 0xff0055ff; // Azul
        const LIVE_COLOR = 0xffff0000; // Rojo
        const PAST_BG = 0xe6000000; // rgba(0,0,0,0.9)
        const PAST_TEXT = 0xffbbbbbb; // Gris texto
        const UPCOMING_BG = 0xc03d3d3c; // rgba(61,61,60,0.75)

        if (isLive) {
            badge.color = isPremiere ? PREMIERE_COLOR : LIVE_COLOR;
            text = isPremiere ? 'ESTRENO' : 'EN VIVO';
            hasDot = true;
            strokeWidth = isPremiere ? 1 : 0;
            strokeColor = PREMIERE_COLOR;
        } else if (isPast) {
            badge.color = PAST_BG;
            textColor = PAST_TEXT;
            text = isPremiere ? 'ESTRENADO' : 'FINALIZADO';
            strokeWidth = 1;
            strokeColor = isPremiere ? 0xff002a80 : 0xff800000; // color-mix black 50%
        } else if (isUpcoming) {
            badge.color = UPCOMING_BG;
            text = isPremiere ? 'ESTRENO PROG.' : 'PROGRAMADO';
            strokeWidth = 1;
            strokeColor = isPremiere ? PREMIERE_COLOR : LIVE_COLOR;
        } else {
            badge.alpha = 0; // Ocultar si no cumple ninguna condición
            return;
        }

        label.text.text = text;
        label.text.textColor = textColor;

        if (hasDot) {
            dot.alpha = 1;
            label.x = 20; // Hacemos lugar para el punto
            badge.w = text.length * 8 + 30; // Aproximación ancho con punto
        } else {
            dot.alpha = 0;
            label.x = 8;
            badge.w = text.length * 8 + 16; // Aproximación ancho sin punto
        }

        badge.h = 26; // Alto fijo para el fondo
        badge.shader = { type: Lightning.shaders.RoundedRectangle, radius: 4, stroke: strokeWidth, strokeColor };
    }

    // Equivalente al onClick en la TV (Apretar OK/Enter en el control remoto)
    _handleEnter() {
        if (this.onClick) {
            this.onClick(this);
        }
    }

    // Efecto visual cuando navegas hacia la tarjeta
    _focus() {
    }

    // Efecto visual cuando sales de la tarjeta
    _unfocus() {
    }
}