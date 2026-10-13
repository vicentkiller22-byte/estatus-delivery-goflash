/* ============ GO FLASH DELIVERY · seguimiento en vivo ============
   Admin asigna pedido + motorizado → el motorizado reporta con un toque →
   el cliente (un solo enlace) y el admin ven el cambio al instante. */
const CONFIG = window.GOFLASH_CONFIG || {};
const $ = (s, r = document) => r.querySelector(s);

const STATES = [
  { label: 'Pedido receptado',               icon: '📥', hint: 'Recibimos tu pedido' },
  { label: 'En camino a la compra',          icon: '🏍️', hint: 'El motorizado va a comprar tu pedido' },
  { label: 'Realizando fila para la compra', icon: '🧍', hint: 'Esperando su turno para comprar' },
  { label: 'Esperando el pedido',            icon: '⏳', hint: 'Están preparando tu pedido' },
  { label: 'En camino a la entrega',         icon: '🚀', hint: 'Tu pedido va hacia ti' },
  { label: 'Pedido en el sitio',             icon: '📍', hint: 'El motorizado llegó a tu dirección' },
  { label: 'Entregado con éxito',            icon: '✅', hint: '¡Que lo disfrutes!' },
];
const LAST = STATES.length - 1;

/* ---------- Utilidades ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b => b.toString(16).padStart(2, '0')).join('');
const hm = t => new Date(t).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
const hms = t => new Date(t).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3200);
}
function logo(size = 44) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="50" cy="50" r="46" fill="#FFE600" stroke="#141414" stroke-width="4"/>
    <path d="M8 62h26M12 72h22M18 82h18" stroke="#7A0B1C" stroke-width="6" stroke-linecap="round" opacity=".55"/>
    <circle cx="56" cy="58" r="26" fill="#7A0B1C"/>
    <circle cx="56" cy="58" r="17" fill="#5A0714" stroke="#F7931E" stroke-width="2"/>
    <path d="M62 38 46 62h10l-5 16 18-26H59z" fill="#F7931E" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="58" cy="22" r="7" fill="#7A0B1C"/><rect x="52" y="28" width="14" height="14" rx="4" fill="#7A0B1C"/>
  </svg>`;
}
$('#brandLogo').innerHTML = logo(44);

const siteBase = () => (CONFIG.SITE_URL || (location.origin + location.pathname)).split('#')[0];
const orderLink = o => siteBase() + '#/p/' + o.id;
const phoneWa = p => { let d = String(p).replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.startsWith('0')) d = '593' + d.slice(1); return d; };
const waUrl = (phone, text) => `https://wa.me/${phoneWa(phone)}?text=${encodeURIComponent(text)}`;

/* ---------- Almacenamiento compartido (Firebase REST o demo local) ---------- */
const Store = (() => {
  const url = (CONFIG.FIREBASE_URL || '').replace(/\/$/, '');
  let db = { orders: {}, drivers: {} }, last = '', loaded = false, syncedAt = 0;
  const subs = [];
  const norm = d => ({ orders: (d && d.orders) || {}, drivers: (d && d.drivers) || {} });
  const emit = () => subs.forEach(f => f());
  const readLocal = () => norm(JSON.parse(localStorage.getItem('goflash_db') || '{}'));
  const saveLocal = () => localStorage.setItem('goflash_db', JSON.stringify(db));
  const finish = () => {
    loaded = true; syncedAt = Date.now();
    const s = JSON.stringify(db); if (s !== last) { last = s; emit(); }
  };
  let error = '';
  const setError = msg => { if (msg !== error) { error = msg; emit(); } };
  const explain = status => status === 401 || status === 403
    ? '🔒 Firebase rechazó el acceso. Publica las reglas del README en Realtime Database → Reglas.'
    : status === 404
      ? '🔎 No se encontró la base de datos. Revisa que FIREBASE_URL en config.js sea la dirección completa de tu Realtime Database.'
      : '📡 No se pudo conectar con Firebase (error ' + status + '). Revisa FIREBASE_URL en config.js y tu internet.';
  // Pide a Firebase; devuelve el JSON o null si falló (y deja un aviso visible)
  async function ask(method, path, body) {
    try {
      const r = await fetch(`${url}/goflash${path}.json`, { method, cache: 'no-store', body: body === undefined ? undefined : JSON.stringify(body) });
      if (!r.ok) { setError(explain(r.status)); return null; }
      setError('');
      return { data: await r.json() };
    } catch (e) { setError(explain(0)); return null; }
  }
  async function load() {          // admin y motorizados: todo
    if (url) { const r = await ask('GET', ''); if (!r) return; db = norm(r.data); }
    else { try { db = readLocal(); } catch { return; } }
    finish();
  }
  async function loadOne(id) {     // cliente: solo su pedido
    if (url) { const r = await ask('GET', `/orders/${encodeURIComponent(id)}`); if (!r) return; db = { orders: r.data ? { [id]: r.data } : {}, drivers: {} }; }
    else { try { db = readLocal(); } catch { return; } }
    finish();
  }
  async function send(method, path, body) {
    if (!url) return saveLocal();
    const r = await ask(method, '/' + path, body);
    if (!r) toast('⚠️ No se guardó en Firebase. Mira el aviso rojo de arriba.');
  }
  const touch = () => { last = JSON.stringify(db); emit(); };
  return {
    load, loadOne, isRemote: !!url,
    get error() { return error; },
    get loaded() { return loaded; }, get syncedAt() { return syncedAt; },
    onChange: f => subs.push(f),
    orders: () => Object.values(db.orders).sort((a, b) => (b.t0 || 0) - (a.t0 || 0)),
    drivers: () => Object.values(db.drivers).sort((a, b) => a.name.localeCompare(b.name)),
    order: id => db.orders[id], driver: id => db.drivers[id],
    put(kind, obj) { db[kind][obj.id] = obj; touch(); return send('PUT', `${kind}/${obj.id}`, obj); },
    patch(kind, id, fields) { db[kind][id] = { ...db[kind][id], ...fields }; touch(); return send('PATCH', `${kind}/${id}`, fields); },
    del(kind, id) { delete db[kind][id]; touch(); return send('DELETE', `${kind}/${id}`); },
  };
})();

