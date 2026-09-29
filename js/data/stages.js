export const STAGES = [
    {
        id: 'hangar',
        name: 'Abandoned Dockyard',
        skyTop: '#0a1a3a',
        skyMid: '#123a5a',
        skyBottom: '#0d2a3a',
        floorTop: '#2a3a4a',
        floorBottom: '#131c26',
        floorLine: 'rgba(90, 200, 255, 0.22)',
        accent: '#3fa9f5',
        props: 'containers',
        fogAlpha: 0.06,
        lighting: { x: 200, y: 100, color: 'rgba(120, 190, 255, 0.10)', r: 520 },
    },
    {
        id: 'dojo',
        name: 'Mishima Ryu Dojo',
        skyTop: '#2a1508',
        skyMid: '#4a2a10',
        skyBottom: '#6a3a18',
        floorTop: '#4a3520',
        floorBottom: '#241809',
        floorLine: 'rgba(255, 180, 90, 0.20)',
        accent: '#ff9933',
        props: 'torii',
        fogAlpha: 0.05,
        lighting: { x: 640, y: 60, color: 'rgba(255, 200, 120, 0.12)', r: 600 },
    },
    {
        id: 'sky',
        name: 'Northern Highlands',
        skyTop: '#0a0a1a',
        skyMid: '#141a3a',
        skyBottom: '#2a2a4a',
        floorTop: '#2a2a35',
        floorBottom: '#12121a',
        floorLine: 'rgba(180, 190, 255, 0.18)',
        accent: '#8899ff',
        props: 'mountains',
        fogAlpha: 0.08,
        lighting: { x: 900, y: 80, color: 'rgba(200, 210, 255, 0.14)', r: 700 },
    },
    {
        id: 'forest',
        name: 'Bamboo Grove',
        skyTop: '#0a1a0a',
        skyMid: '#123a18',
        skyBottom: '#1a4a20',
        floorTop: '#243a20',
        floorBottom: '#101c10',
        floorLine: 'rgba(120, 255, 140, 0.18)',
        accent: '#44ff88',
        props: 'bamboo',
        fogAlpha: 0.10,
        lighting: { x: 300, y: 120, color: 'rgba(140, 255, 160, 0.10)', r: 560 },
    },
    {
        id: 'desert',
        name: 'Ruined Outpost',
        skyTop: '#3a1a0a',
        skyMid: '#7a3a12',
        skyBottom: '#c47a2a',
        floorTop: '#5a4028',
        floorBottom: '#2a1c10',
        floorLine: 'rgba(255, 200, 120, 0.22)',
        accent: '#ffaa44',
        props: 'ruins',
        fogAlpha: 0.07,
        lighting: { x: 400, y: 80, color: 'rgba(255, 220, 150, 0.16)', r: 640 },
    },
    {
        id: 'lab',
        name: 'G-Corp Research Wing',
        skyTop: '#081018',
        skyMid: '#0d2430',
        skyBottom: '#123844',
        floorTop: '#1a2a30',
        floorBottom: '#0a1218',
        floorLine: 'rgba(68, 221, 255, 0.25)',
        accent: '#44ddff',
        props: 'lab',
        fogAlpha: 0.05,
        lighting: { x: 640, y: 40, color: 'rgba(80, 220, 255, 0.12)', r: 700 },
    },
    {
        id: 'rooftop',
        name: 'City Rooftop',
        skyTop: '#0a0a14',
        skyMid: '#1a1a2e',
        skyBottom: '#2a1a2a',
        floorTop: '#252530',
        floorBottom: '#101018',
        floorLine: 'rgba(255, 140, 90, 0.20)',
        accent: '#ff8c5a',
        props: 'city',
        fogAlpha: 0.09,
        lighting: { x: 500, y: 50, color: 'rgba(255, 160, 100, 0.12)', r: 620 },
    },
    {
        id: 'crimson',
        name: 'Mishima Estates',
        skyTop: '#1a0505',
        skyMid: '#3a0a0a',
        skyBottom: '#5a1010',
        floorTop: '#2a1a1a',
        floorBottom: '#120808',
        floorLine: 'rgba(255, 60, 60, 0.28)',
        accent: '#ff3333',
        props: 'mansion',
        fogAlpha: 0.08,
        lighting: { x: 640, y: 60, color: 'rgba(255, 80, 80, 0.14)', r: 660 },
    },
];

export function getStage(index) {
    return STAGES[((index % STAGES.length) + STAGES.length) % STAGES.length];
}

