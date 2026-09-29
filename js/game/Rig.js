const POSE = {
    head: { x: 0, y: 0 },
    neck: { x: 0, y: 0 },
    chest: { x: 0, y: 0 },
    pelvis: { x: 0, y: 0 },
    shoulderL: { x: 0, y: 0 },
    shoulderR: { x: 0, y: 0 },
    elbowL: { x: 0, y: 0 },
    elbowR: { x: 0, y: 0 },
    handL: { x: 0, y: 0 },
    handR: { x: 0, y: 0 },
    hipL: { x: 0, y: 0 },
    hipR: { x: 0, y: 0 },
    kneeL: { x: 0, y: 0 },
    kneeR: { x: 0, y: 0 },
    footL: { x: 0, y: 0 },
    footR: { x: 0, y: 0 },
};

function clonePose(p) {
    const out = {};
    for (const k in p) out[k] = { x: p[k].x, y: p[k].y };
    return out;
}

function blend(a, b, t) {
    const out = {};
    for (const k in a) {
        out[k] = {
            x: a[k].x + (b[k].x - a[k].x) * t,
            y: a[k].y + (b[k].y - a[k].y) * t,
        };
    }
    return out;
}

function add(a, b) {
    const out = {};
    for (const k in a) out[k] = { x: a[k].x + b[k].x, y: a[k].y + b[k].y };
    return out;
}

const GROUND_Y = 0;
const HIP_HEIGHT = 62;
const CHEST_OFFSET = -40;
const HEAD_OFFSET = -72;
const SHOULDER_WIDTH = 17;
const HIP_WIDTH = 9;
const UPPER_ARM = 26;
const FOREARM = 24;
const THIGH = 30;
const SHIN = 30;

function basePose() {
    return {
        head: { x: 0, y: HIP_HEIGHT + HEAD_OFFSET },
        neck: { x: 0, y: HIP_HEIGHT + CHEST_OFFSET - 8 },
        chest: { x: 0, y: HIP_HEIGHT + CHEST_OFFSET },
        pelvis: { x: 0, y: HIP_HEIGHT },
        shoulderL: { x: -SHOULDER_WIDTH, y: HIP_HEIGHT + CHEST_OFFSET - 6 },
        shoulderR: { x: SHOULDER_WIDTH, y: HIP_HEIGHT + CHEST_OFFSET - 6 },
        elbowL: { x: -SHOULDER_WIDTH - 6, y: HIP_HEIGHT + CHEST_OFFSET + 18 },
        elbowR: { x: SHOULDER_WIDTH + 6, y: HIP_HEIGHT + CHEST_OFFSET + 18 },
        handL: { x: -SHOULDER_WIDTH - 8, y: HIP_HEIGHT + CHEST_OFFSET + 40 },
        handR: { x: SHOULDER_WIDTH + 8, y: HIP_HEIGHT + CHEST_OFFSET + 40 },
        hipL: { x: -HIP_WIDTH, y: HIP_HEIGHT },
        hipR: { x: HIP_WIDTH, y: HIP_HEIGHT },
        kneeL: { x: -HIP_WIDTH - 4, y: HIP_HEIGHT * 0.55 },
        kneeR: { x: HIP_WIDTH + 4, y: HIP_HEIGHT * 0.55 },
        footL: { x: -HIP_WIDTH - 6, y: 0 },
        footR: { x: HIP_WIDTH + 6, y: 0 },
    };
}

function stancePose(base, guard) {
    const p = clonePose(base);
    if (guard) {
        p.elbowL = { x: -SHOULDER_WIDTH - 14, y: HIP_HEIGHT + CHEST_OFFSET + 6 };
        p.handL = { x: -SHOULDER_WIDTH - 6, y: HIP_HEIGHT + CHEST_OFFSET - 4 };
        p.elbowR = { x: SHOULDER_WIDTH + 12, y: HIP_HEIGHT + CHEST_OFFSET + 10 };
        p.handR = { x: SHOULDER_WIDTH + 20, y: HIP_HEIGHT + CHEST_OFFSET - 10 };
    }
    return p;
}

