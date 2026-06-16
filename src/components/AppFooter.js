import { Lightning } from '@lightningjs/sdk';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, COMPONENT_SIZE } from '../constants/colors.js';

// Sub-componente interno para los botones del footer
class FooterButton extends Lightning.Component {
    static _template() {
        return {
            w: 260,
            h: 60,
            rect: true,
            color: 0x00000000, // Transparente por defecto
            shader: { type: Lightning.shaders.RoundedRectangle, radius: BORDER_RADIUS.PILL },

            Icon: {
                mount: 0.5,
                x: 50,
                y: 30,
                text: {
                    text: '',
                    fontSize: 26,
                    fontFace: TYPOGRAPHY.FONT_FAMILY,
                    textColor: COLORS.TEXT_WHITE
                }
            },
            Label: {
                mountY: 0.5,
                x: 80,
                y: 32,
                text: {
                    text: '',
                    fontSize: TYPOGRAPHY.FONT_SIZE_LARGE,
                    fontFace: TYPOGRAPHY.FONT_FAMILY,
                    textColor: COLORS.TEXT_WHITE
                }
            }
        };
    }

    set label(v) {
        this.tag('Label').text.text = v;
    }

    set icon(v) {
        this.tag('Icon').text.text = v;
    }

    set centerLabel(v) {
        if (v) {
            this.tag('Label').patch({
                x: 130,
                mountX: 0.5
            });
        }
    }

    _focus() {
        this.patch({
            color: COLORS.BG_PANEL,
            Label: { text: { textColor: COLORS.ACCENT_BLUE } },
            Icon: { text: { textColor: COLORS.ACCENT_BLUE } }
        });
    }

    _unfocus() {
        this.patch({
            color: 0x00000000,
            Label: { text: { textColor: COLORS.TEXT_WHITE } },
            Icon: { text: { textColor: COLORS.TEXT_WHITE } }
        });
    }

    _handleEnter() {
        this.fireAncestors('$onFooterAction', this.ref);
    }
}

export default class AppFooter extends Lightning.Component {
    static _template() {
        return {
            w: 560,
            h: 80,
            rect: true,
            color: COLORS.BG_BLACK,
            shader: { type: Lightning.shaders.RoundedRectangle, radius: BORDER_RADIUS.PILL },

            RefreshBtn: {
                type: FooterButton,
                ref: 'RefreshBtn',
                x: 10,
                y: 10,
                label: 'Actualizar',
                icon: '↻'
            },

            Divider: {
                rect: true,
                w: 2,
                h: 40,
                x: 280,
                y: 20,
                color: COLORS.BORDER_LIGHT
            },

            InfoBtn: {
                type: FooterButton,
                ref: 'InfoBtn',
                x: 290,
                y: 10,
                label: 'Info / Contacto',
                centerLabel: true
            }
        };
    }

    _construct() {
        this._index = 0;
        this._buttons = ['RefreshBtn', 'InfoBtn'];
    }

    _init() {
    }

    // Equivalente a tus props
    set config(data) {
        const { onRefresh, isRefreshing, onShowInfo } = data;

        this._onRefresh = onRefresh;
        this._onShowInfo = onShowInfo;
        this._isRefreshing = isRefreshing;

        // Manejar el estado del botón Refresh
        if (isRefreshing) {
            this.tag('RefreshBtn').alpha = 0.5; // Lo mostramos visualmente "deshabilitado"
        } else {
            this.tag('RefreshBtn').alpha = 1;
        }
    }

    // --- Navegación del Control Remoto ---
    _handleLeft() {
        if (this._index > 0) {
            this._index--;
            this._refocus();
            return true;
        }
        return false;
    }

    _handleRight() {
        if (this._index < this._buttons.length - 1) {
            this._index++;
            this._refocus();
            return true;
        }
        return false;
    }

    _getFocused() {
        return this.tag(this._buttons[this._index]);
    }

    // --- Manejo de clics (Eventos) ---
    $onFooterAction(ref) {
        if (ref === 'RefreshBtn' && !this._isRefreshing) {
            if (this._onRefresh) this._onRefresh();
        } else if (ref === 'InfoBtn') {
            if (this._onShowInfo) this._onShowInfo();
        }
    }
}