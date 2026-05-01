/**

- LEXORD® CLOUDFLARE WORKER v2.0
- 
- KV-Namespaces benötigt: ORDERS_KV, USERS_KV, SESSIONS_KV
- Environment Variable: ADMIN_CODE = “DEIN_GEHEIMER_CODE”
  */

const SESSION_DURATION_MS = 1000 * 60 * 60 * 12;

export default {
async fetch(request, env) {
const url = new URL(request.url);
const path = url.pathname;
const method = request.method;

```
if (method === "OPTIONS") return cors(new Response(null, { status: 204 }));

try {
  if (path === "/" || path === "") return cors(new Response(infoPage(), { headers: { "content-type": "text/html;charset=utf-8" } }));

  if (path === "/order" && method === "POST") return cors(await saveOrder(request, env));
  if (path === "/repair" && method === "POST") return cors(await saveRepair(request, env));

  if (path === "/admin/login" && method === "POST") return cors(await adminLogin(request, env));
  if (path === "/admin/logout" && method === "POST") return cors(await adminLogout(request, env));
  if (path === "/admin/orders" && method === "GET") return cors(await adminGetOrders(request, env));
  if (path === "/admin/repairs" && method === "GET") return cors(await adminGetRepairs(request, env));
  if (path === "/admin/users" && method === "GET") return cors(await adminGetUsers(request, env));
  if (path === "/admin/stats" && method === "GET") return cors(await adminGetStats(request, env));

  if (path === "/user/register" && method === "POST") return cors(await userRegister(request, env));
  if (path === "/user/login" && method === "POST") return cors(await userLogin(request, env));
  if (path === "/user/orders" && method === "GET") return cors(await userGetOrders(request, env));

  return cors(json({ error: "Not Found" }, 404));
} catch (e) {
  return cors(json({ error: e.message || "Server Error" }, 500));
}
```

}
};

function cors(resp) {
resp.headers.set(“Access-Control-Allow-Origin”, “*”);
resp.headers.set(“Access-Control-Allow-Methods”, “GET, POST, OPTIONS”);
resp.headers.set(“Access-Control-Allow-Headers”, “Content-Type, Authorization”);
return resp;
}
function json(d, s = 200) { return new Response(JSON.stringify(d), { status: s, headers: { “content-type”: “application/json;charset=utf-8” } }); }
async function hashPassword(pw) {
const data = new TextEncoder().encode(pw + “_lxrd_2026_salt”);
const buf = await crypto.subtle.digest(“SHA-256”, data);
return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, “0”)).join(””);
}
function genToken() {
const b = new Uint8Array(32); crypto.getRandomValues(b);
return Array.from(b).map(x => x.toString(16).padStart(2, “0”)).join(””);
}
async function getAdmin(req, env) {
const t = (req.headers.get(“Authorization”) || “”).replace(/^Bearer\s+/i, “”);
if (!t) return null;
const r = await env.SESSIONS_KV.get(“admin:” + t);
if (!r) return null;
const s = JSON.parse(r);
if (s.exp < Date.now()) { await env.SESSIONS_KV.delete(“admin:” + t); return null; }
return s;
}
async function getUser(req, env) {
const t = (req.headers.get(“Authorization”) || “”).replace(/^Bearer\s+/i, “”);
if (!t) return null;
const r = await env.SESSIONS_KV.get(“user:” + t);
if (!r) return null;
const s = JSON.parse(r);
if (s.exp < Date.now()) { await env.SESSIONS_KV.delete(“user:” + t); return null; }
return s;
}

async function saveOrder(request, env) {
const b = await request.json();
const orderNr = b.orderNr || (“LXRD-” + Date.now().toString().slice(-6));
const o = {
orderNr, date: b.date || new Date().toISOString(),
name: b.name || “Kunde”, email: (b.email || “”).toLowerCase(),
items: Array.isArray(b.items) ? b.items : [],
total: parseFloat(b.total) || 0, land: b.land || “DE”,
payment: b.payment || “PayPal”, status: “NEU”,
config: b.config || null, address: b.address || null
};
await env.ORDERS_KV.put(“order:” + Date.now() + “:” + orderNr, JSON.stringify(o));
if (o.email) await env.ORDERS_KV.put(“user_order:” + o.email + “:” + Date.now(), JSON.stringify(o));
return json({ success: true, orderNr });
}

async function saveRepair(request, env) {
const b = await request.json();
const repNr = b.repNr || (“REP-” + Date.now().toString().slice(-6));
const r = {
repNr, date: b.date || new Date().toISOString(),
name: b.name || “”, email: (b.email || “”).toLowerCase(),
phone: b.phone || “”, address: b.address || “”,
damage: b.damage || “”, model: b.model || “”,
desc: b.desc || “”, since: b.since || “”,
warranty: b.warranty || “6”, price: b.price || “”, status: “NEU”
};
await env.ORDERS_KV.put(“repair:” + Date.now() + “:” + repNr, JSON.stringify(r));
return json({ success: true, repNr });
}