/* ---------- Lógica ---------- */
const newCode = () => 'GF-' + Math.floor(1000 + Math.random() * 9000);
const advance = (o, by) => {
  if (o.step >= LAST) return;
  const n = o.step + 1;
  return Store.patch('orders', o.id, { step: n, ['t' + n]: Date.now(), ['b' + n]: by });
};
const session = {
  get driver() { return localStorage.getItem('gf_driver'); }, set driver(v) { v ? localStorage.setItem('gf_driver', v) : localStorage.removeItem('gf_driver'); },
  get admin() { return sessionStorage.getItem('gf_admin') === '1'; }, set admin(v) { v ? sessionStorage.setItem('gf_admin', '1') : sessionStorage.removeItem('gf_admin'); },
};

/* ---------- Vistas ---------- */
function viewHome() {
  return `
  <section class="hero">
    <div class="logo-big">${logo(130)}</div>
    <h1>Tu pedido, <span style="color:#000">a la velocidad del rayo</span> ⚡</h1>
    <p>Sigue cada paso de tu pedido en vivo: desde que lo recibimos hasta que llega a tu puerta.</p>
  </section>
  <div class="grid g3">
    <div class="card"><h2>📦 ¿Eres cliente?</h2>
      <p class="muted" style="margin-top:6px">No necesitas registrarte. Abre el <b>enlace que te enviamos por WhatsApp</b>: se actualiza solo, en vivo.</p></div>
    <a class="role" href="#/moto"><span class="ico">🏍️</span><h3>Soy motorizado</h3><p>Reporta el avance de tus pedidos</p></a>
    <a class="role" href="#/admin"><span class="ico">📊</span><h3>Administrador</h3><p>Asigna y controla todos los pedidos</p></a>
  </div>`;
}

