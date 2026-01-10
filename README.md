<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LEXORD // Beyond Standard</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;900&family=Inter:wght@200;700&display=swap');

        :root {
            --black: #050505;
            --accent: #ff003c;
            --border: rgba(255, 255, 255, 0.08);
            --glass: rgba(10, 10, 10, 0.7);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; cursor: crosshair; }
        
        body {
            background-color: var(--black);
            color: #fff;
            font-family: 'Inter', sans-serif;
            overflow-x: hidden;
        }

        /* Ambient Background */
        .bg-grid {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: 
                linear-gradient(rgba(5, 5, 5, 0.8), rgba(5, 5, 5, 0.8)),
                repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255, 255, 255, 0.03) 50px),
                repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(255, 255, 255, 0.03) 50px);
            z-index: -1;
        }

        .scanner {
            position: fixed; top: 0; left: 0; width: 100%; height: 3px;
            background: var(--accent);
            opacity: 0.3;
            box-shadow: 0 0 20px var(--accent);
            animation: scan 6s linear infinite;
            z-index: 100;
        }

        @keyframes scan { 0% { top: -10%; } 100% { top: 110%; } }

        .wrapper { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

        header {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
        }

        /* Das Logo wird hier perfekt integriert */
        .logo-box img {
            max-width: 400px;
            width: 90%;
            filter: drop-shadow(0 0 30px rgba(255, 0, 60, 0.2));
            animation: pulse 4s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(255, 0, 60, 0.1)); }
            50% { transform: scale(1.05); filter: drop-shadow(0 0 40px rgba(255, 0, 60, 0.4)); }
        }

        .hero-title {
            font-family: 'Orbitron';
            font-size: 0.7rem;
            letter-spacing: 15px;
            color: var(--accent);
            margin-top: 20px;
            text-transform: uppercase;
        }

        /* Service Cards */
        .main-content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin-top: -100px;
            padding-bottom: 100px;
        }

        .card {
            background: var(--glass);
            border: 1px solid var(--border);
            padding: 50px;
            backdrop-filter: blur(15px);
            transition: 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
        }

        .card:hover {
            border-color: var(--accent);
            transform: translateY(-10px);
            background: rgba(20, 20, 20, 0.9);
            box-shadow: 0 20px 60px rgba(0,0,0,1);
        }

        .card h2 {
            font-family: 'Orbitron';
            font-size: 1rem;
            letter-spacing: 4px;
            margin-bottom: 30px;
            color: #fff;
            display: flex;
            align-items: center;
        }

        .card h2::before {
            content: ""; width: 8px; height: 8px; background: var(--accent); margin-right: 15px;
        }

        .list { list-style: none; }
        .list li {
            font-size: 0.9rem;
            color: #999;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            transition: 0.3s;
        }

        .card:hover .list li { color: #fff; }

        .list i { color: var(--accent); margin-right: 15px; width: 20px; text-align: center; }

        /* Final Action */
        .action-area {
            padding: 150px 0;
            text-align: center;
        }

        .btn-mega {
            padding: 30px 80px;
            background: transparent;
            border: 1px solid var(--accent);
            color: #fff;
            font-family: 'Orbitron';
            text-decoration: none;
            letter-spacing: 5px;
            font-weight: 900;
            position: relative;
            transition: 0.5s;
            overflow: hidden;
        }

        .btn-mega:hover {
            background: var(--accent);
            color: #000;
            box-shadow: 0 0 50px var(--accent);
        }

        footer {
            padding: 50px;
            text-align: center;
            font-family: 'Orbitron';
            font-size: 0.6rem;
            letter-spacing: 5px;
            opacity: 0.3;
        }
    </style>
</head>
<body>

<div class="bg-grid"></div>
<div class="scanner"></div>

<header>
    <div class="logo-box">
        <img src="logo.png" alt="LEXORD">
    </div>
    <div class="hero-title">Elite Modding Lab</div>
</header>

<div class="wrapper">
    <div class="main-content">
        <div class="card">
            <h2>MODDING</h2>
            <ul class="list">
                <li><i class="fas fa-bolt"></i> Smart Trigger & Bumpers</li>
                <li><i class="fas fa-microchip"></i> Hall Effect (Stick Drift Proof)</li>
                <li><i class="fas fa-gamepad"></i> 4-Paddle Rear Systems</li>
                <li><i class="fas fa-tachometer-alt"></i> Polling Rate Optimization</li>
            </ul>
        </div>

        <div class="card">
            <h2>ENGINEERING</h2>
            <ul class="list">
                <li><i class="fas fa-tools"></i> Deep Cleaning & Maintenance</li>
                <li><i class="fas fa-print"></i> 3D-Printed Custom Parts</li>
                <li><i class="fas fa-vial"></i> Mechanical Diagnostics</li>
                <li><i class="fas fa-plug"></i> Battery & Component Swap</li>
            </ul>
        </div>

        <div class="card">
            <h2>DESIGN</h2>
            <ul class="list">
                <li><i class="fas fa-palette"></i> Industrial Goth Aesthetics</li>
                <li><i class="fas fa-fill-drip"></i> Soft-Touch Performance Grip</li>
                <li><i class="fas fa-lightbulb"></i> Dynamic LED Integration</li>
                <li><i class="fas fa-shield-alt"></i> Hard-Coat Protection</li>
            </ul>
        </div>
    </div>

    <div class="action-area">
        <a href="https://wa.me/DEINE_NUMMER?text=INITIALIZE_LEXORD_UNIT" class="btn-mega">KONFIGURIEREN</a>
    </div>
</div>

<footer>
    LEXORD // PRECISION MODDING // EST. 2026
</footer>

</body>
</html>