function walkPose(base, t, speed) {
    const p = clonePose(base);
    const s = Math.sin(t) * speed;
    const c = Math.cos(t) * speed;
    p.footL = { x: -HIP_WIDTH - 6 + s * 14, y: Math.max(0, -c * 5) };
    p.footR = { x: HIP_WIDTH + 6 - s * 14, y: Math.max(0, c * 5) };
    p.kneeL = { x: -HIP_WIDTH - 4 + s * 7, y: HIP_HEIGHT * 0.55 + Math.abs(c) * 3 };
    p.kneeR = { x: HIP_WIDTH + 4 - s * 7, y: HIP_HEIGHT * 0.55 + Math.abs(s) * 3 };
    p.pelvis = { x: 0, y: HIP_HEIGHT - Math.abs(s) * 2 };
    p.chest = { x: 0, y: HIP_HEIGHT + CHEST_OFFSET - Math.abs(s) * 1.5 };
    p.head = { x: 0, y: HIP_HEIGHT + HEAD_OFFSET - Math.abs(s) * 1.5 };
    p.handL = { x: -SHOULDER_WIDTH - 8 - s * 8, y: HIP_HEIGHT + CHEST_OFFSET + 40 };
    p.handR = { x: SHOULDER_WIDTH + 8 + s * 8, y: HIP_HEIGHT + CHEST_OFFSET + 40 };
    p.shoulderL = { x: -SHOULDER_WIDTH, y: HIP_HEIGHT + CHEST_OFFSET - 6 - Math.abs(s) * 1.5 };
    p.shoulderR = { x: SHOULDER_WIDTH, y: HIP_HEIGHT + CHEST_OFFSET - 6 - Math.abs(s) * 1.5 };
    p.neck = { x: 0, y: HIP_HEIGHT + CHEST_OFFSET - 8 - Math.abs(s) * 1.5 };
    return p;
}

function crouchPose(base) {
    const p = clonePose(base);
    const drop = 26;
    p.pelvis = { x: 0, y: HIP_HEIGHT - drop };
    p.chest = { x: -2, y: HIP_HEIGHT + CHEST_OFFSET - drop + 6 };
    p.head = { x: -3, y: HIP_HEIGHT + HEAD_OFFSET - drop + 10 };
    p.neck = { x: -2, y: HIP_HEIGHT + CHEST_OFFSET - 8 - drop + 8 };
    p.shoulderL = { x: -SHOULDER_WIDTH - 1, y: HIP_HEIGHT + CHEST_OFFSET - 6 - drop + 6 };
    p.shoulderR = { x: SHOULDER_WIDTH + 1, y: HIP_HEIGHT + CHEST_OFFSET - 6 - drop + 6 };
    p.kneeL = { x: -HIP_WIDTH - 8, y: HIP_HEIGHT * 0.5 + 4 };
    p.kneeR = { x: HIP_WIDTH + 8, y: HIP_HEIGHT * 0.5 + 4 };
    p.footL = { x: -HIP_WIDTH - 9, y: 0 };
    p.footR = { x: HIP_WIDTH + 9, y: 0 };
    p.handL = { x: -SHOULDER_WIDTH - 8, y: HIP_HEIGHT + CHEST_OFFSET + 34 - drop };
    p.handR = { x: SHOULDER_WIDTH + 8, y: HIP_HEIGHT + CHEST_OFFSET + 34 - drop };
    return p;
}

