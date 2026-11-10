import { RouterProvider } from 'react-router-dom'
import { router } from './app/router/AppRouter'
import { AuthProvider } from './app/providers/AuthProvider'
import { ThemeProvider } from './app/providers/ThemeProvider'
import { ToastProvider } from './app/providers/ToastProvider'
import { NotificationProvider } from './app/providers/NotificationProvider'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <RouterProvider router={router} />
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