function trackCard(o) {
  const pct = (o.step / LAST) * 100, done = o.step === LAST, st = STATES[o.step];
  return `
  <div class="card" id="trackCard">
    <div class="track-head">
      <div><div class="order-no">PEDIDO #${esc(o.code)}</div><h2>${esc(o.detail || 'Tu pedido')}</h2>
        <div class="muted">Para: ${esc(o.client)}</div></div>
      <div style="text-align:right"><span class="badge ${done ? 'done' : ''}">${done ? 'ENTREGADO' : 'EN PROCESO'}</span>${done ? '' : '<br><span class="live" style="margin-top:8px">EN VIVO</span>'}</div>
    </div>
    ${o['t' + o.step] ? `<span class="updated">🕒 Último reporte: ${hm(o['t' + o.step])}</span>` : ''}
    <div class="bar">
      <div class="fill" style="width:${pct}%"></div>
      <div class="bike" style="left:${pct}%">${done ? '🎉' : '🏍️'}</div>
      <div class="dots">${STATES.map((_, i) => `<i class="${i <= o.step ? 'on' : ''}"></i>`).join('')}</div>
    </div>
    <ul class="timeline">
      ${STATES.map((s, i) => `<li class="${i < o.step ? 'done' : i === o.step ? 'current' : ''}">
        <span class="ic">${i < o.step ? '✔️' : s.icon}</span>
        <div><b>${s.label}</b><small>${o['t' + i] ? hm(o['t' + i]) + ' · ' : ''}${s.hint}</small></div></li>`).join('')}
    </ul>
    ${done ? `<div class="success">🎉 ¡Pedido entregado con éxito! Gracias por elegir Go Flash.</div>` : `
    <div class="eta"><div><small>Tu motorizado</small><b>${esc(o.driverName || 'Asignando…')}</b></div>
      <div><small>Estado actual</small><b>${st.icon} ${st.label}</b></div></div>`}
  </div>`;
}

let seenStep = null, seenId = null;
function viewClient(id) {
  const o = Store.order(id);
  if (!o) return Store.loaded
    ? `<div class="card empty">😕 No encontramos este pedido. Revisa el enlace que te enviamos.</div>`
    : `<div class="card empty">⚡ Buscando tu pedido…</div>`;
  const changed = seenId === id && seenStep !== null && seenStep !== o.step;
  setTimeout(() => {
    if (changed) { toast(`${STATES[o.step].icon} ${STATES[o.step].label}`); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch {} const c = $('#trackCard'); c && c.classList.add('flash'); }
  }, 0);
  seenId = id; seenStep = o.step;
  return trackCard(o) + `<p class="muted" style="text-align:center;margin-top:10px">Se actualiza solo · última revisión ${hms(Store.syncedAt || Date.now())}</p>`;
}

