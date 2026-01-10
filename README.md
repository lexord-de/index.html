<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LEXORD.DE // Ultimate Controller Engineering</title>
    <style>
        :root {
            --p: #00f2ff; /* Neon Cyan */
            --s: #7000ff; /* Deep Purple */
            --bg: #010103;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Orbitron', sans-serif; }
        
        body { 
            background: var(--bg); 
            color: #fff; 
            display: flex; 
            flex-direction: column; 
            align-items: center;
            min-height: 100vh;
            overflow-x: hidden;
            background-image: 
                radial-gradient(circle at 50% 0%, rgba(112, 0, 255, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 0% 100%, rgba(0, 242, 255, 0.05) 0%, transparent 30%);
        }

        /* Animiertes Grid */
        body::before {
            content: "";
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
            background-size: 30px 30px;
            z-index: -1;
            mask-image: linear-gradient(to bottom, black, transparent);
        }

        header { padding: 70px 20px 30px; text-align: center; }

        /* Das Logo mit Energie-Effekt */
        .logo-box {
            position: relative;
            width: 150px; height: 150px;
            margin: 0 auto 30px;
        }
        .logo-box img {
            width: 100%; height: 100%;
            border-radius: 50%;
            border: 2px solid var(--p);
            position: relative; z-index: 5;
            background: #000;
            filter: drop-shadow(0 0 10px var(--p));
        }
        .logo-box::before {
            content: ''; position: absolute; top: -15px; left: -15px; right: -15px; bottom: -15px;
            background: linear-gradient(45deg, var(--p), var(--s));
            border-radius: 50%;
            filter: blur(30px);
            opacity: 0.4;
            animation: rotate 6s linear infinite;
        }

        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Glitch Überschrift */
        h1 { 
            font-size: 3rem; 
            font-weight: 900; 
            letter-spacing: 12px;
            text-shadow: 2px 2px var(--s), -2px -2px var(--p);
            animation: glitch 3s infinite;
        }

        @keyframes glitch {
            0% { text-shadow: 2px 2px var(--s), -2px -2px var(--p); }
            50% { text-shadow: -2px 2px var(--s), 2px -2px var(--p); }
            100% { text-shadow: 2px 2px var(--s), -2px -2px var(--p); }
        }

        .tagline { 
            color: #fff; font-size: 0.85rem; margin-top: 20px; 
            letter-spacing: 3px; font-weight: 700; opacity: 0.8;
            max-width: 400px; line-height: 1.6;
            text-transform: uppercase;
        }

        /* Ultra-Premium Buttons */
        .links { width: 90%; max-width: 460px; display: flex; flex-direction: column; gap: 20px; margin-top: 40px; }

        .btn {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 22px;
            border-radius: 15px;
            text-decoration: none;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: 0.4s;
            backdrop-filter: blur(10px);
            position: relative;
            overflow: hidden;
        }

        .btn::after {
            content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0, 242, 255, 0.1), transparent);
            transition: 0.5s;
        }

        .btn:hover {
            border-color: var(--p);
            transform: translateY(-5px) scale(1.02);
            background: rgba(0, 242, 255, 0.05);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }
        .btn:hover::after { left: 100%; }

        .btn-info h3 { font-size: 1rem; letter-spacing: 2px; }
        .btn-info p { font-size: 0.7rem; opacity: 0.5; font-family: sans-serif; margin-top: 3px; }
        .btn-arrow { color: var(--p); font-size: 1.2rem; }

        /* Massive Action Button */
        .cta {
            margin-top: 40px;
            width: 90%; max-width: 460px;
            background: linear-gradient(45deg, var(--s), var(--p));
            padding: 22px;
            border-radius: 15px;
            text-decoration: none;
            color: #fff;
            font-weight: 900;
            text-align: center;
            letter-spacing: 4px;
            text-transform: uppercase;
            box-shadow: 0 0 30px rgba(112, 0, 255, 0.4);
            transition: 0.3s;
        }
        .cta:hover { transform: scale(1.05); box-shadow: 0 0 50px var(--p); }

        footer { margin-top: 80px; padding: 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); width: 100%; }
        .copy { font-size: 0.6rem; opacity: 0.4; letter-spacing: 3px; margin-bottom: 20px; }
        
        details { background: #000; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; max-width: 400px; margin: 0 auto; text-align: left; }
        summary { cursor: pointer; font-size: 0.7rem; color: var(--p); text-align: center; list-style: none; font-weight: bold; }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
</head>
<body>

<header>
    <div class="logo-box">
        <img src="logo.png" alt="LEXORD" onerror="this.src='https://via.placeholder.com/150/000/00f2ff?text=LEXORD'">
    </div>
    <h1>LEXORD.DE</h1>
    <p class="tagline">DEIN GAME. DEIN UPGRADE.<br>WIR LASSEN WÜNSCHE WAHR WERDEN.</p>
</header>

<div class="links">
    <a href="https://www.ebay.de/usr/lexord-de" target="_blank" class="btn">
        <div class="btn-info">
            <h3>EBAY STORE</h3>
            <p>Ready-to-Play High-End Controller</p>
        </div>
        <div class="btn-arrow">❯</div>
    </a>

    <a href="https://www.tiktok.com/@lexord.de" target="_blank" class="btn">
        <div class="btn-info">
            <h3>TIKTOK CHANNEL</h3>
            <p>Live Repairs & Custom Builds</p>
        </div>
        <div class="btn-arrow">❯</div>
    </a>

    <a href="#" target="_blank" class="btn">
        <div class="btn-info">
            <h3>INSTAGRAM</h3>
            <p>Portfolio & Galerie</p>
        </div>
        <div class="btn-arrow">❯</div>
    </a>
</div>

<a href="https://wa.me/4915204718720" target="_blank" class="cta">
    Projekt Starten
</a>

<footer>
    <p class="copy">© 2026 LEXORD CUSTOMS // PREMIUM ENGINEERING</p>
    <details>
        <summary>RECHTLICHES & IMPRESSUM</summary>
        <div style="font-size: 0.75rem; color: #888; margin-top: 15px; line-height: 1.7;">
            <strong>Impressum</strong><br>
            Inhaber: [DEIN NAME]<br>
            Anschrift: [STRASSE], [PLZ STADT]<br>
            E-Mail: kontakt@lexord.de<br>
            Tel: +49 1520 47 18720<br><br>
            <strong>Haftung</strong><br>
            Verantwortlich für den Inhalt nach § 5 TMG. Wir stehen in keiner offiziellen Verbindung zu Sony oder Microsoft. Alle Marken gehören den jeweiligen Eigentümern.
        </div>
    </details>
</footer>

</body>
</html>



