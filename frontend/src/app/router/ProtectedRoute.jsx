import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'
import Spinner from '../../components/common/Spinner'

export default function ProtectedRoute({ children }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Spinner label="Loading…" />
      </div>
    )
  }

  if (status === 'guest') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return children
}
