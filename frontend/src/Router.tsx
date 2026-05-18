import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ClientLayout } from './components/ClientLayout'
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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/admin',
    element: <Layout />,
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
    path: '/client',
    element: <ClientLayout />,
    children: [
      { index: true, element: <ClientHome /> },
      { path: 'bookings', element: <MyBookings /> },
      { path: 'stay', element: <MyStay /> },
    ],
  },
])