function dashPose(base, t, dir) {
    const p = clonePose(base);
    const s = Math.sin(t * 1.6);
    const lean = dir * 10;
    p.pelvis = { x: lean * 0.5, y: HIP_HEIGHT - 6 };
    p.chest = { x: lean, y: HIP_HEIGHT + CHEST_OFFSET - 8 };
    p.head = { x: lean * 1.2, y: HIP_HEIGHT + HEAD_OFFSET - 6 };
    p.neck = { x: lean, y: HIP_HEIGHT + CHEST_OFFSET - 14 };
    p.footL = { x: -HIP_WIDTH - 6 + s * 20, y: Math.max(0, -s * 6) };
    p.footR = { x: HIP_WIDTH + 6 - s * 20, y: Math.max(0, s * 6) };
    p.kneeL = { x: -HIP_WIDTH - 4 + s * 10, y: HIP_HEIGHT * 0.5 + 6 };
    p.kneeR = { x: HIP_WIDTH + 4 - s * 10, y: HIP_HEIGHT * 0.5 + 6 };
    p.handL = { x: -SHOULDER_WIDTH - 14, y: HIP_HEIGHT + CHEST_OFFSET + 26 };
    p.handR = { x: SHOULDER_WIDTH + 18, y: HIP_HEIGHT + CHEST_OFFSET + 10 };
    return p;
}

function backdashPose(base, t) {
    const p = clonePose(base);
    const s = Math.sin(t * 1.8);
    p.pelvis = { x: -8, y: HIP_HEIGHT - 10 };
    p.chest = { x: -14, y: HIP_HEIGHT + CHEST_OFFSET - 12 };
    p.head = { x: -16, y: HIP_HEIGHT + HEAD_OFFSET - 10 };
    p.neck = { x: -14, y: HIP_HEIGHT + CHEST_OFFSET - 18 };
    p.footL = { x: -HIP_WIDTH - 10 - s * 10, y: 0 };
    p.footR = { x: HIP_WIDTH + 6 + s * 10, y: Math.max(0, s * 4) };
    p.kneeL = { x: -HIP_WIDTH - 8, y: HIP_HEIGHT * 0.5 + 4 };
    p.kneeR = { x: HIP_WIDTH + 8, y: HIP_HEIGHT * 0.5 + 8 };
    p.handL = { x: -SHOULDER_WIDTH - 20, y: HIP_HEIGHT + CHEST_OFFSET + 8 };
    p.handR = { x: SHOULDER_WIDTH + 22, y: HIP_HEIGHT + CHEST_OFFSET + 6 };
    return p;
}

function blockHighPose(base) {
    const p = clonePose(base);
    p.elbowL = { x: -SHOULDER_WIDTH - 16, y: HIP_HEIGHT + CHEST_OFFSET - 12 };
    p.handL = { x: -SHOULDER_WIDTH - 2, y: HIP_HEIGHT + CHEST_OFFSET - 26 };
    p.elbowR = { x: SHOULDER_WIDTH + 16, y: HIP_HEIGHT + CHEST_OFFSET - 10 };
    p.handR = { x: SHOULDER_WIDTH + 4, y: HIP_HEIGHT + CHEST_OFFSET - 24 };
    p.chest = { x: -5, y: HIP_HEIGHT + CHEST_OFFSET - 3 };
    p.head = { x: -7, y: HIP_HEIGHT + HEAD_OFFSET - 2 };
    p.pelvis = { x: -3, y: HIP_HEIGHT - 5 };
    return p;
}

function blockLowPose(base) {
    const c = crouchPose(base);
    c.elbowL = { x: -SHOULDER_WIDTH - 16, y: HIP_HEIGHT + CHEST_OFFSET - 38 };
    c.handL = { x: -SHOULDER_WIDTH - 2, y: HIP_HEIGHT + CHEST_OFFSET - 52 };
    c.elbowR = { x: SHOULDER_WIDTH + 16, y: HIP_HEIGHT + CHEST_OFFSET - 36 };
    c.handR = { x: SHOULDER_WIDTH + 4, y: HIP_HEIGHT + CHEST_OFFSET - 50 };
    return c;
}

