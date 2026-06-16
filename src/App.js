import { Lightning, Utils } from '@lightningjs/sdk'
import { getChannels } from './services/channelService.js'
import { getProvinces } from './services/provinceService.js'
import AppHeader from './components/AppHeader.js'
import AppFooter from './components/AppFooter.js'
import StatusDisplay from './components/StatusDisplay.js'
import InfoModal from './components/InfoModal.js'
import TVPlayer from './components/TVPlayer.js'
import ScheduleGrid from './components/ScheduleGrid.js'
import ChannelCategoryRow from './components/ChannelCategoryRow.js'
import SearchModal from './components/SearchModal.js'
import SelectModal from './components/SelectModal.js'

export default class App extends Lightning.Component {
  static getFonts() {
    return [{ family: 'Regular', url: Utils.asset('fonts/Roboto-Regular.ttf') }]
  }

  static _template() {
    return {
      w: 1920,
      h: 1080,
      Background: {
        w: 1920,
        h: 1080,
        color: 0xfffbb03b,
        src: Utils.asset('images/background.png'),
      },

      // Estructura Principal
      Main: {
        Header: { type: AppHeader, y: 0, zIndex: 10 },

        Content: {
          y: 140, // Debajo del Header
          Status: { type: StatusDisplay },

          Grid: { type: ScheduleGrid, alpha: 0 },
          CardsLive: { type: ChannelCategoryRow, alpha: 0, y: 100 },
          CardsDemand: { type: ChannelCategoryRow, alpha: 0, y: 500 }
        },

        Footer: {
          type: AppFooter,
          y: 980,
          x: 680, // Centrado horizontal (1920 / 2 - 560 / 2)
          zIndex: 10
        }
      },

      // Capas Superpuestas (Modales y Reproductor)
      Overlays: {
        Player: {
          type: TVPlayer,
          alpha: 0,
          visible: false // Usamos visible para que dispare _inactive() y destruya el Iframe
        },
        Info: {
          type: InfoModal,
          zIndex: 20
        },
        Search: {
          type: SearchModal,
          alpha: 0,
          zIndex: 25
        },
        Select: {
          type: SelectModal,
          alpha: 0,
          zIndex: 26
        }
      }
    }
  }

  _init() {
    // --- Estado Principal de la Aplicación ---
    this._channels = [];
    this._allChannels = []; // Almacenar lista completa para filtrado
    this._provincesList = [];
    this._citiesList = [];
    this._cityProvinceMap = {};

    this._isLoadingChannels = true;
    this._searchText = '';
    this._selectedProvince = '';
    this._selectedCity = '';
    this._viewMode = 'cards'; // 'cards' o 'grid'

    // --- Control de Foco General ---
    this._focusedSection = 'header'; // 'header', 'content', 'footer', 'modal', 'player', 'search'
    this._contentRowIndex = 0; // 0 = CardsLive, 1 = CardsDemand (para navegación vertical)

    // --- PUENTE UNIVERSAL (BOTÓN ATRÁS NATIVO) ---
    // Atrapa el botón atrás físico de la tele sin importar qué rompió el DOM
    window.addEventListener('appGoBack', () => {
      const activeModule = this._getFocused(); // Vemos qué componente tiene tu foco (Player, Search, etc)
      if (activeModule && typeof activeModule._handleBack === 'function') {
        activeModule._handleBack(); // Forzamos su cierre nativo de Lightning
      }
    });

    // Configurar Modales
    this.tag('Overlays.Info').onClose = () => {
      this._focusedSection = this._previousFocus || 'footer';
      this.tag('Overlays.Info').patch({ smooth: { alpha: 0 } });
      this._updateUI();
      this._refocus();
    };

    this.tag('Overlays.Player').onClose = () => {
      this._focusedSection = 'content';
      this.tag('Overlays.Player').alpha = 0;
      this.tag('Overlays.Player').visible = false;
      this.tag('Main').alpha = 1; // Restauramos la interfaz principal
      this.tag('Background').alpha = 1;
      this._updateUI();
      this._refocus();
    };

    // Cargar Datos Iniciales
    this._fetchChannels();
    this._fetchProvinces();
  }

