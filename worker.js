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
    const clientIP = request.headers.get("CF-Connecting-IP") || "0.0.0.0";

    // ════════ SECURITY: Rate-Limiting + Brute-Force-Schutz ════════
    if (env.LEXORD_DATA) {
      // Admin-Login Brute-Force: max 5 Versuche pro IP in 15 Minuten
      if ((path === "/admin/login" || path === "/api/admin/login") && request.method === "POST") {
        const rlKey = "ratelimit:login:" + clientIP;
        const rlRaw = await env.LEXORD_DATA.get(rlKey);
        const rl = rlRaw ? JSON.parse(rlRaw) : { count: 0, first: Date.now() };
        if (rl.count >= 5 && (Date.now() - rl.first) < 15 * 60 * 1000) {
          return json({ success: false, error: "Zu viele Login-Versuche. Bitte warte 15 Minuten." }, 429);
        }
        if ((Date.now() - rl.first) >= 15 * 60 * 1000) { rl.count = 0; rl.first = Date.now(); }
        rl.count++;
        await env.LEXORD_DATA.put(rlKey, JSON.stringify(rl), { expirationTtl: 900 });
      }
      // API Rate-Limiting: max 120 Requests pro IP pro Minute
      if (path.startsWith("/api/") || path.startsWith("/admin/") || path === "/track/visitor") {
        const rlKey = "ratelimit:api:" + clientIP + ":" + Math.floor(Date.now() / 60000);
        const count = parseInt(await env.LEXORD_DATA.get(rlKey) || "0");
        if (count > 120) {
          return json({ error: "Rate limit exceeded. Max 120 requests/minute." }, 429);
        }
        await env.LEXORD_DATA.put(rlKey, String(count + 1), { expirationTtl: 120 });
      }
    }

    try {
      // Security-Headers fuer alle Responses
      const SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
      };

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
      if (path === "/api/widerruf" && request.method === "POST") return await saveWiderruf(request, env);
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

      // ════════ NEUE ADMIN-PANEL-ROUTES (v4.0) ════════
      // Auth
      if (path === "/admin/login" && request.method === "POST") return await admin2Login(request, env);
      if (path === "/admin/logout" && request.method === "POST") return json({ success: true });

      // Visitor-Tracking (kein Auth — Frontend schickt fuer Live-Globe)
      if (path === "/track/visitor" && request.method === "POST") return await trackVisitor(request, env);

      // Admin-Daten (Auth required)
      if (path === "/admin/stats" && request.method === "GET") return await admin2Stats(request, env);
      if (path === "/admin/visitors" && request.method === "GET") return await admin2Visitors(request, env);
      if (path === "/admin/orders" && request.method === "GET") return await admin2Orders(request, env);
      if (path === "/admin/repairs" && request.method === "GET") return await admin2Repairs(request, env);
      if (path === "/admin/users" && request.method === "GET") return await admin2Users(request, env);
      if (path === "/admin/widerrufe" && request.method === "GET") return await admin2Widerrufe(request, env);
      if (path.startsWith("/admin/widerruf/") && path.endsWith("/email") && request.method === "POST") {
        return await admin2WiderrufEmail(request, env, decodeURIComponent(path.split("/")[3]));
      }
      if (path.startsWith("/admin/widerruf/") && request.method === "PATCH") {
        return await admin2WiderrufUpdate(request, env, decodeURIComponent(path.split("/").pop()));
      }
      if (path === "/admin/discounts" && request.method === "GET") return await admin2DiscountsList(request, env);
      if (path === "/admin/discounts" && request.method === "POST") return await admin2DiscountsCreate(request, env);
      if (path === "/admin/stats/deep" && request.method === "GET") return await admin2DeepStats(request, env);

      // Pro-Bestellung Aktionen
      if (path.startsWith("/admin/orders/") && path.endsWith("/refund") && request.method === "POST") {
        return await admin2OrderRefund(request, env, decodeURIComponent(path.split("/")[3]));
      }
      if (path.startsWith("/admin/orders/") && path.endsWith("/status") && request.method === "POST") {
        return await admin2OrderStatus(request, env, decodeURIComponent(path.split("/")[3]));
      }
      if (path.startsWith("/admin/orders/") && path.endsWith("/tracking") && request.method === "POST") {
        return await admin2OrderTracking(request, env, decodeURIComponent(path.split("/")[3]));
      }
      if (path.startsWith("/admin/orders/") && path.endsWith("/email") && request.method === "POST") {
        return await admin2OrderEmail(request, env, decodeURIComponent(path.split("/")[3]));
      }
      if (path.startsWith("/admin/orders/") && path.endsWith("/invoice") && request.method === "GET") {
        return await admin2OrderInvoice(request, env, decodeURIComponent(path.split("/")[3]), url);
      }

      // Pro-Discount Aktionen
      if (path.startsWith("/admin/discounts/") && request.method === "PATCH") {
        return await admin2DiscountToggle(request, env, decodeURIComponent(path.split("/").pop()));
      }
      if (path.startsWith("/admin/discounts/") && request.method === "DELETE") {
        return await admin2DiscountDelete(request, env, decodeURIComponent(path.split("/").pop()));
      }

      // ARCHIV (verschluesselt, append-only)
      if (path === "/admin/archive" && request.method === "GET") return await admin2ArchiveList(request, env, url);
      if (path.startsWith("/admin/archive/") && request.method === "GET") {
        const key = decodeURIComponent(path.replace("/admin/archive/", ""));
        return await admin2ArchiveGet(request, env, key);
      }
      if (path.startsWith("/admin/archive/") && request.method === "DELETE") {
        if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
        const key = decodeURIComponent(path.replace("/admin/archive/", ""));
        if (env.LEXORD_DATA) await env.LEXORD_DATA.delete(key);
        return json({ success: true });
      }

      // REPARATUR-AKTIONEN (Status/Tracking/Email/KV/Storno)
      if (path.startsWith("/admin/repair/") && path.endsWith("/invoice") && request.method === "GET") {
        return await admin2RepairInvoice(request, env, decodeURIComponent(path.split("/")[3]), url);
      }
      if (path.startsWith("/admin/repair/") && path.endsWith("/email") && request.method === "POST") {
        return await admin2RepairEmail(request, env, decodeURIComponent(path.split("/")[3]));
      }
      if (path.startsWith("/admin/repair/") && path.endsWith("/quote") && request.method === "POST") {
        return await admin2RepairQuote(request, env, decodeURIComponent(path.split("/")[3]));
      }
      if (path.startsWith("/admin/repair/") && request.method === "PATCH") {
        const repNr = path.split("/").pop();
        return await updateRepair(request, env, decodeURIComponent(repNr));
      }

      // WEB PUSH (Lockscreen-Push wie Shopify)
      if (path === "/admin/push/key" && request.method === "GET") return await admin2PushKey(request, env);
      if (path === "/admin/push/subscribe" && request.method === "POST") return await admin2PushSubscribe(request, env);
      if (path === "/admin/push/unsubscribe" && request.method === "POST") return await admin2PushUnsubscribe(request, env);
      if (path === "/admin/push/test" && request.method === "POST") return await admin2PushTest(request, env);
      if (path === "/admin/push/genkeys" && request.method === "POST") return await admin2PushGenKeys(request, env);

      return json({ error: "Not found", path: path }, 404);
    } catch (err) {
      return json({ error: String(err.message || err), stack: err.stack }, 500);
    }
  }
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      ...CORS
    }
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

  // Push-Notification auf Admin-Handys (Lockscreen)
  try {
    await broadcastPush(env, {
      title: '💰 Neue Bestellung · ' + o.orderNr,
      body: (o.name || 'Kunde') + ' · ' + parseFloat(o.total || 0).toFixed(2) + ' €',
      tag: 'order-' + o.orderNr,
      url: '/admin.html',
      orderNr: o.orderNr,
      type: 'order'
    });
  } catch (e) {}

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

  // Push-Notification auf Admin-Handys
  try {
    await broadcastPush(env, {
      title: '🔧 Neue Reparatur · ' + r.repNr,
      body: (r.name || r.fname || 'Kunde') + ' · ' + (r.damage || r.model || ''),
      tag: 'repair-' + r.repNr,
      url: '/admin.html',
      type: 'repair'
    });
  } catch (e) {}

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
  if (body.doneNote) rep.doneNote = body.doneNote;
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
  const source = body.source || (sessionId.startsWith("rep-") ? "reparatur" : "index");

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
        const convo = existing ? JSON.parse(existing) : { sessionId, email: customerEmail, source, messages: [], started: new Date().toISOString() };
        if (!convo.source) convo.source = source;
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
// Welcome-Codes: einmal pro Geraet/IP/Email einloesbar, nur fuer konfigurierte Controller
const WELCOME_CODES = ["WILLKOMMEN10", "WELCOME10", "WELCOME"];

