# The Best Hotel

Sistema de gestão hoteleira com três perfis de acesso.

## Stack

- **Backend:** Spring Boot 4.0 / Java 21 / MongoDB / Spring Security + JWT
- **Frontend:** React 19 / TypeScript 6 / Vite 8 / Tailwind CSS 4
- **API:** OpenAPI 3 via springdoc-openapi (`/v3/api-docs`)

## Pré-requisitos

- Java 21+
- Node.js 20+
- MongoDB 7+ (via Docker ou instalado localmente)

## Como rodar

### 1. MongoDB

```bash
docker run -d --name mongo -p 27017:27017 mongo:7
```

### 2. Backend

```bash
cd backend
./mvnw spring-boot:run
```

A API sobe em `http://localhost:8080`. Swagger em `http://localhost:8080/swagger-ui.html`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

O app abre em `http://localhost:3000` (proxy automático para o backend em `:8080`).

## Contas de teste

| Email | Senha | Perfil |
|---|---|---|
| admin@gmail.com | admin123 | Admin |
| funcionario@gmail.com | func123 | Funcionário |
| cliente@gmail.com | cliente123 | Cliente |

## Funcionalidades por perfil

### Admin
- Dashboard com indicadores
- CRUD de quartos, produtos, funcionários, clientes, usuários
- Gerenciar reservas, aprovar pendentes, check-in/out, consumos
- Relatórios

### Funcionário
- Criar e gerenciar reservas
- Aprovar reservas pendentes de clientes
- Realizar check-in e check-out
- Registrar consumos dos hóspedes
- CRUD de quartos e produtos

### Cliente
- Autocadastro público (rota `/register`)
- Criar reservas (iniciam como **PENDING**, aguardam aprovação)
- Visualizar apenas as próprias reservas
- Cancelar reservas
- Solicitar check-in

## Scripts úteis (frontend)

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (`:3000`) |
| `npm run build` | Typecheck (`tsc -b`) + build (`vite build`) |
| `npm run lint` | ESLint em todos os arquivos |
| `npm run generate` | Regenerar cliente API via Orval (precisa do backend rodando) |

## Estrutura do projeto

```
backend/
├── src/main/java/com/the/best/hotel/theBestHotel/
│   ├── config/       → SecurityConfig, CorsConfig, DataInitializer
│   ├── controller/   → Endpoints REST (/api/**)
│   ├── dto/          → UserCreateRequest
│   ├── model/        → User, Employee, Client, Room, Booking, Stay, Product
│   ├── repository/   → Spring Data MongoDB repositories
│   ├── security/     → JwtTokenProvider, JwtAuthenticationFilter
│   └── service/      → Regras de negócio
└── src/main/resources/
    └── application.properties

frontend/
├── src/
│   ├── components/   → Layout, Sidebar, ProtectedRoute
│   ├── contexts/     → AuthContext (login/register/logout)
│   ├── pages/        → Páginas por perfil (admin/, client/, LoginPage, RegisterPage)
│   ├── lib/          → Axios instance + customInstance wrapper
│   └── services/     → Orval-generated hooks (react-query)
└── package.json
```

## Observações

- Clientes criados via `/register` já saem logados e vão direto para a área do cliente
- Reservas de clientes nascem como `PENDING` e precisam ser aprovadas por um Admin ou Funcionário
- Ao criar um usuário com perfil **Funcionário** ou **Cliente** em Usuários, o backend cria automaticamente o registro vinculado em `employees` ou `clients`
- A classe `NotFoundException` no backend **não estende RuntimeException** — o `GlobalExceptionHandler` não captura exceções dessa classe
- Arquivos em `src/services/` são gerados pelo Orval. Se regenerar (`npm run generate`), edições manuais em `openAPIDefinition.schemas.ts` precisam ser reaplicadas
