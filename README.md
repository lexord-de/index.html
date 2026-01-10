<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LEXORD // Premium Custom Engineering</title>
    <style>
        :root {
            --primary: #00f2ff;
            --secondary: #7000ff;
            --bg: #020205;
            --card-bg: rgba(255, 255, 255, 0.03);
            --border: rgba(255, 255, 255, 0.08);
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
        }

        /* High-End Background Animation */
        .bg-glow {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: radial-gradient(circle at 50% -20%, #1a1a3a 0%, var(--bg) 70%);
            z-index: -1;
        }

        .bg-grid {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px);
            background-size: 40px 40px;
            mask-image: radial-gradient(circle, black, transparent 80%);
            opacity: 0.2;
            z-index: -1;
        }

        header { padding: 60px 20px 40px; text-align: center; }

        /* Logo Hologramm */
        .logo-container {
            position: relative;
            width: 140px; height: 140px;
            margin: 0 auto 25px;
        }
        .logo-container img {
            width: 100%; height: 100%;
            border-radius: 50%;
            border: 1px solid var(--primary);
            position: relative; z-index: 2;
            object-fit: cover;
            background: #000;
        }
        .logo-container::after {
            content: ''; position: absolute; top: -10px; left: -10px; right: -10px; bottom: -10px;
            border-radius: 50%; background: var(--primary);
            filter: blur(25px); opacity: 0.3; animation: pulse 3s infinite;
        }

        @keyframes pulse { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } }

        h1 { font-size: 2.5rem; letter-spacing: 10px; font-weight: 900; background: linear-gradient(to bottom, #fff 40%, var(--primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 10px rgba(0,242,255,0.3)); }
        
        .badges { display: flex; gap: 10px; justify-content: center; margin-top: 15px; }
        .badge { font-size: 0.6rem; padding: 4px 10px; border: 1px solid var(--primary); border-radius: 4px; color: var(--primary); text-transform: uppercase; letter-spacing: 1px; }

        /* Buttons List */
        .stack { width: 90%; max-width: 440px; display: flex; flex-direction: column; gap: 15px; margin-top: 20px; }

        .item {
            background: var(--card-bg);
            border: 1px solid var(--border);
            padding: 20px;
            border-radius: 12px;
            text-decoration: none;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 15px;
            transition: 0.3s all cubic-bezier(0.23, 1, 0.32, 1);
            backdrop-filter: blur(10px);
        }

        .item:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: var(--primary);
            transform: scale(1.03) translateX(5px);
            box-shadow: -10px 0 20px rgba(0, 242, 255, 0.1);
        }

        .icon-box { font-size: 1.5rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid var(--border); }
        .text-box h3 { font-size: 0.95rem; letter-spacing: 1px; margin-bottom: 2px; }
        .text-box p { font-size: 0.7rem; opacity: 0.5; font-family: 'Segoe UI', sans-serif; }

        /* WhatsApp Action Button */
        .action-btn {
            margin-top: 30px;
            width: 90%; max-width: 440px;
            background: linear-gradient(45deg, var(--secondary), var(--primary));
            padding: 20px;
            border-radius: 12px;
            text-decoration: none;
            color: #fff;
            font-weight: 700;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 3px;
            box-shadow: 0 10px 30px rgba(112, 0, 255, 0.3);
            transition: 0.3s;
        }
        .action-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 40px rgba(0, 242, 255, 0.4); }

        /* Footer */
        footer { margin-top: auto; padding: 60px 20px; text-align: center; width: 100%; opacity: 0.6; }
        .rights { font-size: 0.6rem; letter-spacing: 2px; margin-bottom: 20px; }
        
        details { display: inline-block; width: 100%; max-width: 400px; text-align: left; background: rgba(0,0,0,0.5); border-radius: 8px; padding: 10px; }
        summary { cursor: pointer; font-size: 0.7rem; text-align: center; list-style: none; text-decoration: underline; color: var(--primary); }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
</head>
<body>

<div class="bg-glow"></div>
<div class="bg-grid"></div>

<header>
    <div class="logo-container">
        <img src="logo.png" alt="LEXORD" onerror="this.src='https://via.placeholder.com/150/000/00f2ff?text=LEXORD'">
    </div>
    <h1>LEXORD</h1>
    <div class="badges">
        <span class="badge">Custom Builds</span>
        <span class="badge">Repair Service</span>
        <span class="badge">Est. 2026</span>
    </div>
</header>

<div class="stack">
    <a href="https://www.ebay.de/usr/lexord-de" target="_blank" class="item">
        <div class="icon-box">🛒</div>
        <div class="text-box">
            <h3>EBAY STORE</h3>
            <p>Ready-to-play Controller & Ersatzteile</p>
        </div>
    </a>

    <a href="https://www.tiktok.com/@lexord.de" target="_blank" class="item">
        <div class="icon-box">📱</div>
        <div class="text-box">
            <h3>TIKTOK KANAL</h3>
            <p>Daily Mods, Repairs & Behind the Scenes</p>
        </div>
    </a>

    <a href="#" target="_blank" class="item">
        <div class="icon-box">📸</div>
        <div class="text-box">
            <h3>INSTAGRAM</h3>
            <p>Exklusive Einblicke in unsere Projekte</p>
        </div>
    </a>

    <a href="mailto:kontakt@lexord.de" class="item">
        <div class="icon-box">📧</div>
        <div class="text-box">
            <h3>SUPPORT MAIL</h3>
            <p>kontakt@lexord.de – Anfragen & Hilfe</p>
        </div>
    </a>
</div>

<a href="https://wa.me/4915204718720" target="_blank" class="action-btn">
    Projekt Anfragen
</a>

<footer>
    <p class="rights">© 2026 LEXORD CUSTOMS // ALL RIGHTS RESERVED</p>
    
    <details>
        <summary>Impressum & Datenschutz</summary>
        <div style="font-size: 0.7rem; margin-top: 15px; color: #ccc; line-height: 1.6;">
            <strong>Impressum</strong><br>
            Inhaber: [DEIN NAME]<br>
            [STRASSE & HAUSNUMMER]<br>
            [PLZ & STADT]<br>
            E-Mail: kontakt@lexord.de<br>
            Tel: +49 1520 47 18720<br><br>
            <strong>Haftungshinweis</strong><br>
            Verantwortlich für den Inhalt nach § 5 TMG. Wir modifizieren Hardware nach Kundenwunsch. Keine offizielle Partnerschaft mit Sony, Microsoft oder Nintendo.
        </div>
    </details>
</footer>

</body>
</html>