function hitstunPose(base, dir, t) {
    const p = clonePose(base);
    const wobble = Math.sin(t * 0.5) * 3;
    p.pelvis = { x: -dir * 8, y: HIP_HEIGHT - 4 };
    p.chest = { x: -dir * 18, y: HIP_HEIGHT + CHEST_OFFSET - 8 + wobble };
    p.head = { x: -dir * 28, y: HIP_HEIGHT + HEAD_OFFSET - 6 + wobble * 1.4 };
    p.neck = { x: -dir * 18, y: HIP_HEIGHT + CHEST_OFFSET - 16 };
    p.shoulderL = { x: -SHOULDER_WIDTH - dir * 6, y: HIP_HEIGHT + CHEST_OFFSET - 14 };
    p.shoulderR = { x: SHOULDER_WIDTH - dir * 6, y: HIP_HEIGHT + CHEST_OFFSET - 14 };
    p.elbowL = { x: -SHOULDER_WIDTH - 12 - dir * 8, y: HIP_HEIGHT + CHEST_OFFSET + 12 };
    p.elbowR = { x: SHOULDER_WIDTH + 12 - dir * 8, y: HIP_HEIGHT + CHEST_OFFSET + 14 };
    p.handL = { x: -SHOULDER_WIDTH - 10, y: HIP_HEIGHT + CHEST_OFFSET + 36 };
    p.handR = { x: SHOULDER_WIDTH + 10, y: HIP_HEIGHT + CHEST_OFFSET + 38 };
    p.footL = { x: -HIP_WIDTH - 12, y: 0 };
    p.footR = { x: HIP_WIDTH + 12, y: 0 };
    p.kneeL = { x: -HIP_WIDTH - 8, y: HIP_HEIGHT * 0.5 + 4 };
    p.kneeR = { x: HIP_WIDTH + 10, y: HIP_HEIGHT * 0.5 + 6 };
    return p;
}

function airHitPose(base, dir) {
    const p = clonePose(base);
    p.pelvis = { x: -dir * 4, y: HIP_HEIGHT + 4 };
    p.chest = { x: -dir * 14, y: HIP_HEIGHT + CHEST_OFFSET - 2 };
    p.head = { x: -dir * 24, y: HIP_HEIGHT + HEAD_OFFSET + 2 };
    p.neck = { x: -dir * 14, y: HIP_HEIGHT + CHEST_OFFSET - 10 };
    p.shoulderL = { x: -SHOULDER_WIDTH - dir * 8, y: HIP_HEIGHT + CHEST_OFFSET - 8 };
    p.shoulderR = { x: SHOULDER_WIDTH - dir * 8, y: HIP_HEIGHT + CHEST_OFFSET - 8 };
    p.elbowL = { x: -SHOULDER_WIDTH - 20 - dir * 6, y: HIP_HEIGHT + CHEST_OFFSET - 22 };
    p.elbowR = { x: SHOULDER_WIDTH + 20 - dir * 6, y: HIP_HEIGHT + CHEST_OFFSET - 20 };
    p.handL = { x: -SHOULDER_WIDTH - 14, y: HIP_HEIGHT + CHEST_OFFSET - 40 };
    p.handR = { x: SHOULDER_WIDTH + 14, y: HIP_HEIGHT + CHEST_OFFSET - 38 };
    p.footL = { x: -HIP_WIDTH - 14, y: HIP_HEIGHT + 20 };
    p.footR = { x: HIP_WIDTH + 12, y: HIP_HEIGHT + 28 };
    p.kneeL = { x: -HIP_WIDTH - 10, y: HIP_HEIGHT * 0.6 };
    p.kneeR = { x: HIP_WIDTH + 10, y: HIP_HEIGHT * 0.7 };
    return p;
}

function knockdownPose(base) {
    const p = clonePose(base);
    p.pelvis = { x: -14, y: 18 };
    p.chest = { x: -24, y: 14 };
    p.head = { x: -38, y: 18 };
    p.neck = { x: -26, y: 12 };
    p.shoulderL = { x: -SHOULDER_WIDTH - 12, y: 12 };
    p.shoulderR = { x: SHOULDER_WIDTH - 6, y: 14 };
    p.elbowL = { x: -SHOULDER_WIDTH - 24, y: 22 };
    p.elbowR = { x: SHOULDER_WIDTH + 10, y: 24 };
    p.handL = { x: -SHOULDER_WIDTH - 32, y: 12 };
    p.handR = { x: SHOULDER_WIDTH + 18, y: 16 };
    p.hipL = { x: -HIP_WIDTH - 8, y: 16 };
    p.hipR = { x: HIP_WIDTH + 4, y: 14 };
    p.kneeL = { x: -HIP_WIDTH - 20, y: 10 };
    p.kneeR = { x: HIP_WIDTH + 16, y: 8 };
    p.footL = { x: -HIP_WIDTH - 34, y: 6 };
    p.footR = { x: HIP_WIDTH + 24, y: 4 };
    return p;
}