async function checkDiscountCode(request, env) {
  if (!env.LEXORD_DATA) return json({ valid: false, error: "DB nicht konfiguriert" });
  const body = await request.json();
  const code = (body.code || "").trim().toUpperCase();
  const email = (body.email || "").trim().toLowerCase();
  const fp = (body.fp || "").trim();
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  if (!code) return json({ valid: false, error: "Code fehlt" });

  // === NEU: Admin-angelegte Codes (Tab 'RABATTCODES') ===
  const adminRaw = await env.LEXORD_DATA.get("discount:" + code);
  if (adminRaw) {
    const d = JSON.parse(adminRaw);
    if (!d.active) return json({ valid: false, error: "Code ist deaktiviert" });
    if (d.expires && new Date(d.expires) < new Date()) return json({ valid: false, error: "Code ist abgelaufen" });
    // Optional: pro Email nur 1x
    if (email) {
      const used = await env.LEXORD_DATA.get("discount_used:" + code + ":" + email);
      if (used) return json({ valid: false, alreadyUsed: true, error: "Dieser Code wurde bereits eingeloest" });
    }
    // Antwort mit Discount-Details fuer das Frontend
    const info = { valid: true, type: d.type, value: d.value };
    if (d.type === "percent")   info.percentOff = d.value;
    if (d.type === "fixed")     info.amountOff  = d.value;
    if (d.type === "shipping")  info.freeShipping = true;
    info.label = d.type === "percent" ? (d.value + "% Rabatt")
              : d.type === "fixed"   ? (d.value + " EUR Rabatt")
              : "Free Shipping";
    return json(info);
  }

  // === LEGACY: Email-based usage check ===
  if (email) {
    const used = await env.LEXORD_DATA.get("discount_used:" + code + ":" + email);
    if (used) return json({ valid: false, alreadyUsed: true, error: "Dieser Code wurde bereits eingeloest" });
  }

  // === LEGACY: Welcome-Codes (hartcodiert) ===
  if (WELCOME_CODES.includes(code)) {
    const ipUsed = await env.LEXORD_DATA.get("welcome_ip:" + ip);
    if (ipUsed) return json({ valid: false, alreadyUsed: true, error: "Dieser Bonus wurde bereits von dieser Verbindung eingeloest" });
    if (fp) {
      const fpUsed = await env.LEXORD_DATA.get("welcome_fp:" + fp);
      if (fpUsed) return json({ valid: false, alreadyUsed: true, error: "Dieser Bonus wurde bereits auf diesem Geraet eingeloest" });
    }
    return json({ valid: true });
  }

  // Kein Code gefunden
  return json({ valid: false, error: "Ungueltiger Rabattcode" });
}

async function useDiscountCode(request, env) {
  if (!env.LEXORD_DATA) return json({ success: false });
  const body = await request.json();
  const code = (body.code || "").trim().toUpperCase();
  const email = (body.email || "").trim().toLowerCase();
  const fp = (body.fp || "").trim();
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  if (!code) return json({ success: false, error: "Code fehlt" });

  const ts = new Date().toISOString();
  // Pro Email markieren (legacy)
  if (email) await env.LEXORD_DATA.put("discount_used:" + code + ":" + email, ts);

  // Admin-Code: Use-Counter und Gesamt-Discount-Sum erhoehen
  const adminRaw = await env.LEXORD_DATA.get("discount:" + code);
  if (adminRaw) {
    const d = JSON.parse(adminRaw);
    d.uses = (d.uses || 0) + 1;
    d.totalDiscount = (d.totalDiscount || 0) + parseFloat(body.amountSaved || 0);
    d.lastUsed = ts;
    await env.LEXORD_DATA.put("discount:" + code, JSON.stringify(d));
  }

  // Welcome-Codes: zusaetzlich IP- und Geraete-Lock setzen — permanent
  if (WELCOME_CODES.includes(code)) {
    await env.LEXORD_DATA.put("welcome_ip:" + ip, code + "|" + ts);
    if (fp) await env.LEXORD_DATA.put("welcome_fp:" + fp, code + "|" + ts);
  }
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
      const msgs = c.messages || [];
      conversations.push({
        sessionId: c.sessionId,
        email: c.email,
        started: c.started,
        updated: c.updated,
        msgCount: msgs.length,
        lastMsg: ((msgs.slice(-1)[0]) || {}).content || "",
        messages: msgs
      });
    }
  }
  conversations.sort((a, b) => new Date(b.updated || b.started || 0) - new Date(a.updated || a.started || 0));
  return json({ conversations });
}

// ════════════════════════════════════════════════════════════════
// ADMIN-PANEL v4.0 — Live-Visitor-Tracking, Refund, Discounts, Stats
// ════════════════════════════════════════════════════════════════

// Akzeptiert {code} ODER {password} (kompatibel mit beidem)
async function admin2Login(request, env) {
  const body = await request.json().catch(() => ({}));
  const input = body.code || body.password;
  if (!env.ADMIN_PASSWORD) return json({ success: false, error: "ADMIN_PASSWORD not set" }, 500);
  if (!input || input !== env.ADMIN_PASSWORD) return json({ success: false, error: "Falscher Code" }, 401);
  const token = btoa("admin:" + Date.now() + ":" + (env.JWT_SECRET || "x").slice(0, 8));
  // Brute-Force-Counter bei Erfolg zuruecksetzen
  const clientIP = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  if (env.LEXORD_DATA) try { await env.LEXORD_DATA.delete("ratelimit:login:" + clientIP); } catch(e){}
  return json({ success: true, token });
}

// Visitor-Tracking (Frontend ruft das auf, kein Auth noetig)
async function trackVisitor(request, env) {
  if (!env.LEXORD_DATA) return json({ success: false }, 200);
  try {
    const body = await request.json().catch(() => ({}));
    const sid = body.sid || (request.headers.get("CF-Connecting-IP") || "anon") + "-" + Math.floor(Date.now() / (5 * 60 * 1000));
    const cf = request.cf || {};
    const ip = request.headers.get("CF-Connecting-IP") || "?";
    const data = {
      sid,
      ip: ip.split(".").slice(0, 3).concat(["x"]).join("."), // privacy: last octet masked
      country: cf.country || body.country || "XX",
      city: cf.city || body.city || "",
      region: cf.region || "",
      lat: cf.latitude ? parseFloat(cf.latitude) : null,
      lng: cf.longitude ? parseFloat(cf.longitude) : null,
      page: body.page || "/",
      ref: body.ref || "",
      ua: (request.headers.get("User-Agent") || "").slice(0, 120),
      mobile: /Mobile|Android|iPhone/.test(request.headers.get("User-Agent") || ""),
      lastSeen: Date.now(),
      event: body.event || "view" // view | config_start | cart_add | checkout
    };
    // Live-Visitor: nur schreiben wenn noch nicht vorhanden ODER echtes Event (spart ~80% Writes)
    const existingVisitor = await env.LEXORD_DATA.get("visitor:" + sid);
    if (!existingVisitor || data.event !== "view") {
      await env.LEXORD_DATA.put("visitor:" + sid, JSON.stringify(data), { expirationTtl: 900 });
    }

    // Heute-Aggregation: nur beim ERSTEN Besuch oder bei echten Events (nicht bei Heartbeats)
    if (!existingVisitor || data.event !== "view") {
      const today = new Date().toISOString().slice(0, 10);
      const aggKey = "agg:" + today;
      const aggRaw = await env.LEXORD_DATA.get(aggKey);
      const agg = aggRaw ? JSON.parse(aggRaw) : { visitors: {}, views: 0, configurators: 0, carts: 0, checkouts: 0, orders: 0 };
      agg.visitors[sid] = 1;
      if (!existingVisitor) agg.views++;
      if (data.event === "config_start") agg.configurators++;
      if (data.event === "cart_add") agg.carts++;
      if (data.event === "checkout") agg.checkouts++;
      if (data.event === "order_complete") agg.orders++;
      await env.LEXORD_DATA.put(aggKey, JSON.stringify(agg), { expirationTtl: 60 * 60 * 24 * 31 });
    }

    return json({ success: true });
  } catch (e) {
    return json({ success: false, error: String(e) });
  }
}

// Live-Besucher fuer den Globe
async function admin2Visitors(request, env) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ visitors: [], byCountry: {}, today: {} });
  const list = await env.LEXORD_DATA.list({ prefix: "visitor:" });
  const visitors = [];
  const byCountry = {};
  for (const k of list.keys) {
    const raw = await env.LEXORD_DATA.get(k.name);
    if (!raw) continue;
    const v = JSON.parse(raw);
    visitors.push(v);
    byCountry[v.country] = (byCountry[v.country] || 0) + 1;
  }
  visitors.sort((a, b) => b.lastSeen - a.lastSeen);
  // Heute-Aggregation
  const today = new Date().toISOString().slice(0, 10);
  const aggRaw = await env.LEXORD_DATA.get("agg:" + today);
  const agg = aggRaw ? JSON.parse(aggRaw) : { visitors: {}, views: 0, configurators: 0, carts: 0, orders: 0 };
  const todayVisitors = Object.keys(agg.visitors || {}).length;
  const conv = todayVisitors > 0 ? (agg.orders / todayVisitors) * 100 : 0;
  return json({
    visitors,
    byCountry,
    today: {
      visitors: todayVisitors,
      views: agg.views,
      configurators: agg.configurators,
      carts: agg.carts,
      checkouts: agg.checkouts || 0,
      orders: agg.orders,
      conversion: conv
    }
  });
}

// Stats erweitert (today, deltas)
async function admin2Stats(request, env) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ stats: { orders: 0, revenue: 0, customers: 0, thisMonth: 0, today: 0 } });
  const orderList = await env.LEXORD_DATA.list({ prefix: "order:" });
  let total = 0, revenue = 0, today = 0, thisMonth = 0, lastWeekOrders = 0, lastWeekRevenue = 0;
  const customers = {};
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = new Date().toISOString().slice(0, 7);
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const twoWeeksAgo = Date.now() - 14 * 24 * 3600 * 1000;
  for (const k of orderList.keys) {
    const raw = await env.LEXORD_DATA.get(k.name);
    if (!raw) continue;
    const o = JSON.parse(raw);
    total++;
    revenue += parseFloat(o.total || 0);
    if ((o.date || o.created || "").slice(0, 10) === todayStr) today++;
    if ((o.date || o.created || "").slice(0, 7) === monthStr) thisMonth++;
    const t = new Date(o.date || o.created || 0).getTime();
    if (t > weekAgo) lastWeekOrders++;
    if (t > twoWeeksAgo && t <= weekAgo) lastWeekRevenue++;
    if (o.email) customers[o.email.toLowerCase()] = 1;
  }
  return json({
    stats: {
      orders: total,
      revenue: revenue,
      customers: Object.keys(customers).length,
      thisMonth,
      today,
      ordersDelta: lastWeekOrders - lastWeekRevenue
    }
  });
}