export function drawStage(ctx, stage, cameraX, time) {
    const W = 1400;
    const H = 760;

    const sky = ctx.createLinearGradient(0, -H, 0, 0);
    sky.addColorStop(0, stage.skyTop);
    sky.addColorStop(0.55, stage.skyMid);
    sky.addColorStop(1, stage.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(-W, -H, W * 2, H);

    drawProps(ctx, stage, time);

    const floor = ctx.createLinearGradient(0, 0, 0, 240);
    floor.addColorStop(0, stage.floorTop);
    floor.addColorStop(1, stage.floorBottom);
    ctx.fillStyle = floor;
    ctx.fillRect(-W, 0, W * 2, 240);

    ctx.save();
    ctx.strokeStyle = stage.floorLine;
    ctx.lineWidth = 1.5;
    const offset = (cameraX * 0.4) % 100;
    for (let i = -14; i <= 14; i++) {
        const x = i * 100 - offset;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - 60, 240);
        ctx.stroke();
    }
    for (let j = 1; j < 6; j++) {
        const y = j * j * 6;
        ctx.globalAlpha = 1 - j / 7;
        ctx.beginPath();
        ctx.moveTo(-W, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(-W, -3, W * 2, 6);

    drawBalustrades(ctx, stage);

    const L = stage.lighting;
    const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
    g.addColorStop(0, L.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-W, -H, W * 2, H + 240);

    if (stage.fogAlpha > 0) {
        ctx.fillStyle = `rgba(180, 200, 220, ${stage.fogAlpha})`;
        ctx.fillRect(-W, -60, W * 2, 80);
    }
}

function drawBalustrades(ctx, stage) {
    for (const side of [-1, 1]) {
        const x = side * 560;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(x - 10, -210, 20, 215);
        ctx.fillStyle = stage.accent;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x - 10, -212, 20, 4);
        ctx.globalAlpha = 0.2;
        ctx.fillRect(x - 6, -180, 12, 3);
        ctx.fillRect(x - 6, -140, 12, 3);
        ctx.restore();
    }
}

function drawProps(ctx, stage, time) {
    switch (stage.props) {
        case 'containers':
            drawContainers(ctx, time);
            break;
        case 'torii':
            drawTorii(ctx);
            break;
        case 'mountains':
            drawMountains(ctx);
            break;
        case 'bamboo':
            drawBamboo(ctx, time);
            break;
        case 'ruins':
            drawRuins(ctx);
            break;
        case 'lab':
            drawLab(ctx, time);
            break;
        case 'city':
            drawCity(ctx, time);
            break;
        case 'mansion':
            drawMansion(ctx);
            break;
    }
}

function drawContainers(ctx, time) {
    const colors = ['#8b3a2a', '#2a5a8b', '#3a7a4a', '#8b7a2a'];
    for (let i = 0; i < 9; i++) {
        const x = -1200 + i * 280 + (i % 3) * 40;
        const y = -110 - (i % 2) * 60;
        const w = 190;
        const h = 78;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#000';
        for (let j = 1; j < 8; j++) {
            ctx.beginPath();
            ctx.moveTo(x + (w / 8) * j, y);
            ctx.lineTo(x + (w / 8) * j, y + h);
            ctx.stroke();
        }
        ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#000';
    for (let i = 0; i < 7; i++) {
        const x = -1400 + i * 420;
        ctx.beginPath();
        ctx.moveTo(x, -300);
        ctx.lineTo(x + 60, -300);
        ctx.lineTo(x + 30, 0);
        ctx.lineTo(x + 8, 0);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

function drawTorii(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    for (const [x, s] of [[-700, 1], [700, 1], [-360, 0.6], [360, 0.6]]) {
        const w = 150 * s;
        const h = 240 * s;
        ctx.fillStyle = '#8b1a1a';
        ctx.fillRect(x - w / 2, -h, 16 * s, h);
        ctx.fillRect(x + w / 2 - 16 * s, -h, 16 * s, h);
        ctx.fillRect(x - w / 2 - 20 * s, -h, w + 40 * s, 16 * s);
        ctx.fillRect(x - w / 2 - 10 * s, -h + 26 * s, w + 20 * s, 9 * s);
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffaa44';
    for (let i = 0; i < 12; i++) {
        const x = -800 + i * 145;
        ctx.beginPath();
        ctx.arc(x, -190, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawMountains(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#0a0a18';
    for (let layer = 0; layer < 3; layer++) {
        const baseY = -40 - layer * 50;
        const h = 200 + layer * 80;
        ctx.globalAlpha = 0.3 + layer * 0.12;
        ctx.beginPath();
        ctx.moveTo(-1400, 0);
        let x = -1400;
        let seed = layer * 999;
        while (x < 1400) {
            const w = 180 + ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) % 200);
            ctx.lineTo(x + w / 2, baseY - h);
            ctx.lineTo(x + w, baseY);
            x += w;
        }
        ctx.lineTo(1400, 0);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#e8e8ff';
    for (let i = 0; i < 40; i++) {
        const x = ((i * 137) % 2800) - 1400;
        const y = -620 + ((i * 71) % 300);
        ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();
}

function drawBamboo(ctx, time) {
    ctx.save();
    for (let i = 0; i < 22; i++) {
        const x = -1200 + i * 115;
        const sway = Math.sin(time * 0.8 + i) * 5;
        const h = 420 + (i % 5) * 60;
        const grad = ctx.createLinearGradient(x, -h, x, 0);
        grad.addColorStop(0, 'rgba(60, 140, 70, 0.45)');
        grad.addColorStop(1, 'rgba(30, 80, 40, 0.55)');
        ctx.fillStyle = grad;
        ctx.fillRect(x + sway * 0.4, -h, 12, h);
        ctx.fillStyle = 'rgba(20, 60, 28, 0.4)';
        for (let s = 0; s < 7; s++) {
            ctx.fillRect(x + sway * 0.4, -h + s * (h / 7), 12, 3);
        }
        ctx.fillStyle = 'rgba(90, 180, 100, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x + sway, -h - 20, 24, 40, sway * 0.02, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawRuins(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 12; i++) {
        const x = -1000 + i * 180;
        const h = 100 + ((i * 67) % 160);
        ctx.fillStyle = '#8a7050';
        ctx.fillRect(x, -h, 60, h);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let b = 0; b < 4; b++) {
            ctx.fillRect(x + 8, -h + 14 + b * (h / 5), 44, 6);
        }
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#5a4028';
    for (let i = 0; i < 6; i++) {
        const x = -800 + i * 320;
        ctx.beginPath();
        ctx.ellipse(x, 0, 90, 16, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawLab(ctx, time) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 16; i++) {
        const x = -1200 + i * 160;
        ctx.fillStyle = '#0a1a20';
        ctx.fillRect(x, -320, 90, 320);
        ctx.fillStyle = 'rgba(68, 221, 255, 0.16)';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 3; c++) {
                if (Math.sin(time + i * 2 + r + c) > 0.4) {
                    ctx.fillRect(x + 12 + c * 26, -300 + r * 34, 16, 22);
                }
            }
        }
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#44ddff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-W(), -120);
    for (let x = -700; x < 700; x += 100) {
        ctx.lineTo(x, -120 + Math.sin(time + x * 0.02) * 14);
    }
    ctx.stroke();
    ctx.restore();
}

function W() {
    return 1400;
}

function drawCity(ctx, time) {
    ctx.save();
    for (let i = 0; i < 26; i++) {
        const x = -1300 + i * 105;
        const h = 160 + ((i * 97) % 300);
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#0d0d18';
        ctx.fillRect(x, -h, 90, h);
        ctx.globalAlpha = 0.5;
        for (let r = 0; r < Math.floor(h / 26); r++) {
            for (let c = 0; c < 3; c++) {
                if ((i * 31 + r * 7 + c * 13) % 5 < 2) {
                    ctx.fillStyle = (i + r) % 7 === 0 ? 'rgba(255, 200, 120, 0.5)' : 'rgba(150, 200, 255, 0.25)';
                    ctx.fillRect(x + 10 + c * 26, -h + 12 + r * 26, 14, 14);
                }
            }
        }
    }
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#ff8c5a';
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(-1100 + i * 440, -300 - ((i * 53) % 200), 3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawMansion(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = '#1a0808';
    ctx.fillRect(-700, -420, 1400, 420);
    ctx.fillStyle = '#2a0a0a';
    for (let i = 0; i < 9; i++) {
        const x = -640 + i * 160;
        ctx.fillRect(x, -330, 70, 150);
        ctx.fillStyle = 'rgba(255, 60, 60, 0.22)';
        ctx.fillRect(x + 12, -310, 46, 60);
        ctx.fillStyle = '#2a0a0a';
    }
    ctx.fillStyle = '#3a0a0a';
    ctx.fillRect(-720, -440, 1440, 30);
    for (let i = 0; i < 24; i++) {
        ctx.fillRect(-700 + i * 62, -440, 24, 16);
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ff3333';
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(-500 + i * 200, -350, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}