function wallSplatPose(base) {
    const p = clonePose(base);
    p.pelvis = { x: -10, y: HIP_HEIGHT - 20 };
    p.chest = { x: -18, y: HIP_HEIGHT + CHEST_OFFSET - 26 };
    p.head = { x: -26, y: HIP_HEIGHT + HEAD_OFFSET - 24 };
    p.neck = { x: -20, y: HIP_HEIGHT + CHEST_OFFSET - 34 };
    p.shoulderL = { x: -SHOULDER_WIDTH - 14, y: HIP_HEIGHT + CHEST_OFFSET - 30 };
    p.shoulderR = { x: SHOULDER_WIDTH - 10, y: HIP_HEIGHT + CHEST_OFFSET - 30 };
    p.elbowL = { x: -SHOULDER_WIDTH - 26, y: HIP_HEIGHT + CHEST_OFFSET - 12 };
    p.elbowR = { x: SHOULDER_WIDTH + 14, y: HIP_HEIGHT + CHEST_OFFSET - 10 };
    p.handL = { x: -SHOULDER_WIDTH - 32, y: HIP_HEIGHT + CHEST_OFFSET + 6 };
    p.handR = { x: SHOULDER_WIDTH + 22, y: HIP_HEIGHT + CHEST_OFFSET + 8 };
    p.footL = { x: -HIP_WIDTH - 18, y: 4 };
    p.footR = { x: HIP_WIDTH + 14, y: 0 };
    p.kneeL = { x: -HIP_WIDTH - 14, y: HIP_HEIGHT * 0.4 };
    p.kneeR = { x: HIP_WIDTH + 12, y: HIP_HEIGHT * 0.45 };
    return p;
}

function throwPose(base, t) {
    const p = clonePose(base);
    const s = Math.sin(t * 0.6);
    p.elbowR = { x: SHOULDER_WIDTH + 20, y: HIP_HEIGHT + CHEST_OFFSET - 20 };
    p.handR = { x: SHOULDER_WIDTH + 34, y: HIP_HEIGHT + CHEST_OFFSET - 40 };
    p.elbowL = { x: -SHOULDER_WIDTH - 10, y: HIP_HEIGHT + CHEST_OFFSET + 24 };
    p.handL = { x: -SHOULDER_WIDTH - 4, y: HIP_HEIGHT + CHEST_OFFSET + 44 };
    p.chest = { x: 4, y: HIP_HEIGHT + CHEST_OFFSET - 6 + s * 2 };
    p.head = { x: 8, y: HIP_HEIGHT + HEAD_OFFSET - 6 + s * 2 };
    p.neck = { x: 4, y: HIP_HEIGHT + CHEST_OFFSET - 14 };
    return p;
}

function winPose(base, t) {
    const p = clonePose(base);
    const s = Math.sin(t * 0.04);
    p.elbowR = { x: SHOULDER_WIDTH + 18, y: HIP_HEIGHT + CHEST_OFFSET - 24 - s * 6 };
    p.handR = { x: SHOULDER_WIDTH + 26, y: HIP_HEIGHT + CHEST_OFFSET - 52 - s * 8 };
    p.elbowL = { x: -SHOULDER_WIDTH - 4, y: HIP_HEIGHT + CHEST_OFFSET + 20 };
    p.handL = { x: -SHOULDER_WIDTH + 4, y: HIP_HEIGHT + CHEST_OFFSET + 38 };
    p.chest = { x: 2, y: HIP_HEIGHT + CHEST_OFFSET - 4 };
    p.head = { x: 4, y: HIP_HEIGHT + HEAD_OFFSET - 4 };
    p.neck = { x: 2, y: HIP_HEIGHT + CHEST_OFFSET - 12 };
    return p;
}

