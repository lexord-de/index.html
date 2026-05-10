// LEXORD Cloudflare Worker v3.0 - Brevo Email + KV Backend
// 100% ASCII-safe for drag&drop upload
//
// REQUIRED Cloudflare Setup:
// - KV Namespace Binding: LEXORD_DATA -> bind to LEXORD_DATA
// - Secret: BREVO_API_KEY = xkeysib-xxx (from brevo.com)
// - Secret: ADMIN_PASSWORD = your-admin-password
// - Secret: JWT_SECRET = any 32+ char random string
// - Secret: FROM_EMAIL = Kontakt@Lexord.de

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};

const ADMIN_EMAIL = "Kontakt@Lexord.de";

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Status / Healthcheck
      if (path === "/" || path === "") {
        return json({
          ok: true,
          service: "LEXORD API",
          version: "3.0",
          email: "brevo",
          config: {
            kv: !!env.LEXORD_DATA,
            brevo: !!env.BREVO_API_KEY,
            admin: !!env.ADMIN_PASSWORD,
            jwt: !!env.JWT_SECRET,
            from: !!env.FROM_EMAIL
          }
        });
      }

      // Diagnostic endpoint - tells you what's missing
      if (path === "/api/test-email") {
        // Direct test email - bypass everything, simplest possible test
        if (!env.BREVO_API_KEY) return json({ ok: false, error: "BREVO_API_KEY not set" });
        try {
          const r = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
              sender: { name: "LEXORD Test", email: env.FROM_EMAIL || "Kontakt@Lexord.de" },
              to: [{ email: env.FROM_EMAIL || "Kontakt@Lexord.de", name: "LEXORD Test" }],
              subject: "TEST EMAIL - LEXORD Worker " + new Date().toISOString(),
              htmlContent: "<h1>Test Email funktioniert!</h1><p>Wenn du diese Email siehst, sendet der Cloudflare Worker via Brevo korrekt.</p><p>Zeitpunkt: " + new Date().toISOString() + "</p>"
            })
          });
          const result = await r.json().catch(() => ({}));
          return json({
            ok: r.ok,
            status: r.status,
            brevo_response: result,
            sent_to: env.FROM_EMAIL || "Kontakt@Lexord.de",
            sent_from: env.FROM_EMAIL || "Kontakt@Lexord.de",
            help: r.ok ? "Email wurde an Brevo uebergeben. Pruefe Posteingang UND Spam-Ordner bei " + (env.FROM_EMAIL || "Kontakt@Lexord.de") + ". Check Brevo Logs auf app.brevo.com/email/logs" : "Brevo hat Email abgelehnt. Siehe brevo_response.message fuer Grund."
          });
        } catch (e) {
          return json({ ok: false, error: String(e) });
        }
      }
      if (path === "/api/diag") {
        return json({
          kv_bound: !!env.LEXORD_DATA,
          brevo_key_set: !!env.BREVO_API_KEY,
          admin_pw_set: !!env.ADMIN_PASSWORD,
          jwt_secret_set: !!env.JWT_SECRET,
          from_email_set: !!env.FROM_EMAIL,
          from_email_value: env.FROM_EMAIL || "NOT SET",
          ready: !!(env.LEXORD_DATA && env.BREVO_API_KEY && env.ADMIN_PASSWORD && env.JWT_SECRET && env.FROM_EMAIL)
        });
      }

      if (path === "/api/send-email" && request.method === "POST") return await sendEmail(request, env);
      if (path === "/api/order" && request.method === "POST") return await saveOrder(request, env);
      if (path === "/api/repair" && request.method === "POST") return await saveRepair(request, env);
      if (path === "/api/customer/login" && request.method === "POST") return await customerLogin(request, env);
      if (path === "/api/admin/login" && request.method === "POST") return await adminLogin(request, env);
      if (path === "/api/admin/all" && request.method === "GET") return await adminAll(request, env);
      if (path === "/api/admin/test-data" && request.method === "POST") return await adminTestData(request, env);
      if (path.startsWith("/api/admin/repair/") && request.method === "PATCH") {
        const repNr = path.split("/").pop();
        return await updateRepair(request, env, repNr);
      }
      if (path.startsWith("/api/admin/order/") && request.method === "PATCH") {
        const orderNr = path.split("/").pop();
        return await updateOrder(request, env, orderNr);
      }
      return json({ error: "Not found", path: path }, 404);
    } catch (err) {
      return json({ error: String(err.message || err), stack: err.stack }, 500);
    }
  }
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}