// Bestellungen-Liste
async function admin2Orders(request, env) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ orders: [] });
  const list = await env.LEXORD_DATA.list({ prefix: "order:" });
  const orders = [];
  for (const k of list.keys) {
    const raw = await env.LEXORD_DATA.get(k.name);
    if (raw) orders.push(JSON.parse(raw));
  }
  orders.sort((a, b) => new Date(b.date || b.created || 0) - new Date(a.date || a.created || 0));
  return json({ orders });
}

async function admin2Repairs(request, env) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ repairs: [] });
  const list = await env.LEXORD_DATA.list({ prefix: "repair:" });
  const repairs = [];
  for (const k of list.keys) {
    const raw = await env.LEXORD_DATA.get(k.name);
    if (raw) repairs.push(JSON.parse(raw));
  }
  repairs.sort((a, b) => new Date(b.date || b.created || 0) - new Date(a.date || a.created || 0));
  return json({ repairs });
}

async function admin2Users(request, env) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ users: [] });
  const orderList = await env.LEXORD_DATA.list({ prefix: "order:" });
  const users = {};
  for (const k of orderList.keys) {
    const raw = await env.LEXORD_DATA.get(k.name);
    if (!raw) continue;
    const o = JSON.parse(raw);
    const em = (o.email || "").toLowerCase();
    if (!em) continue;
    if (!users[em]) users[em] = { email: em, name: o.name || "", created: o.date || o.created, orderCount: 0, totalSpent: 0 };
    users[em].orderCount++;
    users[em].totalSpent += parseFloat(o.total || 0);
  }
  return json({ users: Object.values(users).sort((a, b) => b.totalSpent - a.totalSpent) });
}

// ──── REFUND (Stripe / PayPal automatisch) ────
async function admin2OrderRefund(request, env, orderNr) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ success: false, error: "KV nicht verbunden" }, 500);
  const body = await request.json().catch(() => ({}));
  const orderRaw = await env.LEXORD_DATA.get("order:" + orderNr);
  if (!orderRaw) return json({ success: false, error: "Order nicht gefunden" }, 404);
  const order = JSON.parse(orderRaw);
  const amount = parseFloat(body.amount || order.total || 0);

  let refundId = null;
  let refundError = null;

  try {
    if ((order.payment || "").toLowerCase().includes("stripe") && order.stripeChargeId && env.STRIPE_SECRET_KEY) {
      // Stripe Refund
      const r = await fetch("https://api.stripe.com/v1/refunds", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.STRIPE_SECRET_KEY,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "charge=" + encodeURIComponent(order.stripeChargeId) + "&amount=" + Math.round(amount * 100) + "&reason=requested_by_customer"
      });
      const d = await r.json();
      if (d.id) refundId = d.id;
      else refundError = d.error ? d.error.message : "Stripe-Refund fehlgeschlagen";
    } else if ((order.payment || "").toLowerCase().includes("paypal") && order.paypalCaptureId && env.PAYPAL_CLIENT_ID && env.PAYPAL_SECRET) {
      // PayPal OAuth
      const tokenR = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
        method: "POST",
        headers: {
          "Authorization": "Basic " + btoa(env.PAYPAL_CLIENT_ID + ":" + env.PAYPAL_SECRET),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
      });
      const tk = await tokenR.json();
      if (tk.access_token) {
        const r = await fetch("https://api-m.paypal.com/v2/payments/captures/" + order.paypalCaptureId + "/refund", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + tk.access_token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ amount: { value: amount.toFixed(2), currency_code: "EUR" }, note_to_payer: body.reason || "Stornierung" })
        });
        const d = await r.json();
        if (d.id) refundId = d.id;
        else refundError = d.message || "PayPal-Refund fehlgeschlagen";
      } else refundError = "PayPal-Auth fehlgeschlagen";
    } else {
      refundError = "Keine Stripe-/PayPal-Daten in der Bestellung — Refund muss manuell ausgeloest werden";
    }
  } catch (e) {
    refundError = String(e.message || e);
  }

  // Status auf STORNIERT setzen (auch wenn Refund manuell)
  order.status = "STORNIERT";
  order.cancelled = new Date().toISOString();
  order.cancelReason = body.reason || "";
  order.refundId = refundId;
  order.refundAmount = amount;
  order.refundError = refundError;
  await env.LEXORD_DATA.put("order:" + orderNr, JSON.stringify(order));

  // Kunden per Mail benachrichtigen
  if (body.notify !== false && order.email && env.BREVO_API_KEY) {
    const subject = "Stornierung deiner Bestellung " + orderNr + " — LEXORD";
    const html = buildEmailTemplate({
      subject,
      customerName: order.name,
      headerTitle: "Bestellung storniert",
      body: '<p style="margin:0 0 14px 0">deine Bestellung <strong>' + escapeHtml(orderNr) + '</strong> wurde storniert.</p>'
        + '<p style="margin:0 0 14px 0"><strong>Rueckerstattung:</strong> ' + amount.toFixed(2) + ' EUR '
        + (refundId ? '(Referenz: ' + escapeHtml(refundId) + ')' : '(manuelle Bearbeitung)') + '</p>'
        + (body.reason ? '<p style="margin:0 0 14px 0"><strong>Grund:</strong> ' + escapeHtml(body.reason) + '</p>' : '')
        + '<p style="margin:0 0 14px 0">Die Erstattung wird auf das urspruengliche Zahlungskonto zurueckgebucht und ist je nach Anbieter in 3-10 Werktagen sichtbar.</p>'
        + '<p style="margin:0;color:#888">Liebe Gruesse<br><strong style="color:#fff">LEXORD Engineering</strong></p>'
    });
    await sendBrevoMail(env, order.email, subject, html, { orderNr, kind: "refund", amount, refundId });
  }
  return json({ success: !refundError || refundId !== null, refundId, refundError, amount });
}

// ──── STATUS-Update ────
async function admin2OrderStatus(request, env, orderNr) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ success: false }, 500);
  const body = await request.json().catch(() => ({}));
  const orderRaw = await env.LEXORD_DATA.get("order:" + orderNr);
  if (!orderRaw) return json({ success: false, error: "Order not found" }, 404);
  const order = JSON.parse(orderRaw);
  const oldStatus = order.status;
  order.status = body.status;
  order.statusChanged = new Date().toISOString();
  await env.LEXORD_DATA.put("order:" + orderNr, JSON.stringify(order));
  if (body.notify !== false && order.email && env.BREVO_API_KEY) {
    const subject = "Status-Update zu Bestellung " + orderNr;
    const html = buildEmailTemplate({
      subject,
      customerName: order.name,
      headerTitle: "Status-Update",
      body: '<p style="margin:0 0 14px 0">der Status deiner Bestellung <strong>' + escapeHtml(orderNr) + '</strong> wurde aktualisiert:</p>'
        + '<div style="text-align:center;margin:20px 0;padding:16px;background:#111;border:1px solid #00f2ff;border-radius:8px"><span style="font-size:20px;font-weight:900;letter-spacing:2px;color:#00f2ff">' + escapeHtml(body.status) + '</span></div>'
        + (oldStatus ? '<p style="margin:0 0 14px 0;color:#666;font-size:12px;text-align:center">vorher: ' + escapeHtml(oldStatus) + '</p>' : '')
        + '<p style="margin:0;color:#888">Liebe Gruesse<br><strong style="color:#fff">LEXORD Engineering</strong></p>'
    });
    await sendBrevoMail(env, order.email, subject, html, { orderNr, kind: "status", from: oldStatus, to: body.status });
  }
  return json({ success: true });
}

// ──── TRACKING-Nummer ────
async function admin2OrderTracking(request, env, orderNr) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ success: false }, 500);
  const body = await request.json().catch(() => ({}));
  const orderRaw = await env.LEXORD_DATA.get("order:" + orderNr);
  if (!orderRaw) return json({ success: false, error: "Order not found" }, 404);
  const order = JSON.parse(orderRaw);
  order.tracking = body.tracking;
  order.shipped = new Date().toISOString();
  order.status = order.status === "STORNIERT" ? order.status : "VERSANDT";
  await env.LEXORD_DATA.put("order:" + orderNr, JSON.stringify(order));
  if (body.notify !== false && order.email && env.BREVO_API_KEY) {
    const trackUrl = "https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=" + encodeURIComponent(body.tracking);
    const subject = "Deine Bestellung " + orderNr + " ist unterwegs!";
    const html = buildEmailTemplate({
      subject,
      customerName: order.name,
      headerTitle: "Versandbestaetigung",
      body: '<p style="margin:0 0 14px 0">deine Bestellung <strong>' + escapeHtml(orderNr) + '</strong> wurde verschickt!</p>'
        + '<p style="margin:0 0 14px 0"><strong>Tracking-Nummer:</strong> <a href="' + escapeHtml(trackUrl) + '" style="color:#00f2ff;text-decoration:none">' + escapeHtml(body.tracking) + '</a></p>'
        + '<p style="margin:0 0 14px 0">Lieferzeit: in der Regel 1-3 Werktage</p>'
        + '<p style="margin:0;color:#888">Liebe Gruesse<br><strong style="color:#fff">LEXORD Engineering</strong></p>',
      ctaButton: "Sendung verfolgen",
      ctaUrl: trackUrl
    });
    await sendBrevoMail(env, order.email, subject, html, { orderNr, kind: "tracking", tracking: body.tracking });
  }
  return json({ success: true });
}

