<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>LEXORD.DE | Custom Controller Engineering</title>
    <style>
        /* CORE DESIGN LANGUAGE */
        :root {
            --lexord-white: #e0e0e0; /* Angelehnt an Bosch White */
            --lexord-black: #1a1a1a; /* Tiefer Schwarzton */
            --accent-blue: #00bcd4; /* Einzigartiges Türkis */
            --accent-purple: #9c27b0; /* Edles Violett */
            --glass-light: rgba(255, 255, 255, 0.08);
            --border-light: rgba(255, 255, 255, 0.15);
        }

        /* GLOBAL RESET & FONT */
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Orbitron', sans-serif; -webkit-tap-highlight-color: transparent; }
        
        body { 
            background: var(--lexord-black); 
            color: var(--lexord-white); 
            display: flex; 
            flex-direction: column; 
            align-items: center;
            min-height: 100vh;
            overflow-x: hidden;
            position: relative;
        }

        /* 3D-ANIMIERTER HINTERGRUND (PARTIKEL + GRADIENT) */
        .background-effect {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2;
            background: radial-gradient(circle at 50% 0%, rgba(var(--accent-purple), 0.2) 0%, transparent 40%),
                        radial-gradient(circle at 100% 100%, rgba(var(--accent-blue), 0.15) 0%, transparent 30%);
            animation: backgroundShift 20s infinite alternate;
        }
        @keyframes backgroundShift {
            0% { background-position: 0% 0%; }
            100% { background-position: 100% 100%; }
        }

        /* HEAD SECTION */
        header { padding: 80px 20px 40px; text-align: center; position: relative; z-index: 2; }

        /* PULSIERENDES HOLOGRAMM-LOGO */
        .logo-hologram {
            position: relative;
            width: 170px; height: 170px;
            margin: 0 auto 35px;
            background: rgba(0,0,0,0.5); /* Für Tiefe */
            border-radius: 50%;
            box-shadow: 0 0 40px rgba(0,0,0,0.5); /* Realistischer Schatten */
        }
        .logo-hologram img {
            width: 100%; height: 100%;
            border-radius: 50%;
            border: 2px solid var(--accent-blue);
            box-shadow: 0 0 25px var(--accent-blue);
            object-fit: cover;
            animation: pulseGlow 3s infinite alternate;
            position: relative; z-index: 3;
        }
        @keyframes pulseGlow {
            0% { box-shadow: 0 0 20px var(--accent-blue); }
            100% { box-shadow: 0 0 40px var(--accent-blue), 0 0 60px var(--accent-purple); }
        }

        /* GLITCHING & GLOWING HEADLINE */
        h1 { 
            font-size: 3.2rem; font-weight: 900; letter-spacing: 14px;
            background: linear-gradient(to bottom, var(--lexord-white) 50%, var(--lexord-white) 80%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            filter: drop-shadow(0 0 10px rgba(255,255,255,0.4));
            animation: glitchText 6s infinite;
        }
        @keyframes glitchText {
            0%, 70%, 75%, 80%, 100% { text-shadow: 2px 0 var(--accent-blue), -2px 0 var(--accent-purple); }
            72% { text-shadow: -4px 0 var(--accent-blue), 4px 0 var(--accent-purple); }
            78% { text-shadow: 4px 0 var(--accent-blue), -4px 0 var(--accent-purple); }
        }

        .tagline { 
            color: var(--lexord-white); font-size: 0.9rem; margin-top: 15px; 
            letter-spacing: 3px; font-weight: 700; text-transform: uppercase;
            max-width: 450px; line-height: 1.6; opacity: 0.8;
        }

        /* TRUST BADGES */
        .badges { display: flex; gap: 15px; justify-content: center; margin-top: 25px; }
        .badge { 
            font-size: 0.7rem; padding: 6px 15px; border: 1px solid var(--border-light); border-radius: 5px; 
            color: var(--lexord-white); opacity: 0.7; text-transform: uppercase; letter-spacing: 1px;
            background: rgba(0,0,0,0.3); box-shadow: 0 0 10px rgba(0,0,0,0.2);
        }

        /* INTERACTIVE LINK CONTAINER */
        .links-stack { width: 90%; max-width: 500px; display: flex; flex-direction: column; gap: 20px; margin-top: 60px; }

        .quantum-link {
            background: var(--glass-light);
            border: 1px solid var(--border-light);
            padding: 28px;
            border-radius: 25px;
            text-decoration: none;
            color: var(--lexord-white);
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            backdrop-filter: blur(25px); /* Starker Glas-Effekt */
            position: relative;
            overflow: hidden;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        }

        /* Dynamischer Licht-Sweep auf Hover */
        .quantum-link::before {
            content: ''; position: absolute; top: 0; left: -150%; width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(var(--accent-blue), 0.1), transparent);
            transition: 0.8s ease-out;
        }
        .quantum-link:hover::before { left: 150%; }

        .quantum-link:hover {
            border-color: var(--accent-blue);
            transform: translateY(-8px) scale(1.02);
            background: rgba(var(--accent-blue), 0.1);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(var(--accent-blue), 0.3);
        }

        .link-content h3 { font-size: 1.2rem; letter-spacing: 2px; font-weight: 700; }
        .link-content p { font-size: 0.8rem; opacity: 0.6; margin-top: 5px; font-family: sans-serif; letter-spacing: 1px; }
        
        .arrow-icon { color: var(--accent-blue); font-size: 1.5rem; transform: translateX(0); transition: 0.4s; }
        .quantum-link:hover .arrow-icon { transform: translateX(15px); text-shadow: 0 0 15px var(--accent-blue); }

        /* Call To Action Button (Der große Kauf-Knopf) */
        .cta-engage {
            margin-top: 50px;
            width: 90%; max-width: 500px;
            background: linear-gradient(45deg, var(--accent-purple), var(--accent-blue));
            padding: 28px;
            border-radius: 25px;
            text-decoration: none;
            color: var(--lexord-white);
            font-weight: 900;
            text-align: center;
            letter-spacing: 6px;
            text-transform: uppercase;
            box-shadow: 0 15px 50px rgba(var(--accent-purple), 0.4);
            transition: 0.4s cubic-bezier(0.19, 1, 0.22, 1);
            position: relative;
            overflow: hidden;
        }
        .cta-engage:hover { transform: scale(1.03); box-shadow: 0 0 80px rgba(var(--accent-blue), 0.6); }

        /* FOOTER & RECHTLICHES (Professional) */
        footer { margin-top: auto; padding: 80px 20px; text-align: center; width: 100%; border-top: 1px solid rgba(255,255,255,0.05); }
        .legal-notice { font-size: 0.7rem; opacity: 0.4; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 30px; }
        
        details { background: rgba(0,0,0,0.8); border: 1px solid var(--border-light); border-radius: 15px; padding: 20px; max-width: 450px; margin: 0 auto; text-align: left; }
        summary { cursor: pointer; font-size: 0.85rem; color: var(--accent-blue); text-align: center; list-style: none; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
</head>
<body>

<div class="background-effect"></div>

<header>
    <div class="logo-hologram">
        <img src="logo.png" alt="LEXORD Custom Controller" onerror="this.src='https://via.placeholder.com/170/1a1a1a/e0e0e0?text=LEXORD'">
    </div>
    <h1>LEXORD.DE</h1>
    <p class="tagline">PREMIUM CUSTOM CONTROLLER ENGINEERING</p>
    <div class="badges">
        <span class="badge">DESIGNED FOR PERFECTION</span>
        <span class="badge">HANDCRAFTED UNIQUES</span>
    </div>
</header>

<div class="links-stack">
    <a href="https://www.ebay.de/usr/lexord-de" target="_blank" class="quantum-link">
        <div class="link-content">
            <h3>OFFIZIELLER EBAY STORE</h3>
            <p>Fertige Custom Controller & Ersatzteile</p>
        </div>
        <div class="arrow-icon">❯</div>
    </a>

    <a href="https://www.tiktok.com/@lexord.de" target="_blank" class="quantum-link">
        <div class="link-content">
            <h3>TIKTOK CHANNEL</h3>
            <p>Exklusive Einblicke: Builds & Reparaturen</p>
        </div>
        <div class="arrow-icon">❯</div>
    </a>
    
    <a href="#" target="_blank" class="quantum-link">
        <div class="link-content">
            <h3>INSTAGRAM GALERIE</h3>
            <p>Dein nächstes Upgrade wartet schon</p>
        </div>
        <div class="arrow-icon">❯</div>
    </a>

    <a href="mailto:kontakt@lexord.de" class="quantum-link">
        <div class="link-content">
            <h3>DIREKTER SUPPORT</h3>
            <p>kontakt@lexord.de – Deine Fragen, unsere Antworten</p>
        </div>
        <div class="arrow-icon">❯</div>
    </a>
</div>

<a href="https://wa.me/4915204718720" target="_blank" class="cta-engage">
    DEIN CUSTOM-PROJEKT STARTEN
</a>

<footer>
    <p class="legal-notice">© 2026 LEXORD CUSTOMS // GERMAN ENGINEERING</p>
    <details>
        <summary>IMPRESSUM & DATENSCHUTZ</summary>
        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.8); margin-top: 20px; line-height: 1.8;">
            <strong>Impressum</strong><br>
            LEXORD.DE - Custom Engineering<br>
            Inhaber: [DEIN VOLLSTÄNDIGER NAME]<br>
            [DEINE STRASSE & HAUSNUMMER]<br>
            [DEINE POSTLEITZAHL & STADT]<br>
            E-Mail: kontakt@lexord.de<br>
            Telefon: +49 1520 47 18720<br><br>
            <strong>Haftungshinweis</strong><br>
            Alle gezeigten Controller sind Einzelanfertigungen und Kunstwerke. LEXORD.DE ist eine unabhängige Werkstatt und steht in keiner offiziellen Partnerschaft mit Konsolenherstellern. Markennamen sind Eigentum der jeweiligen Inhaber.
        </div>
    </details>
</footer>

</body>
</html>






