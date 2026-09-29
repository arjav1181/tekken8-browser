import { getPose } from './Rig.js';

const BONES = [
    ['chest', 'neck', 8],
    ['neck', 'head', 7],
    ['pelvis', 'chest', 11],
    ['chest', 'shoulderL', 6],
    ['chest', 'shoulderR', 6],
    ['shoulderL', 'elbowL', 5],
    ['shoulderR', 'elbowR', 5],
    ['elbowL', 'handL', 4.5],
    ['elbowR', 'handR', 4.5],
    ['pelvis', 'hipL', 7],
    ['pelvis', 'hipR', 7],
    ['hipL', 'kneeL', 6.5],
    ['hipR', 'kneeR', 6.5],
    ['kneeL', 'footL', 5.5],
    ['kneeR', 'footR', 5.5],
];

const HEAD_RADIUS = 11;
const TORSO_WIDTH = 15;

function limb(ctx, a, b, w1, w2, color) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(a.x + nx * w1, a.y + ny * w1);
    ctx.lineTo(b.x + nx * w2, b.y + ny * w2);
    ctx.lineTo(b.x - nx * w2, b.y - ny * w2);
    ctx.lineTo(a.x - nx * w1, a.y - ny * w1);
    ctx.closePath();
    ctx.fill();
}

function taperLimb(ctx, a, b, c, w1, w2, w3, color) {
    const d1x = b.x - a.x, d1y = b.y - a.y;
    const l1 = Math.sqrt(d1x * d1x + d1y * d1y) || 1;
    const n1x = -d1y / l1, n1y = d1x / l1;
    const d2x = c.x - b.x, d2y = c.y - b.y;
    const l2 = Math.sqrt(d2x * d2x + d2y * d2y) || 1;
    const n2x = -d2y / l2, n2y = d2x / l2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(a.x + n1x * w1, a.y + n1y * w1);
    ctx.lineTo(b.x + n1x * w2, b.y + n1y * w2);
    ctx.lineTo(c.x + n2x * w3, c.y + n2y * w3);
    ctx.lineTo(c.x - n2x * w3, c.y - n2y * w3);
    ctx.lineTo(b.x - n1x * w2, b.y - n1y * w2);
    ctx.lineTo(a.x - n1x * w1, a.y - n1y * w1);
    ctx.closePath();
    ctx.fill();
}

export function drawFighter(ctx, fighter) {
    const pose = getPose(fighter);
    const colors = fighter.colors || fighter.config.palette;
    const scale = fighter.scale || 1;

    ctx.save();
    ctx.translate(fighter.x, fighter.y - fighter.z);
    ctx.scale(fighter.facing === 1 ? 1 : -1, 1);
    ctx.scale(scale, scale);

    const aura = fighter.heatActive ? '#44ddff' : (fighter.rageActive ? '#ff2222' : null);
    if (aura) {
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(Date.now() * 0.012) * 0.1;
        ctx.shadowColor = aura;
        ctx.shadowBlur = 30;
        drawBody(ctx, pose, colors, fighter, aura);
        ctx.restore();
    }

    drawBody(ctx, pose, colors, fighter, null);

    ctx.restore();

    if (aura) {
        drawAura(ctx, fighter, aura);
    }
}

