export default {
  async fetch(request, env) {
    const H = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: H });
    }

    const path = new URL(request.url).pathname;

    try {
      if (path === "/health") {
        return json({ status: "ok" }, H);
      }

      if (path === "/api/send-order-email" && request.method === "POST") {
        const d = await request.json();
        await mail(env, d.email, "Bestellbestaetigung #" + d.orderNr + " | LEXORD", orderHtml(d));
        await mail(env, env.SMTP_USER, "[BESTELLUNG] " + d.orderNr, adminOrderHtml(d), d.email);
        return json({ success: true }, H);
      }

      if (path === "/api/newsletter" && request.method === "POST") {
        const d = await request.json();
        await mail(env, d.email, "Willkommen bei LEXORD - 10% Rabatt", newsletterHtml());
        await mail(env, env.SMTP_USER, "[NEWSLETTER] " + d.email, "<p>Neue Anmeldung: " + esc(d.email) + "</p>", d.email);
        return json({ success: true }, H);
      }

      if (path === "/api/repair-request" && request.method === "POST") {
        const d = await request.json();
        await mail(env, d.email, "Reparaturanfrage " + d.repNr + " | LEXORD", repairHtml(d));
        await mail(env, env.SMTP_USER, "[REPARATUR] " + d.repNr + " " + d.name, repairAdminHtml(d), d.email);
        return json({ success: true }, H);
      }

      if (path === "/api/contact" && request.method === "POST") {
        const d = await request.json();
        await mail(env, env.SMTP_USER, "[KONTAKT] " + d.name, contactAdminHtml(d), d.email);
        await mail(env, d.email, "Nachricht erhalten | LEXORD", contactKundeHtml(d));
        return json({ success: true }, H);
      }

      return json({ error: "Not found" }, H, 404);
    } catch (e) {
      return json({ error: e.message }, H, 500);
    }
  }
};

function json(obj, headers, status) {
  return new Response(JSON.stringify(obj), { headers: headers, status: status || 200 });
}

function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function mail(env, to, subject, html, replyTo) {
  var body = {
    sender: { name: "LEXORD Engineering", email: env.SMTP_USER || "Kontakt@Lexord.de" },
    to: [{ email: to }],
    subject: subject,
    htmlContent: html
  };
  if (replyTo) {
    body.replyTo = { email: replyTo };
  }
  var r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    throw new Error("Brevo " + r.status);
  }
}

// Die HTML-Funktionen (orderHtml, repairHtml, etc.) bleiben logisch gleich, 
// achte aber auch dort darauf, dass beim Kopieren nur Standard-Anführungszeichen genutzt werden.
function orderHtml(d) {
  var dt = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
  var items = d.items || [];
  var rows = "";
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var sum = (Number(it.price) * Number(it.qty)).toFixed(2);
    rows += "<tr>";
    rows += "<td style='padding:12px;border-bottom:1px solid #eee'>" + esc(it.name) + "</td>";
    rows += "<td style='padding:12px;border-bottom:1px solid #eee;text-align:center'>" + it.qty + "</td>";
    rows += "<td style='padding:12px;border-bottom:1px solid #eee;text-align:right'>" + Number(it.price).toFixed(2) + " EUR</td>";
    rows += "<td style='padding:12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold'>" + sum + " EUR</td>";
    rows += "</tr>";
  }
  // ... Rest der HTML-Funktionen analog mit korrekten Anführungszeichen fortsetzen
  return "<html>...</html>"; // (Hier gekürzt für die Übersicht)
}
