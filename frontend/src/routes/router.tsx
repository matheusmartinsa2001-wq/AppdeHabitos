import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/auth/LoginPage'
import { HomePage } from '@/pages/home/HomePage'
import { ProtectedRoute } from './ProtectedRoute'

export const routes = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [{ path: '/', element: <HomePage /> }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

export const router = createBrowserRouter(routes)
