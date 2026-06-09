# 🌹 RosaTV — Plataforma de Streaming

Plataforma temática de **La Rosa de Guadalupe** construida con React + Vite.

## ⚡ Instalación y uso

```bash
# 1. Instalar dependencias
npm install

# 2. Correr en desarrollo
npm run dev

# 3. Abrir en el navegador
# http://localhost:5173
```

## 🏗️ Build para producción

```bash
npm run build
npm run preview
```

## 📦 Paquetes npm usados

| Paquete | Uso |
|---|---|
| `react` + `react-dom` | UI |
| `lucide-react` | Íconos (Home, Heart, Play, Clock) |
| `vite` | Bundler + dev server |
| `@vitejs/plugin-react` | Plugin JSX |

## 📁 Estructura

```
rosatv/
├── src/
│   ├── components/
│   │   ├── PetalCanvas.jsx    # Animación de pétalos flotantes
│   │   ├── Navbar.jsx         # Barra de navegación
│   │   ├── EpisodeCard.jsx    # Tarjeta de episodio
│   │   └── Toast.jsx          # Notificación
│   ├── pages/
│   │   ├── Inicio.jsx         # Pantalla "Aún en Progreso"
│   │   └── Favoritos.jsx      # Lista de favoritos
│   ├── data/
│   │   └── episodes.js        # Datos de episodios
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

## ✨ Características

- 🌹 Canvas de pétalos flotantes animados
- 🧭 Navegación entre **Inicio** y **Favoritos**
- ⏳ Pantalla de "Aún en Progreso" con roseta animada
- 💜 Tarjetas de episodios con hover effects
- 🔔 Toast de notificación al quitar favoritos
- 🎨 CSS Modules para estilos aislados
