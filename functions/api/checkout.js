/* ═══════════════════════════════════════════════════════════════════════
LEXORD® CLOUDFLARE PAGES FUNCTION
Datei-Pfad im Repo: /functions/api/checkout.js
Wird automatisch erreichbar unter: https://lexord.de/api/checkout
═══════════════════════════════════════════════════════════════════════
Aufgaben:
1. Stripe PaymentIntent erstellen (Embedded Checkout)
2. Alle E-Mails versenden via MailChannels (kostenlos via Cloudflare)
- Bestellbestätigung + Rechnung an Kunde
- Bestellung an Admin (Kontakt@Lexord.de)
- Newsletter Welcome-Mail mit Rabattcode
- Reparaturanfrage Bestätigung an Kunde
- Reparaturanfrage Info an Admin
- Kontaktformular Bestätigung + Admin

Environment Variables (in Cloudflare Pages Settings → Environment):
STRIPE_SECRET_KEY = sk_live_…
ADMIN_EMAIL       = Kontakt@Lexord.de
FROM_EMAIL        = noreply@lexord.de   (oder Kontakt@Lexord.de)
SHOP_NAME         = LEXORD® Engineering

POST Body je nach action:
{ action: ‘create-payment-intent’, amount, orderNr, email, … }
{ action: ‘send-order-mail’, … }
{ action: ‘send-newsletter’, email }
{ action: ‘send-repair’, … }
{ action: ‘send-contact’, … }
═══════════════════════════════════════════════════════════════════════ */

export async function onRequestPost(context) {
const { request, env } = context;

// CORS Headers
const corsHeaders = {
‘Access-Control-Allow-Origin’: ‘https://lexord.de’,
‘Access-Control-Allow-Methods’: ‘POST, OPTIONS’,
‘Access-Control-Allow-Headers’: ‘Content-Type’,
‘Content-Type’: ‘application/json’,
};

try {
const body = await request.json();
const action = body.action;

```
if (action === 'create-payment-intent') {
  return await createPaymentIntent(body, env, corsHeaders);
}
if (action === 'send-order-mail') {
  return await sendOrderMail(body, env, corsHeaders);
}
if (action === 'send-newsletter') {
  return await sendNewsletter(body, env, corsHeaders);
}
if (action === 'send-repair') {
  return await sendRepair(body, env, corsHeaders);
}
if (action === 'send-contact') {
  return await sendContact(body, env, corsHeaders);
}

return new Response(JSON.stringify({ error: 'Unknown action' }), {
  status: 400, headers: corsHeaders
});
```

} catch (err) {
console.error(‘Worker error:’, err);
return new Response(JSON.stringify({ error: err.message || ‘Server error’ }), {
status: 500, headers: corsHeaders
});
}
}

// CORS Preflight
export async function onRequestOptions() {
return new Response(null, {
status: 204,
headers: {
‘Access-Control-Allow-Origin’: ‘https://lexord.de’,
‘Access-Control-Allow-Methods’: ‘POST, OPTIONS’,
‘Access-Control-Allow-Headers’: ‘Content-Type’,
‘Access-Control-Max-Age’: ‘86400’,
}
});
}

/* ═══════════════════════════════════════════════════════════════════
STRIPE: PaymentIntent erstellen
═══════════════════════════════════════════════════════════════════ */
async function createPaymentIntent(body, env, corsHeaders) {
const { amount, currency = ‘eur’, orderNr, email, name, items, shipping, land, address, discountLabel, discountAmount } = body;

if (!amount || amount < 50) {
return new Response(JSON.stringify({ error: ‘Invalid amount’ }), {
status: 400, headers: corsHeaders
});
}

// Metadata für Stripe Dashboard (max 50 Keys, jeweils max 500 Zeichen)
const metadata = {
orderNr: orderNr || ‘’,
customerEmail: email || ‘’,
customerName: name || ‘’,
land: land || ‘DE’,
shipping: String(shipping || 0),
items: (items || []).map(i => `${i.name} x${i.qty}`).join(’ | ’).slice(0, 490),
};
if (discountLabel) metadata.discount = `${discountLabel}: -${discountAmount}€`;

// Stripe API Aufruf
const params = new URLSearchParams();
params.append(‘amount’, String(amount));
params.append(‘currency’, currency);
params.append(‘automatic_payment_methods[enabled]’, ‘true’);
params.append(‘receipt_email’, email || ‘’);
params.append(‘description’, `LEXORD Bestellung ${orderNr}`);
Object.entries(metadata).forEach(([k, v]) => params.append(`metadata[${k}]`, v));

// Shipping address für Stripe
if (address && name) {
params.append(‘shipping[name]’, name);
params.append(‘shipping[address][line1]’, address.line1 || ‘’);
params.append(‘shipping[address][postal_code]’, address.zip || ‘’);
params.append(‘shipping[address][city]’, address.city || ‘’);
params.append(‘shipping[address][country]’, (address.country || ‘DE’).toUpperCase().slice(0, 2));
}

const stripeResp = await fetch(‘https://api.stripe.com/v1/payment_intents’, {
method: ‘POST’,
headers: {
‘Authorization’: `Bearer ${env.STRIPE_SECRET_KEY}`,
‘Content-Type’: ‘application/x-www-form-urlencoded’,
},
body: params.toString(),
});

