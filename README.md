<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LEXORD // Beyond Standard</title>
    <style>
        :root {
            --neon-blue: #00f2ff;
            --neon-purple: #bc13fe;
            --dark-bg: #050505;
            --glass: rgba(255, 255, 255, 0.03);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Orbitron', sans-serif; }
        
        body { 
            background: var(--dark-bg); 
            color: white; 
            display: flex; 
            flex-direction: column; 
            align-items: center;
            min-height: 100vh;
            background-image: radial-gradient(circle at 50% 0%, #1a1a2e 0%, #050505 100%);
        }

        /* Header Bereich */
        header {
            padding: 50px 20px;
            text-align: center;
        }

        .logo {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            border: 2px solid var(--neon-blue);
            box-shadow: 0 0 20px var(--neon-blue);
            margin-bottom: 20px;
            object-fit: cover;
        }

        h1 { 
            font-size: 2.2rem; 
            letter-spacing: 5px; 
            text-shadow: 0 0 10px var(--neon-blue);
            margin-bottom: 5px;
        }

        .tagline { color: var(--neon-purple); font-size: 0.8rem; margin-bottom: 30px; letter-spacing: 2px; }

        /* Die Link-Container */
        .link-tree { width: 90%; max-width: 450px; display: flex; flex-direction: column; gap: 15px; }

        .link-item {
            background: var(--glass);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 18px;
            border-radius: 12px;
            text-decoration: none;
            color: white;
            display: flex;
            align-items: center;
            gap: 15px;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }

        .link-item:hover {
            border-color: var(--neon-blue);
            transform: scale(1.03);
            background: rgba(0, 242, 255, 0.05);
            box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);
        }

        .link-item span { font-size: 1.5rem; }
        .link-text h3 { font-size: 1.1rem; }
        .link-text p { font-size: 0.75rem; opacity: 0.6; }

        /* Großer Kontakt Button */
        .contact-btn {
            margin-top: 30px;
            background: linear-gradient(90deg, var(--neon-blue), var(--neon-purple));
            padding: 15px 40px;
            border-radius: 50px;
            text-decoration: none;
            color: white;
            font-weight: bold;
            text-transform: uppercase;
            box-shadow: 0 5px 15px rgba(188, 19, 254, 0.4);
        }

        footer { margin-top: auto; padding: 40px; font-size: 0.6rem; opacity: 0.3; }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>

<header>
    <img src="logo.png" alt="LEXORD Logo" class="logo" onerror="this.src='https://via.placeholder.com/150/000?text=LEXORD'">
    <h1>LEXORD</h1>
    <p class="tagline">CUSTOM CONTROLLERS & TECH REPAIR</p>
</header>

<div class="link-tree">
    <a href="#" class="link-item">
        <span>🎮</span>
        <div class="link-text">
            <h3>Custom Controller</h3>
            <p>Design & Performance Upgrades</p>
        </div>
    </a>

    <a href="#" class="link-item">
        <span>🛠️</span>
        <div class="link-text">
            <h3>Reparatur Service</h3>
            <p>Stick Drift & Button Fixes</p>
        </div>
    </a>

    <a href="#" class="link-item">
        <span>📦</span>
        <div class="link-text">
            <h3>Zubehör Shop</h3>
            <p>Ersatzteile & Cases</p>
        </div>
    </a>

    <a href="#" class="link-item">
        <span>📸</span>
        <div class="link-text">
            <h3>Instagram</h3>
            <p>Check meine neuesten Builds</p>
        </div>
    </a>
</div>

<a href="https://wa.me/DEINE_NUMMER" class="contact-btn">Projekt anfragen</a>

<footer>
    &copy; 2026 LEXORD. DEINE WERKE. DEIN STYLE.
</footer>

</body>
</html>