  async _fetchChannels() {
    try {
      this._isLoadingChannels = true;
      this._updateUI();

      this._channels = await getChannels();
      this._allChannels = [...this._channels]; // Guardar copia completa para filtrado
    } catch (err) {
      console.error("Error en App al cargar canales:", err);
    } finally {
      this._isLoadingChannels = false;
      this._updateUI();
      this._refocus(); // Siempre re-enfocar al terminar de cargar, para obligar al render
    }
  }

  async _fetchProvinces() {
    try {
      const data = await getProvinces();
      this._provincesList = data.provinces;
      this._cityProvinceMap = data.cityProvinceMap;
      this._citiesList = Object.keys(this._cityProvinceMap).sort();
      this._updateUI();
    } catch (err) {
      console.error("Error cargando provincias", err);
    }
  }

  // --- Lógica Unificada de Filtros ---
  _applyFilters() {
    let filtered = this._allChannels;

    if (this._searchText.trim() !== '') {
      filtered = filtered.filter(c => c.ChannelName.toLowerCase().includes(this._searchText.toLowerCase()));
    }

    if (this._selectedProvince !== '') {
      // Si se elige provincia, actualizamos la lista de ciudades permitidas
      this._citiesList = Object.keys(this._cityProvinceMap).filter(c => this._cityProvinceMap[c] === this._selectedProvince).sort();
      // Si la ciudad elegida ya no pertenece a la provincia, se limpia
      if (!this._citiesList.includes(this._selectedCity)) {
        this._selectedCity = '';
      }

      filtered = filtered.filter(c => {
        if (!c.ChannelCity) return false;
        return this._cityProvinceMap[c.ChannelCity] === this._selectedProvince;
      });
    } else {
      // Si borran la provincia, vuelven a estar todas las ciudades disponibles
      this._citiesList = Object.keys(this._cityProvinceMap).sort();
    }

    if (this._selectedCity !== '') {
      filtered = filtered.filter(c => c.ChannelCity === this._selectedCity);
    }

    this._channels = filtered;
    this._updateUI();
  }

