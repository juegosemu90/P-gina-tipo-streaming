// Registra el service worker para que RosaTV funcione como app instalable (PWA).
// Importa esto una sola vez en tu src/main.jsx (o donde tengas el ReactDOM.render).

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/P-gina-tipo-streaming/sw.js')
        .catch(() => {}) // si falla, la app sigue funcionando normal sin PWA
    })
  }
}