// ============ BREVO EMAIL ============
async function sendEmail(request, env) {
  const body = await request.json();
  const to = body.to;
  const name = body.name;
  const subject = body.subject;
  const html = body.html;
  const replyTo = body.replyTo;
  const fromEmail = env.FROM_EMAIL || ADMIN_EMAIL;

  if (!to || !subject || !html) {
    return json({ success: false, error: "Missing to/subject/html" }, 400);
  }
  if (!env.BREVO_API_KEY) {
    return json({ success: false, error: "BREVO_API_KEY not configured in Worker secrets" }, 500);
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

    const result = await r.json().catch(() => ({}));
    if (r.ok && result.messageId) {
      return json({ success: true, via: "brevo", id: result.messageId });
    }
    return json({
      success: false,
      via: "brevo",
      error: result.message || "Brevo error",
      code: result.code || r.status,
      details: result
    }, r.status >= 500 ? 502 : 400);
  } catch (e) {
    return json({ success: false, error: String(e) }, 500);
  }
}

// ============ ORDERS ============
async function saveOrder(request, env) {
  if (!env.LEXORD_DATA) return json({ error: "KV not bound" }, 500);

  const o = await request.json();
  if (!o.orderNr || !o.email) return json({ error: "Missing orderNr/email" }, 400);

  o.created = o.created || new Date().toISOString();
  o.status = o.status || "paid";

  await env.LEXORD_DATA.put("order:" + o.orderNr, JSON.stringify(o));
  await env.LEXORD_DATA.put("byemail:" + o.email.toLowerCase() + ":order:" + o.orderNr, o.orderNr);

  return json({ success: true, orderNr: o.orderNr });
}

async function saveRepair(request, env) {
  if (!env.LEXORD_DATA) return json({ error: "KV not bound" }, 500);

  const r = await request.json();
  if (!r.repNr || !r.email) return json({ error: "Missing repNr/email" }, 400);

  r.created = r.created || new Date().toISOString();
  r.status = r.status || "received";

  await env.LEXORD_DATA.put("repair:" + r.repNr, JSON.stringify(r));
  await env.LEXORD_DATA.put("byemail:" + r.email.toLowerCase() + ":repair:" + r.repNr, r.repNr);

  return json({ success: true, repNr: r.repNr });
}

// ============ CUSTOMER LOGIN ============
async function customerLogin(request, env) {
  if (!env.LEXORD_DATA) return json({ success: false, error: "Database not configured" }, 500);

  const body = await request.json();
  const email = (body.email || "").toLowerCase().trim();
  const ordernr = (body.ordernr || "").toUpperCase().trim();

  if (!email || !ordernr) {
    return json({ success: false, error: "E-Mail und Nummer erforderlich" }, 400);
  }

  // Try to find as order OR repair
  let item = await env.LEXORD_DATA.get("order:" + ordernr);
  let kind = "order";
  if (!item) {
    item = await env.LEXORD_DATA.get("repair:" + ordernr);
    kind = "repair";
  }

  if (!item) {
    return json({ success: false, error: "Nummer nicht gefunden. Bestellungen beginnen mit LXRD-, Reparaturen mit REP-" }, 404);
  }

  const parsed = JSON.parse(item);
  if ((parsed.email || "").toLowerCase() !== email) {
    return json({ success: false, error: "E-Mail stimmt nicht mit dieser Nummer ueberein" }, 403);
  }

  // Get all orders + repairs for this email
  const orders = [];
  const repairs = [];

  const orderList = await env.LEXORD_DATA.list({ prefix: "byemail:" + email + ":order:" });
  for (const k of orderList.keys) {
    const nr = await env.LEXORD_DATA.get(k.name);
    const o = await env.LEXORD_DATA.get("order:" + nr);
    if (o) orders.push(JSON.parse(o));
  }

  const repList = await env.LEXORD_DATA.list({ prefix: "byemail:" + email + ":repair:" });
  for (const k of repList.keys) {
    const nr = await env.LEXORD_DATA.get(k.name);
    const rr = await env.LEXORD_DATA.get("repair:" + nr);
    if (rr) repairs.push(JSON.parse(rr));
  }

  orders.sort((a, b) => new Date(b.created) - new Date(a.created));
  repairs.sort((a, b) => new Date(b.created) - new Date(a.created));

  const token = btoa(email + ":" + Date.now());
  return json({ success: true, token, orders, repairs });
}