  _updateUI() {
    // 1. Actualizar el Estado (StatusDisplay)
    const hasChannels = this._channels.length > 0;
    this.tag('Main.Content.Status').status = {
      isLoading: this._isLoadingChannels,
      hasChannels: hasChannels,
      hasFilteredChannels: true,
      searchText: this._searchText
    };

    // 2. Enviar Canales al componente activo (Grid o Cards)
    if (hasChannels && !this._isLoadingChannels) {
      if (this._viewMode === 'grid') {
        this.tag('Main.Content.Grid').alpha = 1;
        this.tag('Main.Content.CardsLive').alpha = 0;
        this.tag('Main.Content.CardsDemand').alpha = 0;

        this.tag('Main.Content.Grid').config = {
          channels: this._channels,
          navigateYouTube: (url) => this._openPlayer(url),
          toggleInfo: (channelName) => {
              this._previousFocus = this._focusedSection;
            this._focusedSection = 'modal';
            this.tag('Overlays.Info').alpha = 1;
          },
          abrirCanal: (channel) => this._playChannel(channel),
          abrirCanalOnStreams: (channel) => this._playChannel(channel),
          abrirCanalOnDemand: (channel) => this._playChannel(channel)
        };
      } else {
        this.tag('Main.Content.Grid').alpha = 0;

        // Separar canales en LIVE y ON DEMAND
        const canalesEnVivo = this._channels.filter(c => c.Actives && Object.keys(c.Actives).length > 0);
        const canalesOnDemand = this._channels.filter(c => !c.Actives || Object.keys(c.Actives).length === 0);

        // Mostrar u ocultar filas según tengan contenido
        this.tag('Main.Content.CardsLive').alpha = canalesEnVivo.length > 0 ? 1 : 0;
        this.tag('Main.Content.CardsDemand').alpha = canalesOnDemand.length > 0 ? 1 : 0;

        // Callbacks comunes
        const callbacks = {
          navigateYouTube: (url) => this._openPlayer(url),
          toggleInfo: (channelName) => {
              this._previousFocus = this._focusedSection;
            this._focusedSection = 'modal';
            this.tag('Overlays.Info').alpha = 1;
          },
          abrirCanal: (channel) => this._playChannel(channel),
          abrirCanalOnStreams: (channel) => this._playChannel(channel),
          abrirCanalOnDemand: (channel) => this._playChannel(channel)
        };

        // Configurar fila de LIVE
        if (canalesEnVivo.length > 0) {
          this.tag('Main.Content.CardsLive').category = {
            title: 'AHORA',
            channels: canalesEnVivo,
            expandedChannels: new Set(), // Placeholder
            ...callbacks
          };
        }

        // Configurar fila de ON DEMAND
        if (canalesOnDemand.length > 0) {
          this.tag('Main.Content.CardsDemand').category = {
            title: 'ON DEMAND',
            channels: canalesOnDemand,
            expandedChannels: new Set(), // Placeholder
            ...callbacks
          };
        }
      }
    } else {
      // Si está cargando o no hay canales, ocultamos las listas
      this.tag('Main.Content.Grid').alpha = 0;
      this.tag('Main.Content.CardsLive').alpha = 0;
      this.tag('Main.Content.CardsDemand').alpha = 0;
    }

    // 2. Actualizar Cabecera
    this.tag('Main.Header').config = {
      searchText: this._searchText,
      viewMode: this._viewMode,
      selectedProvince: this._selectedProvince,
      selectedCity: this._selectedCity,
      provinces: this._provincesList,
      cities: this._citiesList,
      callbacks: {
        onViewModeChange: (mode) => {
          this._viewMode = mode;
          this._focusedSection = 'content';
          this._updateUI();
          this._refocus();
        },
        onSearchClick: () => {
          this._previousFocus = this._focusedSection;
          this._focusedSection = 'search';
          this.tag('Overlays.Search').alpha = 1;
          this.tag('Overlays.Search').config = {
            searchText: this._searchText,
            onSearch: (text) => this._performSearch(text)
          };
          this._refocus();
        },
        onProvinceClick: () => {
          this._previousFocus = this._focusedSection;
          this._focusedSection = 'select';
          this.tag('Overlays.Select').alpha = 1;
          this.tag('Overlays.Select').config = {
            title: 'Seleccionar Provincia',
            options: [
              { label: 'Todas las provincias', value: '' },
              ...this._provincesList.map(p => ({ label: p, value: p }))
            ],
            onSelect: (prov) => {
              this._selectedProvince = prov;
              this._applyFilters();
              this.$closeSelectModal();
            }
          };
          this._refocus();
        },
        onCityClick: () => {
          if (!this._citiesList || this._citiesList.length === 0) return;
          this._previousFocus = this._focusedSection;
          this._focusedSection = 'select';
          this.tag('Overlays.Select').alpha = 1;
          this.tag('Overlays.Select').config = {
            title: 'Seleccionar Ciudad',
            options: [
              { label: 'Todas las ciudades', value: '' },
              ...this._citiesList.map(c => ({ label: c, value: c }))
            ],
            onSelect: (city) => {
              this._selectedCity = city;
              this._applyFilters();
              this.$closeSelectModal();
            }
          };
          this._refocus();
        }
      }
    };

    // 3. Actualizar Pie de página
    this.tag('Main.Footer').config = {
      isRefreshing: this._isLoadingChannels,
      onRefresh: () => this._fetchChannels(),
      onShowInfo: () => {
        this._previousFocus = this._focusedSection;
        this._focusedSection = 'modal';
        this.tag('Overlays.Info').alpha = 1; // Mostramos el modal
        this._refocus();
      }
    };
  }

