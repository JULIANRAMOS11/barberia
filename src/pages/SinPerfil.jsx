import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'

// Usuario autenticado pero sin fila en "usuarios" (no fue invitado, o está desactivado / suscripción inactiva)
export default function SinPerfil() {
  const { session, signOut } = useAuth()
  return (
    <div className="loader-screen">
      <div className="card animate-in" style={{ maxWidth: 440, textAlign: 'center', padding: 32 }}>
        <div className="alert-icon" style={{ margin: '0 auto 16px', width: 48, height: 48 }}>
          <Icon name="lock" />
        </div>
        <h1 style={{ fontSize: 22 }}>Cuenta sin acceso</h1>
        <p className="muted mt-8">
          El correo <strong>{session?.user?.email}</strong> no está vinculado a ninguna barbería activa,
          o tu usuario fue desactivado. Pide a la administración que te envíe una invitación.
        </p>
        <button className="btn btn-primary mt-24" onClick={signOut} id="sin-perfil-logout">
          <Icon name="logout" /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}