// ============ ADMIN ============
async function adminLogin(request, env) {
  const body = await request.json();
  const password = body.password;

  if (!env.ADMIN_PASSWORD) {
    return json({ success: false, error: "ADMIN_PASSWORD not configured in Worker secrets" }, 500);
  }
  if (!password || password !== env.ADMIN_PASSWORD) {
    return json({ success: false, error: "Falsches Passwort" }, 401);
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
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ error: "KV not bound" }, 500);

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
        if (!customersMap[em]) customersMap[em] = { email: em, name: order.name || "", orderCount: 0, totalSpent: 0, lastActive: order.created };
        customersMap[em].orderCount++;
        customersMap[em].totalSpent += (order.total || 0);
        if (new Date(order.created) > new Date(customersMap[em].lastActive)) customersMap[em].lastActive = order.created;
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

// Insert sample test data so login can be tested before first real order
async function adminTestData(request, env) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ error: "KV not bound" }, 500);

  const testOrder = {
    orderNr: "LXRD-TEST01",
    email: "test@lexord.de",
    name: "Max Mustermann",
    items: [{ name: "LXRD Performance Black", price: 240, qty: 1 }],
    subtotal: 240,
    discount: 0,
    shipping: 0,
    total: 240,
    country: "DE",
    payment: "PayPal",
    status: "shipped",
    tracking: "00340434292135100138",
    created: new Date().toISOString()
  };

  const testRepair = {
    repNr: "REP-TEST01",
    fname: "Anna",
    lname: "Schmidt",
    email: "test@lexord.de",
    phone: "+49 152 1234567",
    addr: "Teststrasse 1",
    zip: "10115",
    city: "Berlin",
    model: "PS5 DualSense",
    damage: "Stick-Drift",
    damageKey: "stick-drift",
    estPrice: "ab 25 EUR",
    desc: "Linker Stick driftet nach rechts.",
    status: "diagnosed",
    created: new Date().toISOString()
  };

  await env.LEXORD_DATA.put("order:" + testOrder.orderNr, JSON.stringify(testOrder));
  await env.LEXORD_DATA.put("byemail:" + testOrder.email.toLowerCase() + ":order:" + testOrder.orderNr, testOrder.orderNr);
  await env.LEXORD_DATA.put("repair:" + testRepair.repNr, JSON.stringify(testRepair));
  await env.LEXORD_DATA.put("byemail:" + testRepair.email.toLowerCase() + ":repair:" + testRepair.repNr, testRepair.repNr);

  return json({
    success: true,
    message: "Test data created. Login with email='test@lexord.de' and ordernr='LXRD-TEST01' or 'REP-TEST01'",
    order: testOrder.orderNr,
    repair: testRepair.repNr
  });
}