  // --- Lógica para abrir el canal directamente ---
  _playChannel(channel) {
    let videoId = null;

    // 1. Si hay videos activos (En Vivo o Estrenos), buscar el ID del principal
    if (channel.Actives && Object.keys(channel.Actives).length > 0) {
      const activeVideos = Object.values(channel.Actives).sort((a, b) => {
        if (a.IsPremiere && !b.IsPremiere) return 1;
        if (!a.IsPremiere && b.IsPremiere) return -1;
        const timeA = new Date(a.ActualStartTime || a.ScheduledStartTime || a.AddedAt || 0).getTime();
        const timeB = new Date(b.ActualStartTime || b.ScheduledStartTime || b.AddedAt || 0).getTime();
        return timeB - timeA;
      });
      videoId = activeVideos[0].VideoId;
    }
    // 2. Si no hay activos, ver si hay un link directo en ChannelLiveUrl (ej: youtube.com/watch?v=...)
    else if (channel.ChannelLiveUrl) {
      const match = channel.ChannelLiveUrl.match(/v=([^&]+)/);
      if (match && match[1]) {
        videoId = match[1];
      }
    }

    if (videoId) {
      this._openPlayer(`https://www.youtube.com/watch?v=${videoId}`);
    } else {
      // OFFLINE: Redirigimos a la pestaña de transmisiones del canal de YouTube usando su ID exacto
      const targetUrl = channel.ChannelLiveUrl.replace("/live", "/streams");
      this._openPlayer(targetUrl);
    }
  }

  // --- Abrir Reproductor ---
  _openPlayer(url) {
    const match = url.match(/v=([^&]+)/);
    if (match && match[1]) {
      this._focusedSection = 'player';
      this.tag('Overlays.Player').videoId = match[1];
      this.tag('Overlays.Player').alpha = 1;
      this.tag('Overlays.Player').visible = true;

      this.tag('Main').alpha = 0; // Ocultamos la app detrás del reproductor
      this.tag('Background').alpha = 0;
      this._refocus();
    } else {
      // En lugar de window.open, forzamos abrir la app nativa mediante Deep Links
      this._launchNativeYouTube(url);
    }
  }

  // --- Helper para lanzar la app NATIVA de YouTube según el Sistema Operativo ---
  _launchNativeYouTube(url) {
    // 1. Tizen (Samsung Smart TV)
    if (typeof tizen !== 'undefined' && tizen.application) {
      try {
        const appControl = new tizen.ApplicationControl(
          'http://tizen.org/appcontrol/operation/view',
          url
        );
        tizen.application.launchAppControl(
          appControl,
          '111299001912', // ID oficial de la app de YouTube en Tizen
          () => console.log('YouTube nativo lanzado en Tizen'),
          (e) => {
            console.error('Fallo al abrir YouTube en Tizen:', e.message);
            window.open(url, '_blank');
          }
        ); 
        return;
      } catch (err) {
        console.error('Error usando tizen.application:', err);
      }
    }

    // 2. WebOS (LG Smart TV)
    if (window.webOS && window.webOS.service) {
      window.webOS.service.request('luna://com.webos.applicationManager', {
        method: 'launch',
        parameters: {
          id: 'youtube.leanback.v4', // ID oficial de YouTube en WebOS
          params: { contentTarget: url }
        },
        onFailure: (e) => {
          console.error('Fallo al abrir YouTube en WebOS:', e);
          window.open(url, '_blank');
        }
      });
      return;
    }

    // 3. Android TV (Capacitor) / Genérico
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      // En Android, el intent URI fuerza al SO a salir del WebView y buscar la app configurada (YouTube)
      const cleanUrl = url.replace(/^https?:\/\//, '');
      const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;
      window.location.href = intentUrl;
      return;
    }

    // 4. Fallback genérico a navegador
    window.open(url, '_blank');
  }

  // --- Búsqueda de Canales ---
  _performSearch(text) {
    this._searchText = text.toLowerCase();
    this._applyFilters();
    this._focusedSection = 'content';
    this._refocus();
  }

  // --- Manejador para seleccionar Stream de un Canal con múltiples activos ---
  $onSelectStream(data) {
    const { channel, activeVideos } = data;
    this._previousFocus = this._focusedSection;
    this._focusedSection = 'select';
    this.tag('Overlays.Select').alpha = 1;
    this.tag('Overlays.Select').config = {
      title: 'Transmisiones en curso',
      options: activeVideos.map(v => ({
        label: (v.IsPremiere ? '⭐ ' : '🔴 ') + (v.Title || channel.ChannelName),
        value: v.VideoId
      })),
      onSelect: (videoId) => {
        this.tag('Overlays.Select').alpha = 0;
        this._openPlayer(`https://www.youtube.com/watch?v=${videoId}`);
      }
    };
    this._refocus();
  }

