import { Lightning } from '@lightningjs/sdk';
import ChannelCard from './ChannelCard.js';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, COMPONENT_SIZE } from '../constants/colors.js';

export default class ChannelCategoryRow extends Lightning.Component {
    static _template() {
        return {
            w: 1920,
            h: 400, // Altura: título + tarjetas
            alpha: 1,

            Title: {
                x: 60,
                y: 0,
                text: {
                    text: '',
                    fontSize: 36,
                    fontFace: TYPOGRAPHY.FONT_FAMILY,
                    textColor: COLORS.ACCENT_BLUE
                }
            },

            // Contenedor que moveremos hacia los lados para simular el scroll
            Slider: {
                x: 60,
                y: 60,
                Items: {}
            }
        };
    }

    _init() {
        this._index = 0; // Índice de la tarjeta enfocada
        this._poolSize = 15; // Pool de tarjetas reciclables
        const items = [];
        for (let i = 0; i < this._poolSize; i++) {
            items.push({ type: ChannelCard, alpha: 0, x: -9999 });
        }
        this.tag('Slider.Items').children = items;
        this._cardsPool = this.tag('Slider.Items').children;
        this._failedVideos = new Set();
    }

    // Setter que reemplaza los "props" de React
    set category(data) {
        const {
            title,
            channels,
            expandedChannels,
            toggleInfo,
            abrirCanal,
            abrirCanalOnStreams,
            abrirCanalOnDemand,
            navigateYouTube
        } = data;

        if (!channels || channels.length === 0) {
            this.alpha = 0;
            return;
        }
        this.alpha = 1;
        this.tag('Title').text.text = title;

        this._originalChannels = channels;
        this._expandedChannels = expandedChannels;
        this._isLiveGroup = title === 'AHORA';

        this._callbacks = { 
            toggleInfo, abrirCanal, abrirCanalOnStreams, abrirCanalOnDemand, navigateYouTube,
            onVideoError: (videoId) => this._handleVideoError(videoId)
        };

        // Limpiar el pool para forzar re-renderizado
        this._cardsPool.forEach(card => {
            card._currentDataIdx = -1;
            card.alpha = 0;
            card.x = -9999;
        });

        this._buildData();
        this._index = 0;
        this._updateScroll(true); // Posicionamiento inicial instantáneo
    }

    _handleVideoError(videoId) {
        if (!this._failedVideos.has(videoId)) {
            this._failedVideos.add(videoId);
            this._buildData();
        }
    }

    _buildData() {
        let currentX = 0;
        const GAP = 150;

        const getCardWidth = (channel) => {
            const actives = Object.values(channel.Actives || {}).filter(v => !this._failedVideos.has(v.VideoId));
            const activeCount = actives.length;
            if (this._isLiveGroup && activeCount > 1) {
                return 380 + ((activeCount - 1) * 355);
            }
            return 380;
        };

        this._channelData = this._originalChannels.map((channel, i) => {
            const w = getCardWidth(channel);
            const info = { channel, x: currentX, w, index: i };
            currentX += w + GAP;
            return info;
        });

        if (this._channelData.length > 0 && this._index >= this._channelData.length) {
            this._index = this._channelData.length - 1;
        }

        // Forzar al pool a actualizar anchos y coordenadas
        this._cardsPool.forEach(card => {
            card._currentDataIdx = -1; 
        });

        this._updateScroll();
    }

    // --- Control de Foco y Navegación Horizontal ---
    _handleLeft() {
        if (this._index > 0) {
            this._index--;
            this._updateScroll();
            this._refocus();
            return true;
        }
        return false;
    }

    _handleRight() {
        if (this._channelData && this._index < this._channelData.length - 1) {
            this._index++;
            this._updateScroll();
            this._refocus();
            return true;
        }
        return false;
    }

    _updateScroll(instant = false) {
        if (!this._channelData || this._channelData.length === 0) return;

        const targetChannel = this._channelData[this._index];
        if (targetChannel) {
            let targetX = 60 - targetChannel.x;
            this.tag('Slider').x = targetX;
        }

        // Ventana de Virtualización
        const startIdx = Math.max(0, this._index - 3);
        const endIdx = Math.min(this._channelData.length - 1, this._index + 7);

        this._cardsPool.forEach(card => {
            if (card._currentDataIdx !== -1 && (card._currentDataIdx < startIdx || card._currentDataIdx > endIdx)) {
                card.alpha = 0;
                card._currentDataIdx = -1;
                card.x = -9999;
            }
        });

        for (let i = startIdx; i <= endIdx; i++) {
            const data = this._channelData[i];
            const poolIndex = i % this._poolSize;
            const card = this._cardsPool[poolIndex];

            if (card._currentDataIdx !== i) {
                card.patch({
                    x: data.x,
                    w: data.w,
                    alpha: 1,
                    item: {
                        channel: data.channel,
                        isExpanded: this._expandedChannels && this._expandedChannels.has(data.channel.ChannelName),
                        isLiveGroup: this._isLiveGroup,
                        failedVideos: this._failedVideos,
                        ...this._callbacks
                    }
                });
                card._currentDataIdx = i;
            }
        }
    }

    _getFocused() {
        if (!this._channelData || this._channelData.length === 0) return this;
        const poolIndex = this._index % this._poolSize;
        return this._cardsPool[poolIndex];
    }
}