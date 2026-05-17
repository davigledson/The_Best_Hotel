export function Dashboard() {
  return <div className="text-zinc-800 text-xl font-medium">Dashboard</div>
}


export function CheckIn() {
  return <div className="text-zinc-800 text-xl font-medium">Check-in</div>
}

export function CheckOut() {
  return <div className="text-zinc-800 text-xl font-medium">Check-out</div>
}

// Reservas and Quartos are exported from their respective files below

export { Clientes } from './Clientes.tsx'

export { Funcionarios } from './Funcionarios.tsx'

export { Produtos } from './Produtos.tsx'

export function Relatorios() {
  return <div className="text-zinc-800 text-xl font-medium">Relatorios</div>
}

export { Usuarios } from './Usuarios.tsx'

export { Reservas } from './Reservas.tsx'
export { Quartos } from './Quartos.tsx'
export { Estadias } from './Estadias.tsx'