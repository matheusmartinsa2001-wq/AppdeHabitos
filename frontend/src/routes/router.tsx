import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/auth/LoginPage'
import { WaterTodayPage } from '@/pages/water/WaterTodayPage'
import { WaterSettingsPage } from '@/pages/water/WaterSettingsPage'
import { ProtectedRoute } from './ProtectedRoute'

export const routes = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <WaterTodayPage /> },
      { path: '/agua/configuracao', element: <WaterSettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

export const router = createBrowserRouter(routes)
