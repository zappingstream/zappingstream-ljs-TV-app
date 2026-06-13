import { Launch } from '@lightningjs/sdk'
import App from './App.js'

export default function (appSettings = {}, platformSettings = {}, appData) {
  // Ocultar etiqueta celeste de APP y SDK (Inspector de Lightning)
  appSettings.debug = false
  appSettings.showVersion = false
  platformSettings.inspector = false

  // --- AJUSTE UNIVERSAL PARA CUALQUIER SMART TV ---
  // Inyectamos CSS global para garantizar que el canvas de Lightning
  // se adapte siempre al 100% de la pantalla sin importar el SO 
  // (WebOS, Tizen, Android TV, Roku, etc.) y sin usar setTimeouts.
  const style = document.createElement('style')
  style.innerHTML = `
    html, body {
      margin: 0; padding: 0;
      width: 100%; height: 100%;
      overflow: hidden; background-color: #000;
    }
    canvas {
      width: 100% !important; height: 100% !important;
      position: absolute !important; top: 0; left: 0;
      z-index: 1 !important;
    }
  `
  document.head.appendChild(style)

  // --- PUENTE CENTRALIZADO: BOTÓN ATRÁS ---
  // Esta función emite el evento que tu App.js SÍ está esperando escuchar
  const fireGoBack = () => {
    window.dispatchEvent(new CustomEvent('appGoBack'))
    
    // Por las dudas, también disparamos el escape tradicional para Lightning
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })
    Object.defineProperty(escEvent, 'keyCode', { get: () => 27 })
    window.dispatchEvent(escEvent)
  }

  // 1. TRAMPA CAPACITOR (ANDROID TV) - ¡El que evita que la app se cierre nativamente!
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    // Usamos import dinámico para no romper Rollup/Lightning (evita el error app$1 is not defined)
    // Esto inicializa el plugin correctamente y secuestra el botón Atrás de Android OS.
    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('backButton', () => fireGoBack())
    }).catch(err => console.error('Error cargando Capacitor App', err))
  }

  // 2. TRAMPAS PARA SMART TV (SAMSUNG / LG / ETC)
  // Usamos la fase de captura (true) para interceptar el botón Atrás ANTES 
  // de que el iframe de YouTube se lo trague cuando tiene el foco.
  window.addEventListener('keydown', (e) => {
    if (e.keyCode === 10009 || e.keyCode === 461 || e.key === 'BrowserBack') {
      e.preventDefault();
      e.stopPropagation();
      fireGoBack();
    }
  }, true);

  if (window.tizen) {
    window.addEventListener('tizenhwkey', (e) => {
      if (e.keyName === 'Back' || e.keyName === 'back' || e.keyName === 'Return') {
        e.preventDefault();
        fireGoBack();
      }
    }, true);
  }

  // --- TRAMPA UNIVERSAL PARA EL BOTÓN ATRÁS (HISTORY API) ---
  window.history.pushState({ noBackExitsApp: true }, '')
  window.addEventListener('popstate', () => {
    window.history.pushState({ noBackExitsApp: true }, '')
    fireGoBack()
  })

  return Launch(App, appSettings, platformSettings, appData)
}
