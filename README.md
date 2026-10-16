# ⚡ Go Flash Delivery – Seguimiento en vivo

Web estática para GitHub Pages. **Un solo enlace por pedido**, que se actualiza solo.

## Cómo funciona
1. **Administrador** (`/#/admin`, con PIN):
   - Crea las cuentas de los motorizados (nombre + contraseña) en la sección **🏍️ Motorizados**.
   - Crea cada pedido, elige el motorizado y toca **📲 Crear y enviar enlace por WhatsApp**. Se abre WhatsApp con el enlace único del cliente.
2. **Motorizado** (`/#/moto`): inicia sesión con su **nombre y contraseña**. Ve solo los pedidos que le asignaron y va tocando el botón grande de cada estado.
3. **Cliente**: abre su enlace (sin registrarse). Ve el estado **en vivo**; cuando cambia, el celular vibra y se muestra un aviso.
4. **Administrador**: ve en tiempo real el estado de todos los pedidos y el registro de reportes.

## Contraseñas de motorizados
- Las crea el administrador. Para cambiarla o restablecerla: botón **🔑 Cambiar clave** junto al nombre. Al cambiarla, la sesión anterior del motorizado se cierra.
- Se guardan solo como **hash SHA-256**, nunca en texto. Aun así, ver la nota de seguridad al final.
- Si ya tenías motorizados creados antes de esta versión, aparecerán como **sin contraseña**: toca **🔑 Crear clave** para cada uno.
- El nombre no distingue mayúsculas de minúsculas ("carlos pérez" = "Carlos Pérez").
- Para que funcione el login la web debe abrirse con `https://` (GitHub Pages ya lo hace).

## Estados
Pedido receptado → En camino a la compra → Realizando fila para la compra → Esperando el pedido → En camino a la entrega → Pedido en el sitio → Entregado con éxito

## 1) Activar el tiempo real (Firebase, gratis, ~3 minutos)
GitHub Pages no guarda datos, por eso se usa una base gratuita **solo para compartir el estado**:
1. Entra a https://console.firebase.google.com con una cuenta Google → **Crear proyecto**.
2. **Build → Realtime Database → Crear base de datos** (modo bloqueado).
3. Pestaña **Reglas**, pega esto y **Publicar**:
```json
{ "rules": { "goflash": { ".read": true, ".write": true } } }
```
4. En la pestaña **Datos** copia la URL (termina en `firebaseio.com` o `firebasedatabase.app`) y pégala en `config.js` → `FIREBASE_URL`.
5. Cambia `ADMIN_PIN` en `config.js`.

## 2) Publicar en GitHub Pages
1. Crea un repositorio y sube: `index.html`, `styles.css`, `extra.css`, `app.js`, `config.js`, `README.md` (los nombres deben ser exactos, sin "(1)").
2. **Settings → Pages**, rama `main`, carpeta `/ (root)`, guardar.
3. Tu web: `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

## Modo demo
Sin `FIREBASE_URL` la web funciona solo dentro de un mismo navegador (útil para probar con varias pestañas).

## Datos y seguridad (léelo)
- Usa **🧹 Limpiar entregados** para vaciar pedidos terminados.
- El login de motorizados y el PIN del admin son una **puerta de entrada de la web**, no seguridad de servidor: la base de Firebase está abierta a quien tenga su URL (las reglas del paso 3 permiten leer y escribir). Alguien con conocimientos técnicos podría leer los datos (nombres, teléfonos, direcciones, hashes de contraseñas) o modificarlos. Es suficiente para operar un negocio pequeño con gente de confianza.
- Usa contraseñas que no repitas en otros sitios. Para seguridad real se necesita Firebase Authentication con reglas por usuario (se puede añadir más adelante).
- El PIN del administrador está visible en `config.js`.
