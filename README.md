<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>LEXORD | High-Performance Controller Manufaktur</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --p: #00f2ff; /* Lexord Cyan Glow */
            --s: #7000ff; /* Lexord Deep Purple */
            --w: #f2f2f2; /* Bosch White / Platinum */
            --bg: #050505; /* Obsidian Black */
        }

        /* Verhindert unsauberes Scrollen und Text-Artefakte */
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        
        body { 
            background: var(--bg); 
            color: var(--w); 
            font-family: 'Inter', sans-serif;
            display: flex; flex-direction: column; align-items: center;
            min-height: 100vh; overflow-x: hidden;
        }

        /* 3D Atmosphere - Bewegliches Glühen im Hintergrund */
        .aura {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(0, 242, 255, 0.07) 0%, transparent 45%);
            z-index: -1; pointer-events: none;
        }

        /* Header & Logo Section */
        header { padding: 90px 20px 40px; text-align: center; z-index: 10; width: 100%; }

        .logo-frame {
            position: relative; width: 160px; height: 160px; margin: 0 auto 35px;
            padding: 2px; background: linear-gradient(145deg, var(--p), var(--s));
            border-radius: 50%; box-shadow: 0 0 40px rgba(0, 242, 255, 0.25);
            animation: float 5s ease-in-out infinite;
        }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }

        .logo-frame img {
            width: 100%; height: 100%; border-radius: 50%;
            background: #000; object-fit: cover; display: block;
        }

        h1 { 
            font-family: 'Orbitron', sans-serif; font-size: 3.2rem; font-weight: 900; 
            letter-spacing: 12px; margin-bottom: 12px;
            background: linear-gradient(180deg, #fff 40%, #999 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        .claim {
            font-family: 'Orbitron', sans-serif; color: var(--p); font-size: 0.75rem;
            letter-spacing: 5px; font-weight: 700; text-transform: uppercase; margin-bottom: 45px;
            text-shadow: 0 0 10px rgba(0, 242, 255, 0.3);
        }

        /* Quality Badges - Schafft Vertrauen beim Käufer */
        .badge-row { display: flex; gap: 12px; margin-bottom: 55px; flex-wrap: wrap; justify-content: center; }
        .badge {
            font-size: 0.65rem; padding: 10px 18px; border-radius: 2px;
            background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1);
            letter-spacing: 2px; text-transform: uppercase; font-weight: 600; color: #aaa;
        }

        /* Brand Actions - Psychologisch formulierte Buttons */
        .main-nav { width: 92%; max-width: 520px; display: flex; flex-direction: column; gap: 18px; }

        .luxury-card {
            background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
            padding: 32px; border-radius: 4px; text-decoration: none; color: #fff;
            display: flex; align-items: center; justify-content: space-between;
            transition: 0.5s cubic-bezier(0.19, 1, 0.22, 1);
            backdrop-filter: blur(15px);
        }

        .luxury-card:hover {
            border-color: var(--p); background: rgba(0, 242, 255, 0.04);
            transform: translateX(8px); box-shadow: -15px 0 30px rgba(0, 242, 255, 0.05);
        }

        .card-body h3 { 
            font-family: 'Orbitron', sans-serif; font-size: 1.05rem; 
            letter-spacing: 2px; color: var(--w); margin-bottom: 6px;
        }
        .card-body p { font-size: 0.8rem; color: #666; font-weight: 400; line-height: 1.4; }
        .card-icon { color: var(--p); font-size: 1.1rem; opacity: 0.4; transition: 0.3s; }
        .luxury-card:hover .card-icon { opacity: 1; transform: translateX(5px); }

        /* The Ultimate Conversion Button */
        .cta-button {
            margin-top: 50px; width: 92%; max-width: 520px;
            background: var(--w); color: #000; padding: 28px; border-radius: 2px;
            text-decoration: none; font-family: 'Orbitron', sans-serif;
            font-weight: 900; text-align: center; letter-spacing: 6px;
            transition: 0.4s; box-shadow: 0 15px 40px rgba(0,0,0,0.4);
            text-transform: uppercase;
        }
        .cta-button:hover { background: var(--p); transform: scale(1.02); box-shadow: 0 0 50px rgba(0, 242, 255, 0.3); }

        /* Footer & Impressum (Clean & Professional) */
        footer { margin-top: auto; padding: 100px 20px 40px; text-align: center; width: 100%; }
        .legal-footer { font-size: 0.65rem; color: #333; letter-spacing: 4px; margin-bottom: 45px; text-transform: uppercase; }
        
        details { 
            background: #000; border: 1px solid #111; border-radius: 4px; 
            padding: 30px; max-width: 520px; margin: 0 auto; text-align: left; 
        }
        summary { cursor: pointer; font-size: 0.75rem; color: #555; font-weight: 700; text-align: center; list-style: none; letter-spacing: 2px; }
        summary:hover { color: var(--p); }
    </style>
</head>
<body>

<div class="aura"></div>

<header>
    <div class="logo-frame">
        <img src="logo.png" alt="LEXORD PRESTIGE" onerror="this.src='https://via.placeholder.com/170/000/fff?text=LEXORD'">
    </div>
    <h1>LEXORD</h1>
    <p class="claim">The Engineering Elite</p>
    
    <div class="badge-row">
        <div class="badge">Master-Handwerk</div>
        <div class="badge">Premium Umbau</div>
        <div class="badge">Est. 2026</div>
    </div>
</header>

<div class="main-nav">
    <a href="https://www.ebay.de/usr/lexord-de" target="_blank" class="luxury-card">
        <div class="card-body">
            <h3>MASTER-COLLECTION</h3>
            <p>Sofort verfügbare High-End Controller & Präzisionsteile erwerben.</p>
        </div>
        <div class="card-icon">❯</div>
    </a>

    <a href="https://www.tiktok.com/@lexord.de" target="_blank" class="luxury-card">
        <div class="card-body">
            <h3>INSIDE THE LAB</h3>
            <p>Exklusive Einblicke in unsere Fertigung und Repair-Sessions.</p>
        </div>
        <div class="card-icon">❯</div>
    </a>

    <a href="mailto:kontakt@lexord.de" class="luxury-card">
        <div class="card-body">
            <h3>VIP-SUPPORT</h3>
            <p>Individuelle Projektanfragen und geschäftlicher Kontakt.</p>
        </div>
        <div class="card-icon">❯</div>
    </a>
</div>

<a href="https://wa.me/4915204718720" target="_blank" class="cta-button">Projekt jetzt starten</a>

<footer>
    <p class="legal-footer">© 2026 LEXORD CUSTOMS // BEYOND PERFECTION</p>
    
    <details>
        <summary>DATENSCHUTZ & IMPRESSUM</summary>
        <div style="font-size: 0.85rem; color: #777; margin-top: 25px; line-height: 2;">
            <strong>Anbieterkennzeichnung</strong><br>
            LEXORD.DE - High-Performance Engineering<br>
            Inhaber: [DEIN VOLLSTÄNDIGER NAME]<br>
            Anschrift: [DEINE STRASSE & HAUSNUMMER], [PLZ & STADT]<br><br>
            <strong>Kontakt</strong><br>
            E-Mail: kontakt@lexord.de<br>
            WhatsApp Business: +49 1520 47 18720<br><br>
            <strong>Haftung & Marken</strong><br>
            Wir sind eine unabhängige Manufaktur für Hardware-Modifikationen. Verwendete Markennamen (z.B. PlayStation, Xbox) dienen ausschließlich der Beschreibung der Kompatibilität.
        </div>
    </details>
</footer>

<script>
    // Flüssiger Hintergrund-Effekt für das Luxus-Feeling
    document.addEventListener('mousemove', e => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        document.body.style.setProperty('--x', x + '%');
        document.body.style.setProperty('--y', y + '%');
    });
</script>

</body>
</html>







