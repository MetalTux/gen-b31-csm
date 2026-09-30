# Correcciones: PWA, menú lateral en móviles y conexión Prisma

Fecha: 2026-09-30 · Versión base: `1.1.0` (commit `5f6165b`)

Este documento resume los cambios hechos para:

1. Permitir la instalación como PWA en Android (Chrome), escritorio e iOS.
2. Corregir el botón "Cerrar Sesión", que quedaba tapado por la barra inferior en móviles.
3. Usar una sola conexión de Prisma para toda la aplicación.

---

## 1. PWA: la app no se podía instalar en Android

### Causa principal

El proxy de autenticación ([src/proxy.ts](../src/proxy.ts)) intercepta todas las rutas que no
estén excluidas en su `matcher` y redirige a `/login` si no hay cookie de sesión. El `matcher`
solo excluía archivos `.png` e `.ico`, así que **`/manifest.webmanifest` y `/sw.js` también
pasaban por la revisión de sesión**.

- Chrome descarga el manifest **sin enviar cookies**, así que siempre recibía una redirección
  al login (HTML) en vez del JSON del manifest.
- En `/login` todavía no hay sesión, así que `/sw.js` también se redirigía, y un service worker
  no se puede registrar a partir de una redirección.

Sin manifest válido ni service worker, Chrome no ofrece instalar la app. Comprobación antes del
cambio, sin sesión:

```
/manifest.webmanifest  307 -> /login
/sw.js                 307 -> /login
```

### Cambios

| Archivo | Cambio |
|---|---|
| [src/proxy.ts](../src/proxy.ts) | El `matcher` ahora excluye `manifest.webmanifest`, `sw.js`, `offline.html` y los archivos estáticos (`png`, `ico`, `svg`, `jpg`, `jpeg`, `webp`). |
| [src/app/manifest.ts](../src/app/manifest.ts) | Se agregan `id`, `scope` y `lang`. Los íconos `maskable` apuntan a imágenes nuevas con margen. |
| `public/icon-maskable-192x192.png`, `public/icon-maskable-512x512.png` | **Nuevos.** El escudo al 70% sobre fondo blanco. Android recorta los íconos `maskable` en círculo o *squircle*; con la imagen original (que llega hasta el borde) se cortaba el texto del escudo. Los íconos `any` siguen siendo los originales. |
| [src/app/apple-icon.png](../src/app/apple-icon.png) | **Nuevo** (180×180). Next.js lo publica automáticamente como `apple-touch-icon`, que es el ícono que usa Safari (iOS/macOS) al instalar. |
| [public/sw.js](../public/sw.js) | Reescrito (ver abajo). |
| [public/offline.html](../public/offline.html) | **Nuevo.** Página que se muestra cuando no hay conexión. |
| [src/components/InstallPrompt.tsx](../src/components/InstallPrompt.tsx) | Ahora se remueve también el listener de `appinstalled` al desmontar (antes solo se removía `beforeinstallprompt`). El banner pasa de la parte inferior a la **superior** (ver abajo). |

### Service worker (`public/sw.js`)

Problemas de la versión anterior:

- Interceptaba **todas** las peticiones, incluidos los `POST` de las *server actions*, las APIs y
  los assets.
- Sin conexión respondía con `caches.match(...)` sobre una caché vacía. Eso devuelve `undefined`,
  y `respondWith(undefined)` termina en error de red.

Versión nueva:

- Solo intercepta **navegaciones** (cargas de página). Todo lo demás va directo a la red.
- Mantiene la estrategia *Network-First*: siempre intenta la red y, si falla, muestra
  `/offline.html`, que se guarda en caché al instalar el SW.
- Al activarse borra cachés de versiones anteriores. Si en el futuro se cambia `offline.html` o
  se precachean más archivos, hay que subir `CACHE_NAME` (`portal-csm-v1` → `v2`).

### Banner de instalación (`InstallPrompt`)

Se movió a la **parte superior** para que sea más visible y no tape el contenido mientras se lee:

- **Móvil:** empieza a la derecha del botón hamburguesa (`left-[4.5rem]`) para no taparlo, y
  respeta la zona segura superior (barra de estado / *notch*). En pantallas angostas se oculta el
  ícono y el subtítulo, y queda solo "Instalar Portal CSM" con sus botones.
- **Escritorio (`md:`):** queda arriba a la derecha con un ancho fijo (`w-96`), sin tapar el
  menú lateral.
- **`z-30`:** al abrir el menú en móvil, el fondo oscuro y el panel (z-40/z-50) quedan por
  encima del banner.

Cuándo aparece y cuándo no:

- Solo aparece cuando Chrome o Edge disparan `beforeinstallprompt`, es decir, cuando la app es
  instalable y **todavía no está instalada** en ese dispositivo.
- Al instalarla, el evento `appinstalled` lo oculta. Después, el navegador deja de disparar el
  evento, así que no vuelve a aparecer. Dentro de la app instalada tampoco aparece.
- Si el usuario lo cierra con la **X**, se oculta solo hasta la próxima carga completa de la
  página: la decisión no se recuerda.
- Si el usuario desinstala la app, puede volver a aparecer.
- Safari (iOS/macOS) y Firefox no disparan este evento, así que ahí nunca aparece.

### Cómo probar en Android

1. Probar siempre por **HTTPS** (Vercel). Por `http://192.168.x.x` Chrome no registra el service
   worker y la app nunca será instalable.
2. En el teléfono, borrar los datos del sitio (Chrome → Configuración → Configuración de
   sitios → el dominio → Borrar y restablecer). Así se descarta el service worker anterior.
3. Para depurar, conectar el teléfono por USB, abrir `chrome://inspect` en el PC y revisar
   **Application → Manifest** y **Application → Service workers**.

### Observaciones pendientes (no modificadas)

- **iOS no dispara `beforeinstallprompt`**, así que el banner de instalación nunca aparece en
  iPhone. Allí se instala con Compartir → "Agregar a inicio". Se podría agregar un aviso con
  esas instrucciones solo para iOS.
- `maximumScale: 1` y `userScalable: false` en el viewport impiden hacer zoom. No afectan la
  instalación, pero perjudican la accesibilidad.

---

## 2. Botón "Cerrar Sesión" tapado en móviles

### Causa

El menú lateral ([src/components/Sidebar.tsx](../src/components/Sidebar.tsx)) usaba `h-screen`,
es decir `height: 100vh`. En Chrome para Android, `100vh` equivale a la altura de la pantalla
**con la barra de direcciones oculta**. Cuando la barra está visible, el panel queda más alto
que el área visible y su parte inferior, donde está "Cerrar Sesión", queda fuera de la pantalla
o debajo de la barra de navegación del sistema.

### Cambios

| Archivo | Cambio |
|---|---|
| [src/components/Sidebar.tsx](../src/components/Sidebar.tsx) | `h-screen` → `h-dvh` (`100dvh`, la altura *dinámica*, que se ajusta a lo que realmente se ve). |
| [src/components/Sidebar.tsx](../src/components/Sidebar.tsx) | El pie con "Cerrar Sesión" usa `pb-[max(1rem,env(safe-area-inset-bottom))]`: nunca menos de 1rem y, si el sistema declara una zona ocupada abajo (barra de gestos o botones), agrega ese espacio. |
| [src/components/Sidebar.tsx](../src/components/Sidebar.tsx) | El encabezado del menú y el botón hamburguesa respetan la zona segura superior (barra de estado / *notch*). |
| [src/app/layout.tsx](../src/app/layout.tsx) | `viewportFit: "cover"` en el `viewport`. Sin esto, los navegadores reportan `env(safe-area-inset-*)` siempre en 0 y el punto anterior no tendría efecto. Es especialmente relevante en la app instalada (modo `standalone`) y en Android 15+, donde las apps se dibujan detrás de las barras del sistema. |
| [src/components/InstallPrompt.tsx](../src/components/InstallPrompt.tsx) | El banner de instalación también respeta la zona segura inferior. |

En escritorio (`md:` en adelante) no cambia nada visible: las zonas seguras valen 0 y `100dvh`
equivale a `100vh`.

### Cómo probar

