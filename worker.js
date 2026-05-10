// LEXORD Cloudflare Worker - Email via Brevo + Backend
// 100% ASCII-safe for copy-paste
//
// Brevo: 300 emails/day FREE forever (no credit card)
// Worker runs on Cloudflare, sends via Brevo API
//
// SETUP:
// 1. Brevo Account: https://www.brevo.com -> Sign up free
// 2. Get API key: SMTP & API -> API Keys -> Generate
// 3. Verify sender domain: Senders, Domains -> Add lexord.de
// 4. Replace this code in Cloudflare Worker
// 5. Add Secrets in Worker Settings:
//    - BREVO_API_KEY = xkeysib-xxxxx
//    - ADMIN_PASSWORD = your-password
//    - JWT_SECRET = random-string-32+chars
//    - FROM_EMAIL = Kontakt@lexord.de
// 6. KV binding: LEXORD_DATA -> LEXORD_DATA

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};

const ADMIN_EMAIL = "Kontakt@Lexord.de";

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/" || path === "") {
        return json({ ok: true, service: "LEXORD API", version: "3.0", email: "brevo" });
      }
      if (path === "/api/send-email" && request.method === "POST") {
        return await sendEmail(request, env);
      }
      if (path === "/api/order" && request.method === "POST") {
        return await saveOrder(request, env);
      }
      if (path === "/api/repair" && request.method === "POST") {
        return await saveRepair(request, env);
      }
      if (path === "/api/customer/login" && request.method === "POST") {
        return await customerLogin(request, env);
      }
      if (path === "/api/admin/login" && request.method === "POST") {
        return await adminLogin(request, env);
      }
      if (path === "/api/admin/all" && request.method === "GET") {
        return await adminAll(request, env);
      }
      if (path.startsWith("/api/admin/order/") && request.method === "PATCH") {
        const orderNr = path.split("/").pop();
        return await updateOrder(request, env, orderNr);
      }
      return json({ error: "Not found" }, 404);
    } catch (err) {
      return json({ error: String(err.message || err) }, 500);
    }
  }
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}

// EMAIL VIA BREVO API
async function sendEmail(request, env) {
  const body = await request.json();
  const to = body.to;
  const name = body.name;
  const subject = body.subject;
  const html = body.html;
  const replyTo = body.replyTo;
  const fromEmail = env.FROM_EMAIL || ADMIN_EMAIL;

  if (!to || !subject || !html) {
    return json({ error: "Missing to/subject/html" }, 400);
  }

  if (!env.BREVO_API_KEY) {
    return json({ success: false, error: "BREVO_API_KEY not configured" }, 500);
  }

  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        sender: { name: "LEXORD Engineering", email: fromEmail },
        to: [{ email: to, name: name || to }],
        replyTo: { email: replyTo || fromEmail },
        subject: subject,
        htmlContent: html
      })
    });

    const result = await r.json();
    if (r.ok && result.messageId) {
      return json({ success: true, via: "brevo", id: result.messageId });
    }
    return json({ success: false, error: result.message || "Brevo error", details: result }, 502);
  } catch (e) {
    return json({ success: false, error: String(e) }, 500);
  }
}

// ORDERS
async function saveOrder(request, env) {
  const o = await request.json();
  if (!o.orderNr || !o.email) {
    return json({ error: "Missing orderNr/email" }, 400);
  }
  o.created = o.created || new Date().toISOString();
  o.status = o.status || "paid";

  await env.LEXORD_DATA.put("order:" + o.orderNr, JSON.stringify(o));
  const emailKey = "byemail:" + o.email.toLowerCase() + ":order:" + o.orderNr;
  await env.LEXORD_DATA.put(emailKey, o.orderNr);
  return json({ success: true, orderNr: o.orderNr });
}

async function saveRepair(request, env) {
  const r = await request.json();
  if (!r.repNr || !r.email) {
    return json({ error: "Missing repNr/email" }, 400);
  }
  r.created = r.created || new Date().toISOString();
  r.status = r.status || "received";

  await env.LEXORD_DATA.put("repair:" + r.repNr, JSON.stringify(r));
  const emailKey = "byemail:" + r.email.toLowerCase() + ":repair:" + r.repNr;
  await env.LEXORD_DATA.put(emailKey, r.repNr);
  return json({ success: true, repNr: r.repNr });
}

