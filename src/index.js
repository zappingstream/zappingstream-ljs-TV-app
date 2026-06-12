import { Launch } from '@lightningjs/sdk'
import App from './App.js'

export default function () {
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

  // --- TRAMPA UNIVERSAL PARA EL BOTÓN ATRÁS (HISTORY API) ---
  // Como las teles simulan el botón 'Back' del control usando la navegación
  // del navegador, empujamos un estado falso para evitar que la app se cierre.
  window.history.pushState({ noBackExitsApp: true }, '')
  window.addEventListener('popstate', () => {
    // Volvemos a empujar el estado para seguir atrapando futuros 'Atrás'
    window.history.pushState({ noBackExitsApp: true }, '')
    // Simulamos la tecla Escape para que Lightning la ataje con _handleBack()
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })
    // Lightning JS requiere estrictamente la propiedad keyCode (27 = Escape) para detectar el botón
    Object.defineProperty(escEvent, 'keyCode', { get: () => 27 })
    window.dispatchEvent(escEvent)
  })

  return Launch(App, ...arguments)
}