  // --- Manejador para cerrar modal de búsqueda ---
  $closeSearchModal() {
    this.tag('Overlays.Search').alpha = 0;
    this._focusedSection = this._previousFocus || 'header';
    this._updateUI();
    this._refocus();
  }

  // --- Manejador para cerrar modal de selector ---
  $closeSelectModal() {
    this.tag('Overlays.Select').alpha = 0;
    this._focusedSection = this._previousFocus || 'header';
    this._updateUI();
    this._refocus();
  }

  // --- Manejo del Foco General ---
  _handleUp() {
    if (this._focusedSection === 'footer') {
      this._focusedSection = 'content';
      this._refocus();
    } else if (this._focusedSection === 'content') {
      // Si estamos en CardsDemand, intentamos ir a CardsLive
      if (this._contentRowIndex === 1 && this.tag('Main.Content.CardsLive').alpha === 1) {
        this._contentRowIndex = 0;
        this._refocus();
        return true;
      }
      // Si no podemos subir en content, vamos al header
      this._focusedSection = 'header';
      this._refocus();
    } else if (this._focusedSection === 'header') {
      // Ya estamos arriba, no hacer nada
    }
  }

  _handleDown() {
    if (this._focusedSection === 'header') {
      this._focusedSection = 'content';
      this._contentRowIndex = 0; // Empezar en la primera fila visible
      this._refocus();
    } else if (this._focusedSection === 'content') {
      // Si estamos en CardsLive, intentamos ir a CardsDemand
      if (this._contentRowIndex === 0 && this.tag('Main.Content.CardsDemand').alpha === 1) {
        this._contentRowIndex = 1;
        this._refocus();
        return true;
      }
      // Si no podemos bajar en content, vamos al footer
      this._focusedSection = 'footer';
      this._refocus();
    } else if (this._focusedSection === 'footer') {
      // Ya estamos abajo, no hacer nada
    }
  }

  _getFocused() {
    if (this._focusedSection === 'search') return this.tag('Overlays.Search');
    if (this._focusedSection === 'select') return this.tag('Overlays.Select');
    if (this._focusedSection === 'modal') return this.tag('Overlays.Info');
    if (this._focusedSection === 'player') return this.tag('Overlays.Player');
    if (this._focusedSection === 'header') return this.tag('Main.Header');
    if (this._focusedSection === 'footer') return this.tag('Main.Footer');

    if (this._focusedSection === 'content') {
      if (this._viewMode === 'grid' && this.tag('Main.Content.Grid').alpha === 1) {
        return this.tag('Main.Content.Grid');
      } else if (this._viewMode === 'cards') {
        // Navegar entre CardsLive y CardsDemand
        if (this._contentRowIndex === 0 && this.tag('Main.Content.CardsLive').alpha === 1) {
          return this.tag('Main.Content.CardsLive');
        } else if (this._contentRowIndex === 1 && this.tag('Main.Content.CardsDemand').alpha === 1) {
          return this.tag('Main.Content.CardsDemand');
        }
        // Si no está visible, buscar la primera fila visible
        if (this.tag('Main.Content.CardsLive').alpha === 1) {
          this._contentRowIndex = 0;
          return this.tag('Main.Content.CardsLive');
        }
        if (this.tag('Main.Content.CardsDemand').alpha === 1) {
          this._contentRowIndex = 1;
          return this.tag('Main.Content.CardsDemand');
        }
      }
    }
    return this;
  }

  // --- ESCUDO FINAL ---
  // Si un evento "Atrás" llega hasta la raíz de la app sin ser manejado,
  // lo absorbemos devolviendo true para evitar que intente cerrar la app o abrir modales.
  _handleBack() {
    return true;
  }
}