- En Chrome Android, abrir el menú con la barra de direcciones visible y oculta: "Cerrar Sesión"
  debe verse completo en ambos casos.
- Repetir con la app instalada, con navegación por gestos y con navegación de 3 botones.

---

## 3. Conexión Prisma única

### Problema

- [src/app/layout.tsx](../src/app/layout.tsx) creaba un `PrismaPg` y un `PrismaClient` **nuevos
  en cada petición** (dentro de `RootLayout`) y nunca los cerraba. Cada uno abre su propio pool
  de conexiones a PostgreSQL, así que las conexiones se acumulaban con el uso.
- Además, **otros 26 archivos** (páginas, server actions, rutas API y `src/lib/auth.ts`) creaban
  cada uno su propio `Pool` + `PrismaClient` a nivel de módulo. Eso no ocurre por petición, pero
  sí significa hasta 26 pools independientes por instancia del servidor (cada uno con hasta 10
  conexiones por defecto de `pg`). Con Neon y funciones serverless en Vercel esto agota más
  rápido el límite de conexiones.
- En desarrollo, cada *hot reload* volvía a crear esos clientes sin cerrar los anteriores.

### Solución

Nuevo módulo [src/lib/prisma.ts](../src/lib/prisma.ts), que exporta un único `prisma`:

```ts
import { prisma } from "@/lib/prisma";
```

- Crea **un solo** `Pool` de `pg` + `PrismaPg` + `PrismaClient`, con la misma configuración que
  se usaba antes (`connectionString: process.env.DATABASE_URL`).
- En desarrollo guarda la instancia en `globalThis` para que el *hot reload* la reutilice. En
  producción el módulo se evalúa una sola vez por instancia del servidor.

### Archivos migrados

En cada archivo se eliminó la construcción local (`new Pool`, `new PrismaPg`,
`new PrismaClient`) y sus imports, y se agregó `import { prisma } from "@/lib/prisma"`. **Las
consultas no cambiaron**: la variable sigue llamándose `prisma`. Donde se importaban otros tipos
de `@prisma/client` (`EventCategory`, `InquiryCategory`, `QuestionType`, `Role`,
`BoardPosition`, `Prisma`), esos imports se conservaron.

- `src/app/layout.tsx` (el caso por petición)
- `src/lib/auth.ts` (el adaptador de NextAuth ahora usa el cliente compartido)
- Páginas: `src/app/page.tsx`, `src/app/calendario/page.tsx`, `src/app/consultas/page.tsx`,
  `src/app/mis-pagos/page.tsx`, `src/app/admin/{alumnos,configuracion,consultas,egresos,encuestas,ingresos,usuarios}/page.tsx`
- Server actions: `src/app/actions/{activity,comment,event,expense,generalIncome,inquiry,magicLink,payment,poll,schoolYear,student,user}.ts`
- API: `src/app/api/exportar-excel/route.ts`, `src/app/api/uploadthing/core.ts`

`activity.ts` y `uploadthing/core.ts` le pasaban el `connectionString` directamente a `PrismaPg`
en vez de un `Pool`. El resultado es equivalente, así que también quedaron en el cliente
compartido.

---

## Verificación realizada

- `tsc --noEmit`: sin errores.
- `eslint src`: 0 errores. Quedan los mismos 27 *warnings* que ya existían antes de los cambios
  (imports y variables sin usar en otros componentes).
- `next build`: compila correctamente.
- Servidor de producción (`next start`), **sin sesión**:
  - `/manifest.webmanifest`, `/sw.js`, `/offline.html`, `/login`, `/api/auth/session` → `200`.
  - `/` → `307` a `/login` (la protección de rutas sigue funcionando).
  - El `<meta name="viewport">` incluye `viewport-fit=cover`.
  - El CSS generado incluye `height: 100dvh` y las reglas `env(safe-area-inset-*)`.

**No verificado aquí** (requiere dispositivo o sesión real): la instalación en un Android real,
el aspecto del menú en el teléfono y las consultas a la base de datos con un usuario logueado.
Conviene probar el login, un par de páginas de admin y alguna server action (por ejemplo,
publicar un comentario) antes de desplegar.