// ──── Custom-Email an Kunden ────
async function admin2OrderEmail(request, env, orderNr) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => ({}));
  const orderRaw = await env.LEXORD_DATA.get("order:" + orderNr);
  if (!orderRaw) return json({ success: false, error: "Order not found" }, 404);
  const order = JSON.parse(orderRaw);
  if (!order.email) return json({ success: false, error: "Keine Kundenmail" }, 400);
  const emailSubject = body.subject || "Nachricht von LEXORD";
  const html = buildEmailTemplate({
    subject: emailSubject,
    customerName: order.name,
    headerTitle: emailSubject,
    body: '<div style="margin:0 0 14px 0">' + escapeHtml(body.body || "").replace(/\n/g, "<br>") + '</div>'
      + '<p style="margin:0;color:#888">Liebe Gruesse<br><strong style="color:#fff">LEXORD Engineering</strong></p>'
  });
  const ok = await sendBrevoMail(env, order.email, emailSubject, html, { orderNr, kind: "custom" });
  return json({ success: ok });
}

// ──── Rechnung als simples HTML/PDF ────
async function admin2OrderInvoice(request, env, orderNr, url) {
  // Token kann im Query stehen (fuer window.open)
  const queryToken = url.searchParams.get("token");
  if (queryToken) request = new Request(request.url, { headers: { Authorization: "Bearer " + queryToken } });
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  const orderRaw = await env.LEXORD_DATA.get("order:" + orderNr);
  if (!orderRaw) return new Response("Order not found", { status: 404 });
  const o = JSON.parse(orderRaw);
  const items = (o.items || []).map(i => "<tr><td>" + escapeHtml(i.name) + "</td><td>" + i.qty + "</td><td>" + (i.price * i.qty).toFixed(2) + " EUR</td></tr>").join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rechnung ${orderNr}</title>
<style>body{font-family:sans-serif;padding:40px;max-width:680px;margin:auto;color:#222}h1{font-size:24px;letter-spacing:3px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}th{background:#f5f5f5}.tot{font-size:18px;font-weight:700;text-align:right;padding-top:14px}.head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px}.head .brand{font-weight:900;color:#00bdd6}.print{padding:10px 20px;background:#000;color:#fff;border:none;border-radius:6px;cursor:pointer;margin-bottom:20px}@media print{.print{display:none}}</style></head>
<body><button class="print" onclick="window.print()">PDF / Drucken</button>
<div class="head"><div><h1 class="brand">LEXORD ENGINEERING</h1><div>Domsuehl, Deutschland</div><div>kontakt@lexord.de</div></div><div><div>Rechnung Nr.</div><strong>${escapeHtml(orderNr)}</strong><div>${new Date(o.date || o.created).toLocaleDateString("de-DE")}</div></div></div>
<div><strong>${escapeHtml(o.name || "")}</strong><br>${escapeHtml(o.email || "")}<br>${escapeHtml(o.address || "")}</div>
<table><thead><tr><th>Artikel</th><th>Menge</th><th>Preis</th></tr></thead><tbody>${items}</tbody></table>
<div class="tot">Gesamt: ${parseFloat(o.total || 0).toFixed(2)} EUR</div>
<p style="margin-top:30px;font-size:11px;color:#888">Kleinunternehmer gemaess Para 19 UStG — kein Ausweis der Umsatzsteuer.</p>
</body></html>`;
  // Rechnungs-Snapshot ins verschluesselte Archiv (GoBD: jede Rechnung muss unveraenderlich archiviert sein)
  try { await archiveStore(env, "invoice", { orderNr, total: o.total, html, order: o }); } catch (e) {}
  return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8", ...CORS } });
}

// ──── DISCOUNTS CRUD ────
async function admin2DiscountsList(request, env) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ discounts: [] });
  const list = await env.LEXORD_DATA.list({ prefix: "discount:" });
  const discounts = [];
  for (const k of list.keys) {
    const raw = await env.LEXORD_DATA.get(k.name);
    if (raw) discounts.push(JSON.parse(raw));
  }
  discounts.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
  return json({ discounts });
}
async function admin2DiscountsCreate(request, env) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ success: false }, 500);
  const body = await request.json().catch(() => ({}));
  const code = (body.code || "").toUpperCase().trim();
  if (!code) return json({ success: false, error: "Code fehlt" }, 400);
  const existing = await env.LEXORD_DATA.get("discount:" + code);
  if (existing) return json({ success: false, error: "Code existiert" }, 409);
  const disc = {
    code,
    type: body.type || "percent",
    value: parseFloat(body.value || 0),
    expires: body.expires || null,
    active: true,
    uses: 0,
    totalDiscount: 0,
    created: new Date().toISOString()
  };
  await env.LEXORD_DATA.put("discount:" + code, JSON.stringify(disc));
  return json({ success: true, discount: disc });
}
async function admin2DiscountToggle(request, env, code) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => ({}));
  const raw = await env.LEXORD_DATA.get("discount:" + code);
  if (!raw) return json({ success: false }, 404);
  const d = JSON.parse(raw);
  d.active = !!body.active;
  await env.LEXORD_DATA.put("discount:" + code, JSON.stringify(d));
  return json({ success: true });
}
async function admin2DiscountDelete(request, env, code) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  await env.LEXORD_DATA.delete("discount:" + code);
  return json({ success: true });
}

// ──── DEEP STATS ────
async function admin2DeepStats(request, env) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ products: [], configurations: [], abandonment: {}, topCustomers: [] });
  const orderList = await env.LEXORD_DATA.list({ prefix: "order:" });
  const products = {};
  const configs = {};
  const customers = {};
  for (const k of orderList.keys) {
    const raw = await env.LEXORD_DATA.get(k.name);
    if (!raw) continue;
    const o = JSON.parse(raw);
    if (o.status === "STORNIERT") continue;
    for (const i of (o.items || [])) {
      products[i.name] = (products[i.name] || 0) + (i.qty || 1);
    }
    // Config-Detection: items mit "custom" oder spezifischen Namen
    for (const i of (o.items || [])) {
      if (/custom|lxrd|edition/i.test(i.name)) {
        configs[i.name] = (configs[i.name] || 0) + 1;
      }
    }
    const em = (o.email || "").toLowerCase();
    if (em) {
      if (!customers[em]) customers[em] = { email: em, name: o.name || em, totalSpent: 0, orderCount: 0 };
      customers[em].totalSpent += parseFloat(o.total || 0);
      customers[em].orderCount++;
    }
  }
  // Aggregations
  const productsArr = Object.entries(products).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const configsArr = Object.entries(configs).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const topCustomers = Object.values(customers).sort((a, b) => b.totalSpent - a.totalSpent);

  // Cart-Abandonment aus today-agg (vereinfachte Cross-Day-Aggregation)
  let abStarted = 0, abCheckout = 0, abCompleted = 0;
  const aggList = await env.LEXORD_DATA.list({ prefix: "agg:" });
  for (const k of aggList.keys) {
    const raw = await env.LEXORD_DATA.get(k.name);
    if (!raw) continue;
    const a = JSON.parse(raw);
    abStarted += a.carts || 0;
    abCheckout += a.checkouts || 0;
    abCompleted += a.orders || 0;
  }
  return json({
    products: productsArr,
    configurations: configsArr,
    abandonment: { started: abStarted, checkout: abCheckout, completed: abCompleted },
    topCustomers
  });
}

// ──── Brevo-Mail Helper ────
async function sendBrevoMail(env, to, subject, html, meta) {
  if (!env.BREVO_API_KEY) return false;
  let ok = false;
  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: "LEXORD Engineering", email: env.FROM_EMAIL || "kontakt@lexord.de" },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });
    ok = r.ok;
  } catch (e) {
    ok = false;
  }
  // === ARCHIV: jede Mail wird verschluesselt + unveraenderlich gespeichert ===
  try { await archiveStore(env, "email", { to, subject, html, ok, ...(meta || {}) }); } catch (e) {}
  return ok;
}

// ════════════════════════════════════════════════════════════════
// VERSCHLUESSELTES ARCHIV (AES-256-GCM, GoBD: append-only)
// ════════════════════════════════════════════════════════════════
async function deriveKey(env) {
  const secret = env.ARCHIVE_KEY || env.JWT_SECRET || env.ADMIN_PASSWORD || "lxrd-fallback";
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode("lxrd-archive::" + secret));
  return await crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
async function aesEncrypt(env, plaintext) {
  const key = await deriveKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc);
  const buf = new Uint8Array(iv.byteLength + cipher.byteLength);
  buf.set(iv, 0); buf.set(new Uint8Array(cipher), iv.byteLength);
  // base64url
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function aesDecrypt(env, ciphertext) {
  try {
    const key = await deriveKey(env);
    const b64 = ciphertext.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const buf = Uint8Array.from(bin, c => c.charCodeAt(0));
    const iv = buf.slice(0, 12);
    const data = buf.slice(12);
    const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(dec);
  } catch (e) { return null; }
}

// Speichert einen Eintrag im verschluesselten Archiv (Append-Only).
// type: "email" | "invoice" | "refund" | "status" | "tracking"
async function archiveStore(env, type, data) {
  if (!env.LEXORD_DATA) return;
  const id = Date.now() + "-" + Math.random().toString(36).slice(2, 10);
  const entry = {
    id, type,
    time: new Date().toISOString(),
    data
  };
  const json = JSON.stringify(entry);
  // SHA-256 Hash als Integritaets-Pruefsumme (gegen Manipulation erkennbar)
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json));
  const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
  const cipher = await aesEncrypt(env, json);
  await env.LEXORD_DATA.put("archive:" + entry.time + ":" + id, JSON.stringify({ cipher, hash, type, time: entry.time }));
}

async function archiveLoad(env, key) {
  const raw = await env.LEXORD_DATA.get(key);
  if (!raw) return null;
  const wrapper = JSON.parse(raw);
  const plain = await aesDecrypt(env, wrapper.cipher);
  if (!plain) return null;
  // Integritaets-Check
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
  const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
  const intact = (hash === wrapper.hash);
  return { ...JSON.parse(plain), _intact: intact, _hash: wrapper.hash };
}

async function admin2ArchiveList(request, env, url) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ entries: [] });
  const typeFilter = url.searchParams.get("type");
  const list = await env.LEXORD_DATA.list({ prefix: "archive:" });
  const entries = [];
  // Reverse-chronologisch
  list.keys.reverse();
  for (const k of list.keys.slice(0, 200)) {
    const raw = await env.LEXORD_DATA.get(k.name);
    if (!raw) continue;
    const w = JSON.parse(raw);
    if (typeFilter && w.type !== typeFilter) continue;
    // Nur Metadaten in der Liste (nicht der entschluesselte Inhalt)
    entries.push({ key: k.name, type: w.type, time: w.time, hash: w.hash.slice(0, 16) });
  }
  return json({ entries, total: list.keys.length });
}

async function admin2ArchiveGet(request, env, key) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ error: "KV nicht verbunden" }, 500);
  const entry = await archiveLoad(env, key);
  if (!entry) return json({ error: "Eintrag nicht gefunden oder Schluessel falsch" }, 404);
  return json({ entry });
}

// ════════════════════════════════════════════════════════════════
// WEB PUSH (RFC 8291 + VAPID) — native Lockscreen-Push wie Shopify
// REQUIRED Cloudflare Secrets:
//   VAPID_PUBLIC_KEY  (Base64URL, 87 chars, beginnt mit 'B')
//   VAPID_PRIVATE_KEY (Base64URL, 43 chars)
//   VAPID_SUBJECT     (mailto:dein-email@domain.de)
// Generieren: einmaliger Aufruf /admin/push/genkeys (admin auth required)
// ════════════════════════════════════════════════════════════════

function b64uEncode(buf){
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = '';
  for(let i=0;i<bytes.length;i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64uDecode(s){
  const pad = '='.repeat((4 - s.length % 4) % 4);
  const b64 = (s + pad).replace(/-/g,'+').replace(/_/g,'/');
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
function concatBuf(...arrs){
  const len = arrs.reduce((a,b)=>a + b.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for(const a of arrs){ out.set(a, off); off += a.length; }
  return out;
}

/* HKDF mit SHA-256 (RFC 5869) */
async function hkdfExpand(prk, info, length){
  const key = await crypto.subtle.importKey('raw', prk, {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  let T = new Uint8Array(0), out = new Uint8Array(0), counter = 0;
  while(out.length < length){
    counter++;
    const input = concatBuf(T, info, new Uint8Array([counter]));
    const sig = await crypto.subtle.sign('HMAC', key, input);
    T = new Uint8Array(sig);
    out = concatBuf(out, T);
  }
  return out.slice(0, length);
}
async function hkdf(salt, ikm, info, length){
  const saltKey = await crypto.subtle.importKey('raw', salt, {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, ikm));
  return hkdfExpand(prk, info, length);
}

/* DER -> raw signature (ECDSA) — Cloudflare gibt raw, aber zur Sicherheit Helper */
function jwtSegment(obj){ return b64uEncode(new TextEncoder().encode(JSON.stringify(obj))); }

async function buildVapidJwt(env, audience){
  if(!env.VAPID_PRIVATE_KEY) throw new Error('VAPID_PRIVATE_KEY fehlt');
  const header = { typ:'JWT', alg:'ES256' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now()/1000) + 12*60*60,
    sub: env.VAPID_SUBJECT || 'mailto:kontakt@lexord.de'
  };
  const unsigned = jwtSegment(header) + '.' + jwtSegment(payload);
  /* Private Key als PKCS8 importieren via raw d-bytes -> JWK */
  const d = b64uDecode(env.VAPID_PRIVATE_KEY);
  if(!env.VAPID_PUBLIC_KEY) throw new Error('VAPID_PUBLIC_KEY fehlt');
  const pubRaw = b64uDecode(env.VAPID_PUBLIC_KEY); // 65 bytes uncompressed (0x04 + X + Y)
  if(pubRaw.length !== 65 || pubRaw[0] !== 0x04) throw new Error('VAPID_PUBLIC_KEY format invalid');
  const x = pubRaw.slice(1, 33);
  const y = pubRaw.slice(33, 65);
  const jwk = {
    kty: 'EC', crv: 'P-256',
    d: b64uEncode(d),
    x: b64uEncode(x),
    y: b64uEncode(y),
    ext: true
  };
  const key = await crypto.subtle.importKey('jwk', jwk, {name:'ECDSA',namedCurve:'P-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign({name:'ECDSA', hash:'SHA-256'}, key, new TextEncoder().encode(unsigned));
  return unsigned + '.' + b64uEncode(sig);
}

/* Payload-Encryption gem. RFC 8291 (aes128gcm) */
async function encryptPushPayload(payload, p256dhRaw, authRaw){
  // 1. Eigenes Ephemeral-Keypair
  const local = await crypto.subtle.generateKey({name:'ECDH', namedCurve:'P-256'}, true, ['deriveBits']);
  const localPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));

  // 2. Client public key importieren
  const clientPub = await crypto.subtle.importKey('raw', p256dhRaw, {name:'ECDH', namedCurve:'P-256'}, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH', public:clientPub}, local.privateKey, 256));

  // 3. PRK_key = HKDF(auth, sharedSecret, "WebPush: info\0" + clientPub + localPub, 32)
  const infoKey = concatBuf(
    new TextEncoder().encode('WebPush: info\0'),
    p256dhRaw, localPubRaw
  );
  const ikm = await hkdf(authRaw, sharedSecret, infoKey, 32);

  // 4. Salt (16 random bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 5. CEK + Nonce ableiten
  const cek = await hkdf(salt, ikm, concatBuf(new TextEncoder().encode('Content-Encoding: aes128gcm\0')), 16);
  const nonce = await hkdf(salt, ikm, concatBuf(new TextEncoder().encode('Content-Encoding: nonce\0')), 12);

  // 6. Plaintext + Padding (0x02 + 00..00) — minimales Padding
  const plain = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload;
  const padded = concatBuf(plain, new Uint8Array([0x02]));

  // 7. AES-128-GCM
  const cekKey = await crypto.subtle.importKey('raw', cek, {name:'AES-GCM'}, false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv:nonce}, cekKey, padded));

  // 8. Header (aes128gcm): salt(16) | rs(4)=4096 | idlen(1)=65 | keyid(localPubRaw 65 bytes)
  const rs = new Uint8Array([0x00, 0x00, 0x10, 0x00]);
  const idlen = new Uint8Array([65]);
  const header = concatBuf(salt, rs, idlen, localPubRaw);

  return concatBuf(header, cipher);
}

async function sendWebPush(env, subscription, payloadStr){
  const endpoint = subscription.endpoint;
  if(!endpoint) return false;
  const aud = new URL(endpoint).origin;
  let jwt;
  try { jwt = await buildVapidJwt(env, aud); }
  catch(e){ console.log('VAPID jwt error:', e.message); return false; }

  const p256dh = b64uDecode(subscription.keys.p256dh);
  const auth = b64uDecode(subscription.keys.auth);
  const encrypted = await encryptPushPayload(payloadStr, p256dh, auth);

  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'TTL': '86400',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Authorization': 'vapid t=' + jwt + ', k=' + env.VAPID_PUBLIC_KEY
    },
    body: encrypted
  });
  return r.ok || r.status === 201;
}

/* Alle gespeicherten Subscriptions abrufen, Push an jede senden */
async function broadcastPush(env, payload){
  if(!env.LEXORD_DATA || !env.VAPID_PRIVATE_KEY) return { sent:0, failed:0 };
  const list = await env.LEXORD_DATA.list({ prefix:'pushsub:' });
  let sent = 0, failed = 0;
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  for(const k of list.keys){
    const raw = await env.LEXORD_DATA.get(k.name);
    if(!raw) continue;
    try{
      const sub = JSON.parse(raw);
      const ok = await sendWebPush(env, sub, payloadStr);
      if(ok) sent++;
      else { failed++; /* Abgelaufene Subs entfernen */ await env.LEXORD_DATA.delete(k.name); }
    }catch(e){ failed++; }
  }
  return { sent, failed };
}

// ──── ENDPOINTS ────
async function admin2PushKey(request, env){
  if(!checkAdmin(request, env)) return json({ error:'Unauthorized' }, 401);
  if(!env.VAPID_PUBLIC_KEY) return json({ error:'VAPID_PUBLIC_KEY nicht im Worker gesetzt' }, 500);
  return json({ publicKey: env.VAPID_PUBLIC_KEY });
}
async function admin2PushSubscribe(request, env){
  if(!checkAdmin(request, env)) return json({ error:'Unauthorized' }, 401);
  if(!env.LEXORD_DATA) return json({ success:false }, 500);
  const body = await request.json().catch(()=>({}));
  const sub = body.subscription || body;
  if(!sub || !sub.endpoint) return json({ success:false, error:'Invalid subscription' }, 400);
  const id = b64uEncode(new TextEncoder().encode(sub.endpoint)).slice(0, 64);
  await env.LEXORD_DATA.put('pushsub:'+id, JSON.stringify({ ...sub, added: new Date().toISOString() }));
  return json({ success:true, id });
}
async function admin2PushUnsubscribe(request, env){
  if(!checkAdmin(request, env)) return json({ success:true });
  const body = await request.json().catch(()=>({}));
  if(!body.endpoint) return json({ success:true });
  const id = b64uEncode(new TextEncoder().encode(body.endpoint)).slice(0, 64);
  if(env.LEXORD_DATA) await env.LEXORD_DATA.delete('pushsub:'+id);
  return json({ success:true });
}
async function admin2PushTest(request, env){
  if(!checkAdmin(request, env)) return json({ error:'Unauthorized' }, 401);
  const result = await broadcastPush(env, {
    title:'🎮 LEXORD Test',
    body:'Push funktioniert! Du bist abonniert ✓',
    tag:'test-'+Date.now(),
    url:'/admin.html'
  });
  return json({ success: result.sent > 0, ...result });
}

/* Einmaliger Generator fuer VAPID-Keys (zum Setup) */
async function admin2PushGenKeys(request, env){
  if(!checkAdmin(request, env)) return json({ error:'Unauthorized' }, 401);
  const kp = await crypto.subtle.generateKey({name:'ECDSA', namedCurve:'P-256'}, true, ['sign','verify']);
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  // x|y in JWK -> uncompressed public key
  const x = b64uDecode(jwk.x), y = b64uDecode(jwk.y);
  const pub = concatBuf(new Uint8Array([0x04]), x, y);
  const d = b64uDecode(jwk.d);
  return json({
    note: 'Diese Keys EINMAL als Cloudflare-Secrets speichern, dann NIE wieder neu generieren!',
    publicKey: b64uEncode(pub),
    privateKey: b64uEncode(d),
    subject: 'mailto:kontakt@lexord.de',
    instructions: 'In Cloudflare → Worker Settings → Variables and Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT setzen'
  });
}

// ════════════════════════════════════════════════════════════════
// PROFESSIONELLES EMAIL-TEMPLATE (LEXORD Design)
// ════════════════════════════════════════════════════════════════
function buildEmailTemplate(opts) {
  const { subject, customerName, body, ctaButton, ctaUrl, headerTitle } = opts || {};
  const name = escapeHtml(customerName || "Kunde");
  const header = escapeHtml(headerTitle || subject || "");
  const ctaHtml = (ctaButton && ctaUrl)
    ? '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0 auto"><tr><td align="center" style="border-radius:8px;background:linear-gradient(135deg,#00f2ff,#00c4cc)" bgcolor="#00f2ff"><a href="' + escapeHtml(ctaUrl) + '" target="_blank" style="display:inline-block;padding:14px 36px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:900;letter-spacing:2px;color:#000;text-decoration:none;text-transform:uppercase">' + escapeHtml(ctaButton) + '</a></td></tr></table>'
    : '';
  return '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>' + escapeHtml(subject || '') + '</title></head>'
    + '<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,Helvetica,sans-serif">'
    + '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0a0a">'
    + '<tr><td align="center" style="padding:30px 16px">'
    // Inner container
    + '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%">'
    // Header
    + '<tr><td style="background:#000;padding:32px 40px;border-radius:14px 14px 0 0;border-bottom:3px solid #00f2ff;text-align:center">'
    + '<div style="font-size:26px;font-weight:900;letter-spacing:6px;color:#fff;font-family:Arial,Helvetica,sans-serif">LEXORD<span style="color:#00f2ff;font-size:16px;vertical-align:super">&reg;</span></div>'
    + '<div style="font-size:10px;letter-spacing:4px;color:#555;text-transform:uppercase;margin-top:4px">ENGINEERING</div>'
    + '</td></tr>'
    // Header title bar
    + (header ? '<tr><td style="background:#111;padding:18px 40px;text-align:center"><div style="font-size:14px;font-weight:700;letter-spacing:2px;color:#00f2ff;text-transform:uppercase">' + header + '</div></td></tr>' : '')
    // Body
    + '<tr><td style="background:#1a1a1a;padding:36px 40px;color:#e0e0e0;font-size:15px;line-height:1.7">'
    + '<p style="margin:0 0 16px 0;color:#fff;font-size:16px">Hallo <strong>' + name + '</strong>,</p>'
    + body
    + ctaHtml
    + '</td></tr>'
    // Divider
    + '<tr><td style="background:#1a1a1a;padding:0 40px"><div style="border-top:1px solid #333"></div></td></tr>'
    // Footer
    + '<tr><td style="background:#1a1a1a;padding:28px 40px 36px;border-radius:0 0 14px 14px">'
    + '<div style="font-size:11px;color:#666;line-height:1.8;text-align:center">'
    + '<div style="font-weight:700;color:#888;letter-spacing:2px;margin-bottom:6px">LEXORD ENGINEERING</div>'
    + 'Leon Schulz<br>'
    + 'An Der Domsuehler Str. 2, 19374 Domsuhl<br>'
    + '<a href="mailto:kontakt@lexord.de" style="color:#00f2ff;text-decoration:none">kontakt@lexord.de</a>'
    + ' &middot; <a href="tel:+4915204718720" style="color:#00f2ff;text-decoration:none">0152 047 18720</a><br>'
    + '<br>'
    + '<span style="color:#555">Kleinunternehmer gem. &sect; 19 UStG &mdash; kein Ausweis der Umsatzsteuer.</span>'
    + '</div>'
    + '</td></tr>'
    + '</table>'
    + '</td></tr></table>'
    + '</body></html>';
}


// ──── REPARATUR: Custom-Email an Kunden ────
async function admin2RepairEmail(request, env, repNr) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => ({}));
  const repRaw = await env.LEXORD_DATA.get("repair:" + repNr);
  if (!repRaw) return json({ success: false, error: "Reparatur nicht gefunden" }, 404);
  const rep = JSON.parse(repRaw);
  const to = body.to || rep.email;
  if (!to) return json({ success: false, error: "Keine Kundenmail" }, 400);
  const html = buildEmailTemplate({
    headerTitle: body.subject || "Update zu deiner Reparatur",
    customerName: body.name || rep.fname || rep.name || "Kunde",
    body: "<p>" + escapeHtml(body.body || "").replace(/\n/g, "<br>") + "</p>" +
      "<p style='margin-top:18px;padding:14px;background:#f0f0f0;border-radius:8px;color:#333'>Reparatur-Nr.: <strong style='color:#00bdd6'>" + escapeHtml(repNr) + "</strong></p>"
  });
  const ok = await sendBrevoMail(env, to, body.subject || "Update Reparatur " + repNr, html, { repNr, kind: "repair-email" });
  return json({ success: ok });
}

// ──── REPARATUR: Kostenvoranschlag senden ────
async function admin2RepairQuote(request, env, repNr) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => ({}));
  const repRaw = await env.LEXORD_DATA.get("repair:" + repNr);
  if (!repRaw) return json({ success: false, error: "Reparatur nicht gefunden" }, 404);
  const rep = JSON.parse(repRaw);
  const to = body.to || rep.email;
  if (!to) return json({ success: false, error: "Keine Kundenmail" }, 400);
  // Preis in der Reparatur speichern
  if (body.price) {
    rep.estPrice = body.price;
    rep.status = rep.status === "received" ? "diagnosed" : rep.status;
    rep.updated = new Date().toISOString();
    await env.LEXORD_DATA.put("repair:" + repNr, JSON.stringify(rep));
  }
  const html = buildEmailTemplate({
    headerTitle: "Kostenvoranschlag",
    customerName: body.name || rep.fname || rep.name || "Kunde",
    body: "<p>vielen Dank fuer deine Reparaturanfrage. Hier ist unser Kostenvoranschlag:</p>" +
      "<table cellpadding='0' cellspacing='0' border='0' width='100%' style='margin:20px 0'>" +
      "<tr><td style='padding:12px;background:#f9f9f9;border-left:4px solid #00f2ff;border-radius:6px'>" +
      "<div style='font-size:12px;color:#666'>Reparatur-Nr.</div><div style='font-size:16px;font-weight:900;color:#00bdd6'>" + escapeHtml(repNr) + "</div>" +
      "</td></tr></table>" +
      (body.damage ? "<p><strong>Diagnose:</strong> " + escapeHtml(body.damage) + "</p>" : "") +
      "<p style='font-size:22px;font-weight:900;color:#00bdd6;margin:16px 0'>" + escapeHtml(body.price || "–") + "</p>" +
      (body.time ? "<p><strong>Bearbeitungszeit:</strong> " + escapeHtml(body.time) + "</p>" : "") +
      (body.note ? "<p style='color:#666;margin-top:12px'>" + escapeHtml(body.note) + "</p>" : "") +
      "<p style='margin-top:20px'>Moechtest du die Reparatur durchfuehren lassen? Antworte einfach auf diese Mail mit <strong>JA</strong> oder <strong>NEIN</strong>.</p>",
    ctaButton: "REPARATUR BESTÄTIGEN",
    ctaUrl: "mailto:kontakt@lexord.de?subject=Reparatur%20" + encodeURIComponent(repNr) + "%20bestaetigen&body=Ja%2C%20bitte%20Reparatur%20durchfuehren."
  });
  const ok = await sendBrevoMail(env, to, "Kostenvoranschlag Reparatur " + repNr + " — LEXORD", html, { repNr, kind: "repair-quote", price: body.price });
  return json({ success: ok });
}

// ──── REPARATUR: Rechnung/Quittung als HTML ────
async function admin2RepairInvoice(request, env, repNr, url) {
  const queryToken = url.searchParams.get("token");
  if (queryToken) request = new Request(request.url, { headers: { Authorization: "Bearer " + queryToken } });
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  const repRaw = await env.LEXORD_DATA.get("repair:" + repNr);
  if (!repRaw) return new Response("Reparatur not found", { status: 404 });
  const r = JSON.parse(repRaw);
  const name = r.name || ((r.fname||'') + ' ' + (r.lname||'')).trim() || 'Kunde';
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reparatur-Rechnung ' + repNr + '</title>' +
    '<style>body{font-family:sans-serif;padding:40px;max-width:680px;margin:auto;color:#222}h1{font-size:24px;letter-spacing:3px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}th{background:#f5f5f5}.tot{font-size:18px;font-weight:700;text-align:right;padding-top:14px}.head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px}.head .brand{font-weight:900;color:#00bdd6}.print{padding:10px 20px;background:#000;color:#fff;border:none;border-radius:6px;cursor:pointer;margin-bottom:20px}@media print{.print{display:none}}</style></head>' +
    '<body><button class="print" onclick="window.print()">PDF / Drucken</button>' +
    '<div class="head"><div><h1 class="brand">LEXORD ENGINEERING</h1><div>Domsuehl, Deutschland</div><div>kontakt@lexord.de</div></div><div><div>Reparatur-Rechnung</div><strong>' + escapeHtml(repNr) + '</strong><div>' + new Date(r.date||r.created||Date.now()).toLocaleDateString("de-DE") + '</div></div></div>' +
    '<div><strong>' + escapeHtml(name) + '</strong><br>' + escapeHtml(r.email||'') + '<br>' + escapeHtml((r.addr||'') + ' ' + (r.zip||'') + ' ' + (r.city||'')) + '</div>' +
    '<table><thead><tr><th>Beschreibung</th><th>Details</th></tr></thead><tbody>' +
    '<tr><td>Controller-Modell</td><td>' + escapeHtml(r.model||'PS5 DualSense') + '</td></tr>' +
    '<tr><td>Schaden / Diagnose</td><td>' + escapeHtml(r.damage||r.damageKey||'-') + '</td></tr>' +
    '<tr><td>Beschreibung</td><td>' + escapeHtml(r.desc||'-') + '</td></tr>' +
    '<tr><td>Status</td><td>' + escapeHtml(r.status||'received') + '</td></tr>' +
    (r.tracking?'<tr><td>Tracking</td><td>' + escapeHtml(r.tracking) + '</td></tr>':'') +
    '</tbody></table>' +
    '<div class="tot">Reparaturkosten: ' + escapeHtml(r.finalPrice||r.estPrice||'nach Aufwand') + '</div>' +
    '<p style="margin-top:30px;font-size:11px;color:#888">Kleinunternehmer gemaess Para 19 UStG — kein Ausweis der Umsatzsteuer.</p>' +
    '</body></html>';
  try { await archiveStore(env, "invoice", { repNr, html, repair: r }); } catch(e){}
  return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8", ...CORS } });
}

// ────────────────────────────────────────────────────
// EU-WIDERRUF (Verbraucherrechte-Richtlinie 2023/2673)
// ────────────────────────────────────────────────────
async function saveWiderruf(request, env) {
  if (!env.LEXORD_DATA) return json({ success: false, error: "DB nicht konfiguriert" }, 500);
  const body = await request.json().catch(() => ({}));
  if (!body.orderNr || !body.email || !body.name) return json({ success: false, error: "Pflichtfelder fehlen" }, 400);

  const wfNr = "WF-" + Date.now().toString(36).toUpperCase().slice(-8);
  const entry = {
    wfNr,
    orderNr: body.orderNr,
    email: body.email.toLowerCase(),
    name: body.name,
    orderDate: body.orderDate,
    address: body.address,
    items: body.items,
    reason: body.reason || "",
    status: "received",
    submitted: body.submitted || new Date().toISOString(),
    ip: request.headers.get("CF-Connecting-IP") || ""
  };
  await env.LEXORD_DATA.put("widerruf:" + wfNr, JSON.stringify(entry));
  await env.LEXORD_DATA.put("byemail:" + entry.email + ":widerruf:" + wfNr, wfNr);

  // Push-Notification an Admin
  try {
    await broadcastPush(env, {
      title: "🛡 EU-Widerruf eingegangen",
      body: entry.name + " · " + entry.orderNr,
      tag: "widerruf-" + wfNr,
      url: "/admin.html",
      type: "widerruf"
    });
  } catch (e) {}

  // Bestätigungsmail an Kunden — professionelles Template mit allen Pflichtangaben
  if (env.BREVO_API_KEY) {
    const html = buildEmailTemplate({
      headerTitle: "Widerruf bestätigt",
      customerName: entry.name,
      body:
        "<p style='margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#e0e0e0'>vielen Dank — wir haben deinen Widerruf gemäß <strong style='color:#fff'>EU-Verbraucherrechte-Richtlinie 2023/2673</strong> erhalten und bestätigen ihn hiermit.</p>" +
        // Widerrufs-Box
        "<table cellpadding='0' cellspacing='0' border='0' width='100%' style='margin:24px 0;border-collapse:collapse'>" +
        "<tr><td style='padding:20px;background:linear-gradient(135deg,#001428 0%,#0a1a2e 100%);border-left:4px solid #00f2ff;border-radius:8px'>" +
        "<div style='font-family:Arial,sans-serif;font-size:10px;color:#888;letter-spacing:2px;margin-bottom:4px'>WIDERRUFS-NUMMER</div>" +
        "<div style='font-family:Arial,sans-serif;font-size:22px;font-weight:900;color:#00f2ff;letter-spacing:2px;margin-bottom:10px'>" + escapeHtml(wfNr) + "</div>" +
        "<div style='font-size:12px;color:#aaa;line-height:1.7'>Bestellnummer: <strong style='color:#fff'>" + escapeHtml(entry.orderNr) + "</strong><br>" +
        "Bestelldatum: <strong style='color:#fff'>" + (entry.orderDate ? new Date(entry.orderDate).toLocaleDateString('de-DE') : '–') + "</strong><br>" +
        "Eingangsdatum: <strong style='color:#fff'>" + new Date(entry.submitted).toLocaleDateString('de-DE') + "</strong></div>" +
        "</td></tr></table>" +
        // Rücksende-Adresse Box (prominent!)
        "<div style='margin:24px 0 8px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#00f2ff;font-weight:700'>📦 RÜCKSENDE-ADRESSE</div>" +
        "<table cellpadding='0' cellspacing='0' border='0' width='100%' style='margin:0 0 24px 0;border-collapse:collapse'>" +
        "<tr><td style='padding:18px 20px;background:#fff;border-radius:8px;color:#000'>" +
        "<div style='font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#000;line-height:1.6'>LEXORD Engineering<br>Leon Schulz<br>An Der Domsühler Str. 2<br>19374 Domsühl<br>Deutschland</div>" +
        "</td></tr></table>" +
        // Schritte
        "<div style='font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#00f2ff;font-weight:700;margin:24px 0 12px 0'>✓ NÄCHSTE SCHRITTE</div>" +
        "<table cellpadding='0' cellspacing='0' border='0' width='100%' style='border-collapse:collapse'>" +
        "<tr><td style='padding:12px 0;border-bottom:1px solid #333;vertical-align:top;color:#e0e0e0;font-size:13px;line-height:1.6'>" +
        "<strong style='color:#00f2ff;font-size:18px;margin-right:10px'>1.</strong>Sende die Ware <strong style='color:#fff'>innerhalb von 14 Tagen</strong> ab Eingang dieser Mail an die oben genannte Adresse zurück.</td></tr>" +
        "<tr><td style='padding:12px 0;border-bottom:1px solid #333;vertical-align:top;color:#e0e0e0;font-size:13px;line-height:1.6'>" +
        "<strong style='color:#00f2ff;font-size:18px;margin-right:10px'>2.</strong>Bitte verwende einen versicherten und nachverfolgbaren Versand (z.B. DHL Paket mit Sendungsverfolgung). Die <strong style='color:#fff'>Rücksendekosten trägst du</strong> als Kunde.</td></tr>" +
        "<tr><td style='padding:12px 0;border-bottom:1px solid #333;vertical-align:top;color:#e0e0e0;font-size:13px;line-height:1.6'>" +
        "<strong style='color:#00f2ff;font-size:18px;margin-right:10px'>3.</strong>Lege bitte einen Zettel mit deiner Widerrufs-Nummer <strong style='color:#00f2ff'>" + escapeHtml(wfNr) + "</strong> in das Paket — so können wir es schneller zuordnen.</td></tr>" +
        "<tr><td style='padding:12px 0;vertical-align:top;color:#e0e0e0;font-size:13px;line-height:1.6'>" +
        "<strong style='color:#00f2ff;font-size:18px;margin-right:10px'>4.</strong>Nach Eingang der Ware erhältst du die Erstattung <strong style='color:#fff'>innerhalb von 14 Tagen</strong> auf das ursprüngliche Zahlungsmittel.</td></tr>" +
        "</table>" +
        // Widerrufene Artikel
        "<div style='font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#00f2ff;font-weight:700;margin:24px 0 8px 0'>📋 WIDERRUFENE ARTIKEL</div>" +
        "<table cellpadding='0' cellspacing='0' border='0' width='100%' style='border-collapse:collapse;margin-bottom:18px'>" +
        "<tr><td style='padding:14px 18px;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;color:#ccc;font-size:13px;line-height:1.6'>" +
        escapeHtml(entry.items).replace(/\n/g, "<br>") + "</td></tr></table>" +
        // Wichtige Hinweise
        "<table cellpadding='0' cellspacing='0' border='0' width='100%' style='margin:24px 0;border-collapse:collapse'>" +
        "<tr><td style='padding:14px 18px;background:#2a1f00;border-left:4px solid #ffa500;border-radius:8px;color:#ffd180;font-size:12px;line-height:1.6'>" +
        "<strong style='color:#fff'>⚠ Ausnahmen vom Widerrufsrecht:</strong><br>" +
        "Individuell konfigurierte Controller (§ 312g Abs. 2 Nr. 1 BGB) sowie bereits begonnene Reparaturen (§ 356 Abs. 4 BGB) sind vom Widerrufsrecht ausgenommen. Diese Artikel können nicht widerrufen werden." +
        "</td></tr></table>" +
        // Kontakt
        "<p style='margin:28px 0 0 0;font-size:13px;color:#aaa;line-height:1.7'>Bei Fragen zu deinem Widerruf erreichst du uns unter:<br>" +
        "<strong style='color:#fff'>📧 <a href='mailto:Kontakt@Lexord.de' style='color:#00f2ff;text-decoration:none'>Kontakt@Lexord.de</a></strong><br>" +
        "<strong style='color:#fff'>📞 <a href='tel:+4915204718720' style='color:#00f2ff;text-decoration:none'>0152 047 18720</a></strong><br>" +
        "<strong style='color:#fff'>💬 <a href='https://wa.me/4915204718720' style='color:#00f2ff;text-decoration:none'>WhatsApp Chat</a></strong></p>" +
        "<p style='margin:18px 0 0 0;font-size:11px;color:#666;line-height:1.6'>Diese Bestätigung gilt als Eingangsbestätigung gemäß § 312k BGB. Sie wurde am " + new Date().toLocaleString('de-DE') + " automatisch erstellt.</p>"
    });
    await sendBrevoMail(env, entry.email, "Widerruf " + wfNr + " bestätigt — LEXORD Engineering", html, { wfNr, kind: "widerruf-confirm" });

    // Admin-Benachrichtigung
    const adminHtml = buildEmailTemplate({
      headerTitle: "🛡 Neuer EU-Widerruf",
      customerName: "Admin",
      body:
        "<p style='margin:0 0 18px 0;font-size:15px;color:#fff'>Ein neuer EU-Widerruf ist eingegangen und wartet auf Bearbeitung im <a href='https://lexord.de/admin.html' style='color:#00f2ff;text-decoration:none'>Admin-Panel</a>.</p>" +
        "<table cellpadding='0' cellspacing='0' border='0' width='100%' style='margin:20px 0;border-collapse:collapse'>" +
        "<tr><td style='padding:18px 20px;background:#001428;border-left:4px solid #00f2ff;border-radius:8px'>" +
        "<div style='font-size:10px;color:#888;letter-spacing:2px;margin-bottom:4px'>WIDERRUFS-NR</div>" +
        "<div style='font-size:20px;font-weight:900;color:#00f2ff;margin-bottom:14px'>" + escapeHtml(wfNr) + "</div>" +
        "<table cellpadding='0' cellspacing='0' border='0' width='100%' style='font-size:13px;color:#e0e0e0;line-height:2'>" +
        "<tr><td style='color:#888;width:120px'>Kunde:</td><td><strong style='color:#fff'>" + escapeHtml(entry.name) + "</strong></td></tr>" +
        "<tr><td style='color:#888'>Email:</td><td><a href='mailto:" + escapeHtml(entry.email) + "' style='color:#00f2ff'>" + escapeHtml(entry.email) + "</a></td></tr>" +
        "<tr><td style='color:#888'>Bestellung:</td><td><strong style='color:#fff'>" + escapeHtml(entry.orderNr) + "</strong></td></tr>" +
        "<tr><td style='color:#888'>Bestelldatum:</td><td>" + escapeHtml(entry.orderDate || '–') + "</td></tr>" +
        "<tr><td style='color:#888;vertical-align:top'>Adresse:</td><td>" + escapeHtml(entry.address || '–') + "</td></tr>" +
        "</table></td></tr></table>" +
        "<div style='font-size:11px;color:#00f2ff;letter-spacing:2px;font-weight:700;margin:20px 0 8px 0'>WIDERRUFENE ARTIKEL</div>" +
        "<div style='padding:14px;background:#0a0a0a;border-radius:8px;color:#ccc;font-size:13px;line-height:1.6'>" + escapeHtml(entry.items).replace(/\n/g, "<br>") + "</div>" +
        (entry.reason ? "<div style='font-size:11px;color:#00f2ff;letter-spacing:2px;font-weight:700;margin:20px 0 8px 0'>GRUND (freiwillig)</div>" +
          "<div style='padding:14px;background:#0a0a0a;border-radius:8px;color:#ccc;font-size:13px;line-height:1.6'>" + escapeHtml(entry.reason).replace(/\n/g, "<br>") + "</div>" : ""),
      ctaButton: "WIDERRUF BEARBEITEN",
      ctaUrl: "https://lexord.de/admin.html"
    });
    await sendBrevoMail(env, "Kontakt@Lexord.de", "🛡 NEUER EU-WIDERRUF · " + wfNr + " · " + entry.name, adminHtml, { wfNr, kind: "widerruf-admin" });
  }
  return json({ success: true, wfNr });
}

async function admin2Widerrufe(request, env) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.LEXORD_DATA) return json({ widerrufe: [] });
  const list = await env.LEXORD_DATA.list({ prefix: "widerruf:" });
  const arr = [];
  for (const k of list.keys) {
    const raw = await env.LEXORD_DATA.get(k.name);
    if (raw) arr.push(JSON.parse(raw));
  }
  arr.sort((a, b) => new Date(b.submitted) - new Date(a.submitted));
  return json({ widerrufe: arr });
}

async function admin2WiderrufUpdate(request, env, wfNr) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => ({}));
  const raw = await env.LEXORD_DATA.get("widerruf:" + wfNr);
  if (!raw) return json({ success: false, error: "Nicht gefunden" }, 404);
  const w = JSON.parse(raw);
  const oldStatus = w.status;
  if (body.status) w.status = body.status;
  if (body.note) w.adminNote = body.note;
  w.updated = new Date().toISOString();
  await env.LEXORD_DATA.put("widerruf:" + wfNr, JSON.stringify(w));

  // Auto-Refund triggern
  if (body.triggerRefund && body.orderNr) {
    try {
      const orderRaw = await env.LEXORD_DATA.get("order:" + body.orderNr);
      if (orderRaw) {
        const order = JSON.parse(orderRaw);
        // Refund nutzt admin2OrderRefund-Logik (Stripe/PayPal)
        const fakeReq = new Request("https://x/admin/orders/" + body.orderNr + "/refund", {
          method: "POST",
          headers: { Authorization: request.headers.get("Authorization") },
          body: JSON.stringify({ reason: "EU-Widerruf " + wfNr, notify: false, amount: order.total })
        });
        await admin2OrderRefund(fakeReq, env, body.orderNr);
        w.status = "refunded";
        await env.LEXORD_DATA.put("widerruf:" + wfNr, JSON.stringify(w));
      }
    } catch (e) {}
  }

  // Mail an Kunden
  if (body.notify !== false && w.email && env.BREVO_API_KEY && body.status && body.status !== oldStatus) {
    const titles = {
      received: "Widerruf eingegangen",
      processing: "Widerruf in Bearbeitung",
      approved: "Widerruf genehmigt",
      refunded: "Rückerstattung erfolgt",
      rejected: "Widerruf abgelehnt"
    };
    const html = buildEmailTemplate ? buildEmailTemplate({
      headerTitle: titles[body.status] || "Widerruf-Update",
      customerName: w.name,
      body: "<p>Status-Update zu deinem Widerruf <strong>" + escapeHtml(wfNr) + "</strong>:</p>" +
        "<p style='font-size:18px;font-weight:900;color:#0066ff'>" + (titles[body.status] || body.status) + "</p>" +
        (body.note ? "<p style='margin-top:14px;padding:12px;background:#f5f5f5;border-radius:8px'>" + escapeHtml(body.note).replace(/\n/g, "<br>") + "</p>" : "")
    }) : "<p>Widerruf-Status: " + body.status + "</p>";
    await sendBrevoMail(env, w.email, titles[body.status] + " · " + wfNr + " — LEXORD", html, { wfNr, kind: "widerruf-status" });
  }
  return json({ success: true });
}

async function admin2WiderrufEmail(request, env, wfNr) {
  if (!checkAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => ({}));
  const raw = await env.LEXORD_DATA.get("widerruf:" + wfNr);
  if (!raw) return json({ success: false, error: "Nicht gefunden" }, 404);
  const w = JSON.parse(raw);
  const html = buildEmailTemplate ? buildEmailTemplate({
    headerTitle: body.subject || "Update zu deinem Widerruf",
    customerName: body.name || w.name,
    body: "<p>" + escapeHtml(body.body || "").replace(/\n/g, "<br>") + "</p>" +
      "<p style='margin-top:18px;padding:12px;background:#f5f5f5;border-radius:8px;font-size:12px;color:#666'>Widerruf-Nr.: <strong>" + escapeHtml(wfNr) + "</strong></p>"
  }) : "<p>" + escapeHtml(body.body) + "</p>";
  const ok = await sendBrevoMail(env, body.to || w.email, body.subject || "Widerruf " + wfNr, html, { wfNr, kind: "widerruf-email" });
  return json({ success: ok });
}