function viewDriver() {
  const me = Store.driver(session.driver);
  if (!me) {
    const list = Store.drivers();
    return `
    <h1 style="margin-bottom:14px">🏍️ Zona motorizados</h1>
    <div class="grid g2">
      ${list.length ? `<div class="card"><h2>Ya estoy registrado</h2>
        <form id="pickForm"><label>Elige tu nombre</label>
        <select name="id" required>${list.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select>
        <button class="btn block" style="margin-top:16px">Entrar</button></form></div>` : ''}
      <div class="card"><h2>Registrarme</h2>
        <form id="regForm"><label>Tu nombre</label><input name="name" required maxlength="40" placeholder="Ej: Carlos Pérez" autocomplete="name">
        <label>Placa de la moto (opcional)</label><input name="plate" maxlength="10" placeholder="ABC-123" style="text-transform:uppercase">
        <button class="btn orange block" style="margin-top:16px">⚡ Crear mi cuenta</button></form></div>
    </div>`;
  }
  const all = Store.orders().filter(o => o.driverId === me.id);
  const mine = all.filter(o => o.step < LAST), done = all.filter(o => o.step === LAST);
  const card = o => `
    <div class="order-card">
      <div class="row" style="justify-content:space-between"><h3>#${esc(o.code)} · ${esc(o.detail)}</h3><span class="badge">${STATES[o.step].icon} ${STATES[o.step].label}</span></div>
      <div class="muted">👤 ${esc(o.client)} · 📞 ${esc(o.phone)}<br>📍 ${esc(o.address)}</div>
      <div class="mini">${STATES.map((_, i) => `<span class="${i <= o.step ? 'on' : ''}"></span>`).join('')}</div>
      <button class="btn orange next" data-adv="${o.id}">➡️ Reportar: ${STATES[o.step + 1].icon} ${STATES[o.step + 1].label}</button>
    </div>`;
  return `
  <div class="row" style="justify-content:space-between;margin-bottom:14px">
    <h1>Hola, ${esc(me.name.split(' ')[0])} 👋</h1><div><span class="live">EN VIVO</span> <button class="btn ghost sm" id="logout">Salir</button></div></div>
  <div class="card"><h2>🔥 Pedidos asignados a ti (${mine.length})</h2>
    ${mine.map(card).join('') || '<div class="empty">Esperando que el administrador te asigne un pedido… 🛵<br><small>Aparecerá aquí automáticamente.</small></div>'}</div>
  <div class="card"><h2>✅ Entregados (${done.length})</h2>
    ${done.slice(0, 8).map(o => `<div class="muted" style="padding:6px 0">#${esc(o.code)} · ${esc(o.client)} · ${hm(o['t' + LAST])}</div>`).join('') || '<div class="empty">Aún no has entregado pedidos</div>'}</div>`;
}

function viewAdmin() {
  if (!session.admin) return `
  <h1 style="margin-bottom:14px">📊 Panel de administrador</h1>
  <div class="card" style="max-width:420px;margin:auto"><form id="adminForm">
    <label>PIN de administrador</label><input name="pin" type="password" required autofocus>
    <button class="btn block" style="margin-top:16px">Entrar</button></form></div>`;
  const orders = Store.orders(), drivers = Store.drivers();
  const active = orders.filter(o => o.step < LAST).length, done = orders.length - active;
  const feed = orders.flatMap(o => STATES.map((_, i) => o['t' + i] ? { at: o['t' + i], by: o['b' + i] || 'Admin', o, step: i } : null).filter(Boolean))
    .sort((a, b) => b.at - a.at).slice(0, 25);
  const opts = (sel) => drivers.map(d => `<option value="${d.id}" ${d.id === sel ? 'selected' : ''}>${esc(d.name)}</option>`).join('');
  return `
  <div class="row" style="justify-content:space-between;margin-bottom:14px">
    <h1>📊 Panel Go Flash</h1>
    <div><span class="mode">${Store.isRemote ? '🌐 EN LÍNEA' : '🧪 MODO DEMO'}</span> <span class="live">EN VIVO</span> <button class="btn ghost sm" id="logout">Salir</button></div></div>
  ${Store.isRemote ? '' : '<div class="note" style="margin:0 0 14px">🧪 <b>Modo demo:</b> los datos solo se comparten dentro de este mismo navegador. Para verlo en vivo entre celulares conecta Firebase (ver README).</div>'}
  <div class="grid g3" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
    <div class="stat"><b>${orders.length}</b><span>Pedidos</span></div>
    <div class="stat"><b>${active}</b><span>En proceso</span></div>
    <div class="stat"><b>${done}</b><span>Entregados</span></div>
    <div class="stat"><b>${drivers.length}</b><span>Motorizados</span></div></div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card"><h2>➕ Nuevo pedido</h2>
      <form id="newOrder">
        <label>Cliente</label><input name="client" required>
        <label>WhatsApp del cliente</label><input name="phone" inputmode="tel" required placeholder="09XXXXXXXX">
        <label>Dirección de entrega</label><input name="address" required>
        <label>Pedido (qué compran / dónde)</label><input name="detail" required placeholder="Ej: Spicy Zinger Combo – KFC">
        <label>Motorizado asignado</label>
        <select name="driverId" required><option value="">— Elige un motorizado —</option>${opts('')}</select>
        ${drivers.length ? '' : '<p class="muted" style="margin-top:6px">Aún no hay motorizados registrados. Pídeles que se registren en la sección Motorizados.</p>'}
        <button class="btn wa block" style="margin-top:16px">📲 Crear y enviar enlace por WhatsApp</button></form></div>
    <div class="card"><h2>📡 Reportes en vivo</h2>
      <ul class="feed">${feed.map(f => `<li><time>${hm(f.at)}</time><b>${esc(f.by)}</b> · #${esc(f.o.code)}: ${STATES[f.step].icon} ${STATES[f.step].label}</li>`).join('') || '<li class="empty">Sin reportes todavía</li>'}</ul></div>
  </div>
  <div class="card"><div class="row" style="justify-content:space-between"><h2>📋 Todos los pedidos</h2>
    <button class="btn ghost sm" id="clean">🧹 Limpiar entregados</button></div><div class="tablewrap"><table>
    <tr><th>Código</th><th>Cliente</th><th>Pedido</th><th>Estado</th><th>Motorizado</th><th></th></tr>
    ${orders.map(o => `<tr>
      <td><b>${esc(o.code)}</b></td><td>${esc(o.client)}<br><span class="muted">${esc(o.phone)}</span></td><td>${esc(o.detail)}</td>
      <td><span class="badge ${o.step === LAST ? 'done' : ''}">${STATES[o.step].icon} ${STATES[o.step].label}</span></td>
      <td><select data-assign="${o.id}">${opts(o.driverId)}</select></td>
      <td style="white-space:nowrap"><button class="btn sm wa" data-wa="${o.id}" title="Enviar enlace por WhatsApp">📲</button> <button class="btn sm" data-copy="${o.id}" title="Copiar enlace">🔗</button> <button class="btn sm ghost" data-del="${o.id}" title="Eliminar">🗑️</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Crea tu primer pedido</td></tr>'}
  </table></div></div>
  <div class="card"><h2>🏍️ Motorizados registrados</h2>
    ${drivers.map(d => `<div class="row" style="padding:6px 0;justify-content:space-between"><span class="muted">• <b>${esc(d.name)}</b> ${d.plate ? '· ' + esc(d.plate) : ''}</span><button class="btn sm ghost" style="flex:0" data-deldriver="${d.id}">Quitar</button></div>`).join('') || '<div class="empty">Nadie se ha registrado aún</div>'}</div>`;
}

/* ---------- Router ---------- */
const route = () => { const [, page = '', arg = ''] = location.hash.split('/'); return { page, arg: decodeURIComponent(arg) }; };
function render(force) {
  const a = document.activeElement;
  if (!force && a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && $('#app').contains(a)) return;
  const { page, arg } = route();
  document.querySelectorAll('.topbar nav a').forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#/' + page));
  const banner = Store.error ? `<div class="note" style="margin:0 0 14px;background:#fde0e3;border-color:#c0112b;color:#8a0f22"><b>⚠️ Problema con la base de datos</b><br>${esc(Store.error)}</div>` : '';
  $('#app').innerHTML = banner + (page === 'p' ? viewClient(arg) : page === 'moto' ? viewDriver() : page === 'admin' ? viewAdmin() : viewHome());
}
const tick = () => { const { page, arg } = route(); return page === 'p' ? Store.loadOne(arg) : Store.load(); };
window.addEventListener('hashchange', () => { seenStep = seenId = null; render(true); window.scrollTo(0, 0); tick(); });
Store.onChange(() => render());
setInterval(tick, Store.isRemote ? 3000 : 1500);
document.addEventListener('visibilitychange', () => !document.hidden && tick());

const msgClient = o => `⚡ *Go Flash Delivery*\nHola ${o.client}, recibimos tu pedido *#${o.code}* 🎉\nSíguelo en vivo aquí 👇\n${orderLink(o)}`;

/* ---------- Eventos ---------- */
document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, v = Object.fromEntries(new FormData(f));
  if (f.id === 'regForm') {
    const name = v.name.trim();
    if (Store.drivers().some(d => d.name.toLowerCase() === name.toLowerCase())) return toast('Ese nombre ya existe, elígelo en "Ya estoy registrado"');
    const d = { id: rid(), name, plate: (v.plate || '').toUpperCase().trim() };
    await Store.put('drivers', d); session.driver = d.id; toast('¡Bienvenido a Go Flash! 🏍️'); render(true);
  }
  if (f.id === 'pickForm') { session.driver = v.id; render(true); }
  if (f.id === 'adminForm') {
    if (v.pin !== (CONFIG.ADMIN_PIN || '1234')) return toast('PIN incorrecto');
    session.admin = true; render(true); tick();
  }
  if (f.id === 'newOrder') {
    const dr = Store.driver(v.driverId); if (!dr) return toast('Elige un motorizado');
    const codes = Store.orders().map(o => o.code); let code; do { code = newCode(); } while (codes.includes(code));
    const o = { id: rid(), code, client: v.client.trim(), phone: v.phone.trim(), address: v.address.trim(), detail: v.detail.trim(),
      driverId: dr.id, driverName: dr.name, step: 0, t0: Date.now(), b0: 'Admin' };
    window.open(waUrl(o.phone, msgClient(o)), '_blank');   // se abre WhatsApp con el enlace único
    await Store.put('orders', o); render(true); toast('Pedido ' + code + ' creado ⚡');
  }
});

document.addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.id === 'logout') { session.driver = null; session.admin = false; render(true); }
  if (t.dataset.adv) {
    const o = Store.order(t.dataset.adv), me = Store.driver(session.driver); if (!o || !me) return;
    toast(STATES[o.step + 1].icon + ' ' + STATES[o.step + 1].label + ' ✔️');
    await advance(o, me.name);
  }
  if (t.dataset.wa) { const o = Store.order(t.dataset.wa); window.open(waUrl(o.phone, msgClient(o)), '_blank'); }
  if (t.dataset.copy) {
    const link = orderLink(Store.order(t.dataset.copy));
    try { await navigator.clipboard.writeText(link); toast('Enlace copiado 🔗'); } catch { prompt('Copia el enlace:', link); }
  }
  if (t.dataset.del && confirm('¿Eliminar este pedido?')) Store.del('orders', t.dataset.del);
  if (t.dataset.deldriver && confirm('¿Quitar a este motorizado?')) Store.del('drivers', t.dataset.deldriver);
  if (t.id === 'clean') {
    const dn = Store.orders().filter(o => o.step === LAST);
    if (dn.length && confirm(`¿Borrar ${dn.length} pedido(s) entregado(s)?`)) { dn.forEach(o => Store.del('orders', o.id)); toast('Entregados eliminados 🧹'); }
  }
});
document.addEventListener('change', e => {
  const s = e.target.closest('[data-assign]'); if (!s) return;
  const d = Store.driver(s.value); if (!d) return;
  Store.patch('orders', s.dataset.assign, { driverId: d.id, driverName: d.name }); toast('Motorizado actualizado');
});

tick().then(() => render(true));
render(true);
