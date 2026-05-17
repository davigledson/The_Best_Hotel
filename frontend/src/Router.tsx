import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
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

export const router = createBrowserRouter([
  {
    path: '/',
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
])