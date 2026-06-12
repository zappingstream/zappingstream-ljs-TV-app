import { Launch } from '@lightningjs/sdk'
import App from './App.js'
import { App as CapacitorApp } from '@capacitor/app'

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

  // --- FIX CAPACITOR: BOTÓN FÍSICO 'ATRÁS' EN ANDROID TV ---
  // Evita que Android OS cierre la app cuando presionas la flecha Atrás.
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    CapacitorApp.addListener('backButton', () => {
      // Simular tecla 'Escape' para que Lightning JS la procese con _handleBack()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
  }

  // --- FIX TIZEN (SAMSUNG TV): BOTÓN FÍSICO 'ATRÁS' ---
  // Intercepta el botón físico 'Atrás' en Tizen y lo convierte en una tecla 'Escape'
  // para que Lightning JS lo maneje, evitando que se cierre la app.
  if (window.tizen) {
    document.addEventListener('tizenhwkey', (e) => {
      if (e.keyName === 'Back') {
        e.preventDefault() // Detiene la acción por defecto de Tizen (cerrar la app)
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      }
    })
  }

  return Launch(App, ...arguments)
}
