# ⚡ Go Flash Delivery – Seguimiento en vivo

Web estática para GitHub Pages. **Un solo enlace por pedido**, que se actualiza solo.

## Cómo funciona
1. **Administrador** (`/#/admin`, con PIN): crea el pedido, elige el motorizado y toca **📲 Crear y enviar enlace por WhatsApp**. Se abre WhatsApp con el mensaje y el enlace único del cliente.
2. **Motorizado** (`/#/moto`): se registra solo con su nombre. Ve únicamente los pedidos que le asignaron y va tocando el botón grande de cada estado.
3. **Cliente**: abre su enlace (sin registrarse). Ve el estado **en vivo**; cuando cambia, el celular vibra y se muestra un aviso.
4. **Administrador**: ve en tiempo real el estado de todos los pedidos y el feed de reportes.

## Estados
Pedido receptado → En camino a la compra → Realizando fila para la compra → Esperando el pedido → En camino a la entrega → Pedido en el sitio → Entregado con éxito

## 1) Activar el tiempo real (Firebase, gratis, ~3 minutos)
GitHub Pages no guarda datos, por eso se usa una base gratuita **solo para compartir el estado**:
1. Entra a https://console.firebase.google.com con una cuenta Google → **Crear proyecto**.
2. **Build → Realtime Database → Crear base de datos** (elige cualquier ubicación, modo bloqueado).
3. Pestaña **Reglas**, pega esto y **Publicar**:
```json
{ "rules": { "goflash": { ".read": true, ".write": true } } }
```
4. En la pestaña **Datos** copia la URL (termina en `firebaseio.com`) y pégala en `config.js` → `FIREBASE_URL`.
5. Cambia `ADMIN_PIN` en `config.js`.

## 2) Publicar en GitHub Pages
1. Crea un repositorio (ej. `goflash`) y sube: `index.html`, `styles.css`, `extra.css`, `app.js`, `config.js`, `README.md`.
2. **Settings → Pages**, rama `main`, carpeta `/ (root)`, guardar.
3. Tu web: `https://TU-USUARIO.github.io/goflash/`. Opcional: ponla en `SITE_URL` de `config.js`.

## Modo demo
Sin `FIREBASE_URL` la web funciona solo dentro de un mismo navegador (útil para probar con varias pestañas).

## Datos y seguridad
- No necesitas conservar historial: usa **🧹 Limpiar entregados** cuando quieras vaciar pedidos terminados.
- Es una versión sencilla: el PIN del admin está visible en `config.js` y la base está abierta a quien tenga su URL. El enlace del cliente solo muestra código, pedido, motorizado y estado, pero la base contiene teléfono y dirección. Para más seguridad, añade Firebase Authentication más adelante.
