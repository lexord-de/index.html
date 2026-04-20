/**

- LEXORD® Cloudflare Worker — E-Mail via Brevo API
- Endpoints: /api/send-order-email, /api/newsletter, /api/repair-request, /api/contact
- Variables: BREVO_API_KEY, SMTP_USER (Kontakt@Lexord.de)
  */
  export default {
  async fetch(request, env) {
  const H={‘Access-Control-Allow-Origin’:’*’,‘Access-Control-Allow-Methods’:‘GET,POST,OPTIONS’,‘Access-Control-Allow-Headers’:‘Content-Type’,‘Content-Type’:‘application/json’};
  if(request.method===‘OPTIONS’) return new Response(null,{headers:H});
  const path=new URL(request.url).pathname;
  try{
  if(path===’/health’) return new Response(JSON.stringify({status:‘ok’}),{headers:H});
  
  if(path===’/api/send-order-email’&&request.method===‘POST’){
  const d=await request.json();
  await sendMail(env,d.email,’\u2705 Bestellbestätigung & Rechnung #’+d.orderNr+’ | LEXORD\u00ae’,orderKunde(d));
  await sendMail(env,env.SMTP_USER||‘Kontakt@Lexord.de’,’[BESTELLUNG] ‘+d.orderNr+’ | ‘+d.customerName+’ | ‘+Number(d.total).toFixed(2)+’ \u20ac’,orderAdmin(d),d.email);
  return new Response(JSON.stringify({success:true}),{headers:H});
  }
  
  if(path===’/api/newsletter’&&request.method===‘POST’){
  const{email}=await request.json();
  await sendMail(env,email,’\ud83c\udf81 Dein 10% Willkommensrabatt | LEXORD\u00ae’,nlHtml());
  await sendMail(env,env.SMTP_USER||‘Kontakt@Lexord.de’,’[NEWSLETTER] ‘+email,’<div style="font-family:Arial;padding:20px;background:#0a0a0a;color:#fff"><h3 style="color:#00f2ff">\ud83d\udce7 Newsletter</h3><p style="color:#ccc">’+email+’</p><p style="color:#888;font-size:12px">’+new Date().toLocaleString(‘de-DE’)+’</p></div>’,email);
  return new Response(JSON.stringify({success:true}),{headers:H});
  }
  
  if(path===’/api/repair-request’&&request.method===‘POST’){
  const d=await request.json();
  await sendMail(env,d.email,’\ud83d\udd27 Reparaturanfrage ‘+d.repNr+’ | LEXORD\u00ae’,repKunde(d));
  await sendMail(env,env.SMTP_USER||‘Kontakt@Lexord.de’,’[REPARATUR] ‘+d.repNr+’ \u2013 ’+d.name,repAdmin(d),d.email);
  return new Response(JSON.stringify({success:true}),{headers:H});
  }
  
  if(path===’/api/contact’&&request.method===‘POST’){
  const d=await request.json();
  await sendMail(env,env.SMTP_USER||‘Kontakt@Lexord.de’,’[KONTAKT] ‘+d.name+’ | ‘+(d.subject||‘Anfrage’),contactAdmin(d),d.email);
  await sendMail(env,d.email,’\u2705 Nachricht erhalten | LEXORD\u00ae’,contactKunde(d));
  return new Response(JSON.stringify({success:true}),{headers:H});
  }
  
  return new Response(JSON.stringify({error:‘Not found’}),{status:404,headers:H});
  }catch(e){return new Response(JSON.stringify({error:e.message}),{status:500,headers:H});}
  }
  };

async function sendMail(env,to,subject,html,replyTo){
const r=await fetch(‘https://api.brevo.com/v3/smtp/email’,{method:‘POST’,headers:{‘api-key’:env.BREVO_API_KEY,‘Content-Type’:‘application/json’},body:JSON.stringify({sender:{name:‘LEXORD Engineering’,email:env.SMTP_USER||‘Kontakt@Lexord.de’},to:[{email:to}],subject,htmlContent:html,replyTo:replyTo?{email:replyTo}:undefined})});
if(!r.ok) throw new Error(‘Brevo:’+r.status+’ ’+await r.text());
}

function e(s){return String(s||’’).replace(/&/g,’&’).replace(/</g,’<’).replace(/>/g,’>’);}

function orderKunde(d){
const dt=new Date().toLocaleDateString(‘de-DE’,{day:‘2-digit’,month:‘long’,year:‘numeric’});
const rows=(d.items||[]).map(i=>’<tr><td style="padding:12px 14px;border-bottom:1px solid #eee;font-size:13px;color:#333">’+e(i.name)+’</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:center;font-size:13px;color:#555">’+i.qty+’</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;font-size:13px">’+Number(i.price).toFixed(2)+’ \u20ac</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:bold">’+(Number(i.price)*Number(i.qty)).toFixed(2)+’ \u20ac</td></tr>’).join(’’);
const disc=Number(d.disc)>0?’<tr><td colspan="3" style="padding:8px 14px;font-size:13px;color:#009900">’+e(d.discLabel||‘Rabatt’)+’</td><td style="padding:8px 14px;text-align:right;font-size:13px;color:#009900">-’+Number(d.disc).toFixed(2)+’ \u20ac</td></tr>’:’’;
const sh=Number(d.ship)===0?‘Kostenlos’:Number(d.ship).toFixed(2)+’ \u20ac’;
return ‘<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial"><div style="max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.08)"><div style="background:#000;padding:28px 32px;text-align:center"><div style="font-size:22px;font-weight:900;color:#00f2ff;letter-spacing:6px">LEXORD\u00ae</div><div style="font-size:11px;color:#888;letter-spacing:3px;margin-top:4px">ENGINEERING EXCELLENCE \u00b7 MADE IN GERMANY</div></div><div style="background:#00f2ff;padding:14px 32px"><b style="color:#000">BESTELLBEST\u00c4TIGUNG & RECHNUNG</b> <span style="float:right;color:#006060">Nr. ‘+d.orderNr+’</span></div><div style="padding:28px 32px"><p style="font-size:14px;color:#333">Hallo <b>’+e(d.customerName)+’</b>,</p><p style="font-size:13px;color:#666;line-height:1.6">vielen Dank! Diese E-Mail ist deine Rechnung gem. \u00a7 14 UStG.</p><div style="background:#f9f9f9;border-radius:6px;padding:16px;margin:20px 0;border-left:4px solid #00f2ff"><table style="font-size:13px;color:#333;line-height:2;width:100%"><tr><td style="color:#888">Datum:</td><td>’+dt+’</td></tr><tr><td style="color:#888">Zahlung:</td><td>’+e(d.payMethod)+’</td></tr><tr><td style="color:#888">Land:</td><td>’+e(d.land)+’</td></tr></table></div><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f0f0f0"><th style="padding:10px;text-align:left;font-size:11px;color:#888">PRODUKT</th><th style="padding:10px;text-align:center;font-size:11px;color:#888">MENGE</th><th style="padding:10px;text-align:right;font-size:11px;color:#888">PREIS</th><th style="padding:10px;text-align:right;font-size:11px;color:#888">SUMME</th></tr></thead><tbody>’+rows+’</tbody><tfoot><tr><td colspan="3" style="padding:8px 14px;font-size:13px;color:#555">Zwischensumme</td><td style="padding:8px 14px;text-align:right">’+Number(d.sub).toFixed(2)+’ \u20ac</td></tr>’+disc+’<tr><td colspan="3" style="padding:8px 14px;font-size:13px;color:#555">Versand DHL</td><td style="padding:8px 14px;text-align:right">’+sh+’</td></tr><tr style="background:#000"><td colspan="3" style="padding:14px;font-weight:bold;color:#fff">GESAMT</td><td style="padding:14px;text-align:right;font-size:17px;font-weight:bold;color:#00f2ff">’+Number(d.total).toFixed(2)+’ \u20ac</td></tr></tfoot></table><div style="background:#fff8e1;border:1px solid #ffd54f;border-radius:6px;padding:14px;margin:20px 0;font-size:11px;color:#555"><b>Hinweis:</b> Kleinunternehmer gem. \u00a7 19 UStG \u2013 keine USt.</div><div style="background:#f9f9f9;border-radius:6px;padding:16px;font-size:12px;color:#666;line-height:1.8"><b style="color:#333">Rechnungsaussteller:</b><br>Leon Schulz | LEXORD Engineering<br>An Der Doms\u00fchler Str. 2 \u00b7 19374 Doms\u00fchl<br>Kontakt@Lexord.de \u00b7 0152 047 18720<br>Nr. ‘+d.orderNr+’ \u00b7 ‘+dt+’</div></div><div style="background:#f5f5f5;padding:18px 32px;text-align:center;border-top:1px solid #eee;font-size:12px;color:#888">14 Tage Widerrufsrecht \u00b7 <a href="mailto:Kontakt@Lexord.de" style="color:#00a8b5">Kontakt@Lexord.de</a></div></div></body></html>’;
}

function orderAdmin(d){
const il=(d.items||[]).map(i=>’<div style="font-size:13px;color:#ddd;padding:4px 0;border-bottom:1px solid #1a1a1a">’+e(i.name)+’ \u00d7’+i.qty+’ = <b style="color:#00f2ff">’+(Number(i.price)*Number(i.qty)).toFixed(2)+’ \u20ac</b></div>’).join(’’);
const sh=Number(d.ship)===0?‘Kostenlos’:Number(d.ship).toFixed(2)+’ \u20ac’;
return ‘<body style="font-family:Arial;background:#0a0a0a;color:#fff;padding:20px"><div style="max-width:520px;margin:0 auto;background:#111;border:2px solid #00f2ff;border-radius:10px;padding:24px"><h2 style="color:#00f2ff;font-size:16px;letter-spacing:2px">\ud83d\udce6 NEUE BESTELLUNG</h2><table style="font-size:13px;color:#ccc;line-height:2.4;width:100%"><tr><td style="color:#888">Nr:</td><td style="color:#00f2ff;font-weight:bold">’+d.orderNr+’</td></tr><tr><td style="color:#888">Kunde:</td><td>’+e(d.customerName)+’</td></tr><tr><td style="color:#888">E-Mail:</td><td>’+d.email+’</td></tr><tr><td style="color:#888">Zahlung:</td><td>’+e(d.payMethod)+’</td></tr><tr><td style="color:#888">Land:</td><td>’+e(d.land)+’</td></tr></table><div style="margin-top:14px;background:#0a0a0a;border-radius:6px;padding:14px">’+il+’</div><table style="font-size:13px;color:#ccc;line-height:2;width:100%;margin-top:12px"><tr><td style="color:#888">Versand:</td><td>’+sh+’</td></tr><tr><td style="color:#888;font-weight:bold">GESAMT:</td><td style="color:#00f2ff;font-size:16px;font-weight:bold">’+Number(d.total).toFixed(2)+’ \u20ac</td></tr></table></div></body>’;
}

function nlHtml(){
return ‘<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial"><div style="max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden"><div style="background:#000;padding:28px 32px;text-align:center"><div style="font-size:22px;font-weight:900;color:#00f2ff;letter-spacing:6px">LEXORD\u00ae</div></div><div style="background:linear-gradient(135deg,#00f2ff,#bc13fe);padding:28px 32px;text-align:center"><div style="font-size:40px;margin-bottom:10px">\ud83c\udf81</div><div style="font-size:22px;font-weight:900;color:#fff">WILLKOMMEN!</div></div><div style="padding:32px"><p style="font-size:14px;color:#333;line-height:1.7">Danke f\u00fcr deine Anmeldung! <b>10% Rabatt</b> auf deine erste Bestellung:</p><div style="background:#000;border-radius:10px;padding:22px;text-align:center;margin:24px 0"><div style="font-size:11px;color:#888;letter-spacing:3px;margin-bottom:8px">DEIN RABATTCODE</div><div style="font-size:28px;color:#00f2ff;letter-spacing:8px;font-weight:900">WILLKOMMEN10</div></div><div style="text-align:center"><a href="https://lexord.de" style="display:inline-block;background:#00f2ff;color:#000;font-weight:900;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:2px">JETZT SHOPPEN \u2192</a></div></div><div style="background:#f5f5f5;padding:16px 32px;text-align:center;border-top:1px solid #eee;font-size:11px;color:#aaa">Abmeldung jederzeit \u00b7 Kontakt@Lexord.de</div></div></body></html>’;
}

function repKunde(d){
return ‘<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial"><div style="max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden"><div style="background:#000;padding:28px 32px;text-align:center"><div style="font-size:22px;font-weight:900;color:#00f2ff;letter-spacing:6px">LEXORD\u00ae</div><div style="font-size:11px;color:#888;letter-spacing:3px;margin-top:4px">REPARATUR SERVICE</div></div><div style="background:#00f2ff;padding:14px 32px;text-align:center"><b style="color:#000">\ud83d\udd27 REPARATURANFRAGE ERHALTEN</b></div><div style="padding:28px 32px"><p style="font-size:14px;color:#333">Hallo <b>’+e(d.name)+’</b>,</p><p style="font-size:13px;color:#666;line-height:1.7">Anfrage erhalten. Wir melden uns innerhalb <b>24 Stunden</b>.</p><div style="background:#f9f9f9;border-radius:8px;padding:18px;margin:18px 0;border-left:4px solid #00f2ff"><table style="font-size:13px;color:#333;line-height:2.2;width:100%"><tr><td style="color:#888">Nr:</td><td><b>’+e(d.repNr)+’</b></td></tr><tr><td style="color:#888">Schaden:</td><td>’+e(d.repairType)+’</td></tr><tr><td style="color:#888">Kosten:</td><td style="color:#009900;font-weight:bold">’+e(d.price)+’</td></tr></table></div><div style="background:#000;border-radius:8px;padding:20px;color:#ccc;font-size:13px;line-height:1.7">Controller sicher verpackt an:<br><b style="color:#00f2ff">Leon Schulz \u00b7 An Der Doms\u00fchler Str. 2 \u00b7 19374 Doms\u00fchl</b><br>Bitte <b style="color:#00f2ff">’+e(d.repNr)+’</b> beilegen.</div></div></div></body></html>’;
}

function repAdmin(d){
return ‘<body style="font-family:Arial;background:#111;color:#fff;padding:20px"><div style="max-width:520px;margin:0 auto;background:#1a1a1a;border:2px solid #00f2ff;border-radius:8px;padding:24px"><h2 style="color:#00f2ff;font-size:16px;letter-spacing:2px">\ud83d\udd27 REPARATUR</h2><table style="font-size:13px;color:#ccc;line-height:2.4;width:100%"><tr><td style="color:#888">Nr:</td><td style="color:#00f2ff;font-weight:bold">’+e(d.repNr)+’</td></tr><tr><td style="color:#888">Kunde:</td><td>’+e(d.name)+’</td></tr><tr><td style="color:#888">E-Mail:</td><td>’+d.email+’</td></tr><tr><td style="color:#888">Tel:</td><td>’+e(d.phone||’-’)+’</td></tr><tr><td style="color:#888">Schaden:</td><td>’+e(d.repairType)+’</td></tr><tr><td style="color:#888">Controller:</td><td>’+e(d.model||’-’)+’</td></tr><tr><td style="color:#888">Kosten:</td><td style="color:#00b67a">’+e(d.price)+’</td></tr><tr><td style="color:#888">Garantie:</td><td>’+e(d.warranty||’-’)+’</td></tr></table><div style="background:#0a0a0a;border-radius:6px;padding:14px;margin-top:14px;font-size:13px;color:#ddd;line-height:1.6">’+e(d.problem)+’</div></div></body>’;
}

function contactAdmin(d){
return ‘<body style="font-family:Arial;background:#0a0a0a;color:#fff;padding:20px"><div style="max-width:540px;margin:0 auto;background:#111;border:2px solid #00f2ff;border-radius:10px;padding:24px"><h2 style="color:#00f2ff;font-size:16px;letter-spacing:2px">\u2709\ufe0f KONTAKT</h2><table style="font-size:13px;color:#ccc;line-height:2.4;width:100%"><tr><td style="color:#888">Name:</td><td>’+e(d.name)+’</td></tr><tr><td style="color:#888">E-Mail:</td><td>’+d.email+’</td></tr><tr><td style="color:#888">Betreff:</td><td>’+e(d.subject||‘Anfrage’)+’</td></tr><tr><td style="color:#888">Datum:</td><td>’+new Date().toLocaleString(‘de-DE’)+’</td></tr></table><div style="background:#0a0a0a;border-radius:6px;padding:16px;margin-top:14px;font-size:14px;color:#ddd;line-height:1.7;white-space:pre-wrap">’+e(d.message)+’</div></div></body>’;
}

function contactKunde(d){
return ‘<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial"><div style="max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden"><div style="background:#000;padding:24px 32px;text-align:center"><div style="font-size:20px;font-weight:900;color:#00f2ff;letter-spacing:6px">LEXORD\u00ae</div></div><div style="background:#00f2ff;padding:12px 32px;text-align:center"><b style="color:#000">\u2705 NACHRICHT ERHALTEN</b></div><div style="padding:28px 32px"><p style="font-size:14px;color:#333">Hallo <b>’+e(d.name)+’</b>,</p><p style="font-size:13px;color:#666;line-height:1.7">Danke! Wir melden uns innerhalb <b>24 Stunden</b>.</p></div><div style="background:#f5f5f5;padding:14px 32px;text-align:center;border-top:1px solid #eee;font-size:11px;color:#aaa">Made in Germany \u00b7 Kontakt@Lexord.de</div></div></body></html>’;
}