function attackPose(base, move, frame, t) {
    const p = clonePose(base);
    if (!move) return p;

    const total = Math.max(1, move.total);
    const progress = frame / total;
    const windup = Math.max(0, Math.min(1, (move.startup / total) * (1 - progress) + 0.15));
    const strike = progress > (move.startup / total) ? Math.min(1, (progress - move.startup / total) / 0.2) : 0;
    const ext = move.range / 100;
    const level = move.hitLevel;

    if (move.category === 'throw' || move.hitLevel === 'throw') {
        return blend(p, throwPose(base, t), 0.6);
    }

    const leadHand = move.buttons?.includes('HK') || move.buttons?.includes('LK') ? 'R' : 'R';
    const target = leadHand === 'R' ? 'R' : 'L';

    if (level === 'low') {
        p.elbowR = { x: SHOULDER_WIDTH + 12 - strike * 30, y: HIP_HEIGHT + CHEST_OFFSET + 26 + windup * 6 - strike * 6 };
        p.handR = { x: SHOULDER_WIDTH + 18 - strike * 50, y: HIP_HEIGHT + CHEST_OFFSET + 46 - strike * 30 };
        p.pelvis = { x: -strike * 6, y: HIP_HEIGHT - strike * 12 };
        p.chest = { x: -strike * 12, y: HIP_HEIGHT + CHEST_OFFSET + strike * 4 };
        p.head = { x: -strike * 10, y: HIP_HEIGHT + HEAD_OFFSET + strike * 4 };
        p.footL = { x: -HIP_WIDTH - 10, y: 0 };
        p.footR = { x: HIP_WIDTH + 14 + strike * 10, y: 0 };
        p.kneeR = { x: HIP_WIDTH + 12, y: HIP_HEIGHT * 0.5 + strike * 8 };
    } else if (level === 'high' || level === 'overhead') {
        p.elbowR = { x: SHOULDER_WIDTH + 14 - windup * 10 + strike * 24, y: HIP_HEIGHT + CHEST_OFFSET - 10 - windup * 20 + strike * 26 };
        p.handR = { x: SHOULDER_WIDTH + 20 - windup * 14 + strike * 40, y: HIP_HEIGHT + CHEST_OFFSET - 28 - windup * 34 + strike * 44 };
        p.chest = { x: -windup * 6 + strike * 10, y: HIP_HEIGHT + CHEST_OFFSET - windup * 4 };
        p.head = { x: -windup * 4 + strike * 8, y: HIP_HEIGHT + HEAD_OFFSET - windup * 6 };
        p.elbowL = { x: -SHOULDER_WIDTH - 12, y: HIP_HEIGHT + CHEST_OFFSET + 20 + windup * 8 };
        p.handL = { x: -SHOULDER_WIDTH - 6, y: HIP_HEIGHT + CHEST_OFFSET + 38 };
    } else {
        const pAmt = strike * 46 * ext;
        p.elbowR = { x: SHOULDER_WIDTH + 12 + pAmt * 0.5, y: HIP_HEIGHT + CHEST_OFFSET + 2 - windup * 8 };
        p.handR = { x: SHOULDER_WIDTH + 20 + pAmt, y: HIP_HEIGHT + CHEST_OFFSET + 4 - windup * 10 };
        p.chest = { x: strike * 14, y: HIP_HEIGHT + CHEST_OFFSET - 4 - windup * 4 };
        p.head = { x: strike * 10, y: HIP_HEIGHT + HEAD_OFFSET - 4 };
        p.neck = { x: strike * 12, y: HIP_HEIGHT + CHEST_OFFSET - 12 };
        p.elbowL = { x: -SHOULDER_WIDTH - 14, y: HIP_HEIGHT + CHEST_OFFSET + 18 };
        p.handL = { x: -SHOULDER_WIDTH - 4, y: HIP_HEIGHT + CHEST_OFFSET + 36 };
        p.footL = { x: -HIP_WIDTH - 12 - strike * 6, y: 0 };
        p.footR = { x: HIP_WIDTH + 10 + strike * 8, y: 0 };
    }

    if (move.launches && strike > 0.5) {
        p.pelvis = { x: p.pelvis.x - 6, y: p.pelvis.y + 6 };
        p.chest = { x: p.chest.x - 8, y: p.chest.y - 4 };
    }

    return p;
}