const data = await stripeResp.json();

if (!stripeResp.ok) {
console.error(‘Stripe error:’, data);
return new Response(JSON.stringify({ error: data.error?.message || ‘Stripe failed’ }), {
status: 500, headers: corsHeaders
});
}

return new Response(JSON.stringify({ clientSecret: data.client_secret, id: data.id }), {
status: 200, headers: corsHeaders
});
}

/* ═══════════════════════════════════════════════════════════════════
MAIL SENDER via MailChannels (kostenlos für Cloudflare Workers)
═══════════════════════════════════════════════════════════════════ */
async function sendMail(to, toName, subject, html, env, replyTo) {
const fromEmail = env.FROM_EMAIL || ‘Kontakt@Lexord.de’;
const fromName = env.SHOP_NAME || ‘LEXORD® Engineering’;

const payload = {
personalizations: [{
to: [{ email: to, name: toName || to }],
}],
from: { email: fromEmail, name: fromName },
reply_to: { email: replyTo || fromEmail, name: fromName },
subject: subject,
content: [{ type: ‘text/html’, value: html }],
};

const resp = await fetch(‘https://api.mailchannels.net/tx/v1/send’, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’ },
body: JSON.stringify(payload),
});

if (!resp.ok) {
const err = await resp.text();
console.error(‘MailChannels error:’, err);
throw new Error(’Mail send failed: ’ + err.slice(0, 200));
}

return true;
}

