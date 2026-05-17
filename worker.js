// LEXORD Cloudflare Worker v3.0 - Brevo Email + KV Backend
// 100% ASCII-safe for drag&drop upload
//
// REQUIRED Cloudflare Setup:
// - KV Namespace Binding: LEXORD_DATA -> bind to LEXORD_DATA
// - Secret: BREVO_API_KEY = xkeysib-xxx (from brevo.com)
// - Secret: ADMIN_PASSWORD = your-admin-password
// - Secret: JWT_SECRET = any 32+ char random string
// - Secret: FROM_EMAIL = kontakt@lexord.de

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};

const ADMIN_EMAIL = "kontakt@lexord.de";

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
      if (path === "/test" || path === "/test/") {
        return new Response(`<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LEXORD Email Test</title>
<style>*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif}body{background:#0a0a0a;color:#fff;padding:30px 20px;min-height:100vh}h1{font-size:22px;letter-spacing:3px;color:#00f2ff;text-transform:uppercase;margin-bottom:8px}.sub{color:#888;font-size:12px;margin-bottom:30px}label{display:block;font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin:24px 0 8px}input{width:100%;padding:18px;background:#1a1a1a;border:2px solid #333;color:#fff;font-size:16px;border-radius:10px;outline:none;-webkit-appearance:none}input:focus{border-color:#00f2ff}button{width:100%;padding:18px;background:linear-gradient(135deg,#00f2ff,#bc13fe);border:none;color:#000;font-size:13px;font-weight:900;letter-spacing:3px;text-transform:uppercase;border-radius:10px;margin-top:22px}button:disabled{opacity:0.5}.r{margin-top:24px;padding:16px;border-radius:10px;font-size:12px;line-height:1.7;word-break:break-all;display:none}.r.ok{background:#003d2e;border:2px solid #00b67a;color:#7fffd4}.r.err{background:#3d0000;border:2px solid #ff3030;color:#ffaaaa}</style></head>
<body><h1>LEXORD Email Test</h1><div class="sub">Direkter Test des Cloudflare Workers + Brevo</div>
<label>Deine Email-Adresse</label>
<input id="email" type="email" placeholder="z.B. leonschulz1420@gmail.com" autocomplete="email" inputmode="email" autocapitalize="off">
<button id="btn" onclick="test()">TEST EMAIL SENDEN</button>
<div id="result" class="r"></div>
<script>
async function test(){
  const e=document.getElementById('email').value.trim();
  const b=document.getElementById('btn');
  const r=document.getElementById('result');
  if(!e||!e.includes('@')){r.className='r err';r.style.display='block';r.textContent='Bitte gueltige Email eingeben';return}
  b.disabled=true;b.textContent='SENDE...';r.style.display='none';
  try{
    const res=await fetch('/api/test-email?to='+encodeURIComponent(e));
    const d=await res.json();
    r.style.display='block';
    if(d.ok){r.className='r ok';r.innerHTML='<strong>OK!</strong><br>Email an <strong>'+d.sent_to+'</strong> uebergeben.<br>MessageId: '+(d.brevo_response.messageId||'?')+'<br><br>Pruefe in 30 Sek:<br>1. Posteingang<br>2. SPAM/Werbung Ordner<br>3. Promotions-Tab (Gmail)<br><br>Falls nichts kommt: Logs auf brevo.com'}
    else{r.className='r err';r.innerHTML='<strong>FEHLER:</strong><br>'+(d.error||JSON.stringify(d))}
  }catch(err){r.style.display='block';r.className='r err';r.textContent='Fehler: '+err}
  b.disabled=false;b.textContent='TEST EMAIL SENDEN';
}
</script></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", ...CORS } });
      }
      if (path === "/api/test-email") {
        // Test email - use ?to=your@email.com to specify recipient
        if (!env.BREVO_API_KEY) return json({ ok: false, error: "BREVO_API_KEY not set" });
        const recipient = url.searchParams.get("to") || env.FROM_EMAIL || "kontakt@lexord.de";
        try {
          const r = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
              sender: { name: "LEXORD Engineering", email: env.FROM_EMAIL || "kontakt@lexord.de" },
              to: [{ email: recipient, name: "Test Empfaenger" }],
              subject: "[TEST] LEXORD Worker " + new Date().toLocaleTimeString("de-DE"),
              htmlContent: "<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:30px auto;padding:30px;background:#fff;border:2px solid #00f2ff;border-radius:14px\"><h1 style=\"color:#00f2ff\">LEXORD Test Email</h1><p>Wenn du diese Email siehst, funktioniert <strong>alles korrekt</strong>!</p><ul><li>Worker: OK</li><li>Brevo API: OK</li><li>Zustellung: OK</li></ul><p>Gesendet: " + new Date().toISOString() + "</p></div>"
            })
          });
          const result = await r.json().catch(() => ({}));
          return json({
            ok: r.ok,
            status: r.status,
            brevo_response: result,
            sent_to: recipient,
            sent_from: env.FROM_EMAIL || "kontakt@lexord.de",
            help: r.ok ? "Email an " + recipient + " gesendet! Pruefe Posteingang + Spam-Ordner. Logs: app.brevo.com/transactional/email-activity" : "Brevo Fehler: " + (result.message || "unbekannt")
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
      if (path === "/api/chat" && request.method === "POST") return await chatWithAI(request, env);
      if (path === "/api/discount/check" && request.method === "POST") return await checkDiscountCode(request, env);
      if (path === "/api/discount/use" && request.method === "POST") return await useDiscountCode(request, env);
      if (path === "/api/newsletter/subscribe" && request.method === "POST") return await newsletterSubscribe(request, env);
      if (path === "/api/newsletter/check" && request.method === "POST") return await newsletterCheck(request, env);
      if (path === "/api/admin/conversations" && request.method === "GET") return await adminConversations(request, env);
      if (path === "/api/admin/newsletter/send" && request.method === "POST") return await sendNewsletter(request, env);
      if (path === "/api/admin/products" && request.method === "GET") return await adminListProducts(request, env);
      if (path === "/api/admin/products" && request.method === "POST") return await adminCreateProduct(request, env);
      if (path === "/api/products" && request.method === "GET") return await listProducts(request, env);
      if (path === "/api/b2b/inquiry" && request.method === "POST") return await b2bInquiry(request, env);
      if (path === "/api/b2b/register" && request.method === "POST") return await b2bRegister(request, env);
      if (path === "/api/b2b/login" && request.method === "POST") return await b2bLogin(request, env);
      if (path === "/api/b2b/contact" && request.method === "POST") return await b2bContact(request, env);
      if (path.startsWith("/api/admin/order/") && path.endsWith("/cancel") && request.method === "POST") {
        const orderNr = path.split("/")[4];
        return await cancelOrder(request, env, orderNr);
      }
      if (path.startsWith("/api/admin/products/") && request.method === "DELETE") {
        const slug = path.split("/").pop();
        return await adminDeleteProduct(request, env, slug);
      }
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
  const fromEmail = (env.FROM_EMAIL || ADMIN_EMAIL).toLowerCase();

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
          sender: { name: "LEXORD Engineering", email: (env.FROM_EMAIL || ADMIN_EMAIL).toLowerCase() },
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
      "<div style=\"background:#0a0a0a;padding:24px;text-align:center;font-size:10px;color:#888\">LEXORD Engineering &middot; An Der Domsuehler Str. 2 &middot; 19374 Domsuehl<br>kontakt@lexord.de &middot; 0152 047 18720</div>" +
      "</div></body></html>";

    try {
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          sender: { name: "LEXORD Engineering", email: (env.FROM_EMAIL || ADMIN_EMAIL).toLowerCase() },
          to: [{ email: rep.email, name: (rep.fname || "") + " " + (rep.lname || "") }],
          subject: "[" + repNr + "] " + msg.title,
          htmlContent: html
        })
      });
    } catch (e) { /* ignore email error */ }
  }

  return json({ success: true });
}


// ============ LEXORD AI CHAT (Cloudflare Workers AI) ============
async function chatWithAI(request, env) {
  const body = await request.json();
  const userMessages = body.messages || [];
  const sessionId = body.sessionId || "anon-" + Date.now();
  const customerEmail = body.email || "";

  const systemPrompt = `Du bist die freundliche KI-Assistentin von LEXORD Engineering, einem deutschen Custom PS5 Controller Shop aus Domsuehl.

WICHTIG:
- Antworte IMMER auf Deutsch
- Sei professionell, hilfsbereit, freundlich und kurz (max 3-4 Saetze)
- Beziehe dich auf konkrete LEXORD Produkte wenn passend
- Bei komplexen Reklamationen / spezifischen Bestellungen: sage dass Leon Schulz sich innerhalb 24h persoenlich meldet
- Bei Reparaturen: leite auf das Reparatur-Formular auf lexord.de hin
- Bei Bestellungs-Tracking: leite auf "Login" oben rechts auf lexord.de hin

PRODUKTE / PREISE:
- LXRD Performance Black: 240 EUR (TMR Sticks, Clicky Trigger, GRIP Gehaeuse, 2x Paddles)
- LXRD Plus Black: 180 EUR (Hall Effect Sticks, Clicky Trigger, 2x Paddles)
- LXRD Basic Black: 105 EUR (2x Paddles)
- LXRD Elite Pro: 280 EUR (TMR Pro, Carbon, 4x Paddles, RGB, Gravur)
- LXRD Stealth Edition: 220 EUR (Hall Effect, Matt-Finish, Limited)
- Stickzange Pro: 5 EUR
- Paddle System V2: 40 EUR
- TMR Stick Upgrade Kit: 55 EUR
- Hall Effect Kit: 35 EUR
- Konfigurator auf lexord.de/konfigurator.html ab 70 EUR

REPARATUREN:
- Stick-Drift: ab 25 EUR
- Trigger: ab 20 EUR
- Taste: ab 15 EUR
- USB-C: ab 30 EUR
- Gehaeuse: ab 35 EUR
- Vibration/Akku: ab 20 EUR
- Reparaturzeit: 3-5 Werktage
- 6 Monate Garantie inklusive

FAKTEN:
- Versand: 24h-Versand DE, kostenlos ab 50 EUR (DE), EU 14,49 EUR, CH 20,99 EUR
- Versandzeit: DE 1-3 Werktage, EU 3-7, International 7-14
- Bewertungen: 4.9/5 aus 91+ Reviews
- Kein MwSt-Ausweis (Paragraph 19 UStG)
- Widerrufsrecht: 14 Tage (ausser individuell konfigurierte Controller)
- Zahlung: PayPal, Karte, Apple Pay, Google Pay, SEPA, Klarna
- Kontakt: Kontakt@Lexord.de, 0152 047 18720

Wenn du etwas nicht weisst: gib zu dass du es nicht weisst und biete an Leon zu kontaktieren.

NIEMALS:
- Versprich Liefertermine die du nicht garantieren kannst
- Schreibe Preise die nicht in der Liste stehen
- Beleidige Konkurrenten
- Beantworte Fragen ueber andere Marken (Scuf, etc) - leite zurueck zu LEXORD
- Mache ueber LEXORD hinausgehende politische / persoenliche Statements`;

  if (!env.AI) {
    return json({
      reply: "Hallo! Ich bin LEXORD-KI. Aktuell bin ich noch nicht ganz online. Schreib gerne direkt an Kontakt@Lexord.de oder via WhatsApp 0152 047 18720 - Leon meldet sich innerhalb 24h!",
      via: "fallback"
    });
  }

  try {
    const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        ...userMessages
      ],
      max_tokens: 300
    });

    const reply = (aiResponse.response || "").trim();
    if (!reply) throw new Error("Empty AI response");

    // Save conversation in KV
    if (env.LEXORD_DATA) {
      try {
        const convKey = "chat:" + sessionId;
        const existing = await env.LEXORD_DATA.get(convKey);
        const convo = existing ? JSON.parse(existing) : { sessionId, email: customerEmail, messages: [], started: new Date().toISOString() };
        const lastUserMsg = userMessages[userMessages.length - 1];
        if (lastUserMsg) convo.messages.push({ role: "user", content: lastUserMsg.content, ts: new Date().toISOString() });
        convo.messages.push({ role: "assistant", content: reply, ts: new Date().toISOString() });
        convo.updated = new Date().toISOString();
        if (customerEmail) convo.email = customerEmail;
        await env.LEXORD_DATA.put(convKey, JSON.stringify(convo));
      } catch (e) { /* ignore */ }
    }

    // Detect "needs human" keywords and notify admin
    const lowerReply = reply.toLowerCase();
    const lastUserText = (userMessages[userMessages.length - 1]?.content || "").toLowerCase();
    const escalateKeywords = ["reklamation", "beschwerde", "anwalt", "rueckgabe", "nicht funktioniert", "kaputt", "defekt", "umtausch", "geld zurueck"];
    const shouldEscalate = escalateKeywords.some(k => lastUserText.includes(k));

    if (shouldEscalate && env.BREVO_API_KEY) {
      const fromE = (env.FROM_EMAIL || "kontakt@lexord.de").toLowerCase();
      const adminHtml = "<h2>Wichtige Kundenanfrage (KI eskaliert)</h2>" +
        "<p><strong>Email:</strong> " + (customerEmail || "anonym") + "</p>" +
        "<p><strong>Session:</strong> " + sessionId + "</p>" +
        "<p><strong>Letzte Nachricht:</strong></p>" +
        "<blockquote style=\"background:#f5f5f5;padding:12px;border-left:4px solid #ff9500\">" + escapeHtml(lastUserText) + "</blockquote>" +
        "<p><strong>KI-Antwort:</strong></p>" +
        "<blockquote style=\"background:#f0f9fb;padding:12px;border-left:4px solid #00f2ff\">" + escapeHtml(reply) + "</blockquote>" +
        "<p>Vollstaendige Konversation im <a href=\"https://lexord.de/?admin=1\">Admin-Panel</a> ansehen.</p>";
      try {
        await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            sender: { name: "LEXORD KI", email: fromE },
            to: [{ email: fromE, name: "LEXORD Admin" }],
            subject: "[KI ESKALATION] Kunde braucht persoenliche Antwort",
            htmlContent: adminHtml
          })
        });
      } catch (e) { /* ignore */ }
    }

    return json({ reply, via: "workers-ai", escalated: shouldEscalate });
  } catch (e) {
    return json({
      reply: "Entschuldige, ich bin gerade kurz offline. Schreib gerne direkt an Kontakt@Lexord.de - Leon meldet sich innerhalb 24h!",
      via: "error",
      error: String(e)
    });
  }
}

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

// ============ SINGLE-USE DISCOUNT CODES ============
async function checkDiscountCode(request, env) {
  if (!env.LEXORD_DATA) return json({ valid: false, error: "DB nicht konfiguriert" });
  const body = await request.json();
  const code = (body.code || "").trim().toUpperCase();
  const email = (body.email || "").trim().toLowerCase();
  if (!code) return json({ valid: false, error: "Code fehlt" });

  // Check if already used
  if (email) {
    const used = await env.LEXORD_DATA.get("discount_used:" + code + ":" + email);
    if (used) return json({ valid: false, alreadyUsed: true, error: "Dieser Code wurde bereits eingeloest" });
  }
  return json({ valid: true });
}

async function useDiscountCode(request, env) {
  if (!env.LEXORD_DATA) return json({ success: false });
  const body = await request.json();
  const code = (body.code || "").trim().toUpperCase();
  const email = (body.email || "").trim().toLowerCase();
  if (!code || !email) return json({ success: false, error: "Code+Email noetig" });
  await env.LEXORD_DATA.put("discount_used:" + code + ":" + email, new Date().toISOString());
  return json({ success: true });
}

// ============ NEWSLETTER ============
async function newsletterSubscribe(request, env) {
  if (!env.LEXORD_DATA) return json({ success: false });
  const body = await request.json();
  const email = (body.email || "").trim().toLowerCase();
  const fp = (body.fp || "").trim();
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  if (!email || !email.includes("@")) return json({ success: false, error: "Email ungueltig" });

  // Block disposable
  const domain = email.split("@")[1];
  if (DISPOSABLE_DOMAINS.some(d => domain === d || domain.endsWith("." + d))) {
    return json({ success: false, error: "Wegwerf-Email nicht erlaubt" });
  }

  // Block duplicates
  const existing = await env.LEXORD_DATA.get("newsletter:" + email);
  if (existing) return json({ success: false, error: "Bereits angemeldet" });

  await env.LEXORD_DATA.put("newsletter:" + email, JSON.stringify({
    email,
    subscribed: new Date().toISOString(),
    active: true,
    ip,
    fp
  }));

  // Track IP rate-limit
  if (ip && ip !== "0.0.0.0") {
    const ipKey = "nl_ip:" + ip;
    const ipData = await env.LEXORD_DATA.get(ipKey);
    const ipRec = ipData ? JSON.parse(ipData) : { count: 0, ts: Date.now() };
    if (Date.now() - ipRec.ts > 24 * 3600 * 1000) {
      ipRec.count = 0;
      ipRec.ts = Date.now();
    }
    ipRec.count++;
    await env.LEXORD_DATA.put(ipKey, JSON.stringify(ipRec), { expirationTtl: 30 * 24 * 3600 });
  }

  // Track fingerprint (30 days)
  if (fp) {
    await env.LEXORD_DATA.put("nl_fp:" + fp, email, { expirationTtl: 30 * 24 * 3600 });
  }

  return json({ success: true });
}

async function sendNewsletter(request, env) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA || !env.BREVO_API_KEY) return json({ error: "DB or Brevo missing" }, 500);

  const body = await request.json();
  const subject = body.subject || "Update von LEXORD";
  const html = body.html || "<p>Newsletter Inhalt</p>";

  // Get all newsletter subscribers
  const list = await env.LEXORD_DATA.list({ prefix: "newsletter:" });
  const recipients = [];
  for (const k of list.keys) {
    const raw = await env.LEXORD_DATA.get(k.name);
    if (raw) {
      const s = JSON.parse(raw);
      if (s.active) recipients.push(s.email);
    }
  }

  if (!recipients.length) return json({ success: false, error: "Keine Abonnenten" });

  const fromE = (env.FROM_EMAIL || "kontakt@lexord.de").toLowerCase();
  let sent = 0, failed = 0;
  for (const email of recipients) {
    try {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          sender: { name: "LEXORD Engineering", email: fromE },
          to: [{ email, name: email }],
          subject,
          htmlContent: html
        })
      });
      if (r.ok) sent++; else failed++;
    } catch (e) { failed++; }
  }

  return json({ success: true, sent, failed, total: recipients.length });
}

// ============ NEWSLETTER ANTI-FAKE CHECK ============
const DISPOSABLE_DOMAINS = [
  "mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com",
  "throwaway.email", "fakeinbox.com", "trashmail.com", "sharklasers.com",
  "maildrop.cc", "yopmail.com", "tempmail.org", "getairmail.com",
  "spamgourmet.com", "mintemail.com", "mailcatch.com", "moakt.com",
  "tempr.email", "minuteinbox.com", "emailondeck.com", "fakemail.net"
];

async function newsletterCheck(request, env) {
  if (!env.LEXORD_DATA) return json({ ok: false, reason: "db" });
  const body = await request.json();
  const email = (body.email || "").trim().toLowerCase();
  const fp = (body.fp || "").trim();
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";

  if (!email || !email.includes("@") || email.length < 6) {
    return json({ ok: false, reason: "invalid", msg: "E-Mail-Adresse ungueltig" });
  }
  const domain = email.split("@")[1];
  if (!domain || !domain.includes(".")) {
    return json({ ok: false, reason: "invalid", msg: "Domain ungueltig" });
  }
  if (DISPOSABLE_DOMAINS.some(d => domain === d || domain.endsWith("." + d))) {
    return json({ ok: false, reason: "disposable", msg: "Wegwerf-E-Mail-Adressen sind nicht erlaubt" });
  }

  // Check if already subscribed
  const existing = await env.LEXORD_DATA.get("newsletter:" + email);
  if (existing) {
    return json({ ok: false, reason: "duplicate", msg: "Diese E-Mail ist bereits angemeldet" });
  }

  // Check IP rate-limit (max 3 different emails from same IP in 24h)
  if (ip && ip !== "0.0.0.0") {
    const ipKey = "nl_ip:" + ip;
    const ipData = await env.LEXORD_DATA.get(ipKey);
    const ipRec = ipData ? JSON.parse(ipData) : { count: 0, ts: Date.now() };
    if (Date.now() - ipRec.ts > 24 * 3600 * 1000) {
      ipRec.count = 0;
      ipRec.ts = Date.now();
    }
    if (ipRec.count >= 3) {
      return json({ ok: false, reason: "rate", msg: "Zu viele Anmeldungen von dieser IP (max. 3 / Tag)" });
    }
  }

  // Check fingerprint dedup
  if (fp) {
    const fpKey = "nl_fp:" + fp;
    const used = await env.LEXORD_DATA.get(fpKey);
    if (used) {
      return json({ ok: false, reason: "device", msg: "Dieses Geraet hat bereits einen Willkommens-Code erhalten" });
    }
  }

  return json({ ok: true });
}

// ============ B2B ============
async function b2bInquiry(request, env) {
  if (!env.LEXORD_DATA) return json({ success: false, error: "DB nicht konfiguriert" });
  const body = await request.json();
  const required = ["company", "email", "name", "ustid"];
  for (const f of required) {
    if (!body[f]) return json({ success: false, error: "Feld fehlt: " + f });
  }
  const id = "B2B-" + Date.now().toString().slice(-7);
  const record = {
    id,
    company: body.company,
    email: body.email,
    name: body.name,
    phone: body.phone || "",
    ustid: body.ustid,
    address: body.address || "",
    industry: body.industry || "",
    volume: body.volume || "",
    message: body.message || "",
    status: "pending",
    created: new Date().toISOString()
  };
  await env.LEXORD_DATA.put("b2b:" + id, JSON.stringify(record));

  // Notify admin
  if (env.BREVO_API_KEY) {
    const fromE = (env.FROM_EMAIL || ADMIN_EMAIL).toLowerCase();
    const html = "<h2>Neue B2B-Anfrage " + id + "</h2>" +
      "<p><strong>Firma:</strong> " + escapeHtml(body.company) + "</p>" +
      "<p><strong>USt-ID:</strong> " + escapeHtml(body.ustid) + "</p>" +
      "<p><strong>Ansprechpartner:</strong> " + escapeHtml(body.name) + " (" + escapeHtml(body.email) + ")</p>" +
      "<p><strong>Telefon:</strong> " + escapeHtml(body.phone || "-") + "</p>" +
      "<p><strong>Branche:</strong> " + escapeHtml(body.industry || "-") + "</p>" +
      "<p><strong>Bestellvolumen:</strong> " + escapeHtml(body.volume || "-") + "</p>" +
      "<p><strong>Nachricht:</strong></p><blockquote>" + escapeHtml(body.message || "-") + "</blockquote>";
    try {
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          sender: { name: "LEXORD B2B", email: fromE },
          to: [{ email: fromE, name: "LEXORD Admin" }],
          replyTo: { email: body.email },
          subject: "[B2B " + id + "] Neue Anfrage von " + body.company,
          htmlContent: html
        })
      });
      // Confirmation to customer
      const custHtml = "<h2>Vielen Dank fuer Ihre B2B-Anfrage</h2>" +
        "<p>Hallo " + escapeHtml(body.name) + ",</p>" +
        "<p>wir haben Ihre Anfrage <strong>" + id + "</strong> erhalten und melden uns innerhalb von 24 Stunden mit einem individuellen Angebot.</p>" +
        "<p>Bei dringenden Fragen: <a href=\"tel:+4915204718720\">0152 047 18720</a></p>" +
        "<p>LEXORD Engineering &middot; Made in Germany</p>";
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          sender: { name: "LEXORD Engineering", email: fromE },
          to: [{ email: body.email, name: body.name }],
          subject: "[" + id + "] B2B-Anfrage erhalten | LEXORD",
          htmlContent: custHtml
        })
      });
    } catch (e) { /* ignore */ }
  }
  return json({ success: true, id });
}

async function b2bRegister(request, env) {
  if (!env.LEXORD_DATA) return json({ success: false, error: "DB nicht konfiguriert" }, 500);
  const body = await request.json();
  const required = ["company", "ustid", "name", "email", "password", "phone", "address"];
  for (const f of required) {
    if (!body[f]) return json({ success: false, error: "Feld fehlt: " + f }, 400);
  }
  const email = body.email.toLowerCase().trim();
  if (!email.includes("@")) return json({ success: false, error: "E-Mail ungueltig" }, 400);
  const ustidNorm = body.ustid.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9A-Z]{8,12}$/.test(ustidNorm)) return json({ success: false, error: "USt-ID Format ungueltig" }, 400);
  if (body.password.length < 8) return json({ success: false, error: "Passwort min. 8 Zeichen" }, 400);

  // Bereits registriert?
  const existing = await env.LEXORD_DATA.get("b2b_account:" + email);
  if (existing) return json({ success: false, error: "Diese E-Mail ist bereits registriert" }, 409);

  const id = "B2B-" + Date.now().toString().slice(-7);
  // Passwort als simpler Hash (in Produktion: bcrypt - hier minimal-stub)
  const pwHash = btoa(body.password + ":" + (env.JWT_SECRET || "lxrd"));
  const record = {
    id,
    email,
    company: body.company,
    ustid: ustidNorm,
    name: body.name,
    position: body.position || "",
    phone: body.phone,
    address: body.address,
    industry: body.industry || "",
    volume: body.volume || "",
    message: body.message || "",
    pwHash,
    status: "pending",
    discount: 0,
    tier: "starter",
    created: new Date().toISOString()
  };
  await env.LEXORD_DATA.put("b2b_account:" + email, JSON.stringify(record));
  await env.LEXORD_DATA.put("b2b:" + id, JSON.stringify({ ...record, pwHash: undefined }));

  // Admin + Customer notification
  if (env.BREVO_API_KEY) {
    const fromE = (env.FROM_EMAIL || ADMIN_EMAIL).toLowerCase();
    const adminHtml = "<h2>Neue B2B-Registrierung " + id + "</h2>" +
      "<p><strong>Firma:</strong> " + escapeHtml(body.company) + "</p>" +
      "<p><strong>USt-ID:</strong> " + escapeHtml(ustidNorm) + "</p>" +
      "<p><strong>Ansprechpartner:</strong> " + escapeHtml(body.name) + " (" + escapeHtml(email) + ")</p>" +
      "<p><strong>Telefon:</strong> " + escapeHtml(body.phone) + "</p>" +
      "<p><strong>Anschrift:</strong> " + escapeHtml(body.address) + "</p>" +
      "<p><strong>Branche:</strong> " + escapeHtml(body.industry || "-") + "</p>" +
      "<p><strong>Volumen:</strong> " + escapeHtml(body.volume || "-") + "</p>" +
      (body.message ? "<p><strong>Nachricht:</strong></p><blockquote>" + escapeHtml(body.message) + "</blockquote>" : "") +
      "<p>Im Admin-Panel auf <strong>approved</strong> setzen, damit der Kunde sich einloggen kann.</p>";
    try {
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          sender: { name: "LEXORD B2B", email: fromE },
          to: [{ email: fromE, name: "LEXORD Admin" }],
          replyTo: { email: email },
          subject: "[B2B " + id + "] Neue Registrierung von " + body.company,
          htmlContent: adminHtml
        })
      });

      const custHtml = "<h2>Willkommen bei LEXORD B2B</h2>" +
        "<p>Hallo " + escapeHtml(body.name) + ",</p>" +
        "<p>vielen Dank fuer Ihre Registrierung. Ihre B2B-Anfrage <strong>" + id + "</strong> ist eingegangen.</p>" +
        "<p><strong>Naechste Schritte:</strong></p>" +
        "<ol><li>Wir pruefen Ihre Angaben (USt-ID, Firma) innerhalb von 24 Stunden</li>" +
        "<li>Nach Pruefung erhalten Sie eine Freischaltungs-E-Mail</li>" +
        "<li>Anschliessend koennen Sie sich mit E-Mail + Passwort einloggen und unsere B2B-Konditionen einsehen</li></ol>" +
        "<p>Bei dringenden Fragen: <a href=\"mailto:Kontakt@Lexord.de\">Kontakt@Lexord.de</a> oder Tel. +49 152 047 18720</p>" +
        "<p>Beste Gruesse,<br>Leon Schulz<br>LEXORD Engineering</p>";
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          sender: { name: "LEXORD Engineering", email: fromE },
          to: [{ email: email, name: body.name }],
          subject: "[" + id + "] B2B-Registrierung eingegangen | LEXORD",
          htmlContent: custHtml
        })
      });
    } catch (e) { /* ignore */ }
  }
  return json({ success: true, id, status: "pending" });
}

async function b2bContact(request, env) {
  const body = await request.json();
  if (!body.email || !body.message || !body.template) return json({ success: false, error: "Felder fehlen" }, 400);

  const templates = {
    anfrage:   { subject: "Angebotsanfrage", icon: "💼" },
    bestellung:{ subject: "Bestellanfrage", icon: "📦" },
    reklamation:{ subject: "Reklamation", icon: "⚠️" },
    individuell:{ subject: "Individuelles Branding/Custom", icon: "🎨" },
    sonstiges: { subject: "Sonstige Anfrage", icon: "💬" }
  };
  const tpl = templates[body.template] || templates.sonstiges;

  if (env.BREVO_API_KEY) {
    const fromE = (env.FROM_EMAIL || ADMIN_EMAIL).toLowerCase();
    const adminHtml = "<h2>" + tpl.icon + " B2B-" + escapeHtml(tpl.subject) + "</h2>" +
      "<table style=\"font-family:Arial;font-size:13px;border-collapse:collapse\">" +
      "<tr><td style=\"padding:6px 12px;color:#888\">Firma</td><td style=\"padding:6px 12px;font-weight:bold\">" + escapeHtml(body.company || "-") + "</td></tr>" +
      "<tr><td style=\"padding:6px 12px;color:#888\">B2B-ID</td><td style=\"padding:6px 12px\">" + escapeHtml(body.b2bId || "-") + "</td></tr>" +
      "<tr><td style=\"padding:6px 12px;color:#888\">Kunde</td><td style=\"padding:6px 12px;font-weight:bold\">" + escapeHtml(body.name || "-") + "</td></tr>" +
      "<tr><td style=\"padding:6px 12px;color:#888\">E-Mail</td><td style=\"padding:6px 12px\"><a href=\"mailto:" + escapeHtml(body.email) + "\">" + escapeHtml(body.email) + "</a></td></tr>" +
      "<tr><td style=\"padding:6px 12px;color:#888\">Telefon</td><td style=\"padding:6px 12px\">" + escapeHtml(body.phone || "-") + "</td></tr>" +
      "</table>" +
      "<h3 style=\"color:#00f2ff;margin-top:18px\">Nachricht:</h3>" +
      "<blockquote style=\"background:#f5f5f5;padding:14px;border-left:4px solid #00f2ff;font-family:Arial;font-size:13px\">" + escapeHtml(body.message).replace(/\n/g, "<br>") + "</blockquote>";

    const custHtml = "<h2>" + tpl.icon + " Ihre B2B-Anfrage</h2>" +
      "<p>Hallo " + escapeHtml(body.name || "Kunde") + ",</p>" +
      "<p>wir haben Ihre <strong>" + escapeHtml(tpl.subject) + "</strong> erhalten und melden uns innerhalb von <strong>24 Stunden</strong> mit einer ausfuehrlichen Antwort.</p>" +
      "<p><strong>Ihre Nachricht:</strong></p>" +
      "<blockquote style=\"background:#f5f5f5;padding:14px;border-left:4px solid #00f2ff;font-family:Arial;font-size:13px\">" + escapeHtml(body.message).replace(/\n/g, "<br>") + "</blockquote>" +
      "<p>Bei dringenden Fragen erreichen Sie uns unter Tel. +49 152 047 18720 (Mo-Fr 9-18 Uhr).</p>" +
      "<p>Beste Gruesse,<br>Leon Schulz<br>LEXORD Engineering B2B</p>";

    try {
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          sender: { name: "LEXORD B2B", email: fromE },
          to: [{ email: fromE, name: "LEXORD Admin" }],
          replyTo: { email: body.email },
          subject: "[B2B " + tpl.subject + "] " + (body.company || body.name),
          htmlContent: adminHtml
        })
      });
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          sender: { name: "LEXORD Engineering", email: fromE },
          to: [{ email: body.email, name: body.name || body.email }],
          subject: "[Eingegangen] " + tpl.subject + " | LEXORD",
          htmlContent: custHtml
        })
      });
    } catch (e) { /* ignore */ }
  }
  return json({ success: true });
}

async function b2bLogin(request, env) {
  if (!env.LEXORD_DATA) return json({ success: false, error: "DB nicht konfiguriert" }, 500);
  const body = await request.json();
  const email = (body.email || "").toLowerCase().trim();
  const password = body.password || "";
  if (!email || !password) return json({ success: false, error: "E-Mail und Passwort erforderlich" }, 400);
  const raw = await env.LEXORD_DATA.get("b2b_account:" + email);
  if (!raw) return json({ success: false, error: "Konto nicht gefunden" }, 404);
  const rec = JSON.parse(raw);
  const pwHash = btoa(password + ":" + (env.JWT_SECRET || "lxrd"));
  if (rec.pwHash !== pwHash) return json({ success: false, error: "Passwort falsch" }, 401);
  if (rec.status === "pending") return json({ success: false, error: "Konto wird gerade geprueft. Wir melden uns binnen 24h.", pending: true }, 403);
  if (rec.status === "rejected") return json({ success: false, error: "Konto abgelehnt. Bei Fragen: Kontakt@Lexord.de" }, 403);
  const token = btoa("b2b:" + rec.id + ":" + Date.now());
  return json({
    success: true,
    token,
    company: rec.company,
    name: rec.name,
    email: rec.email,
    id: rec.id,
    discount: rec.discount || 10,
    tier: rec.tier || "starter"
  });
}

// ============ ORDER CANCEL ============
async function cancelOrder(request, env, orderNr) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ error: "KV not bound" }, 500);
  const existing = await env.LEXORD_DATA.get("order:" + orderNr);
  if (!existing) return json({ success: false, error: "Bestellung nicht gefunden" }, 404);
  const order = JSON.parse(existing);
  order.status = "cancelled";
  order.cancelled = new Date().toISOString();
  order.updated = new Date().toISOString();
  await env.LEXORD_DATA.put("order:" + orderNr, JSON.stringify(order));

  // Send cancellation email
  if (order.email && env.BREVO_API_KEY) {
    const fromE = (env.FROM_EMAIL || ADMIN_EMAIL).toLowerCase();
    const html = "<!DOCTYPE html><html><body style=\"margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif\">" +
      "<div style=\"max-width:600px;margin:30px auto;background:#fff;border-radius:10px;overflow:hidden\">" +
      "<div style=\"background:#000;padding:24px;text-align:center\"><div style=\"font-size:20px;font-weight:900;color:#ff4d4f;letter-spacing:5px\">LEXORD&reg;</div></div>" +
      "<div style=\"background:#ff4d4f;padding:14px;text-align:center;color:#fff;font-weight:bold;letter-spacing:2px\">BESTELLUNG STORNIERT</div>" +
      "<div style=\"padding:28px;color:#333;font-size:14px;line-height:1.7\">" +
      "<p>Hallo " + escapeHtml(order.name || "") + ",</p>" +
      "<p>deine Bestellung <strong>" + escapeHtml(orderNr) + "</strong> wurde storniert.</p>" +
      "<p>Eine Rueckerstattung in Hoehe von <strong>" + (order.total || 0).toFixed(2) + " EUR</strong> wird innerhalb von 1-3 Werktagen ueber die urspruengliche Zahlungsmethode (PayPal) ausgeloest.</p>" +
      "<p>Bei Rueckfragen erreichst du uns unter <a href=\"mailto:Kontakt@Lexord.de\">Kontakt@Lexord.de</a> oder Tel. 0152 047 18720.</p>" +
      "<p>Wir bedauern den Vorfall und hoffen, dich bald wieder bei LEXORD begruessen zu duerfen.</p>" +
      "<p>Beste Gruesse,<br>Leon Schulz<br>LEXORD Engineering</p>" +
      "</div></div></body></html>";
    try {
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          sender: { name: "LEXORD Engineering", email: fromE },
          to: [{ email: order.email, name: order.name || "Kunde" }],
          subject: "[STORNIERT] Bestellung " + orderNr + " | LEXORD",
          htmlContent: html
        })
      });
    } catch (e) { /* ignore */ }
  }
  return json({ success: true });
}

// ============ PRODUCTS ============
async function listProducts(request, env) {
  if (!env.LEXORD_DATA) return json({ products: [] });
  const list = await env.LEXORD_DATA.list({ prefix: "product:" });
  const products = [];
  for (const k of list.keys) {
    const raw = await env.LEXORD_DATA.get(k.name);
    if (raw) products.push(JSON.parse(raw));
  }
  return json({ products });
}

async function adminListProducts(request, env) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  return await listProducts(request, env);
}

async function adminCreateProduct(request, env) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ error: "KV not bound" }, 500);
  const p = await request.json();
  if (!p.slug || !p.name || !p.price) return json({ error: "slug/name/price required" }, 400);
  p.created = p.created || new Date().toISOString();
  p.updated = new Date().toISOString();
  await env.LEXORD_DATA.put("product:" + p.slug, JSON.stringify(p));
  return json({ success: true, slug: p.slug });
}

async function adminDeleteProduct(request, env, slug) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ error: "KV not bound" }, 500);
  await env.LEXORD_DATA.delete("product:" + slug);
  return json({ success: true });
}

async function adminConversations(request, env) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ error: "KV not bound" }, 500);

  const list = await env.LEXORD_DATA.list({ prefix: "chat:" });
  const conversations = [];
  for (const k of list.keys) {
    const raw = await env.LEXORD_DATA.get(k.name);
    if (raw) {
      const c = JSON.parse(raw);
      conversations.push({
        sessionId: c.sessionId,
        email: c.email,
        started: c.started,
        updated: c.updated,
        msgCount: (c.messages || []).length,
        lastMsg: ((c.messages || []).slice(-1)[0] || {}).content || ""
      });
    }
  }
  conversations.sort((a, b) => new Date(b.updated || b.started) - new Date(a.updated || a.started));
  return json({ conversations });
}

