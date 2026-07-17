# LoTienes

App para prestar cosas entre amigos: un amigo te pide un objeto, tú aceptas la
solicitud, y queda registrado quién tiene qué y desde cuándo.

## Estructura

- `backend/` — API REST con Express + SQLite (la base de datos se crea sola en `backend/lotienes.db`).
- `app/` — App Expo (React Native): el mismo código corre en iOS, Android y web.

## Cómo arrancarlo con Docker (recomendado)

Lo único que necesitas instalado es Docker. Con esto funciona igual en
cualquier ordenador:

```bash
docker compose up --build
```

- App web: http://localhost:8081
- API: http://localhost:3001

El código está montado desde tu carpeta, así que los cambios se recargan en
caliente sin reconstruir nada. Si cambias dependencias (`package.json`),
levanta con `docker compose up --build --renew-anon-volumes`. La base de datos
vive en un volumen de Docker (cada ordenador tiene sus propios datos de prueba).

**Para probar en el móvil (Expo Go):** el QR de Expo no funciona desde dentro
de Docker. En ese caso arranca la app en local:

```bash
cd app
npm install     # solo la primera vez
npx expo start  # escanea el QR con Expo Go
```

y cambia `localhost` por la IP de tu ordenador en `app/src/lib/api.ts` (el
backend puede seguir corriendo en Docker).

## Cómo arrancarlo sin Docker

Terminal 1 — backend (puerto 3001):

```bash
cd backend
npm install   # solo la primera vez
npm run dev
```

Terminal 2 — app:

```bash
cd app
npm install   # solo la primera vez
npx expo start
```

Desde ahí: pulsa `w` para abrirla en el navegador, o escanea el QR con Expo Go.

## Estado actual (esqueleto)

- Sin login todavía: el usuario "logueado" se fija en `app/src/lib/api.ts`
  (`CURRENT_USER_ID`; el seed crea 1 = Juanjo, 2 = Ana, 3 = Luis). Cámbialo y
  recarga para probar los dos lados de un préstamo.
- Flujo completo ya funcional: pedir prestado → aceptar/rechazar → marcar devuelto.
- La API usa el header `x-user-id` como auth provisional.

## Modelo de datos

- `users` — usuarios/amigos.
- `items` — objetos que cada uno ofrece.
- `loans` — solicitudes/préstamos con estados: `pendiente` → `aceptado` → `devuelto` (o `rechazado`), con fechas de solicitud, aceptación, devolución y fecha límite (`due_date`).

## Próximos pasos (pendiente)

- Autenticación real (registro/login) y sistema de amigos.
- Notificaciones push cuando llega una solicitud.
- Fotos de los objetos.
- Elegir fecha de devolución al pedir/aceptar.
