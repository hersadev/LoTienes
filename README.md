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

- Entrada sin contraseña: al abrir la app eliges tu usuario o creas una cuenta
  (auth provisional con el header `x-user-id`; el seed crea Juanjo, Ana y Luis).
  La sesión se guarda en el navegador; en el móvil se pierde al cerrar la app.
- Amigos e invitaciones por enlace: en la pestaña **Amigos**, "Invitar a un
  amigo" crea un enlace `/invitacion/<token>` y abre la hoja de compartir.
  Quien lo abre sin cuenta se registra ahí mismo (o entra con su email) y
  quedáis como amigos; también puede abrirlo en la app (`lotienes://`).
- Los objetos solo se ven entre amigos, y solo se puede pedir prestado a amigos.
- Flujo completo de préstamos: pedir prestado → aceptar/rechazar → marcar devuelto.
- El dominio de los enlaces de invitación sale de `PUBLIC_WEB_URL` en el
  backend (por defecto `http://localhost:8081`); en producción sería el real.

## Modelo de datos

- `users` — usuarios.
- `friendships` — parejas de amigos (una fila por pareja).
- `invites` — invitaciones por enlace: token, quién invita y quién la aceptó.
- `items` — objetos que cada uno ofrece (visibles solo para amigos).
- `loans` — solicitudes/préstamos con estados: `pendiente` → `aceptado` → `devuelto` (o `rechazado`), con fechas de solicitud, aceptación, devolución y fecha límite (`due_date`).

## Próximos pasos (pendiente)

- Autenticación real (contraseñas o enlace mágico por email).
- Publicar la app en las stores y universal links (que el enlace de invitación
  abra la app directamente si está instalada).
- Notificaciones push cuando llega una solicitud.
- Fotos de los objetos.
- Elegir fecha de devolución al pedir/aceptar.
