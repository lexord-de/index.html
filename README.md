<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>LEXORD.DE | Premium Engineering</title>
    <style>
        /* LUXURY SYSTEM SETTINGS */
        :root {
            --neon-cyan: #00f2ff;
            --deep-purple: #7000ff;
            --dark-space: #010103;
            --glass: rgba(255, 255, 255, 0.02);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Orbitron', sans-serif; -webkit-tap-highlight-color: transparent; }
        
        body { 
            background: var(--dark-space); 
            color: #ffffff; 
            display: flex; 
            flex-direction: column; 
            align-items: center;
            min-height: 100vh;
            overflow-x: hidden;
            background-image: 
                radial-gradient(circle at 50% 0%, rgba(112, 0, 255, 0.1) 0%, transparent 40%),
                radial-gradient(circle at 100% 100%, rgba(0, 242, 255, 0.05) 0%, transparent 30%);
        }

        /* ANIMATED HIGH-TECH BACKGROUND */
        body::after {
            content: "";
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
            background-size: 50px 50px;
            mask-image: radial-gradient(circle, black, transparent 90%);
            z-index: -1;
        }

        header { padding: 80px 20px 40px; text-align: center; }

        /* THE HOLOGRAM LOGO */
        .logo-aura {
            position: relative;
            width: 160px; height: 160px;
            margin: 0 auto 30px;
        }
        .logo-aura img {
            width: 100%; height: 100%;
            border-radius: 50%;
            border: 1px solid rgba(0, 242, 255, 0.5);
            position: relative; z-index: 10;
            background: #000;
            box-shadow: 0 0 30px rgba(0, 242, 255, 0.2);
            object-fit: cover;
        }
        .logo-aura::before, .logo-aura::after {
            content: ''; position: absolute; top: -15px; left: -15px; right: -15px; bottom: -15px;
            border-radius: 50%; background: linear-gradient(45deg, var(--neon-cyan), var(--deep-purple));
            filter: blur(20px); opacity: 0.3; animation: breathe 4s infinite alternate;
        }
        @keyframes breathe { from { opacity: 0.2; transform: scale(0.95); } to { opacity: 0.5; transform: scale(1.05); } }

        /* TYPOGRAPHY */
        h1 { 
            font-size: 3rem; font-weight: 900; letter-spacing: 12px;
            background: linear-gradient(to bottom, #fff 50%, #888);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            filter: drop-shadow(0 0 15px rgba(0, 242, 255, 0.4));
        }

        .tagline { 
            color: var(--neon-cyan); font-size: 0.8rem; margin-top: 15px; 
            letter-spacing: 4px; font-weight: 700; text-transform: uppercase;
            text-shadow: 0 0 10px rgba(0, 242, 255, 0.5);
        }

        /* ELITE INTERACTIVE BUTTONS */
        .container { width: 90%; max-width: 480px; display: flex; flex-direction: column; gap: 20px; margin-top: 50px; }

        .luxury-item {
            background: var(--glass);
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 25px;
            border-radius: 20px;
            text-decoration: none;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: 0.5s cubic-bezier(0.19, 1, 0.22, 1);
            backdrop-filter: blur(20px);
            position: relative;
            overflow: hidden;
        }

        .luxury-item:hover {
            border-color: var(--neon-cyan);
            transform: scale(1.02) translateY(-5px);
            background: rgba(255, 255, 255, 0.07);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 242, 255, 0.1);
        }

        .luxury-item h3 { font-size: 1.1rem; letter-spacing: 2px; font-weight: 700; }
        .luxury-item p { font-size: 0.75rem; opacity: 0.4; margin-top: 4px; font-family: sans-serif; letter-spacing: 1px; }
        
        .arrow { color: var(--neon-cyan); font-size: 1.2rem; transform: translateX(0); transition: 0.3s; }
        .luxury-item:hover .arrow { transform: translateX(10px); text-shadow: 0 0 10px var(--neon-cyan); }

        /* THE 50K CTA BUTTON */
        .cta-gold {
            margin-top: 40px;
            width: 90%; max-width: 480px;
            background: linear-gradient(90deg, var(--deep-purple), var(--neon-cyan));
            padding: 25px;
            border-radius: 20px;
            text-decoration: none;
            color: #fff;
            font-weight: 900;
            text-align: center;
            letter-spacing: 5px;
            text-transform: uppercase;
            box-shadow: 0 10px 40px rgba(112, 0, 255, 0.3);
            transition: 0.4s;
            position: relative;
        }
        .cta-gold:hover { transform: translateY(-5px); box-shadow: 0 0 60px rgba(0, 242, 255, 0.5); }

        /* FOOTER & LEGAL */
        footer { margin-top: auto; padding: 60px 20px; text-align: center; width: 100%; border-top: 1px solid rgba(255,255,255,0.03); }
        .rights { font-size: 0.65rem; opacity: 0.3; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 25px; }
        
        details { background: rgba(0,0,0,0.8); border: 1px solid var(--neon-cyan); border-radius: 15px; padding: 20px; max-width: 400px; margin: 0 auto; text-align: left; }
        summary { cursor: pointer; font-size: 0.8rem; color: var(--neon-cyan); text-align: center; list-style: none; font-weight: 900; letter-spacing: 2px; }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
</head>
<body>

<header>
    <div class="logo-aura">
        <img src="logo.png" alt="LEXORD MASTERPIECE" onerror="this.src='https://via.placeholder.com/150/000/00f2ff?text=LEXORD'">
    </div>
    <h1>LEXORD.DE</h1>
    <p class="tagline">DEIN GAME. DEIN UPGRADE. <br>WIR LASSEN WÜNSCHE WAHR WERDEN.</p>
</header>

<div class="container">
    <a href="https://www.ebay.de/usr/lexord-de" target="_blank" class="luxury-item">
        <div class="info">
            <h3>EBAY STORE</h3>
            <p>PREMIUM CONTROLLER & HARDWARE</p>
        </div>
        <div class="arrow">❯</div>
    </a>

    <a href="https://www.tiktok.com/@lexord.de" target="_blank" class="luxury-item">
        <div class="info">
            <h3>TIKTOK</h3>
            <p>LIVE REPAIRS & CUSTOM BUILDS</p>
        </div>
        <div class="arrow">❯</div>
    </a>

    <a href="mailto:kontakt@lexord.de" class="luxury-item">
        <div class="info">
            <h3>VIP SUPPORT</h3>
            <p>DIREKTER KONTAKT VIA E-MAIL</p>
        </div>
        <div class="arrow">❯</div>
    </a>
</div>

<a href="https://wa.me/4915204718720" target="_blank" class="cta-gold">
    PROJEKT STARTEN
</a>

<footer>
    <p class="rights">© 2026 LEXORD CUSTOMS // BEYOND PERFECTION</p>
    <details>
        <summary>RECHTLICHES</summary>
        <div style="font-size: 0.8rem; color: #fff; margin-top: 20px; line-height: 1.8; opacity: 0.7;">
            <strong>Impressum</strong><br>
            LEXORD.DE - Custom Engineering<br>
            Inhaber: [DEIN VOLLSTÄNDIGER NAME]<br>
            [DEINE STRASSE & NR]<br>
            [DEINE PLZ & STADT]<br>
            E-Mail: kontakt@lexord.de<br>
            Tel: +49 1520 47 18720<br><br>
            <strong>Haftung</strong><br>
            Handgefertigte Unikate. Alle Rechte vorbehalten. Wir sind nicht verbunden mit Sony, Microsoft oder Nintendo.
        </div>
    </details>
</footer>

</body>
</html>





