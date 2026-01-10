<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>LEXORD.DE | The Gold Standard of Customs</title>
    <style>
        :root {
            --pure-white: #ffffff;
            --off-white: #f5f5f7;
            --lexord-black: #050505;
            --accent-glow: #00d4ff;
            --royal-purple: #8e2de2;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Orbitron', sans-serif; }
        
        body { 
            background: var(--lexord-black); 
            color: var(--pure-white); 
            display: flex; 
            flex-direction: column; 
            align-items: center;
            min-height: 100vh;
            overflow-x: hidden;
            background-image: linear-gradient(180deg, #0a0a0c 0%, #000 100%);
        }

        /* 3D Floating Particles im Hintergrund */
        .ambient-bg {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: radial-gradient(circle at 20% 30%, rgba(0, 212, 255, 0.05) 0%, transparent 40%),
                        radial-gradient(circle at 80% 70%, rgba(142, 45, 226, 0.05) 0%, transparent 40%);
            z-index: -1;
        }

        header { padding: 90px 20px 50px; text-align: center; }

        /* Das Logo - Jetzt wie ein edles Juwel eingefasst */
        .logo-frame {
            position: relative;
            width: 180px; height: 180px;
            margin: 0 auto 40px;
            padding: 5px;
            background: linear-gradient(45deg, var(--accent-glow), var(--royal-purple));
            border-radius: 50%;
            box-shadow: 0 0 50px rgba(0, 212, 255, 0.3);
        }

        .logo-frame img {
            width: 100%; height: 100%;
            border-radius: 50%;
            object-fit: cover;
            background: #000;
            display: block;
        }

        /* Überschrift: Platinum-Effekt */
        h1 { 
            font-size: 3.5rem; font-weight: 900; letter-spacing: 15px;
            background: linear-gradient(180deg, #fff 30%, #a1a1a1 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }

        .premium-subtitle {
            font-size: 0.85rem; letter-spacing: 5px; color: var(--accent-glow);
            text-transform: uppercase; font-weight: 700; margin-bottom: 40px;
            opacity: 0.9;
        }

        /* Trust-Sektion */
        .trust-bar {
            display: flex; gap: 15px; margin-bottom: 50px;
        }
        .trust-tag {
            font-size: 0.6rem; padding: 8px 18px; border: 1px solid rgba(255,255,255,0.1);
            border-radius: 50px; background: rgba(255,255,255,0.03); letter-spacing: 2px;
        }

        /* Premium Links */
        .links-wrapper { width: 95%; max-width: 480px; display: flex; flex-direction: column; gap: 20px; }

        .luxury-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 30px;
            border-radius: 24px;
            text-decoration: none;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            backdrop-filter: blur(30px);
        }

        .luxury-card:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: var(--accent-glow);
            transform: translateY(-10px) scale(1.02);
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 212, 255, 0.2);
        }

        .luxury-card h3 { font-size: 1.1rem; letter-spacing: 2px; }
        .luxury-card p { font-size: 0.75rem; color: #888; margin-top: 5px; font-family: 'Segoe UI', sans-serif; }
        
        /* Der ultimative Kauf-Button */
        .main-cta {
            margin-top: 60px; width: 95%; max-width: 480px;
            background: var(--pure-white);
            color: var(--lexord-black);
            padding: 25px; border-radius: 20px;
            text-decoration: none; font-weight: 900;
            text-align: center; letter-spacing: 5px;
            box-shadow: 0 20px 40px rgba(255,255,255,0.1);
            transition: 0.4s;
        }
        .main-cta:hover { transform: scale(1.05); background: var(--accent-glow); color: #fff; }

        footer { margin-top: auto; padding: 100px 20px 50px; text-align: center; width: 100%; }
        .footer-line { font-size: 0.6rem; opacity: 0.3; letter-spacing: 4px; margin-bottom: 30px; }

        details { background: #000; border: 1px solid #222; border-radius: 20px; padding: 25px; max-width: 450px; margin: 0 auto; text-align: left; }
        summary { cursor: pointer; font-size: 0.8rem; color: #555; text-align: center; list-style: none; font-weight: bold; }
    </style>
</head>
<body>

<div class="ambient-bg"></div>

<header>
    <div class="logo-frame">
        <img src="logo.png" alt="LEXORD PRESTIGE" onerror="this.src='https://via.placeholder.com/180/000/fff?text=LEXORD'">
    </div>
    <h1>LEXORD.DE</h1>
    <p class="premium-subtitle">The Peak of Controller Art</p>
    
    <div class="trust-bar">
        <div class="trust-tag">GERMAN CRAFT</div>
        <div class="trust-tag">LIFETIME SUPPORT</div>
    </div>
</header>

<div class="links-wrapper">
    <a href="https://www.ebay.de/usr/lexord-de" target="_blank" class="luxury-card">
        <div><h3>EBAY COLLECTION</h3><p>Exklusive Builds sofort lieferbar</p></div>
        <span>→</span>
    </a>
    <a href="https://www.tiktok.com/@lexord.de" target="_blank" class="luxury-card">
        <div><h3>TIKTOK INSIGHTS</h3><p>Hinter den Kulissen der Manufaktur</p></div>
        <span>→</span>
    </a>
    <a href="mailto:kontakt@lexord.de" class="luxury-card">
        <div><h3>VIP SERVICE</h3><p>Anfragen & individuelle Beratung</p></div>
        <span>→</span>
    </a>
</div>

<a href="https://wa.me/4915204718720" target="_blank" class="main-cta">JETZT KONFIGURIEREN</a>

<footer>
    <p class="footer-line">ESTABLISHED 2026 | BEYOND THE LIMITS</p>
    <details>
        <summary>LEGAL & IMPRESSUM</summary>
        <div style="font-size: 0.8rem; color: #666; margin-top: 25px; line-height: 2;">
            <strong>Impressum</strong><br>
            Inhaber: [DEIN NAME]<br>
            [STRASSE & HAUSNUMMER]<br>
            [PLZ & STADT]<br>
            E-Mail: kontakt@lexord.de<br>
            WhatsApp: +49 1520 47 18720<br><br>
            <strong>Rechtliches</strong><br>
            Unabhängiger Custom-Anbieter. Alle Marken sind Eigentum ihrer Inhaber.
        </div>
    </details>
</footer>

</body>
</html>