export function getPose(fighter) {
    const base = basePose();
    const t = fighter.animFrame;
    const state = fighter.state;
    const anim = fighter.animState;

    let pose;
    switch (anim) {
        case 'walkF':
            pose = walkPose(base, t * 0.16, 1);
            break;
        case 'walkB':
            pose = walkPose(base, -t * 0.14, 0.7);
            break;
        case 'dashF':
            pose = dashPose(base, t * 0.2, 1);
            break;
        case 'dashB':
            pose = dashPose(base, t * 0.18, -1);
            break;
        case 'backdash':
            pose = backdashPose(base, t * 0.2);
            break;
        case 'sidestep':
            pose = walkPose(base, t * 0.2, 0.5);
            break;
        case 'crouch':
            pose = crouchPose(base);
            break;
        case 'block':
            pose = fighter.isCrouching ? blockLowPose(base) : blockHighPose(base);
            break;
        case 'hitstun':
            pose = hitstunPose(base, fighter.facing, t);
            break;
        case 'hitstunAir':
        case 'juggle':
            pose = airHitPose(base, fighter.facing);
            break;
        case 'knockdown':
        case 'downTech':
            pose = knockdownPose(base);
            break;
        case 'wallSplat':
            pose = wallSplatPose(base);
            break;
        case 'thrown':
            pose = airHitPose(base, fighter.facing);
            break;
        case 'win':
            pose = winPose(base, t);
            break;
        case 'lose':
            pose = knockdownPose(base);
            break;
        case 'attack':
            pose = attackPose(base, fighter.currentMove, fighter.moveFrame, t);
            break;
        case 'heat':
            pose = stancePose(base, true);
            break;
        case 'rage':
            pose = stancePose(base, true);
            break;
        default:
            pose = stancePose(base, true);
    }

    if (fighter.grounded && (anim === 'jump' || state === 'jump' || state === 'airborne')) {
        const j = stancePose(base, true);
        j.footL = { x: -HIP_WIDTH - 10, y: HIP_HEIGHT + 16 };
        j.footR = { x: HIP_WIDTH + 8, y: HIP_HEIGHT + 24 };
        j.kneeL = { x: -HIP_WIDTH - 12, y: HIP_HEIGHT * 0.6 };
        j.kneeR = { x: HIP_WIDTH + 10, y: HIP_HEIGHT * 0.68 };
        j.pelvis = { x: 0, y: HIP_HEIGHT + 2 };
        j.chest = { x: 2, y: HIP_HEIGHT + CHEST_OFFSET + 2 };
        j.head = { x: 4, y: HIP_HEIGHT + HEAD_OFFSET + 2 };
        pose = j;
    }

    if (fighter.stance) {
        pose = stancePose(pose, true);
        pose.pelvis = { x: pose.pelvis.x - 4, y: pose.pelvis.y + 4 };
    }

    return pose;
}

export function getJoints(pose) {
    return {
        head: pose.head,
        neck: pose.neck,
        chest: pose.chest,
        pelvis: pose.pelvis,
        shoulderL: pose.shoulderL,
        shoulderR: pose.shoulderR,
        elbowL: pose.elbowL,
        elbowR: pose.elbowR,
        handL: pose.handL,
        handR: pose.handR,
        hipL: pose.hipL,
        hipR: pose.hipR,
        kneeL: pose.kneeL,
        kneeR: pose.kneeR,
        footL: pose.footL,
        footR: pose.footR,
    };
}

export const RIG = {
    HIP_HEIGHT, CHEST_OFFSET, HEAD_OFFSET, SHOULDER_WIDTH, HIP_WIDTH,
    UPPER_ARM, FOREARM, THIGH, SHIN, GROUND_Y,
};