function drawBody(ctx, pose, colors, fighter, auraOverride) {
    const primary = colors.primary || '#333';
    const secondary = colors.secondary || '#222';
    const skin = colors.skin || '#e0b080';
    const accent = colors.accent || '#fff';
    const hair = colors.hair || '#222';

    const skinColor = fighter.flashTimer > 0 ? '#ffffff' : skin;
    const clothColor = fighter.flashTimer > 0 ? '#ffffff' : primary;
    const clothColor2 = fighter.flashTimer > 0 ? '#ffffff' : secondary;
    const accentColor = fighter.flashTimer > 0 ? '#ffffff' : accent;

    for (const [a, b, w] of BONES) {
        const pa = pose[a];
        const pb = pose[b];
        if (!pa || !pb) continue;
        const isBack = a === 'shoulderL' || a === 'elbowL' || a === 'handL' ||
                      a === 'hipL' || a === 'kneeL' || a === 'footL';
        ctx.globalAlpha = isBack ? 0.82 : 1;
        limb(ctx, pa, pb, w, w * 0.86, isBack ? clothColor2 : clothColor);
    }
    ctx.globalAlpha = 1;

    const torso = ctx.createLinearGradient(pose.pelvis.x, pose.pelvis.y, pose.chest.x, pose.chest.y);
    torso.addColorStop(0, clothColor2);
    torso.addColorStop(0.5, clothColor);
    torso.addColorStop(1, clothColor);
    ctx.fillStyle = torso;
    ctx.beginPath();
    const tw = TORSO_WIDTH;
    ctx.moveTo(pose.pelvis.x - tw * 0.75, pose.pelvis.y);
    ctx.lineTo(pose.pelvis.x + tw * 0.75, pose.pelvis.y);
    ctx.lineTo(pose.chest.x + tw, pose.chest.y);
    ctx.lineTo(pose.chest.x - tw, pose.chest.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.ellipse(
        (pose.pelvis.x + pose.chest.x) / 2,
        (pose.pelvis.y + pose.chest.y) / 2,
        tw * 0.95,
        Math.abs(pose.chest.y - pose.pelvis.y) * 0.28,
        0, 0, Math.PI * 2
    );
    ctx.globalAlpha = 0.28;
    ctx.fill();
    ctx.globalAlpha = 1;

    taperLimb(ctx, pose.shoulderL, pose.elbowL, pose.handL, 5.2, 4.4, 3.6, skinColor);
    taperLimb(ctx, pose.shoulderR, pose.elbowR, pose.handR, 5.2, 4.4, 3.6, skinColor);

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(pose.handL.x, pose.handL.y, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pose.handR.x, pose.handR.y, 4.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = secondary || '#222';
    for (const foot of [pose.footL, pose.footR]) {
        ctx.beginPath();
        ctx.ellipse(foot.x + 3, foot.y - 2, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    const headAngle = Math.atan2(pose.head.y - pose.neck.y, pose.head.x - pose.neck.x) - Math.PI / 2;
    ctx.save();
    ctx.translate(pose.head.x, pose.head.y);
    ctx.rotate(headAngle * 0.6);
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, HEAD_RADIUS * 0.92, HEAD_RADIUS * 1.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(0, -3.5, HEAD_RADIUS * 0.95, HEAD_RADIUS * 0.72, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    if (fighter.stance) {
        ctx.fillStyle = accentColor;
        ctx.fillRect(-HEAD_RADIUS * 0.8, -1, HEAD_RADIUS * 1.6, 2.5);
    }
    ctx.restore();

    if (fighter.charging) {
        const c = fighter.chargeLevel;
        ctx.save();
        ctx.globalAlpha = 0.35 + c * 0.5;
        ctx.strokeStyle = c > 1.4 ? '#ffdd44' : '#8888ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fighter.x, fighter.y - 46 * scale, 34 * scale * (0.4 + c * 0.7), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

function drawAura(ctx, fighter, color) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const t = Date.now() * 0.006;
    for (let i = 0; i < 10; i++) {
        const a = (Math.PI * 2 * i) / 10 + t;
        const r = 40 + Math.sin(t * 2 + i) * 12;
        const x = fighter.x + Math.cos(a) * r * fighter.scale;
        const y = fighter.y - 50 + Math.sin(a) * r * 0.7;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.28 + Math.sin(t * 3 + i) * 0.16;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

export function drawHitboxDebug(ctx, fighter) {
    const hb = fighter.getHitbox();
    if (!hb) return;
    ctx.save();
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);
    ctx.restore();
}

export function drawHurtboxDebug(ctx, fighter) {
    const hb = fighter.getHurtbox();
    ctx.save();
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);
    ctx.restore();
}
