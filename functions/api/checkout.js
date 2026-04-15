// LEXORD CLOUDFLARE PAGES FUNCTION
// Pfad: functions/api/checkout.js
// Erreichbar unter: https://lexord.de/api/checkout
// iOS-sichere Version: keine Single-Quotes, keine Backticks

export async function onRequestPost(context) {
const req = context.request;
const env = context.env;

const cors = {
“Access-Control-Allow-Origin”: “*”,
“Access-Control-Allow-Methods”: “POST, OPTIONS”,
“Access-Control-Allow-Headers”: “Content-Type”,
“Content-Type”: “application/json”
};

try {
const body = await req.json();
const action = body.action;

```
if (action === "create-payment-intent") return await createPI(body, env, cors);
if (action === "send-order-mail")        return await sendOrder(body, env, cors);
if (action === "send-newsletter")        return await sendNL(body, env, cors);
if (action === "send-repair")            return await sendRep(body, env, cors);
if (action === "send-contact")           return await sendCT(body, env, cors);

return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: cors });
```

} catch (err) {
return new Response(JSON.stringify({ error: String(err.message || err) }), { status: 500, headers: cors });
}
}

export async function onRequestOptions() {
return new Response(null, {
status: 204,
headers: {
“Access-Control-Allow-Origin”: “*”,
“Access-Control-Allow-Methods”: “POST, OPTIONS”,
“Access-Control-Allow-Headers”: “Content-Type”,
“Access-Control-Max-Age”: “86400”
}
});
}

async function createPI(body, env, cors) {
const amount = body.amount;
if (!amount || amount < 50) {
return new Response(JSON.stringify({ error: “Invalid amount” }), { status: 400, headers: cors });
}

const params = new URLSearchParams();
params.append(“amount”, String(amount));
params.append(“currency”, “eur”);
params.append(“automatic_payment_methods[enabled]”, “true”);
if (body.email) params.append(“receipt_email”, body.email);
params.append(“description”, “LEXORD Bestellung “ + (body.orderNr || “”));

if (body.orderNr)       params.append(“metadata[orderNr]”,       body.orderNr);
if (body.email)         params.append(“metadata[customerEmail]”, body.email);
if (body.name)          params.append(“metadata[customerName]”,  body.name);
if (body.land)          params.append(“metadata[land]”,          body.land);
if (body.shipping)      params.append(“metadata[shipping]”,      String(body.shipping));
if (body.discountLabel) params.append(“metadata[discount]”,      body.discountLabel + “: -” + body.discountAmount + “ EUR”);

if (body.items && body.items.length) {
const itemStr = body.items.map(function(i) { return i.name + “ x” + i.qty; }).join(” | “).slice(0, 490);
params.append(“metadata[items]”, itemStr);
}

if (body.address && body.name) {
params.append(“shipping[name]”, body.name);
params.append(“shipping[address][line1]”,       body.address.line1 || “”);
params.append(“shipping[address][postal_code]”, body.address.zip   || “”);
params.append(“shipping[address][city]”,        body.address.city  || “”);
params.append(“shipping[address][country]”,    (body.address.country || “DE”).toUpperCase().slice(0, 2));
}

const r = await fetch(“https://api.stripe.com/v1/payment_intents”, {
method: “POST”,
headers: {
“Authorization”: “Bearer “ + env.STRIPE_SECRET_KEY,
“Content-Type”:  “application/x-www-form-urlencoded”
},
body: params.toString()
});

const data = await r.json();
if (!r.ok) {
const msg = (data.error && data.error.message) ? data.error.message : “Stripe failed”;
return new Response(JSON.stringify({ error: msg }), { status: 500, headers: cors });
}

return new Response(JSON.stringify({ clientSecret: data.client_secret, id: data.id }), { status: 200, headers: cors });
}

