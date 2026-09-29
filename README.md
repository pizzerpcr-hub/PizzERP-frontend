# PizzERP – Frontend

Interfaz web del sistema PizzERP (Pizzería Mabet), hecha con React 19 y Vite.
Se conecta con la API del repositorio [PizzERP-backend](https://github.com/pizzerpcr-hub/PizzERP-backend).

## Requisitos

| Programa | Versión | Descarga |
| --- | --- | --- |
| Git | cualquiera | https://git-scm.com/download/win |
| Node.js | 22.12 o superior (LTS) | https://nodejs.org (use "Windows Installer (.msi)") |

Además, el backend tiene que estar instalado y encendido (vea el README del backend).

## Instalación

```powershell
git clone -b develop https://github.com/pizzerpcr-hub/PizzERP-frontend.git
cd PizzERP-frontend
npm install
copy .env.example .env
```

`BACKEND_URL` en `.env` indica dónde corre la API (por defecto `http://localhost:8000`).

## Ejecutar

Con el backend ya encendido (`php artisan serve`):

```powershell
npm run dev
```

Abra http://localhost:5173. Vite reenvía las llamadas a `/api` y `/sanctum` al backend,
así que los dos deben estar encendidos al mismo tiempo, cada uno en su propia ventana de PowerShell.

## Pruebas y revisión de código

```powershell
npm run lint                     # revisión con ESLint
node --test "tests/*.test.mjs"   # pruebas automáticas
npm run build                    # confirma que el proyecto compila
```

## Traer los cambios del equipo

```powershell
git pull origin develop --no-rebase
npm install
```

## Estructura

```
src/
  components/   componentes reutilizables (Sidebar, tablas, formularios, layouts)
  constants/    roles y rutas de inicio por rol
  context/      sesión del usuario (AuthContext)
  pages/        pantallas (Login, Usuarios)
  services/     llamadas a la API
  styles/       estilos generales
tests/          pruebas con node:test
```
