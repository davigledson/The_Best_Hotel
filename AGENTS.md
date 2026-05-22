# The Best Hotel - Repo Guide

## Project Structure

| Path | Tech |
|---|---|
| `backend/` | Spring Boot 4.0 + Java 21 + MongoDB (Maven) |
| `frontend/` | React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4 |

## Quick Start

```bash
# Backend (requires MongoDB on localhost:27017)
backend$ ./mvnw spring-boot:run

# Frontend
frontend$ npm install
frontend$ npm run dev    # starts on :3000, proxies to backend :8080
```

## Frontend Commands

| Command | Action |
|---|---|
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | `tsc -b && vite build` (typecheck + build) |
| `npm run lint` | ESLint on all files |
| `npm run generate` | Run Orval — regenerates `src/services/` from `http://localhost:8080/v3/api-docs` |

### Orval API Client

- Config: `frontend/orval.config.ts` — fetches OpenAPI spec from the running backend at `:8080/v3/api-docs`
- Generates `src/services/` as **tags-split** (one dir per controller) with **react-query** hooks
- Custom Axios instance at `src/lib/axios.ts` (base URL `http://localhost:8080`)
- Backend **must be running** before `npm run generate`

## Backend Architecture

- **Entrypoint**: `com.the.best.hotel.theBestHotel.TheBestHotelApplication`
- **Persistence**: Spring Data MongoDB (`MongoRepository<Entity, ObjectId>`)
- **API spec**: OpenAPI 3 via springdoc-openapi (`/v3/api-docs`)
- **ID type**: MongoDB `ObjectId` serialized as hex string via `@JsonSerialize(using = ToStringSerializer.class)`
- **CORS**: Wide open (`*`) in `CorsConfig.java`

### API Endpoints (`/api`)

| Controller | Base Path | Key Endpoints |
|---|---|---|
| AuthController | `/auth` | `POST /login` (public) |
| BookingController | `/bookings` | CRUD + cancel, requestCheckin, findByStatus |
| ClientController | `/clients` | Full CRUD |
| EmployeeController | `/employees` | Full CRUD |
| ProductController | `/products` | CRUD + filter by active/category |
| RoomController | `/rooms` | CRUD + findByStatus |
| StayController | `/stays` | CRUD + checkin, checkout, addConsumption |
| UserController | `/users` | Full CRUD |

### Authentication (Spring Security + JWT)

- JWT via `jjwt 0.12.6`, secret + expiration in `application.properties`
- 3 roles in `User.Role`: `ADMIN`, `EMPLOYEE`, `CLIENT`
  - **ADMIN** — full dashboard, relatorios, gerenciar funcionários e usuários
  - **EMPLOYEE** — criar reservas, gerenciar check-in/out, registrar consumos
  - **CLIENT** — criar próprias reservas, solicitar check-in, ver próprios dados
- `POST /auth/login` → `{ email, password }` → `{ token, email, role, refId }`
- Token enviado via `Authorization: Bearer <token>` (interceptor automático no frontend)
- Root `/` redireciona para `/swagger-ui.html`

### Known Backend Bugs (do NOT introduce new ones)

1. ~~`spring.mongodb.uri` → `spring.data.mongodb.uri`~~ (fixed)
2. `NotFoundException` is a plain class — does not extend `RuntimeException`, cannot be thrown. `GlobalExceptionHandler.handleNotFound` targets `ChangeSetPersister.NotFoundException` but parameter type is the local `NotFoundException` — handler never fires
3. Passwords stored with BCrypt (fixed), but no refresh token or session invalidation

### Test

```bash
backend$ ./mvnw test   # single smoke test (contextLoads)
```

## Frontend Architecture

- **Routing**: React Router v7 (`createBrowserRouter`) — 4 route groups: `/` (public), `/login`, `/admin` (ADMIN sidebar), `/employee` (EMPLOYEE sidebar), `/client` (CLIENT sidebar)
- **Auth**: `AuthContext` + `ProtectedRoute` wrapper — checks JWT in localStorage, redirects to `/login` if missing/wrong role
- **Server state**: TanStack React Query v5 via Orval-generated hooks
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss"` in `index.css`, no tailwind.config.js)
- **Icons**: lucide-react
- **No global state** (local state + React Query)
- **No `.env` files** — backend URL is hardcoded in `src/lib/axios.ts`

### File organization

```
src/
├── lib/axios.ts           Axios + customInstance wrapper
├── services/              Orval-generated (react-query hooks)
│   ├── booking-controller/
│   ├── client-controller/
│   ├── employee-controller/
│   ├── product-controller/
│   ├── room-controller/
│   ├── stay-controller/
│   ├── user-controller/
│   └── openAPIDefinition.schemas.ts
├── contexts/
│   └── AuthContext.tsx    Auth state + login/logout + localStorage
├── components/
│   ├── Layout.tsx         Admin shell (Sidebar + Outlet)
│   ├── ClientLayout.tsx   Client shell (sidebar + Outlet)
│   ├── EmployeeLayout.tsx Employee shell (sidebar + Outlet)
│   ├── Sidebar.tsx        Collapsible admin sidebar
│   └── ProtectedRoute.tsx Route guard (redirect to /login)
├── pages/
│   ├── index.tsx          Barrel exports + stub Relatorios
│   ├── HomePage.tsx       Public landing page
│   ├── LoginPage.tsx      Login form (email + password)
│   ├── admin/             All admin CRUD pages
│   └── client/            Client-self-service pages
└── assets/                hero.png, etc.
```

### CRUD pattern (every admin page)

```tsx
const { data = [], isLoading } = useFindAll1()
const create = useCreate1({ mutation: { onSuccess: () => { invalidate(); close() } } })
const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAll1QueryKey() })
```

### ID normalization

MongoDB ObjectIds arrive as `{ $oid: "..." }`. Pages have inline `getId()` helpers — duplicated, not shared.

## CI / Tooling

- **No CI workflows** found in `.github/`
- `.github/java-upgrade/` contains per-session AI tool-use recording hooks (Bash + PowerShell) — gitignored
