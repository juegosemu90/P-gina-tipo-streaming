import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import styles from './Login.module.css'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      onLogin()
    } catch (e) {
      setError('Correo o contraseña incorrectos')
    }
    setLoading(false)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.icon}>🌹</div>
        <h1 className={styles.title}>Panel Admin</h1>
        <p className={styles.sub}>Solo para administradores</p>

        <input
          className={styles.input}
          type="email"
          placeholder="Correo"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className={styles.input}
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.btn} onClick={handleLogin} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}
