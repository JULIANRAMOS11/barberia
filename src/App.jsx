import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/Layout'
import { ErrorBoundary, Spinner } from './components/ui'
import Login from './pages/Login'
import SinPerfil from './pages/SinPerfil'
import Dashboard from './pages/Dashboard'
import AgendaMaestra from './pages/AgendaMaestra'
import Caja from './pages/Caja'
import Inventario from './pages/Inventario'
import Reportes from './pages/Reportes'
import Configuracion from './pages/Configuracion'
import MiAgenda from './pages/MiAgenda'
import MisFinanzas from './pages/MisFinanzas'
import ReservaPublica from './pages/ReservaPublica'
import LandingPublica from './pages/LandingPublica'

const homeFor = (profile) => (profile?.rol === 'admin' ? '/dashboard' : '/mi-agenda')

function Guard({ role, children }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <div className="loader-screen"><Spinner /></div>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <SinPerfil />
  if (role && profile.rol !== role) return <Navigate to={homeFor(profile)} replace />
  return children
}

function LoginRoute() {
  const { session, profile, loading } = useAuth()
  if (loading) return <div className="loader-screen"><Spinner /></div>
  // Redirección automática según el rol
  if (session && profile) return <Navigate to={homeFor(profile)} replace />
  if (session && !profile) return <SinPerfil />
  return <Login />
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              {/* Página Principal Oficial / Instagram Bio */}
              <Route path="/" element={<LandingPublica />} />
              <Route path="/inicio" element={<Navigate to="/" replace />} />

              {/* Redirecciones automáticas a la Página Oficial */}
              <Route path="/reservar" element={<Navigate to="/" replace />} />
              <Route path="/agendar" element={<Navigate to="/" replace />} />

              <Route path="/login" element={<LoginRoute />} />
              <Route element={<Guard><Layout /></Guard>}>
                {/* Admin */}
                <Route path="/dashboard" element={<Guard role="admin"><Dashboard /></Guard>} />
                <Route path="/agenda" element={<Guard role="admin"><AgendaMaestra /></Guard>} />
                <Route path="/caja" element={<Guard role="admin"><Caja /></Guard>} />
                <Route path="/inventario" element={<Guard role="admin"><Inventario /></Guard>} />
                <Route path="/reportes" element={<Guard role="admin"><Reportes /></Guard>} />
                <Route path="/configuracion" element={<Guard role="admin"><Configuracion /></Guard>} />
                {/* Empleados */}
                <Route path="/mi-agenda" element={<Guard role="empleado"><MiAgenda /></Guard>} />
                <Route path="/mis-finanzas" element={<Guard role="empleado"><MisFinanzas /></Guard>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}