async function sendMail(to, toName, subject, html, env, replyTo) {
const fromEmail = env.FROM_EMAIL || “Kontakt@Lexord.de”;
const fromName  = env.SHOP_NAME  || “LEXORD Engineering”;

const payload = {
personalizations: [{ to: [{ email: to, name: toName || to }] }],
from:     { email: fromEmail, name: fromName },
reply_to: { email: replyTo || fromEmail, name: fromName },
subject:  subject,
content:  [{ type: “text/html”, value: html }]
};

const r = await fetch(“https://api.mailchannels.net/tx/v1/send”, {
method: “POST”,
headers: { “Content-Type”: “application/json” },
body: JSON.stringify(payload)
});

if (!r.ok) {
const t = await r.text();
throw new Error(“Mail failed: “ + t.slice(0, 200));
}
return true;
}

function esc(s) {
if (s === null || s === undefined) return “”;
return String(s)
.replace(/&/g,  “&”)
.replace(/</g,  “<”)
.replace(/>/g,  “>”)
.replace(/”/g,  “"”);
}

function wrap(headerBg, headerTitle, headerSub, content) {
let h = “”;
h += “<!DOCTYPE html><html><head><meta charset="UTF-8"></head>”;
h += “<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">”;
h += “<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;padding:30px 0">”;
h += “<tr><td align="center">”;
h += “<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">”;
h += “<tr><td style="background:#000;padding:28px 32px;text-align:center">”;
h += “<div style="font-size:24px;font-weight:900;color:#00f2ff;letter-spacing:6px">LEXORD</div>”;
h += “<div style="font-size:11px;color:#888;letter-spacing:3px;margin-top:5px">ENGINEERING EXCELLENCE - MADE IN GERMANY</div>”;
h += “</td></tr>”;
h += “<tr><td style="background:” + headerBg + “;padding:16px 32px;text-align:center">”;
h += “<div style="font-size:15px;font-weight:bold;color:#000">” + headerTitle + “</div>”;
if (headerSub) h += “<div style="font-size:11px;color:rgba(0,0,0,.6);margin-top:3px">” + headerSub + “</div>”;
h += “</td></tr>”;
h += “<tr><td style="padding:32px">” + content + “</td></tr>”;
h += “<tr><td style="background:#f5f5f5;padding:18px 32px;text-align:center;border-top:1px solid #eee;font-size:11px;color:#888;line-height:1.7">”;
h += “<strong style="color:#666">LEXORD Engineering - Leon Schulz</strong><br>”;
h += “An Der Domsuehler Str. 2 - 19374 Domsuehl - Deutschland<br>”;
h += “<a href="mailto:Kontakt@Lexord.de" style="color:#00a8b5;text-decoration:none">Kontakt@Lexord.de</a> - “;
h += “<a href="tel:+4915204718720" style="color:#00a8b5;text-decoration:none">0152 047 18720</a><br>”;
h += “<span style="color:#aaa">Kleinunternehmer gem. Paragraph 19 UStG - lexord.de</span>”;
h += “</td></tr></table></td></tr></table></body></html>”;
return h;
}

async function sendOrder(body, env, cors) {
const email   = body.email;
const name    = body.name || “Kunde”;
const orderNr = body.orderNr;
const items   = body.items || [];
const sub     = body.sub || 0;
const disc    = body.discount || 0;
const dLabel  = body.discountLabel || “”;
const ship    = body.shipping || 0;
const total   = body.total || 0;
const land    = body.land || “DE”;
const addr    = body.address || “”;
const payM    = body.payMethod || “Online”;

if (!email || !orderNr) {
return new Response(JSON.stringify({ error: “Missing email or orderNr” }), { status: 400, headers: cors });
}

const date = new Date().toLocaleDateString(“de-DE”, { day: “2-digit”, month: “long”, year: “numeric” });

let rows = “”;
for (let i = 0; i < items.length; i++) {
const it = items[i];
rows += “<tr>”;
rows += “<td style="padding:11px 14px;border-bottom:1px solid #eee;font-size:13px;color:#333">” + esc(it.name) + “</td>”;
rows += “<td style="padding:11px 14px;border-bottom:1px solid #eee;text-align:center;font-size:13px;color:#555">” + it.qty + “</td>”;
rows += “<td style="padding:11px 14px;border-bottom:1px solid #eee;text-align:right;font-size:13px">” + it.price.toFixed(2) + “ EUR</td>”;
rows += “<td style="padding:11px 14px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:bold">” + (it.price * it.qty).toFixed(2) + “ EUR</td>”;
rows += “</tr>”;
}

let dRow = “”;
if (disc > 0) {
dRow  = “<tr><td colspan="3" style="padding:8px 14px;font-size:13px;color:#009900">” + esc(dLabel || “Rabatt”) + “</td>”;
dRow += “<td style="padding:8px 14px;text-align:right;font-size:13px;color:#009900">-” + disc.toFixed(2) + “ EUR</td></tr>”;
}

const shipTxt = (ship === 0) ? “Kostenlos” : (ship.toFixed(2) + “ EUR”);

let cContent = “”;
cContent += “<p style="font-size:14px;color:#333;margin:0 0 8px 0">Hallo <strong>” + esc(name) + “</strong>,</p>”;
cContent += “<p style="font-size:13px;color:#666;line-height:1.7;margin:0 0 22px 0">vielen Dank fuer deine Bestellung bei LEXORD! Diese E-Mail ist gleichzeitig deine Rechnung gem. Paragraph 14 UStG.</p>”;
cContent += “<div style="background:#f9f9f9;border-radius:8px;padding:18px;margin-bottom:22px;border-left:4px solid #00f2ff">”;
cContent += “<table cellpadding="0" cellspacing="0" style="font-size:13px;color:#333;width:100%">”;
cContent += “<tr><td style="color:#888;width:160px;padding:3px 0">Bestelldatum:</td><td style="padding:3px 0">” + date + “</td></tr>”;
cContent += “<tr><td style="color:#888;padding:3px 0">Bestellnummer:</td><td style="padding:3px 0;font-weight:bold">” + esc(orderNr) + “</td></tr>”;
cContent += “<tr><td style="color:#888;padding:3px 0">Zahlungsart:</td><td style="padding:3px 0">” + esc(payM) + “</td></tr>”;
cContent += “<tr><td style="color:#888;padding:3px 0">Lieferland:</td><td style="padding:3px 0">” + esc(land) + “</td></tr>”;
if (addr) cContent += “<tr><td style="color:#888;padding:3px 0;vertical-align:top">Lieferadresse:</td><td style="padding:3px 0">” + esc(addr) + “</td></tr>”;
cContent += “</table></div>”;
cContent += “<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:18px">”;
cContent += “<thead><tr style="background:#f0f0f0">”;
cContent += “<th style="padding:12px 14px;text-align:left;font-size:11px;color:#666;letter-spacing:1px;border-bottom:2px solid #ddd">PRODUKT</th>”;
cContent += “<th style="padding:12px 14px;text-align:center;font-size:11px;color:#666;letter-spacing:1px;border-bottom:2px solid #ddd">MENGE</th>”;
cContent += “<th style="padding:12px 14px;text-align:right;font-size:11px;color:#666;letter-spacing:1px;border-bottom:2px solid #ddd">PREIS</th>”;
cContent += “<th style="padding:12px 14px;text-align:right;font-size:11px;color:#666;letter-spacing:1px;border-bottom:2px solid #ddd">GESAMT</th>”;
cContent += “</tr></thead><tbody>” + rows + “</tbody>”;
cContent += “<tfoot>”;
cContent += “<tr><td colspan="3" style="padding:9px 14px;font-size:13px;color:#555">Zwischensumme</td><td style="padding:9px 14px;text-align:right;font-size:13px">” + sub.toFixed(2) + “ EUR</td></tr>”;
cContent += dRow;
cContent += “<tr><td colspan="3" style="padding:9px 14px;font-size:13px;color:#555">Versand DHL (” + esc(land) + “)</td><td style="padding:9px 14px;text-align:right;font-size:13px">” + shipTxt + “</td></tr>”;
cContent += “<tr style="background:#000"><td colspan="3" style="padding:14px;font-size:15px;font-weight:bold;color:#fff;letter-spacing:1px">GESAMTBETRAG</td>”;
cContent += “<td style="padding:14px;text-align:right;font-size:18px;font-weight:bold;color:#00f2ff">” + total.toFixed(2) + “ EUR</td></tr>”;
cContent += “</tfoot></table>”;
cContent += “<div style="background:#fff8e1;border:1px solid #ffd54f;border-radius:6px;padding:14px;margin-bottom:20px;font-size:11px;color:#666;line-height:1.6">”;
cContent += “<strong>Steuerhinweis:</strong> Kleinunternehmer gem. Paragraph 19 UStG - keine Umsatzsteuer ausgewiesen.</div>”;
cContent += “<div style="background:#f0fdfd;border-radius:6px;padding:14px;font-size:12px;color:#555;line-height:1.7">”;
cContent += “<strong style="color:#333">Versand:</strong> Wir versenden innerhalb von 24h per DHL.<br>”;
cContent += “<strong style="color:#333">Widerruf:</strong> 14 Tage Rueckgaberecht.<br>”;
cContent += “<strong style="color:#333">Garantie:</strong> 24 Monate Gewaehrleistung.</div>”;

let aContent = “”;
aContent += “<p style="font-size:14px;color:#333;margin:0 0 18px 0">Eine neue Bestellung ist eingegangen!</p>”;
aContent += “<table cellpadding="0" cellspacing="0" style="font-size:13px;color:#333;width:100%;margin-bottom:18px">”;
aContent += “<tr><td style="color:#888;width:160px;padding:5px 0">Bestellnummer:</td><td style="padding:5px 0;font-weight:bold;color:#00a8b5">” + esc(orderNr) + “</td></tr>”;
aContent += “<tr><td style="color:#888;padding:5px 0">Kunde:</td><td style="padding:5px 0">” + esc(name) + “</td></tr>”;
aContent += “<tr><td style="color:#888;padding:5px 0">E-Mail:</td><td style="padding:5px 0"><a href="mailto:” + esc(email) + “" style="color:#00a8b5">” + esc(email) + “</a></td></tr>”;
aContent += “<tr><td style="color:#888;padding:5px 0">Zahlung:</td><td style="padding:5px 0">” + esc(payM) + “</td></tr>”;
aContent += “<tr><td style="color:#888;padding:5px 0">Land:</td><td style="padding:5px 0">” + esc(land) + “</td></tr>”;
if (addr) aContent += “<tr><td style="color:#888;padding:5px 0;vertical-align:top">Adresse:</td><td style="padding:5px 0">” + esc(addr) + “</td></tr>”;
aContent += “<tr><td style="color:#888;padding:5px 0">Datum:</td><td style="padding:5px 0">” + date + “</td></tr>”;
aContent += “</table>”;
aContent += “<div style="background:#f9f9f9;border-radius:6px;padding:14px">”;
aContent += “<div style="font-size:11px;color:#888;font-weight:bold;letter-spacing:1px;margin-bottom:9px">ARTIKEL</div>”;
for (let i = 0; i < items.length; i++) {
const it = items[i];
aContent += “<div style="font-size:13px;color:#333;padding:5px 0;border-bottom:1px solid #eee">” + esc(it.name) + “ x” + it.qty + “ = <strong style="color:#00a8b5">” + (it.price * it.qty).toFixed(2) + “ EUR</strong></div>”;
}
aContent += “</div>”;
aContent += “<table cellpadding="0" cellspacing="0" style="font-size:13px;width:100%;margin-top:14px">”;
aContent += “<tr><td style="color:#666;padding:4px 0">Zwischensumme:</td><td style="text-align:right;padding:4px 0">” + sub.toFixed(2) + “ EUR</td></tr>”;
if (disc > 0) aContent += “<tr><td style="color:#009900;padding:4px 0">Rabatt:</td><td style="text-align:right;color:#009900;padding:4px 0">-” + disc.toFixed(2) + “ EUR</td></tr>”;
aContent += “<tr><td style="color:#666;padding:4px 0">Versand:</td><td style="text-align:right;padding:4px 0">” + shipTxt + “</td></tr>”;
aContent += “<tr style="border-top:2px solid #000"><td style="padding:9px 0;font-weight:bold;font-size:14px">GESAMT:</td>”;
aContent += “<td style="text-align:right;padding:9px 0;font-weight:bold;font-size:16px;color:#00a8b5">” + total.toFixed(2) + “ EUR</td></tr>”;
aContent += “</table>”;

const adminEmail = env.ADMIN_EMAIL || “Kontakt@Lexord.de”;
await Promise.allSettled([
sendMail(email, name, “Bestellbestaetigung “ + orderNr + “ | LEXORD”, wrap(”#00f2ff”, “BESTELLBESTAETIGUNG”, “Nr. “ + esc(orderNr), cContent), env),
sendMail(adminEmail, “LEXORD Admin”, “[BESTELLUNG] “ + orderNr + “ - “ + name + “ - “ + total.toFixed(2) + “ EUR”, wrap(”#00b67a”, “NEUE BESTELLUNG”, esc(orderNr) + “ - “ + total.toFixed(2) + “ EUR”, aContent), env, email)
]);

return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
}

async function sendNL(body, env, cors) {
const email = body.email;
if (!email || email.indexOf(”@”) < 0) {
return new Response(JSON.stringify({ error: “Invalid email” }), { status: 400, headers: cors });
}

let cc = “”;
cc += “<div style="text-align:center;margin-bottom:24px">”;
cc += “<div style="font-size:48px;margin-bottom:12px">GESCHENK</div>”;
cc += “<div style="font-size:22px;font-weight:900;color:#000;letter-spacing:2px">WILLKOMMEN!</div>”;
cc += “<div style="font-size:13px;color:#666;margin-top:8px">Dein exklusiver Rabattcode wartet</div></div>”;
cc += “<p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 22px 0">Vielen Dank fuer deine Newsletter-Anmeldung! Als Willkommensgeschenk erhaeltst du <strong>10% Rabatt</strong> auf deine erste Bestellung.</p>”;
cc += “<div style="background:#000;border-radius:12px;padding:26px;text-align:center;margin:0 0 24px 0">”;
cc += “<div style="font-size:11px;color:#888;letter-spacing:3px;margin-bottom:10px">DEIN RABATTCODE</div>”;
cc += “<div style="font-size:32px;color:#00f2ff;letter-spacing:8px;font-weight:900;font-family:Courier,monospace">WILLKOMMEN10</div>”;
cc += “<div style="font-size:12px;color:#666;margin-top:10px">Im Warenkorb eingeben - 10% auf alle Produkte</div></div>”;
cc += “<div style="text-align:center"><a href="https://lexord.de" style="display:inline-block;background:#00f2ff;color:#000;font-weight:900;font-size:13px;letter-spacing:2px;padding:15px 36px;border-radius:8px;text-decoration:none">JETZT SHOPPEN</a></div>”;

let ac = “”;
ac += “<p style="font-size:14px;color:#333;margin:0 0 14px 0">Neue Newsletter-Anmeldung:</p>”;
ac += “<div style="background:#f9f9f9;border-radius:8px;padding:18px">”;
ac += “<div style="font-size:13px;color:#333;line-height:2">”;
ac += “<strong style="color:#888">E-Mail:</strong> <a href="mailto:” + esc(email) + “" style="color:#00a8b5">” + esc(email) + “</a><br>”;
ac += “<strong style="color:#888">Datum:</strong> “ + new Date().toLocaleString(“de-DE”) + “<br>”;
ac += “<strong style="color:#888">Rabattcode:</strong> WILLKOMMEN10”;
ac += “</div></div>”;

const adminEmail = env.ADMIN_EMAIL || “Kontakt@Lexord.de”;
await Promise.allSettled([
sendMail(email, “Neuer Abonnent”, “Dein 10% Willkommensrabatt | LEXORD”, wrap(”#00f2ff”, “WILLKOMMEN BEI LEXORD”, “”, cc), env),
sendMail(adminEmail, “LEXORD Admin”, “[NEWSLETTER] “ + email, wrap(”#00b67a”, “NEUE NEWSLETTER ANMELDUNG”, “”, ac), env, email)
]);

return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
}

async function sendRep(body, env, cors) {
const fname  = body.fname  || “”;
const lname  = body.lname  || “”;
const email  = body.email;
const phone  = body.phone  || “-”;
const addr   = body.address || “”;
const zip    = body.zip    || “”;
const city   = body.city   || “”;
const model  = body.model  || “”;
const serial = body.serial || “”;
const damage = body.damage || “”;
const damagePrice = body.damagePrice || “”;
const description = body.description || “”;
const since    = body.since    || “”;
const warranty = body.warranty || “6”;
const repNr    = body.repNr;

if (!email || !repNr) {
return new Response(JSON.stringify({ error: “Missing fields” }), { status: 400, headers: cors });
}

const date = new Date().toLocaleDateString(“de-DE”, { day: “2-digit”, month: “long”, year: “numeric” });

let cc = “”;
cc += “<p style="font-size:14px;color:#333;margin:0 0 8px 0">Hallo <strong>” + esc(fname) + “ “ + esc(lname) + “</strong>,</p>”;
cc += “<p style="font-size:13px;color:#666;line-height:1.7;margin:0 0 22px 0">deine Reparaturanfrage wurde erfolgreich uebermittelt. Wir melden uns innerhalb von <strong>24 Stunden</strong>.</p>”;
cc += “<div style="background:#f9f9f9;border-radius:10px;padding:20px;margin-bottom:22px;border-left:4px solid #00f2ff">”;
cc += “<div style="font-size:11px;color:#888;letter-spacing:1px;font-weight:bold;margin-bottom:14px">DEINE ANFRAGE</div>”;
cc += “<table cellpadding="0" cellspacing="0" style="font-size:13px;color:#333;width:100%">”;
cc += “<tr><td style="color:#888;width:160px;padding:5px 0">Anfragenummer:</td><td style="padding:5px 0;font-weight:bold;color:#00a8b5">” + esc(repNr) + “</td></tr>”;
cc += “<tr><td style="color:#888;padding:5px 0">Schaden:</td><td style="padding:5px 0">” + esc(damage) + “</td></tr>”;
cc += “<tr><td style="color:#888;padding:5px 0">Preisschaetzung:</td><td style="padding:5px 0;color:#009900;font-weight:bold">” + esc(damagePrice) + “</td></tr>”;
cc += “<tr><td style="color:#888;padding:5px 0">Controller:</td><td style="padding:5px 0">” + esc(model) + “</td></tr>”;
if (serial) cc += “<tr><td style="color:#888;padding:5px 0">Seriennr:</td><td style="padding:5px 0">” + esc(serial) + “</td></tr>”;
cc += “<tr><td style="color:#888;padding:5px 0">Problem seit:</td><td style="padding:5px 0">” + esc(since) + “</td></tr>”;
cc += “<tr><td style="color:#888;padding:5px 0">Garantie:</td><td style="padding:5px 0">” + esc(warranty) + “ Monate</td></tr>”;
cc += “<tr><td style="color:#888;padding:5px 0;vertical-align:top">Beschreibung:</td><td style="padding:5px 0">” + esc(description) + “</td></tr>”;
cc += “</table></div>”;
cc += “<div style="background:#000;border-radius:10px;padding:22px;color:#fff;margin-bottom:18px">”;
cc += “<div style="font-size:11px;color:#888;letter-spacing:1px;font-weight:bold;margin-bottom:12px">EINSENDEANWEISUNG</div>”;
cc += “<p style="font-size:13px;color:#ccc;line-height:1.8;margin:0">”;
cc += “Schicke deinen Controller <strong style="color:#fff">sicher verpackt</strong> an:<br><br>”;
cc += “<span style="color:#00f2ff;font-weight:bold">Leon Schulz - LEXORD Reparatur<br>An Der Domsuehler Str. 2<br>19374 Domsuehl - Deutschland</span><br><br>”;
cc += “Lege bitte einen Zettel mit der Anfragenummer <strong style="color:#00f2ff">” + esc(repNr) + “</strong> bei.<br>”;
cc += “Reparaturzeit: <strong style="color:#fff">3-5 Werktage</strong> nach Eingang.</p></div>”;

let ac = “”;
ac += “<table cellpadding="0" cellspacing="0" style="font-size:13px;color:#333;width:100%;margin-bottom:14px">”;
ac += “<tr><td style="color:#888;width:160px;padding:5px 0">Anfragenr:</td><td style="padding:5px 0;font-weight:bold;color:#00a8b5">” + esc(repNr) + “</td></tr>”;
ac += “<tr><td style="color:#888;padding:5px 0">Kunde:</td><td style="padding:5px 0">” + esc(fname) + “ “ + esc(lname) + “</td></tr>”;
ac += “<tr><td style="color:#888;padding:5px 0">E-Mail:</td><td style="padding:5px 0"><a href="mailto:” + esc(email) + “" style="color:#00a8b5">” + esc(email) + “</a></td></tr>”;
ac += “<tr><td style="color:#888;padding:5px 0">Telefon:</td><td style="padding:5px 0">” + esc(phone) + “</td></tr>”;
ac += “<tr><td style="color:#888;padding:5px 0;vertical-align:top">Adresse:</td><td style="padding:5px 0">” + esc(addr) + “, “ + esc(zip) + “ “ + esc(city) + “</td></tr>”;
ac += “<tr><td style="color:#888;padding:5px 0">Schaden:</td><td style="padding:5px 0;font-weight:bold">” + esc(damage) + “</td></tr>”;
ac += “<tr><td style="color:#888;padding:5px 0">Preis:</td><td style="padding:5px 0;color:#00b67a;font-weight:bold">” + esc(damagePrice) + “</td></tr>”;
ac += “<tr><td style="color:#888;padding:5px 0">Controller:</td><td style="padding:5px 0">” + esc(model) + “</td></tr>”;
if (serial) ac += “<tr><td style="color:#888;padding:5px 0">Seriennr:</td><td style="padding:5px 0">” + esc(serial) + “</td></tr>”;
ac += “<tr><td style="color:#888;padding:5px 0">Garantie:</td><td style="padding:5px 0">” + esc(warranty) + “ Monate</td></tr>”;
ac += “<tr><td style="color:#888;padding:5px 0">Problem seit:</td><td style="padding:5px 0">” + esc(since) + “</td></tr>”;
ac += “<tr><td style="color:#888;padding:5px 0">Datum:</td><td style="padding:5px 0">” + date + “</td></tr>”;
ac += “</table>”;
ac += “<div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-top:14px">”;
ac += “<div style="font-size:11px;color:#888;font-weight:bold;letter-spacing:1px;margin-bottom:8px">BESCHREIBUNG</div>”;
ac += “<div style="font-size:13px;color:#333;line-height:1.7;white-space:pre-wrap">” + esc(description) + “</div></div>”;

const adminEmail = env.ADMIN_EMAIL || “Kontakt@Lexord.de”;
await Promise.allSettled([
sendMail(email, fname + “ “ + lname, “Reparaturanfrage “ + repNr + “ erhalten | LEXORD”, wrap(”#00f2ff”, “REPARATURANFRAGE ERHALTEN”, “Nr. “ + esc(repNr), cc), env),
sendMail(adminEmail, “LEXORD Admin”, “[REPARATUR] “ + repNr + “ - “ + fname + “ “ + lname + “ - “ + damage, wrap(”#bc13fe”, “NEUE REPARATURANFRAGE”, esc(repNr) + “ - “ + esc(damage), ac), env, email)
]);

return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
}

async function sendCT(body, env, cors) {
const name    = body.name    || “Kunde”;
const email   = body.email;
const subject = body.subject || “Kontaktanfrage”;
const message = body.message;

if (!email || !message) {
return new Response(JSON.stringify({ error: “Missing fields” }), { status: 400, headers: cors });
}

const date = new Date().toLocaleString(“de-DE”);

let cc = “”;
cc += “<p style="font-size:14px;color:#333;margin:0 0 8px 0">Hallo <strong>” + esc(name) + “</strong>,</p>”;
cc += “<p style="font-size:13px;color:#666;line-height:1.7;margin:0 0 18px 0">vielen Dank fuer deine Nachricht! Wir melden uns innerhalb von <strong>24 Stunden</strong>.</p>”;
cc += “<div style="background:#f9f9f9;border-radius:8px;padding:16px;border-left:4px solid #00f2ff;margin-bottom:18px">”;
cc += “<div style="font-size:11px;color:#888;letter-spacing:1px;font-weight:bold;margin-bottom:6px">DEIN BETREFF</div>”;
cc += “<div style="font-size:14px;color:#333;font-weight:bold">” + esc(subject) + “</div></div>”;
cc += “<div style="background:#f0fdfd;border-radius:6px;padding:14px;font-size:12px;color:#666;line-height:1.8">”;
cc += “<strong style="color:#333">DIREKTKONTAKT:</strong><br>”;
cc += “E-Mail: <a href="mailto:Kontakt@Lexord.de" style="color:#00a8b5">Kontakt@Lexord.de</a><br>”;
cc += “Telefon: <a href="tel:+4915204718720" style="color:#00a8b5">0152 047 18720</a></div>”;

let ac = “”;
ac += “<table cellpadding="0" cellspacing="0" style="font-size:13px;color:#333;width:100%;margin-bottom:14px">”;
ac += “<tr><td style="color:#888;width:120px;padding:5px 0">Name:</td><td style="padding:5px 0">” + esc(name) + “</td></tr>”;
ac += “<tr><td style="color:#888;padding:5px 0">E-Mail:</td><td style="padding:5px 0"><a href="mailto:” + esc(email) + “" style="color:#00a8b5">” + esc(email) + “</a></td></tr>”;
ac += “<tr><td style="color:#888;padding:5px 0">Betreff:</td><td style="padding:5px 0;font-weight:bold">” + esc(subject) + “</td></tr>”;
ac += “<tr><td style="color:#888;padding:5px 0">Datum:</td><td style="padding:5px 0">” + date + “</td></tr>”;
ac += “</table>”;
ac += “<div style="background:#f9f9f9;border-radius:8px;padding:16px">”;
ac += “<div style="font-size:11px;color:#888;font-weight:bold;letter-spacing:1px;margin-bottom:8px">NACHRICHT</div>”;
ac += “<div style="font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap">” + esc(message) + “</div></div>”;

const adminEmail = env.ADMIN_EMAIL || “Kontakt@Lexord.de”;
await Promise.allSettled([
sendMail(email, name, “Deine Nachricht bei LEXORD | “ + subject, wrap(”#00f2ff”, “NACHRICHT ERHALTEN”, “”, cc), env),
sendMail(adminEmail, “LEXORD Admin”, “[KONTAKT] “ + name + “ - “ + subject, wrap(”#ffae00”, “NEUE KONTAKTANFRAGE”, “”, ac), env, email)
]);

return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
}