async function adminLogin(request, env) {
const b = await request.json();
const code = b.code || “”;
const ADMIN_CODE = env.ADMIN_CODE || “LEXORD2026”;
if (code !== ADMIN_CODE) {
await new Promise(r => setTimeout(r, 1000));
return json({ error: “Falscher Code” }, 401);
}
const token = genToken();
await env.SESSIONS_KV.put(“admin:” + token, JSON.stringify({ isAdmin: true, exp: Date.now() + SESSION_DURATION_MS }), { expirationTtl: Math.ceil(SESSION_DURATION_MS / 1000) });
return json({ success: true, token });
}
async function adminLogout(request, env) {
const t = (request.headers.get(“Authorization”) || “”).replace(/^Bearer\s+/i, “”);
if (t) await env.SESSIONS_KV.delete(“admin:” + t);
return json({ success: true });
}
async function adminGetOrders(request, env) {
if (!await getAdmin(request, env)) return json({ error: “Unauthorized” }, 401);
const list = await env.ORDERS_KV.list({ prefix: “order:” });
const orders = [];
for (const k of list.keys) { const r = await env.ORDERS_KV.get(k.name); if (r) try { orders.push(JSON.parse(r)); } catch (e) {} }
orders.sort((a, b) => new Date(b.date) - new Date(a.date));
return json({ success: true, orders });
}
async function adminGetRepairs(request, env) {
if (!await getAdmin(request, env)) return json({ error: “Unauthorized” }, 401);
const list = await env.ORDERS_KV.list({ prefix: “repair:” });
const repairs = [];
for (const k of list.keys) { const r = await env.ORDERS_KV.get(k.name); if (r) try { repairs.push(JSON.parse(r)); } catch (e) {} }
repairs.sort((a, b) => new Date(b.date) - new Date(a.date));
return json({ success: true, repairs });
}
async function adminGetUsers(request, env) {
if (!await getAdmin(request, env)) return json({ error: “Unauthorized” }, 401);
const list = await env.USERS_KV.list({ prefix: “user:” });
const users = [];
for (const k of list.keys) { const r = await env.USERS_KV.get(k.name); if (r) try { const u = JSON.parse(r); delete u.pw; users.push(u); } catch (e) {} }
return json({ success: true, users });
}
async function adminGetStats(request, env) {
if (!await getAdmin(request, env)) return json({ error: “Unauthorized” }, 401);
const list = await env.ORDERS_KV.list({ prefix: “order:” });
let revenue = 0, count = 0, monthCount = 0;
const customers = new Set();
const now = new Date();
for (const k of list.keys) {
const raw = await env.ORDERS_KV.get(k.name);
if (raw) try {
const o = JSON.parse(raw);
revenue += parseFloat(o.total) || 0; count++;
if (o.email) customers.add(o.email);
const d = new Date(o.date);
if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) monthCount++;
} catch (e) {}
}
return json({ success: true, stats: { orders: count, revenue, customers: customers.size, thisMonth: monthCount } });
}

async function userRegister(request, env) {
const b = await request.json();
const name = (b.name || “”).trim();
const email = (b.email || “”).trim().toLowerCase();
const pw = b.pw || “”;
if (!name || !email || !pw) return json({ error: “Alle Felder ausfüllen” }, 400);
if (!email.includes(”@”)) return json({ error: “Ungültige E-Mail” }, 400);
if (pw.length < 6) return json({ error: “Passwort min. 6 Zeichen” }, 400);
if (await env.USERS_KV.get(“user:” + email)) return json({ error: “E-Mail bereits registriert” }, 409);
await env.USERS_KV.put(“user:” + email, JSON.stringify({ name, email, pw: await hashPassword(pw), created: Date.now() }));
return json({ success: true });
}
async function userLogin(request, env) {
const b = await request.json();
const email = (b.email || “”).trim().toLowerCase();
const pw = b.pw || “”;
if (!email || !pw) return json({ error: “E-Mail & Passwort erforderlich” }, 400);
const r = await env.USERS_KV.get(“user:” + email);
if (!r) { await new Promise(r => setTimeout(r, 800)); return json({ error: “Falsche Zugangsdaten” }, 401); }
const u = JSON.parse(r);
if (u.pw !== await hashPassword(pw)) { await new Promise(r => setTimeout(r, 800)); return json({ error: “Falsche Zugangsdaten” }, 401); }
const token = genToken();
await env.SESSIONS_KV.put(“user:” + token, JSON.stringify({ email: u.email, name: u.name, exp: Date.now() + SESSION_DURATION_MS }), { expirationTtl: Math.ceil(SESSION_DURATION_MS / 1000) });
return json({ success: true, token, name: u.name, email: u.email });
}
async function userGetOrders(request, env) {
const s = await getUser(request, env);
if (!s) return json({ error: “Unauthorized” }, 401);
const list = await env.ORDERS_KV.list({ prefix: “user_order:” + s.email + “:” });
const orders = [];
for (const k of list.keys) { const r = await env.ORDERS_KV.get(k.name); if (r) try { orders.push(JSON.parse(r)); } catch (e) {} }
orders.sort((a, b) => new Date(b.date) - new Date(a.date));
return json({ success: true, orders });
}

function infoPage() {
return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>LEXORD Worker</title>

<style>body{background:#000;color:#0ff;font-family:monospace;padding:40px;line-height:1.7}h1{color:#fff;letter-spacing:5px}</style>

</head><body><h1>LEXORD® WORKER v2.0</h1><div style="color:#0f0">✓ Online</div>
<pre>POST /order · /repair
POST /admin/login · /admin/logout
GET  /admin/orders · /admin/repairs · /admin/users · /admin/stats
POST /user/register · /user/login
GET  /user/orders</pre></body></html>`;
}
