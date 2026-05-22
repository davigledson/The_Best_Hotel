import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ClientLayout } from './components/ClientLayout'
import { EmployeeLayout } from './components/EmployeeLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import {
  Dashboard,
  Reservas,
  CheckIn,
  CheckOut,
  Quartos,
  Clientes,
  Funcionarios,
  Produtos,
  Relatorios,
  Usuarios,
  Estadias,
} from './pages'
import { MyBookings } from './pages/client/MyBookings'
import { MyStay } from './pages/client/MyStay'
import { ClientHome } from './pages/client/ClientHome'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'reservas', element: <Reservas /> },
      { path: 'checkin', element: <CheckIn /> },
      { path: 'checkout', element: <CheckOut /> },
      { path: 'quartos', element: <Quartos /> },
      { path: 'clientes', element: <Clientes /> },
      { path: 'funcionarios', element: <Funcionarios /> },
      { path: 'produtos', element: <Produtos /> },
      { path: 'estadias', element: <Estadias /> },
      { path: 'relatorios', element: <Relatorios /> },
      { path: 'usuarios', element: <Usuarios /> },
    ],
  },
  {
    path: '/employee',
    element: (
      <ProtectedRoute allowedRoles={['EMPLOYEE']}>
        <EmployeeLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Reservas /> },
      { path: 'reservas', element: <Reservas /> },
      { path: 'checkin', element: <CheckIn /> },
      { path: 'checkout', element: <CheckOut /> },
      { path: 'estadias', element: <Estadias /> },
      { path: 'quartos', element: <Quartos /> },
      { path: 'produtos', element: <Produtos /> },
    ],
  },
  {
    path: '/client',
    element: (
      <ProtectedRoute allowedRoles={['CLIENT']}>
        <ClientLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <ClientHome /> },
      { path: 'bookings', element: <MyBookings /> },
      { path: 'stay', element: <MyStay /> },
    ],
  },
])