// CUSTOMER LOGIN
async function customerLogin(request, env) {
  const body = await request.json();
  const email = body.email;
  const ordernr = body.ordernr;

  if (!email || !ordernr) {
    return json({ success: false, error: "Email and number required" }, 400);
  }

  const emailLower = email.toLowerCase().trim();
  const nr = ordernr.toUpperCase().trim();

  let item = await env.LEXORD_DATA.get("order:" + nr);
  if (item) {
    const order = JSON.parse(item);
    if ((order.email || "").toLowerCase() !== emailLower) {
      return json({ success: false, error: "Email does not match" }, 403);
    }
  } else {
    item = await env.LEXORD_DATA.get("repair:" + nr);
    if (item) {
      const rep = JSON.parse(item);
      if ((rep.email || "").toLowerCase() !== emailLower) {
        return json({ success: false, error: "Email does not match" }, 403);
      }
    } else {
      return json({ success: false, error: "Number not found" }, 404);
    }
  }

  const orders = [];
  const repairs = [];

  const orderList = await env.LEXORD_DATA.list({ prefix: "byemail:" + emailLower + ":order:" });
  for (const k of orderList.keys) {
    const orderNr = await env.LEXORD_DATA.get(k.name);
    const o = await env.LEXORD_DATA.get("order:" + orderNr);
    if (o) orders.push(JSON.parse(o));
  }

  const repList = await env.LEXORD_DATA.list({ prefix: "byemail:" + emailLower + ":repair:" });
  for (const k of repList.keys) {
    const repNr = await env.LEXORD_DATA.get(k.name);
    const rr = await env.LEXORD_DATA.get("repair:" + repNr);
    if (rr) repairs.push(JSON.parse(rr));
  }

  orders.sort((a, b) => new Date(b.created) - new Date(a.created));
  repairs.sort((a, b) => new Date(b.created) - new Date(a.created));

  const token = btoa(emailLower + ":" + Date.now());
  return json({ success: true, token, orders, repairs });
}

// ADMIN
async function adminLogin(request, env) {
  const body = await request.json();
  const password = body.password;
  if (!password || password !== env.ADMIN_PASSWORD) {
    return json({ success: false, error: "Wrong password" }, 401);
  }
  const token = btoa("admin:" + Date.now() + ":" + (env.JWT_SECRET || "x").slice(0, 8));
  return json({ success: true, token });
}

function checkAdmin(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return false;
  try {
    const decoded = atob(token);
    return decoded.startsWith("admin:");
  } catch (e) {
    return false;
  }
}

async function adminAll(request, env) {
  if (!checkAdmin(request, env)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const orders = [];
  const repairs = [];
  const customersMap = {};

  const orderList = await env.LEXORD_DATA.list({ prefix: "order:" });
  for (const k of orderList.keys) {
    const o = await env.LEXORD_DATA.get(k.name);
    if (o) {
      const order = JSON.parse(o);
      orders.push(order);
      const em = (order.email || "").toLowerCase();
      if (em) {
        if (!customersMap[em]) {
          customersMap[em] = { email: em, name: order.name || "", orderCount: 0, totalSpent: 0, lastActive: order.created };
        }
        customersMap[em].orderCount++;
        customersMap[em].totalSpent += (order.total || 0);
        if (new Date(order.created) > new Date(customersMap[em].lastActive)) {
          customersMap[em].lastActive = order.created;
        }
      }
    }
  }

  const repList = await env.LEXORD_DATA.list({ prefix: "repair:" });
  for (const k of repList.keys) {
    const r = await env.LEXORD_DATA.get(k.name);
    if (r) repairs.push(JSON.parse(r));
  }

  orders.sort((a, b) => new Date(b.created) - new Date(a.created));
  repairs.sort((a, b) => new Date(b.created) - new Date(a.created));

  const customers = Object.values(customersMap).sort((a, b) => b.totalSpent - a.totalSpent);
  return json({ orders, repairs, customers });
}

async function updateOrder(request, env, orderNr) {
  if (!checkAdmin(request, env)) {
    return json({ error: "Unauthorized" }, 401);
  }
  const body = await request.json();
  const existing = await env.LEXORD_DATA.get("order:" + orderNr);
  if (!existing) return json({ error: "Not found" }, 404);

  const order = JSON.parse(existing);
  if (body.status) order.status = body.status;
  if (body.tracking) order.tracking = body.tracking;
  order.updated = new Date().toISOString();

  await env.LEXORD_DATA.put("order:" + orderNr, JSON.stringify(order));

  // Send shipped email via Brevo
  if (body.status === "shipped" && order.email && env.BREVO_API_KEY) {
    const trackUrl = body.tracking
      ? "https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=" + body.tracking
      : "";
    const html = "<p>Hallo " + (order.name || "") + ",</p>"
      + "<p>deine Bestellung <strong>" + orderNr + "</strong> wurde versendet.</p>"
      + (body.tracking ? "<p>DHL Tracking: <strong>" + body.tracking + "</strong></p>"
        + "<p><a href=\"" + trackUrl + "\">Sendung verfolgen</a></p>" : "")
      + "<p>Lieferzeit ca. 1-3 Werktage.</p><p>LEXORD Engineering</p>";

    try {
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": env.BREVO_API_KEY,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          sender: { name: "LEXORD Engineering", email: env.FROM_EMAIL || ADMIN_EMAIL },
          to: [{ email: order.email, name: order.name || "Kunde" }],
          subject: "Versandbestaetigung " + orderNr,
          htmlContent: html
        })
      });
    } catch (e) { /* ignore */ }
  }

  return json({ success: true });
}