async function updateOrder(request, env, orderNr) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ error: "KV not bound" }, 500);

  const body = await request.json();
  const existing = await env.LEXORD_DATA.get("order:" + orderNr);
  if (!existing) return json({ error: "Not found" }, 404);

  const order = JSON.parse(existing);
  if (body.status) order.status = body.status;
  if (body.tracking) order.tracking = body.tracking;
  order.updated = new Date().toISOString();

  await env.LEXORD_DATA.put("order:" + orderNr, JSON.stringify(order));

  // Send shipped notification via Brevo
  if (body.status === "shipped" && order.email && env.BREVO_API_KEY) {
    const trackUrl = body.tracking ? "https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=" + body.tracking : "";
    const html = "<p>Hallo " + (order.name || "") + ",</p>" +
      "<p>deine Bestellung <strong>" + orderNr + "</strong> wurde versendet.</p>" +
      (body.tracking ? "<p>DHL Tracking: <strong>" + body.tracking + "</strong></p><p><a href=\"" + trackUrl + "\">Sendung verfolgen</a></p>" : "") +
      "<p>Lieferzeit ca. 1-3 Werktage.</p><p>LEXORD Engineering</p>";
    try {
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
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

async function updateRepair(request, env, repNr) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ error: "KV not bound" }, 500);

  const body = await request.json();
  const existing = await env.LEXORD_DATA.get("repair:" + repNr);
  if (!existing) return json({ error: "Not found" }, 404);

  const rep = JSON.parse(existing);
  const oldStatus = rep.status;
  if (body.status) rep.status = body.status;
  if (body.note) rep.adminNote = body.note;
  if (body.tracking) rep.tracking = body.tracking;
  if (body.finalPrice) rep.finalPrice = body.finalPrice;
  rep.updated = new Date().toISOString();

  await env.LEXORD_DATA.put("repair:" + repNr, JSON.stringify(rep));

  // Send status email via Brevo
  if (rep.email && env.BREVO_API_KEY && body.status && body.status !== oldStatus) {
    const statusMessages = {
      received: { title: "Reparatur eingegangen", color: "#ffae00", msg: "Wir haben deinen Controller erhalten. Diagnose folgt in 1-2 Werktagen." },
      diagnosed: { title: "Diagnose abgeschlossen", color: "#00f2ff", msg: "Wir haben die Diagnose abgeschlossen und starten jetzt die Reparatur." },
      repaired: { title: "Reparatur abgeschlossen", color: "#00b67a", msg: "Deine Reparatur ist fertig. Wir verpacken den Controller und versenden ihn in den naechsten 24h." },
      completed: { title: "Reparatur abgeschlossen + versendet", color: "#00b67a", msg: "Dein Controller wurde versendet. Lieferzeit ca. 1-3 Werktage." }
    };
    const msg = statusMessages[body.status] || { title: "Status Update", color: "#00f2ff", msg: "Es gibt ein Update zu deiner Reparatur." };
    const trackHtml = rep.tracking ? "<p>DHL Tracking: <strong>" + rep.tracking + "</strong><br><a href=\"https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=" + rep.tracking + "\">Sendung verfolgen</a></p>" : "";
    const noteHtml = body.note ? "<p><strong>Anmerkung:</strong> " + body.note + "</p>" : "";
    const priceHtml = body.finalPrice ? "<p><strong>Finaler Preis:</strong> " + body.finalPrice + "</p>" : "";

    const html = "<!DOCTYPE html><html><body style=\"margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif\"><div style=\"max-width:600px;margin:30px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.1)\">" +
      "<div style=\"background:#000;padding:28px;text-align:center\"><div style=\"font-size:22px;font-weight:900;color:" + msg.color + ";letter-spacing:6px\">LEXORD&reg;</div><div style=\"font-size:10px;color:#666;letter-spacing:3px;margin-top:4px\">MADE IN GERMANY</div></div>" +
      "<div style=\"background:" + msg.color + ";padding:14px 28px;text-align:center;font-size:14px;font-weight:bold;color:#000\">" + msg.title.toUpperCase() + "</div>" +
      "<div style=\"padding:28px;color:#333;font-size:14px;line-height:1.7\">" +
      "<p>Hallo " + (rep.fname || "") + ",</p>" +
      "<p>deine Reparaturanfrage <strong style=\"color:" + msg.color + "\">" + repNr + "</strong>:</p>" +
      "<p style=\"background:#f9f9f9;border-left:4px solid " + msg.color + ";padding:14px;border-radius:6px;margin:18px 0\">" + msg.msg + "</p>" +
      noteHtml + priceHtml + trackHtml +
      "<p style=\"margin-top:24px\">Status verfolgen: <a href=\"https://lexord.de\" style=\"color:" + msg.color + "\">lexord.de</a> &rarr; LOGIN</p>" +
      "</div>" +
      "<div style=\"background:#0a0a0a;padding:24px;text-align:center;font-size:10px;color:#888\">LEXORD Engineering &middot; An Der Domsuehler Str. 2 &middot; 19374 Domsuehl<br>Kontakt@Lexord.de &middot; 0152 047 18720</div>" +
      "</div></body></html>";

    try {
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          sender: { name: "LEXORD Engineering", email: env.FROM_EMAIL || ADMIN_EMAIL },
          to: [{ email: rep.email, name: (rep.fname || "") + " " + (rep.lname || "") }],
          subject: "[" + repNr + "] " + msg.title,
          htmlContent: html
        })
      });
    } catch (e) { /* ignore email error */ }
  }

  return json({ success: true });
}

