import { useEffect, useRef } from 'react'

const COLORS = ['#c084fc', '#a855f7', '#f0abfc', '#f5c842', '#e879f9']

function makePetal(W, H) {
  return {
    x:    Math.random() * W,
    y:    Math.random() * H,
    r:    3 + Math.random() * 6,
    ry:   1.5 + Math.random() * 3,
    rot:  Math.random() * Math.PI * 2,
    rotV: (Math.random() - 0.5) * 0.018,
    vx:   (Math.random() - 0.5) * 0.35,
    vy:   0.18 + Math.random() * 0.28,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: 0.15 + Math.random() * 0.35,
  }
}

export default function PetalCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    let W, H
    let petals = []

    const resize = () => {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
      petals = Array.from({ length: 38 }, () => makePetal(W, H))
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      petals.forEach(p => {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = p.alpha
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.ellipse(0, 0, p.r, p.ry, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        p.x = (p.x + p.vx + W) % W
        p.y = (p.y + p.vy + H) % H
        p.rot += p.rotV
      })
      animId = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.55,
      }}
    />
  )
}
