/**
 * LEXORD® Cloudflare Worker (v3 - Final Professional Edition)
 * - Stripe Payment Intent (Embedded Checkout)
 * - Professional HTML Email Templates (Invoice, Newsletter, Repair, Contact)
 * - 100% Serverless & Free
 */

export default {
  async fetch(request, env, ctx) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers });

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/health') return new Response(JSON.stringify({ status: 'ok' }), { headers });

      // 1. STRIPE PAYMENT INTENT
      if (path === '/api/create-payment-intent' && request.method === 'POST') {
        const { amount, currency, orderNr, customerEmail } = await request.json();
        const res = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            amount, currency,
            'metadata[orderNr]': orderNr,
            'metadata[customerEmail]': customerEmail,
            'automatic_payment_methods[enabled]': 'true',
          }),
        });
        const data = await res.json();
        if (!res.ok) return new Response(JSON.stringify({ error: data.error?.message }), { status: 400, headers });
        return new Response(JSON.stringify({ clientSecret: data.client_secret }), { headers });
      }

      // 2. SEND ORDER EMAIL (INVOICE)
      if (path === '/api/send-order-email' && request.method === 'POST') {
        const data = await request.json();
        const html = buildOrderEmailHtml(data);
        await sendEmail(env, data.email, `Bestellbestätigung & Rechnung #${data.orderNr} | LEXORD®`, html);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // 3. NEWSLETTER
      if (path === '/api/newsletter' && request.method === 'POST') {
        const { email } = await request.json();
        const html = buildNewsletterHtml();
        await sendEmail(env, email, 'Willkommen bei LEXORD® | Dein 10% Gutschein', html);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // 4. REPAIR REQUEST
      if (path === '/api/repair-request' && request.method === 'POST') {
        const data = await request.json();
        const html = buildRepairEmailHtml(data);
        await sendEmail(env, data.email, `Reparaturanfrage erhalten #${data.repNr} | LEXORD®`, html);
        await sendEmail(env, env.SMTP_USER, `NEUE REPARATUR #${data.repNr} von ${data.name}`, html);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // 5. CONTACT FORM
      if (path === '/api/contact' && request.method === 'POST') {
        const { name, email, message } = await request.json();
        const html = buildContactEmailHtml({ name, email, message });
        await sendEmail(env, env.SMTP_USER, `Kontaktanfrage: ${name}`, html, email);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
  }
};

// ── EMAIL SENDING (VIA BREVO API - FREE & EASY) ─────────────────────────────
async function sendEmail(env, to, subject, htmlContent, replyTo) {
  // Wir nutzen Brevo API (ehem. Sendinblue) - 300 E-Mails/Tag kostenlos, keine SMTP-Probleme
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'LEXORD Engineering', email: 'Kontakt@Lexord.de' },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent,
      replyTo: replyTo ? { email: replyTo } : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Email Error: ${await res.text()}`);
}

// ── PROFESSIONAL HTML TEMPLATES ─────────────────────────────────────────────

function buildOrderEmailHtml({ orderNr, customerName, payMethod, land, items, sub, disc, discLabel, ship, total }) {
  const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  const itemRows = items.map(i => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eee;font-size:13px;color:#333">${i.name}</td>
      <td style="padding:12px;border-bottom:1px solid #eee;text-align:center;font-size:13px;color:#555">${i.qty}</td>
      <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;font-size:13px">${Number(i.price).toFixed(2)} €</td>
      <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:bold">${(Number(i.price)*Number(i.qty)).toFixed(2)} €</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8f8f8;font-family:Arial,sans-serif">
    <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 25px rgba(0,0,0,0.05)">
      <div style="background:#000;padding:30px;text-align:center">
        <div style="font-size:24px;font-weight:900;color:#00f2ff;letter-spacing:6px">LEXORD®</div>
        <div style="font-size:10px;color:#666;letter-spacing:3px;margin-top:5px">ENGINEERING EXCELLENCE · MADE IN GERMANY</div>
      </div>
      <div style="background:#00f2ff;padding:15px 30px;color:#000;font-weight:bold;display:flex;justify-content:space-between">
        <span>RECHNUNG & BESTÄTIGUNG</span>
        <span>#${orderNr}</span>
      </div>
      <div style="padding:30px">
        <p style="font-size:15px;color:#333">Hallo <strong>${customerName}</strong>,</p>
        <p style="font-size:14px;color:#666;line-height:1.6">vielen Dank für deine Bestellung! Hier ist deine Rechnung gem. § 14 UStG.</p>
        <div style="background:#f9f9f9;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #00f2ff">
          <table style="width:100%;font-size:13px;color:#444;line-height:1.8">
            <tr><td>Datum:</td><td>${date}</td></tr>
            <tr><td>Zahlungsart:</td><td>${payMethod}</td></tr>
            <tr><td>Lieferland:</td><td>${land}</td></tr>
          </table>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead><tr style="background:#f4f4f4"><th style="padding:10px;text-align:left;font-size:11px;color:#888">PRODUKT</th><th style="padding:10px;text-align:center;font-size:11px;color:#888">MENGE</th><th style="padding:10px;text-align:right;font-size:11px;color:#888">PREIS</th><th style="padding:10px;text-align:right;font-size:11px;color:#888">SUMME</th></tr></thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr><td colspan="3" style="padding:10px;text-align:right;font-size:13px;color:#777">Zwischensumme</td><td style="padding:10px;text-align:right;font-size:13px">${Number(sub).toFixed(2)} €</td></tr>
            ${disc > 0 ? `<tr><td colspan="3" style="padding:10px;text-align:right;font-size:13px;color:#009900">Rabatt (${discLabel})</td><td style="padding:10px;text-align:right;font-size:13px;color:#009900">-${Number(disc).toFixed(2)} €</td></tr>` : ''}
            <tr><td colspan="3" style="padding:10px;text-align:right;font-size:13px;color:#777">Versand</td><td style="padding:10px;text-align:right;font-size:13px">${Number(ship)===0?'Kostenlos':Number(ship).toFixed(2)+' €'}</td></tr>
            <tr style="background:#000;color:#fff"><td colspan="3" style="padding:15px;font-weight:bold">GESAMTBETRAG</td><td style="padding:15px;text-align:right;font-size:18px;font-weight:bold;color:#00f2ff">${Number(total).toFixed(2)} €</td></tr>
          </tfoot>
        </table>
        <div style="font-size:11px;color:#999;text-align:center;margin-top:40px;border-top:1px solid #eee;padding-top:20px">
          LEXORD Engineering · Leon Schulz · An Der Domsühler Str. 2 · 19374 Domsühl<br>
          Steuerhinweis: Kleinunternehmer gem. § 19 UStG – keine Umsatzsteuer ausgewiesen.
        </div>
      </div>
    </div>
  </body></html>`;
}

function buildNewsletterHtml() {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#000;font-family:Arial,sans-serif;color:#fff">
    <div style="max-width:600px;margin:0 auto;padding:40px;text-align:center">
      <div style="font-size:30px;font-weight:900;color:#00f2ff;letter-spacing:8px;margin-bottom:10px">LEXORD®</div>
      <div style="height:2px;background:linear-gradient(to right, transparent, #00f2ff, transparent);margin-bottom:40px"></div>
      <h1 style="font-size:28px;margin-bottom:20px">WILLKOMMEN IM TEAM!</h1>
      <p style="font-size:16px;color:#ccc;line-height:1.6;margin-bottom:30px">Danke für deine Anmeldung. Als Teil der LEXORD Elite erhältst du exklusiven Zugriff auf neue Drops und Technik-Updates.</p>
      <div style="background:#111;border:1px solid #222;padding:30px;border-radius:15px;margin-bottom:30px">
        <div style="font-size:12px;color:#666;letter-spacing:3px;margin-bottom:10px">DEIN WILLKOMMENS-CODE</div>
        <div style="font-size:36px;font-weight:900;color:#00f2ff;letter-spacing:5px">WILLKOMMEN10</div>
        <div style="font-size:14px;color:#444;margin-top:10px">10% Rabatt auf deine erste Bestellung</div>
      </div>
      <a href="https://lexord.de" style="display:inline-block;background:#00f2ff;color:#000;padding:15px 40px;border-radius:5px;text-weight:bold;text-decoration:none;letter-spacing:2px">JETZT SHOPPEN</a>
    </div>
  </body></html>`;
}

function buildRepairEmailHtml({ name, problem, repairType, repNr }) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
    <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:10px;overflow:hidden">
      <div style="background:#000;padding:25px;text-align:center;color:#00f2ff;font-weight:bold;letter-spacing:4px">REPARATUR SERVICE</div>
      <div style="padding:30px">
        <h2 style="color:#333">Anfrage erhalten #${repNr}</h2>
        <p>Hallo ${name}, wir haben deine Anfrage für eine <strong>${repairType}</strong> erhalten.</p>
        <div style="background:#f9f9f9;padding:15px;border-radius:5px;margin:20px 0">
          <strong style="font-size:12px;color:#888">PROBLEMBESCHREIBUNG:</strong><br>
          <p style="font-size:14px;color:#444">${problem}</p>
        </div>
        <p style="font-size:14px;color:#666">Unser Techniker prüft deine Anfrage und meldet sich innerhalb von 24h mit den nächsten Schritten bei dir.</p>
      </div>
    </div>
  </body></html>`;
}

function buildContactEmailHtml({ name, email, message }) {
  return `<h2>Neue Kontaktanfrage</h2><p><strong>Von:</strong> ${name} (${email})</p><p><strong>Nachricht:</strong></p><div style="padding:15px;background:#f4f4f4;border-radius:5px">${message}</div>`;
}
