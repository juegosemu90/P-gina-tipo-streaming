// Detecta si RosaTV se está ejecutando como app instalada (PWA)
// en vez de abierta normal desde el navegador con su barra de direcciones.
export function isAppMode() {
  if (typeof window === 'undefined') return false

  // display-mode: standalone → la app fue instalada y abierta desde el ícono
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

  // iOS Safari usa esta propiedad en vez del media query estándar
  const isIosStandalone = window.navigator.standalone === true

  return isStandalone || isIosStandalone
}
