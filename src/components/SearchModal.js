import { Lightning, Utils } from '@lightningjs/sdk';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, COMPONENT_SIZE } from '../constants/colors.js';

export default class SearchModal extends Lightning.Component {
    static _template() {
        return {
            w: 1920,
            h: 1080,
            Background: {
                w: 1920,
                h: 1080,
                rect: true,
                color: 0xaa000000,
            },
            Container: {
                x: 960,
                y: 540,
                mount: 0.5,
                w: 1400,
                h: 600,
                rect: true,
                color: COLORS.BG_DARK,
                shader: { type: Lightning.shaders.RoundedRectangle, radius: BORDER_RADIUS.LARGE },
                Border: {
                    w: 1400,
                    h: 600,
                    rect: true,
                    color: 0x00000000,
                    strokeObject: { color: COLORS.ACCENT_BLUE, width: 3 },
                    shader: { type: Lightning.shaders.RoundedRectangle, radius: BORDER_RADIUS.LARGE },
                },
                Title: {
                    x: 30,
                    y: 30,
                    text: {
                        text: 'Buscar Canal',
                        fontSize: TYPOGRAPHY.FONT_SIZE_LARGE,
                        fontFace: TYPOGRAPHY.FONT_FAMILY,
                        textColor: COLORS.TEXT_WHITE,
                    }
                },
                InputBox: {
                    x: 30,
                    y: 80,
                    w: 1340,
                    h: 60,
                    rect: true,
                    color: COLORS.ACCENT_BLUE,
                    shader: { type: Lightning.shaders.RoundedRectangle, radius: BORDER_RADIUS.MEDIUM },
                    InputText: {
                        x: 20,
                        y: 15,
                        text: {
                            text: '',
                            fontSize: TYPOGRAPHY.FONT_SIZE_LARGE,
                            fontFace: TYPOGRAPHY.FONT_FAMILY,
                            textColor: COLORS.BG_BLACK,
                        }
                    }
                },
                Keyboard: {
                    x: 30,
                    y: 160,
                }
            }
        };
    }

    _construct() {
        this._searchText = '';
        this._onSearch = null;
        this._rowIndex = 0;
        this._colIndex = 0;
        this._keyboardLayout = [
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '-', '_'],
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
            ['ESPACIO', 'BORRAR', 'CANCELAR', 'BUSCAR']
        ];
        this._keysGrid = [];
    }

    set config(data) {
        this._onSearch = data.onSearch;
        this._searchText = data.searchText || '';
        this._updateDisplay();
        this._rowIndex = 0;
        this._colIndex = 0;
        this._updateKeyboardFocus();
    }

    _init() {
        this._buildKeyboard();
    }

    _updateDisplay() {
        this.tag('Container.InputBox.InputText').text.text = this._searchText;
    }

    _buildKeyboard() {
        const keyboard = this.tag('Container.Keyboard');
        const gap = 12;

        let yPos = 0;
        const keysList = [];
        this._keysGrid = [];

        this._keyboardLayout.forEach((row, rIdx) => {
            let xPos = 0;
            const rowNodes = [];

            // Calcular el ancho de la fila para centrarla
            let rowWidth = row.reduce((acc, key) => acc + this._getKeyWidth(key) + gap, 0) - gap;
            xPos = (1340 - rowWidth) / 2; // Centrado horizontal

            row.forEach((key, cIdx) => {
                let bw = this._getKeyWidth(key);

                keysList.push({
                    x: xPos,
                    y: yPos,
                    w: bw,
                    h: 60,
                    rect: true,
                    color: COLORS.BG_PANEL,
                    shader: { type: Lightning.shaders.RoundedRectangle, radius: BORDER_RADIUS.MEDIUM },
                    Label: {
                        x: bw / 2,
                        y: 32, // Centrado vertical manual del texto
                        mount: 0.5,
                        text: {
                            text: key,
                            fontSize: TYPOGRAPHY.FONT_SIZE_LARGE,
                            fontFace: TYPOGRAPHY.FONT_FAMILY,
                            textColor: COLORS.TEXT_WHITE,
                        }
                    }
                });
                rowNodes.push({ key, index: keysList.length - 1 });
                xPos += bw + gap;
            });
            this._keysGrid.push(rowNodes);
            yPos += 60 + gap;
        });

        keyboard.children = keysList;
    }

    _getKeyWidth(key) {
        if (key === 'ESPACIO') return 250;
        if (key === 'BORRAR' || key === 'CANCELAR' || key === 'BUSCAR') return 180;
        return 65; // Letras estándar
    }

    _updateKeyboardFocus() {
        const keyboard = this.tag('Container.Keyboard');

        // Desenfoquar todos
        keyboard.children.forEach(btn => {
            btn.patch({
                color: COLORS.BG_PANEL,
                Label: { text: { textColor: COLORS.TEXT_WHITE } },
                smooth: { scale: 1.0 }
            });
        });

        // Enfocar el actual
        const flatIndex = this._keysGrid[this._rowIndex][this._colIndex].index;
        const btn = keyboard.children[flatIndex];
        if (btn) {
            btn.patch({
                color: COLORS.ACCENT_BLUE,
                Label: { text: { textColor: COLORS.BG_BLACK } },
                smooth: { scale: 1.1 }
            });
        }
    }

    _handleUp() {
        if (this._rowIndex > 0) {
            this._rowIndex--;
            if (this._colIndex >= this._keysGrid[this._rowIndex].length) {
                this._colIndex = this._keysGrid[this._rowIndex].length - 1;
            }
            this._updateKeyboardFocus();
        }
        return true;
    }

    _handleDown() {
        if (this._rowIndex < this._keysGrid.length - 1) {
            this._rowIndex++;
            if (this._colIndex >= this._keysGrid[this._rowIndex].length) {
                this._colIndex = this._keysGrid[this._rowIndex].length - 1;
            }
            this._updateKeyboardFocus();
        }
        return true;
    }

    _handleLeft() {
        if (this._colIndex > 0) {
            this._colIndex--;
            this._updateKeyboardFocus();
        }
        return true;
    }

    _handleRight() {
        if (this._colIndex < this._keysGrid[this._rowIndex].length - 1) {
            this._colIndex++;
            this._updateKeyboardFocus();
        }
        return true;
    }

    _handleEnter() {
        const key = this._keysGrid[this._rowIndex][this._colIndex].key;

        if (key === 'ESPACIO') {
            this._searchText += ' ';
        } else if (key === 'BORRAR') {
            if (this._searchText.length > 0) {
                this._searchText = this._searchText.slice(0, -1);
            }
        } else if (key === 'CANCELAR') {
            this.fireAncestors('$closeSearchModal');
            return true;
        } else if (key === 'BUSCAR') {
            if (this._onSearch) this._onSearch(this._searchText.trim());
            this.fireAncestors('$closeSearchModal');
            return true;
        } else {
            this._searchText += key.toLowerCase();
        }

        this._updateDisplay();
        return true;
    }

    _handleBack() {
        this.fireAncestors('$closeSearchModal');
        return true;
    }
}