/* ═══════════════════════════════════════════════════════════════════
TEMPLATE: HTML-Wrapper (einheitliches Design für alle Mails)
═══════════════════════════════════════════════════════════════════ */
function htmlWrapper(headerBg, headerTitle, headerSub, content) {
return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>

<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;padding:30px 0">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
<tr><td style="background:#000;padding:28px 32px;text-align:center">
  <div style="font-size:24px;font-weight:900;color:#00f2ff;letter-spacing:6px;font-family:'Helvetica Neue',Arial,sans-serif">LEXORD&reg;</div>
  <div style="font-size:11px;color:#888;letter-spacing:3px;margin-top:5px">ENGINEERING EXCELLENCE &middot; MADE IN GERMANY</div>
</td></tr>
<tr><td style="background:${headerBg};padding:16px 32px;text-align:center">
  <div style="font-size:15px;font-weight:bold;color:#000">${headerTitle}</div>
  ${headerSub ? `<div style="font-size:11px;color:rgba(0,0,0,.6);margin-top:3px">${headerSub}</div>` : ''}
</td></tr>
<tr><td style="padding:32px">${content}</td></tr>
<tr><td style="background:#f5f5f5;padding:18px 32px;text-align:center;border-top:1px solid #eee;font-size:11px;color:#888;line-height:1.7">
  <strong style="color:#666">LEXORD&reg; Engineering &middot; Leon Schulz</strong><br>
  An Der Domsühler Str. 2 &middot; 19374 Domsühl &middot; Deutschland<br>
  <a href="mailto:Kontakt@Lexord.de" style="color:#00a8b5;text-decoration:none">Kontakt@Lexord.de</a> &middot;
  <a href="tel:+4915204718720" style="color:#00a8b5;text-decoration:none">0152 047 18720</a><br>
  <span style="color:#aaa">Kleinunternehmer gem. § 19 UStG &middot; <a href="https://lexord.de" style="color:#aaa;text-decoration:none">lexord.de</a></span>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ═══════════════════════════════════════════════════════════════════
ACTION: Bestellbestätigung + Rechnung versenden
═══════════════════════════════════════════════════════════════════ */
async function sendOrderMail(body, env, corsHeaders) {
const { email, name, orderNr, payMethod, items, sub, discount, discountLabel, shipping, total, land, address } = body;

if (!email || !orderNr) {
return new Response(JSON.stringify({ error: ‘Missing email or orderNr’ }), {
status: 400, headers: corsHeaders
});
}

const date = new Date().toLocaleDateString(‘de-DE’, { day: ‘2-digit’, month: ‘long’, year: ‘numeric’ });

// Items-Tabelle
const itemRows = (items || []).map(i =>
`<tr> <td style="padding:11px 14px;border-bottom:1px solid #eee;font-size:13px;color:#333">${escapeHtml(i.name)}</td> <td style="padding:11px 14px;border-bottom:1px solid #eee;text-align:center;font-size:13px;color:#555">${i.qty}</td> <td style="padding:11px 14px;border-bottom:1px solid #eee;text-align:right;font-size:13px">${i.price.toFixed(2)} €</td> <td style="padding:11px 14px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:bold">${(i.price * i.qty).toFixed(2)} €</td> </tr>`
).join(’’);

const discRow = discount > 0
? `<tr><td colspan="3" style="padding:8px 14px;font-size:13px;color:#009900">${escapeHtml(discountLabel || 'Rabatt')}</td><td style="padding:8px 14px;text-align:right;font-size:13px;color:#009900">-${discount.toFixed(2)} €</td></tr>`
: ‘’;

const shipTxt = (shipping === 0 || !shipping) ? ‘Kostenlos’ : `${shipping.toFixed(2)} €`;

// ═══ KUNDEN-MAIL ═══
const customerContent = `
<p style="font-size:14px;color:#333;margin:0 0 8px 0">Hallo <strong>${escapeHtml(name || ‘Kunde’)}</strong>,</p>
<p style="font-size:13px;color:#666;line-height:1.7;margin:0 0 22px 0">vielen Dank für deine Bestellung bei LEXORD®! Diese E-Mail ist gleichzeitig deine Rechnung gem. § 14 UStG.</p>

```
<div style="background:#f9f9f9;border-radius:8px;padding:18px;margin-bottom:22px;border-left:4px solid #00f2ff">
  <table cellpadding="0" cellspacing="0" style="font-size:13px;color:#333;width:100%">
    <tr><td style="color:#888;width:160px;padding:3px 0">Bestelldatum:</td><td style="padding:3px 0">${date}</td></tr>
    <tr><td style="color:#888;padding:3px 0">Bestellnummer:</td><td style="padding:3px 0;font-weight:bold">${escapeHtml(orderNr)}</td></tr>
    <tr><td style="color:#888;padding:3px 0">Zahlungsart:</td><td style="padding:3px 0">${escapeHtml(payMethod || 'Online')}</td></tr>
    <tr><td style="color:#888;padding:3px 0">Lieferland:</td><td style="padding:3px 0">${escapeHtml(land || 'DE')}</td></tr>
    ${address ? `<tr><td style="color:#888;padding:3px 0;vertical-align:top">Lieferadresse:</td><td style="padding:3px 0">${escapeHtml(address)}</td></tr>` : ''}
  </table>
</div>

<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:18px">
  <thead><tr style="background:#f0f0f0">
    <th style="padding:12px 14px;text-align:left;font-size:11px;color:#666;letter-spacing:1px;border-bottom:2px solid #ddd">PRODUKT</th>
    <th style="padding:12px 14px;text-align:center;font-size:11px;color:#666;letter-spacing:1px;border-bottom:2px solid #ddd">MENGE</th>
    <th style="padding:12px 14px;text-align:right;font-size:11px;color:#666;letter-spacing:1px;border-bottom:2px solid #ddd">PREIS</th>
    <th style="padding:12px 14px;text-align:right;font-size:11px;color:#666;letter-spacing:1px;border-bottom:2px solid #ddd">GESAMT</th>
  </tr></thead>
  <tbody>${itemRows}</tbody>
  <tfoot>
    <tr><td colspan="3" style="padding:9px 14px;font-size:13px;color:#555">Zwischensumme</td>
        <td style="padding:9px 14px;text-align:right;font-size:13px">${sub.toFixed(2)} €</td></tr>
    ${discRow}
    <tr><td colspan="3" style="padding:9px 14px;font-size:13px;color:#555">Versand DHL (${escapeHtml(land || 'DE')})</td>
        <td style="padding:9px 14px;text-align:right;font-size:13px">${shipTxt}</td></tr>
    <tr style="background:#000">
      <td colspan="3" style="padding:14px;font-size:15px;font-weight:bold;color:#fff;letter-spacing:1px">GESAMTBETRAG</td>
      <td style="padding:14px;text-align:right;font-size:18px;font-weight:bold;color:#00f2ff">${total.toFixed(2)} €</td>
    </tr>
  </tfoot>
</table>

<div style="background:#fff8e1;border:1px solid #ffd54f;border-radius:6px;padding:14px;margin-bottom:20px;font-size:11px;color:#666;line-height:1.6">
  <strong>Steuerhinweis:</strong> Kleinunternehmer gem. § 19 UStG &mdash; keine Umsatzsteuer ausgewiesen.
</div>

<div style="background:#f0fdfd;border-radius:6px;padding:14px;font-size:12px;color:#555;line-height:1.7">
  <strong style="color:#333">📦 Versand:</strong> Wir versenden innerhalb von 24h per DHL.<br>
  <strong style="color:#333">↩ Widerruf:</strong> 14 Tage Rückgaberecht (außer individuell konfigurierte Controller).<br>
  <strong style="color:#333">🛡 Garantie:</strong> 24 Monate Gewährleistung.
</div>

<div style="background:#f9f9f9;border-radius:6px;padding:14px;margin-top:18px;font-size:11px;color:#888;line-height:1.7">
  <strong style="color:#333">RECHNUNGSAUSSTELLER (§ 14 UStG):</strong><br>
  Leon Schulz | LEXORD® Engineering<br>
  An Der Domsühler Str. 2 · 19374 Domsühl<br>
  Rechnungsnr.: ${escapeHtml(orderNr)} · Datum: ${date}
</div>
```

`;

const customerHtml = htmlWrapper(’#00f2ff’, ‘✓ BESTELLBESTÄTIGUNG & RECHNUNG’, `Nr. ${escapeHtml(orderNr)}`, customerContent);

// ═══ ADMIN-MAIL ═══
const adminContent = `<p style="font-size:14px;color:#333;margin:0 0 18px 0">Eine neue Bestellung ist eingegangen!</p> <table cellpadding="0" cellspacing="0" style="font-size:13px;color:#333;width:100%;margin-bottom:18px"> <tr><td style="color:#888;width:160px;padding:5px 0">Bestellnummer:</td><td style="padding:5px 0;font-weight:bold;color:#00a8b5">${escapeHtml(orderNr)}</td></tr> <tr><td style="color:#888;padding:5px 0">Kunde:</td><td style="padding:5px 0">${escapeHtml(name || '-')}</td></tr> <tr><td style="color:#888;padding:5px 0">E-Mail:</td><td style="padding:5px 0"><a href="mailto:${escapeHtml(email)}" style="color:#00a8b5">${escapeHtml(email)}</a></td></tr> <tr><td style="color:#888;padding:5px 0">Zahlung:</td><td style="padding:5px 0">${escapeHtml(payMethod || '-')}</td></tr> <tr><td style="color:#888;padding:5px 0">Land:</td><td style="padding:5px 0">${escapeHtml(land || 'DE')}</td></tr> ${address ?`<tr><td style="color:#888;padding:5px 0;vertical-align:top">Adresse:</td><td style="padding:5px 0">${escapeHtml(address)}</td></tr>`: ''} <tr><td style="color:#888;padding:5px 0">Datum:</td><td style="padding:5px 0">${date}</td></tr> </table> <div style="background:#f9f9f9;border-radius:6px;padding:14px;margin-bottom:14px"> <div style="font-size:11px;color:#888;font-weight:bold;letter-spacing:1px;margin-bottom:9px">ARTIKEL</div> ${(items || []).map(i =>`<div style="font-size:13px;color:#333;padding:5px 0;border-bottom:1px solid #eee">${escapeHtml(i.name)} <strong>×${i.qty}</strong> = <strong style="color:#00a8b5">${(i.price * i.qty).toFixed(2)} €</strong></div>`).join('')} </div> <table cellpadding="0" cellspacing="0" style="font-size:13px;width:100%"> <tr><td style="color:#666;padding:4px 0">Zwischensumme:</td><td style="text-align:right;padding:4px 0">${sub.toFixed(2)} €</td></tr> ${discount > 0 ? `<tr><td style="color:#009900;padding:4px 0">Rabatt:</td><td style="text-align:right;color:#009900;padding:4px 0">-${discount.toFixed(2)} €</td></tr>`: ''} <tr><td style="color:#666;padding:4px 0">Versand:</td><td style="text-align:right;padding:4px 0">${shipTxt}</td></tr> <tr style="border-top:2px solid #000"><td style="padding:9px 0;font-weight:bold;font-size:14px">GESAMT:</td><td style="text-align:right;padding:9px 0;font-weight:bold;font-size:16px;color:#00a8b5">${total.toFixed(2)} €</td></tr> </table>`;

const adminHtml = htmlWrapper(’#00b67a’, ‘📦 NEUE BESTELLUNG’, `${escapeHtml(orderNr)} · ${total.toFixed(2)} €`, adminContent);

// Beide Mails senden (parallel)
const adminEmail = env.ADMIN_EMAIL || ‘Kontakt@Lexord.de’;
await Promise.allSettled([
sendMail(email, name, `✓ Bestellbestätigung & Rechnung ${orderNr} | LEXORD®`, customerHtml, env),
sendMail(adminEmail, ‘LEXORD Admin’, `[BESTELLUNG] ${orderNr} · ${name} · ${total.toFixed(2)} €`, adminHtml, env, email),
]);

return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
}

/* ═══════════════════════════════════════════════════════════════════
ACTION: Newsletter Welcome Mail
═══════════════════════════════════════════════════════════════════ */
async function sendNewsletter(body, env, corsHeaders) {
const { email } = body;
if (!email || !email.includes(’@’)) {
return new Response(JSON.stringify({ error: ‘Invalid email’ }), {
status: 400, headers: corsHeaders
});
}

const customerContent = `<div style="text-align:center;margin-bottom:24px"> <div style="font-size:48px;margin-bottom:12px">🎁</div> <div style="font-size:22px;font-weight:900;color:#000;letter-spacing:2px">WILLKOMMEN!</div> <div style="font-size:13px;color:#666;margin-top:8px">Dein exklusiver Rabattcode wartet</div> </div> <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 22px 0">Vielen Dank für deine Newsletter-Anmeldung! Als Willkommensgeschenk erhältst du <strong>10% Rabatt</strong> auf deine erste Bestellung.</p> <div style="background:#000;border-radius:12px;padding:26px;text-align:center;margin:0 0 24px 0"> <div style="font-size:11px;color:#888;letter-spacing:3px;margin-bottom:10px">DEIN RABATTCODE</div> <div style="font-size:32px;color:#00f2ff;letter-spacing:8px;font-weight:900;font-family:'Courier New',monospace">WILLKOMMEN10</div> <div style="font-size:12px;color:#666;margin-top:10px">Im Warenkorb eingeben · 10% auf alle Produkte</div> </div> <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:22px"> <tr> <td style="background:#f9f9f9;border-radius:8px;padding:14px;text-align:center;border-left:3px solid #00f2ff;width:33%"> <div style="font-size:22px">🎮</div> <div style="font-size:11px;font-weight:bold;color:#333;margin-top:5px">CUSTOM CONTROLLER</div> </td> <td style="width:8px"></td> <td style="background:#f9f9f9;border-radius:8px;padding:14px;text-align:center;border-left:3px solid #00f2ff;width:33%"> <div style="font-size:22px">🚚</div> <div style="font-size:11px;font-weight:bold;color:#333;margin-top:5px">VERSAND IN 24H</div> </td> <td style="width:8px"></td> <td style="background:#f9f9f9;border-radius:8px;padding:14px;text-align:center;border-left:3px solid #00f2ff;width:33%"> <div style="font-size:22px">⭐</div> <div style="font-size:11px;font-weight:bold;color:#333;margin-top:5px">TOP BEWERTUNGEN</div> </td> </tr> </table> <div style="text-align:center"><a href="https://lexord.de" style="display:inline-block;background:#00f2ff;color:#000;font-weight:900;font-size:13px;letter-spacing:2px;padding:15px 36px;border-radius:8px;text-decoration:none">JETZT SHOPPEN →</a></div>`;

const adminContent = `<p style="font-size:14px;color:#333;margin:0 0 14px 0">Neue Newsletter-Anmeldung:</p> <div style="background:#f9f9f9;border-radius:8px;padding:18px"> <div style="font-size:13px;color:#333;line-height:2"> <strong style="color:#888">E-Mail:</strong> <a href="mailto:${escapeHtml(email)}" style="color:#00a8b5">${escapeHtml(email)}</a><br> <strong style="color:#888">Datum:</strong> ${new Date().toLocaleString('de-DE')}<br> <strong style="color:#888">Rabattcode:</strong> WILLKOMMEN10 </div> </div>`;

const adminEmail = env.ADMIN_EMAIL || ‘Kontakt@Lexord.de’;
await Promise.allSettled([
sendMail(email, ‘Neuer Abonnent’, ‘🎁 Dein 10% Willkommensrabatt | LEXORD®’,
htmlWrapper(‘linear-gradient(135deg,#00f2ff,#bc13fe)’, ‘🎁 WILLKOMMEN BEI LEXORD®’, ‘’, customerContent), env),
sendMail(adminEmail, ‘LEXORD Admin’, `[NEWSLETTER] Neue Anmeldung: ${email}`,
htmlWrapper(’#00b67a’, ‘📧 NEUE NEWSLETTER ANMELDUNG’, ‘’, adminContent), env, email),
]);

return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
}

/* ═══════════════════════════════════════════════════════════════════
ACTION: Reparatur-Anfrage
═══════════════════════════════════════════════════════════════════ */
async function sendRepair(body, env, corsHeaders) {
const { fname, lname, email, phone, address, zip, city, model, serial, damage, damagePrice, description, since, warranty, repNr } = body;

if (!email || !repNr) {
return new Response(JSON.stringify({ error: ‘Missing fields’ }), {
status: 400, headers: corsHeaders
});
}

const date = new Date().toLocaleDateString(‘de-DE’, { day: ‘2-digit’, month: ‘long’, year: ‘numeric’ });

// Kunden-Mail
const customerContent = `
<p style="font-size:14px;color:#333;margin:0 0 8px 0">Hallo <strong>${escapeHtml(fname)} ${escapeHtml(lname)}</strong>,</p>
<p style="font-size:13px;color:#666;line-height:1.7;margin:0 0 22px 0">deine Reparaturanfrage wurde erfolgreich übermittelt. Wir melden uns innerhalb von <strong>24 Stunden</strong> mit allen weiteren Infos.</p>

```
<div style="background:#f9f9f9;border-radius:10px;padding:20px;margin-bottom:22px;border-left:4px solid #00f2ff">
  <div style="font-size:11px;color:#888;letter-spacing:1px;font-weight:bold;margin-bottom:14px">DEINE ANFRAGE</div>
  <table cellpadding="0" cellspacing="0" style="font-size:13px;color:#333;width:100%">
    <tr><td style="color:#888;width:160px;padding:5px 0">Anfragenummer:</td><td style="padding:5px 0;font-weight:bold;color:#00a8b5">${escapeHtml(repNr)}</td></tr>
    <tr><td style="color:#888;padding:5px 0">Schaden:</td><td style="padding:5px 0">${escapeHtml(damage)}</td></tr>
    <tr><td style="color:#888;padding:5px 0">Preisschätzung:</td><td style="padding:5px 0;color:#009900;font-weight:bold">${escapeHtml(damagePrice)}</td></tr>
    <tr><td style="color:#888;padding:5px 0">Controller:</td><td style="padding:5px 0">${escapeHtml(model)}</td></tr>
    ${serial ? `<tr><td style="color:#888;padding:5px 0">Seriennr.:</td><td style="padding:5px 0">${escapeHtml(serial)}</td></tr>` : ''}
    <tr><td style="color:#888;padding:5px 0">Problem seit:</td><td style="padding:5px 0">${escapeHtml(since)}</td></tr>
    <tr><td style="color:#888;padding:5px 0">Garantie:</td><td style="padding:5px 0">${escapeHtml(warranty)} Monate</td></tr>
    <tr><td style="color:#888;padding:5px 0;vertical-align:top">Beschreibung:</td><td style="padding:5px 0">${escapeHtml(description)}</td></tr>
  </table>
</div>

<div style="background:#000;border-radius:10px;padding:22px;color:#fff;margin-bottom:18px">
  <div style="font-size:11px;color:#888;letter-spacing:1px;font-weight:bold;margin-bottom:12px">📦 EINSENDEANWEISUNG</div>
  <p style="font-size:13px;color:#ccc;line-height:1.8;margin:0">
    Schicke deinen Controller <strong style="color:#fff">sicher verpackt</strong> an:<br><br>
    <span style="color:#00f2ff;font-weight:bold">Leon Schulz · LEXORD Reparatur<br>An Der Domsühler Str. 2<br>19374 Domsühl · Deutschland</span><br><br>
    Lege bitte einen Zettel mit der Anfragenummer <strong style="color:#00f2ff">${escapeHtml(repNr)}</strong> bei.<br>
    Reparaturzeit: <strong style="color:#fff">3–5 Werktage</strong> nach Eingang.
  </p>
</div>

<div style="background:#f0fdfd;border-radius:6px;padding:13px;font-size:12px;color:#666;line-height:1.7">
  💡 <strong style="color:#333">Tipp:</strong> Mach vor dem Versand ein Foto vom Controller mit Anfragenummer — falls beim Transport etwas passiert.
</div>
```

`;

// Admin-Mail
const adminContent = `<table cellpadding="0" cellspacing="0" style="font-size:13px;color:#333;width:100%;margin-bottom:14px"> <tr><td style="color:#888;width:160px;padding:5px 0">Anfragenr.:</td><td style="padding:5px 0;font-weight:bold;color:#00a8b5">${escapeHtml(repNr)}</td></tr> <tr><td style="color:#888;padding:5px 0">Kunde:</td><td style="padding:5px 0">${escapeHtml(fname)} ${escapeHtml(lname)}</td></tr> <tr><td style="color:#888;padding:5px 0">E-Mail:</td><td style="padding:5px 0"><a href="mailto:${escapeHtml(email)}" style="color:#00a8b5">${escapeHtml(email)}</a></td></tr> <tr><td style="color:#888;padding:5px 0">Telefon:</td><td style="padding:5px 0">${escapeHtml(phone || '-')}</td></tr> <tr><td style="color:#888;padding:5px 0;vertical-align:top">Adresse:</td><td style="padding:5px 0">${escapeHtml(address)}, ${escapeHtml(zip)} ${escapeHtml(city)}</td></tr> <tr><td style="color:#888;padding:5px 0">Schaden:</td><td style="padding:5px 0;font-weight:bold">${escapeHtml(damage)}</td></tr> <tr><td style="color:#888;padding:5px 0">Preis:</td><td style="padding:5px 0;color:#00b67a;font-weight:bold">${escapeHtml(damagePrice)}</td></tr> <tr><td style="color:#888;padding:5px 0">Controller:</td><td style="padding:5px 0">${escapeHtml(model)}</td></tr> ${serial ?`<tr><td style="color:#888;padding:5px 0">Seriennr.:</td><td style="padding:5px 0">${escapeHtml(serial)}</td></tr>`: ''} <tr><td style="color:#888;padding:5px 0">Garantie:</td><td style="padding:5px 0">${escapeHtml(warranty)} Monate</td></tr> <tr><td style="color:#888;padding:5px 0">Problem seit:</td><td style="padding:5px 0">${escapeHtml(since)}</td></tr> <tr><td style="color:#888;padding:5px 0">Datum:</td><td style="padding:5px 0">${date}</td></tr> </table> <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-top:14px"> <div style="font-size:11px;color:#888;font-weight:bold;letter-spacing:1px;margin-bottom:8px">BESCHREIBUNG</div> <div style="font-size:13px;color:#333;line-height:1.7;white-space:pre-wrap">${escapeHtml(description)}</div> </div>`;

const adminEmail = env.ADMIN_EMAIL || ‘Kontakt@Lexord.de’;
await Promise.allSettled([
sendMail(email, `${fname} ${lname}`, `🔧 Reparaturanfrage ${repNr} erhalten | LEXORD®`,
htmlWrapper(’#00f2ff’, ‘🔧 REPARATURANFRAGE ERHALTEN’, `Nr. ${escapeHtml(repNr)}`, customerContent), env),
sendMail(adminEmail, ‘LEXORD Admin’, `[REPARATUR] ${repNr} · ${fname} ${lname} · ${damage}`,
htmlWrapper(’#bc13fe’, ‘🔧 NEUE REPARATURANFRAGE’, `${escapeHtml(repNr)} · ${escapeHtml(damage)}`, adminContent), env, email),
]);

return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
}

/* ═══════════════════════════════════════════════════════════════════
ACTION: Kontaktformular
═══════════════════════════════════════════════════════════════════ */
async function sendContact(body, env, corsHeaders) {
const { name, email, subject, message } = body;
if (!email || !message) {
return new Response(JSON.stringify({ error: ‘Missing fields’ }), {
status: 400, headers: corsHeaders
});
}

const date = new Date().toLocaleString(‘de-DE’);
const subj = subject || ‘Kontaktanfrage’;

const customerContent = `<p style="font-size:14px;color:#333;margin:0 0 8px 0">Hallo <strong>${escapeHtml(name || 'Kunde')}</strong>,</p> <p style="font-size:13px;color:#666;line-height:1.7;margin:0 0 18px 0">vielen Dank für deine Nachricht! Wir melden uns innerhalb von <strong>24 Stunden</strong> bei dir.</p> <div style="background:#f9f9f9;border-radius:8px;padding:16px;border-left:4px solid #00f2ff;margin-bottom:18px"> <div style="font-size:11px;color:#888;letter-spacing:1px;font-weight:bold;margin-bottom:6px">DEIN BETREFF</div> <div style="font-size:14px;color:#333;font-weight:bold">${escapeHtml(subj)}</div> </div> <div style="background:#f0fdfd;border-radius:6px;padding:14px;font-size:12px;color:#666;line-height:1.8"> <strong style="color:#333">📞 DIREKTKONTAKT:</strong><br> E-Mail: <a href="mailto:Kontakt@Lexord.de" style="color:#00a8b5">Kontakt@Lexord.de</a><br> Telefon: <a href="tel:+4915204718720" style="color:#00a8b5">0152 047 18720</a> </div>`;

const adminContent = `<table cellpadding="0" cellspacing="0" style="font-size:13px;color:#333;width:100%;margin-bottom:14px"> <tr><td style="color:#888;width:120px;padding:5px 0">Name:</td><td style="padding:5px 0">${escapeHtml(name || '-')}</td></tr> <tr><td style="color:#888;padding:5px 0">E-Mail:</td><td style="padding:5px 0"><a href="mailto:${escapeHtml(email)}" style="color:#00a8b5">${escapeHtml(email)}</a></td></tr> <tr><td style="color:#888;padding:5px 0">Betreff:</td><td style="padding:5px 0;font-weight:bold">${escapeHtml(subj)}</td></tr> <tr><td style="color:#888;padding:5px 0">Datum:</td><td style="padding:5px 0">${date}</td></tr> </table> <div style="background:#f9f9f9;border-radius:8px;padding:16px"> <div style="font-size:11px;color:#888;font-weight:bold;letter-spacing:1px;margin-bottom:8px">NACHRICHT</div> <div style="font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap">${escapeHtml(message)}</div> </div>`;

const adminEmail = env.ADMIN_EMAIL || ‘Kontakt@Lexord.de’;
await Promise.allSettled([
sendMail(email, name || ‘Kunde’, `✓ Deine Nachricht bei LEXORD® | ${subj}`,
htmlWrapper(’#00f2ff’, ‘✉️ NACHRICHT ERHALTEN’, ‘’, customerContent), env),
sendMail(adminEmail, ‘LEXORD Admin’, `[KONTAKT] ${name || email} · ${subj}`,
htmlWrapper(’#ffae00’, ‘✉️ NEUE KONTAKTANFRAGE’, ‘’, adminContent), env, email),
]);

return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
}

/* ═══════════════════════════════════════════════════════════════════
HELPER: HTML escapen (XSS-Schutz)
═══════════════════════════════════════════════════════════════════ */
function escapeHtml(str) {
if (str === null || str === undefined) return ‘’;
return String(str)
.replace(/&/g, ‘&’)
.replace(/</g, ‘<’)
.replace(/>/g, ‘>’)
.replace(/”/g, ‘"’)
.replace(/’/g, ‘'’);
}
