import { useState } from 'react'
import Icon from '../components/Icon'
import { Avatar, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { api, isDemo } from '../lib/api'
import { AREAS } from '../lib/constants'
import loginBg from '../assets/login-bg.jpg'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login') // login | activar
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const demoAccounts = isDemo
    ? api.demoAccounts()
    : [
        { id: 'admin', email: 'admin@demo.com', password: 'Password123!', nombre: 'Administrador Demo', rol: 'admin', area: null },
        { id: 'barbero', email: 'barbero@demo.com', password: 'Password123!', nombre: 'Carlos Barbero Demo', rol: 'empleado', area: 'barberia' },
        { id: 'estilista', email: 'estilista@demo.com', password: 'Password123!', nombre: 'Valentina Estilista Demo', rol: 'empleado', area: 'women' },
      ]

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        // La redirección por rol la hace <LoginRoute /> al detectar la sesión
      } else {
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')
        const { needsConfirmation } = await signUp(email, password)
        if (needsConfirmation) {
          setOk('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.')
        } else {
          setOk('Cuenta activada. Ya puedes iniciar sesión.')
        }
        setMode('login')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const quick = async (acc) => {
    setEmail(acc.email)
    const pass = acc.password || 'demo123'
    setPassword(pass)
    setError('')
    setBusy(true)
    try {
      await signIn(acc.email, pass)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-art" aria-hidden="true">
        <img src={loginBg} alt="" />
        <div className="login-quote">
          <span className="badge badge-gold no-dot">Barbería · Zona Women</span>
          <h2 className="mt-16">
            Tu local, <span className="gold-text">bajo control</span>.
          </h2>
          <p>Agenda de los 14 empleados, caja con comisiones automáticas, inventario y cierres en Excel. Todo en un solo lugar.</p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-box">
          <div className="row">
            <div className="brand-logo"><Icon name="scissors" size={20} /></div>
            <div className="brand-name">BarberOS</div>
          </div>

          <h1>{mode === 'login' ? 'Bienvenido de nuevo' : 'Activa tu cuenta'}</h1>
          <p className="muted mt-8">
            {mode === 'login'
              ? 'Ingresa con tu correo y contraseña.'
              : 'Usa el correo con el que la administración te invitó y crea tu contraseña.'}
          </p>

          <form className="col mt-24" onSubmit={submit} style={{ gap: 16 }}>
            {error && <div className="form-error">{error}</div>}
            {ok && <div className="form-ok">{ok}</div>}

            <div className="field">
              <label className="label" htmlFor="login-email">Correo electrónico</label>
              <div className="input-icon">
                <Icon name="mail" />
                <input id="login-email" className="input" type="email" autoComplete="email" required
                  placeholder="tucorreo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="login-password">Contraseña</label>
              <div className="input-icon">
                <Icon name="lock" />
                <input id="login-password" className="input" type="password" required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>

            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy} id="login-submit">
              {busy ? <Spinner /> : mode === 'login' ? 'Ingresar' : 'Activar cuenta'}
            </button>

            <button type="button" className="btn btn-ghost btn-block" id="login-toggle-mode"
              onClick={() => { setMode(mode === 'login' ? 'activar' : 'login'); setError(''); setOk('') }}>
              {mode === 'login' ? '¿Te invitaron? Activa tu cuenta' : 'Ya tengo cuenta, iniciar sesión'}
            </button>
          </form>

          {mode === 'login' && (
            <>
              <div className="divider">Cuentas de demostración</div>
              <div className="demo-accounts">
                {demoAccounts.map((acc) => (
                  <button key={acc.id} className="demo-acc" onClick={() => quick(acc)} disabled={busy} id={`demo-${acc.rol}-${acc.area ?? 'admin'}`}>
                    <Avatar nombre={acc.nombre} area={acc.area} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{acc.rol === 'admin' ? 'Administrador' : acc.nombre.split(' ')[0]}</div>
                      <div className="faint small">{acc.rol === 'admin' ? 'Acceso total' : AREAS[acc.area].label}</div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="faint small mt-8">
                {isDemo
                  ? 'Contraseña de todas las cuentas demo: demo123'
                  : 'Cuentas demo listas para probar en vivo (1 clic o contraseña: Password123!)'}
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
