import { HitLevel, MoveCategory, Stance } from '../game/Move.js';

const NOTATION_MOTION = (notation) => {
    const base = notation.split(' ')[0];
    if (base.startsWith('~')) return [4, 1, 2, 3, 6];
    const double = base.match(/^([fb]),\1/);
    if (double) {
        const rest = base.slice(3);
        const lead = [];
        let i = 0;
        while (i < rest.length) {
            const c = rest[i];
            if (c === 'f') { lead.push(3); i++; continue; }
            if (c === 'b') { lead.push(4); i++; continue; }
            if (c === 'u') { lead.push(6); i++; continue; }
            if (c === 'd') { lead.push(2); i++; continue; }
            break;
        }
        return [double[1] === 'f' ? 3 : 4, double[1] === 'f' ? 3 : 4, ...lead];
    }
    const dirs = [];
    let i = 0;
    while (i < base.length) {
        const c = base[i];
        if (c === 'f') { dirs.push(3); i++; continue; }
        if (c === 'b') { dirs.push(4); i++; continue; }
        if (c === 'u') { dirs.push(6); i++; continue; }
        if (c === 'd') { dirs.push(2); i++; continue; }
        break;
    }
    return dirs.length ? dirs : null;
};

const withMotion = (notation, extra) => {
    const m = NOTATION_MOTION(notation);
    return m && !extra.motion ? { motion: m, ...extra } : extra;
};

const N = (name, notation, extra) => ({
    name, notation, category: MoveCategory.NORMAL,
    buttons: 'LP', hitLevel: HitLevel.HIGH, ...withMotion(notation, extra),
});
const N4 = (name, notation, extra) => ({
    name, notation, category: MoveCategory.NORMAL,
    buttons: 'HP', hitLevel: HitLevel.HIGH, ...withMotion(notation, extra),
});
const N2 = (name, notation, extra) => ({
    name, notation, category: MoveCategory.NORMAL,
    buttons: 'LK', hitLevel: HitLevel.LOW, ...withMotion(notation, extra),
});
const N3 = (name, notation, extra) => ({
    name, notation, category: MoveCategory.NORMAL,
    buttons: 'HK', hitLevel: HitLevel.LOW, ...withMotion(notation, extra),
});
const CMN = (name, notation, extra) => ({
    name, notation, category: MoveCategory.COMMAND_NORMAL,
    buttons: 'LP+HP', hitLevel: HitLevel.MID, ...withMotion(notation, extra),
});
const SEN = (name, notation, extra) => ({
    name, notation, category: MoveCategory.SPECIAL,
    buttons: 'LP+HP', hitLevel: HitLevel.MID, ...withMotion(notation, extra),
});
const CS = (name, notation, extra) => ({
    name, notation, category: MoveCategory.COMMAND_SPECIAL,
    buttons: 'LP+HP', hitLevel: HitLevel.MID, ...withMotion(notation, extra),
});
const HCF = (name, notation, extra) => ({
    name, notation, category: MoveCategory.COMMAND_SPECIAL,
    buttons: 'LP+HP', hitLevel: HitLevel.MID, ...withMotion(notation, extra),
});
const RAGE = (name, notation, extra) => ({
    name, notation, category: MoveCategory.RAGE_ART,
    buttons: 'LP+HP', hitLevel: HitLevel.MID, requiresRage: true, ...withMotion(notation, extra),
});
const HS = (name, notation, extra) => ({
    name, notation, category: MoveCategory.HEAT_SMASH,
    buttons: 'HP+HK', hitLevel: HitLevel.MID, requiresHeat: true, ...withMotion(notation, extra),
});
const HE = (name, notation, extra) => ({
    name, notation, category: MoveCategory.HEAT_ENGAGER,
    buttons: 'HP+HK', hitLevel: HitLevel.MID, heatEngager: true, ...withMotion(notation, extra),
});
const TH = (name, notation, extra) => ({
    name, notation, category: MoveCategory.THROW,
    buttons: 'LP+LK', hitLevel: HitLevel.THROW, throwType: 'normal', ...withMotion(notation, extra),
});
const CTH = (name, notation, extra) => ({
    name, notation, category: MoveCategory.THROW,
    buttons: 'LP+HP', hitLevel: HitLevel.THROW, throwType: 'command', ...withMotion(notation, extra),
});

const WALL_THROW = (name, notation, extra) => ({
    name, notation, category: MoveCategory.THROW,
    buttons: 'LP+LK', hitLevel: HitLevel.THROW, throwType: 'command',
    wallThrow: true, knockdown: true, techable: true, range: 0,
    motion: NOTATION_MOTION(notation), priority: 20, ...extra,
});
const WALL_SPLAT = (name, notation, extra) => ({
    name, notation, category: MoveCategory.COMMAND_SPECIAL,
    buttons: 'LP+HP', hitLevel: HitLevel.MID, wallSplat: true,
    motion: NOTATION_MOTION(notation), priority: 20, ...extra,
});
const BALCONY = (name, notation, extra) => ({
    name, notation, category: MoveCategory.COMMAND_SPECIAL,
    buttons: 'LP+HP', hitLevel: HitLevel.MID, balconyBreak: true, knockdown: true,
    motion: NOTATION_MOTION(notation), priority: 25, ...extra,
});
const SPIRAL = (name, notation, extra) => ({
    name, notation, category: MoveCategory.THROW,
    buttons: 'LP+HP', hitLevel: HitLevel.THROW, throwType: 'command',
    spiral: true, knockdown: true, techable: true,
    motion: NOTATION_MOTION(notation), priority: 20, ...extra,
});
const PK = (name, notation, extra) => ({
    name, notation, category: MoveCategory.PROJECTILE,
    buttons: 'HP+HK', hitLevel: HitLevel.PROJECTILE, ...extra,
});

export const ROSTER = {};

ROSTER.jin = {
    id: 'jin',
    name: 'JIN KAZAMA',
    style: 'Kazama Style Martial Arts',
    blurb: 'Mishima bloodline. Balanced, explosive, punish-happy.',
    health: 1000,
    speed: 1.0,
    weight: 1.0,
    jumpPower: 1.0,
    height: 186,
    colors: {
        primary: '#1a3a6a', secondary: '#0d1f3d', accent: '#ff4444',
        skin: '#e8c8a0', hair: '#1a1a2e', aura: '#ff4444',
    },
    palette: { skin: '#e8c8a0', hair: '#1a1a2e', primary: '#1a3a6a', secondary: '#0d1f3d', accent: '#ff4444' },
    stats: { power: 3, speed: 4, range: 3, defense: 3, heat: 4 },
    moves: [
        N('Standing LP', '1', { damage: 7, startup: 9, active: 3, recovery: 12, onHit: 5, onBlock: -1, range: 62, hitY: 112, chipDamage: 0, chainCancel: '1' }),
        N4('Standing HP', '2', { damage: 14, startup: 13, active: 4, recovery: 20, onHit: 8, onBlock: -5, range: 72, hitY: 100, chainCancel: '2' }),
        N2('Crouching LP', 'd1', { damage: 6, startup: 8, active: 3, recovery: 11, onHit: 4, onBlock: -1, requiresCrouch: true, range: 58, hitY: 30, chainCancel: 'd1' }),
        N3('Crouching HP', 'd2', { damage: 13, startup: 12, active: 4, recovery: 19, onHit: 7, onBlock: -5, requiresCrouch: true, range: 70, hitY: 28 }),
        N3('Crouching LK (Low)', 'd3', { damage: 8, startup: 13, active: 3, recovery: 16, onHit: 4, onBlock: -3, requiresCrouch: true, range: 66, hitY: 20 }),
        N('Jump LP', 'uj1', { damage: 10, startup: 6, active: 8, recovery: 12, onHit: 4, requiresAir: true, range: 60, hitY: 40, hitHeight: 50 }),
        N4('Jump HP', 'uj2', { damage: 16, startup: 8, active: 8, recovery: 16, onHit: 6, requiresAir: true, hitLevel: HitLevel.MID, range: 70, hitY: 40, hitHeight: 50 }),
        N2('Jump LK', 'uj3', { damage: 9, startup: 7, active: 6, recovery: 10, onHit: 3, requiresAir: true, range: 58, hitY: 20, hitHeight: 40 }),
        CMN('God Fist', 'f+LP', { damage: 18, startup: 14, active: 4, recovery: 21, onHit: 7, onBlock: -4, range: 76, hitY: 100, chainCancel: 'f+LP' }),
        CMN('Palm Strike', 'f+HP', { damage: 26, startup: 18, active: 5, recovery: 26, onHit: 9, onBlock: -7, range: 84, hitY: 78, launches: true }),
        CS('Blazing Knuckle', 'f,f+HP', { damage: 38, startup: 23, active: 5, recovery: 30, onHit: 12, onBlock: -8, range: 90, hitY: 72, launches: true, heatEngager: true, effectColor: '#ff4400' }),
        CS('Eruption', 'f,f+HK', { damage: 44, startup: 26, active: 6, recovery: 34, onHit: 14, onBlock: -10, range: 96, hitY: 66, launches: true, heatEngager: true, effectColor: '#ff2200' }),
        SEN('Hellfire Stance', 'f+1+2', { damage: 0, startup: 0, active: 0, recovery: 13, onHit: 0, onBlock: 0, damage: 0, range: 0, hitY: 0, enterStance: Stance.BOK, cancelsIntoStance: true, hitLevel: HitLevel.MID, noHitbox: true }),
        N('BOK 1', 'BOK1', { damage: 16, startup: 11, active: 3, recovery: 17, onHit: 5, onBlock: -3, stanceOnly: true, requiresStance: Stance.BOK, range: 74, hitY: 100, chainCancel: 'BOK1' }),
        N('BOK 2', 'BOK2', { damage: 24, startup: 15, active: 4, recovery: 22, onHit: 7, onBlock: -6, stanceOnly: true, requiresStance: Stance.BOK, range: 82, hitY: 80 }),
        N3('BOK 3 (Wall)', 'BOK3', { damage: 20, startup: 17, active: 4, recovery: 20, onHit: 6, onBlock: -4, stanceOnly: true, requiresStance: Stance.BOK, range: 80, hitY: 90, wallCarry: true, wallBounce: true, hitLevel: HitLevel.MID, launchOnWall: true }),
        N4('BOK 4', 'BOK4', { damage: 30, startup: 20, active: 5, recovery: 26, onHit: 10, onBlock: -8, stanceOnly: true, requiresStance: Stance.BOK, range: 86, hitY: 66, launches: true }),
        CS('Hellfire Punch', 'BOK d+1+2', { damage: 34, startup: 25, active: 5, recovery: 32, onHit: 13, onBlock: -9, stanceOnly: true, requiresStance: Stance.BOK, range: 92, hitY: 64, launches: true, heatEngager: true, effectColor: '#ff3300' }),
        CS('Hellfire Kick', 'BOK f+1+2', { damage: 40, startup: 28, active: 6, recovery: 35, onHit: 15, onBlock: -11, stanceOnly: true, requiresStance: Stance.BOK, range: 98, hitY: 60, launches: true, heatEngager: true, effectColor: '#ff1100' }),
        HCF('Divine Counter', '~1+2', { damage: 0, startup: 0, active: 0, recovery: 24, onHit: 0, onBlock: 0, range: 0, hitY: 0, reversal: true, noHitbox: true, invulnFrames: 8, hitLevel: HitLevel.MID, effectColor: '#44ddff' }),
        HCF('Divine Blaze', '~1+2 1+2', { damage: 20, startup: 17, active: 4, recovery: 26, onHit: 8, onBlock: -6, range: 88, hitY: 80, followUp: '1+2' }),
        N('Hurricane (combo)', '1+2 1+2', { damage: 15, startup: 10, active: 4, recovery: 18, onHit: 6, onBlock: -5, range: 72, hitY: 90, requiresStand: true, chainCancel: '1+2 1+2' }),
        N('Hellfire Ball', '1+2 > LP+HP', { damage: 26, startup: 15, active: 3, recovery: 24, onHit: 0, onBlock: 0, projectile: true, range: 0, hitY: 0, noHitbox: true, requiresStand: true, followUpDelay: 6, effectColor: '#ff4400' }),
        WALL_THROW('Hell Twister (Wall)', 'ub+LP+LK', { damage: 24, startup: 5, active: 3, recovery: 27, onHit: 17, onBlock: 0, hitY: 80, wallThrow: true, knockdown: true, techable: true, effectColor: '#ff4400' }),
        BALCONY('Devil Blaster (Balcony)', 'ubf+1+2', { damage: 30, startup: 23, active: 6, recovery: 34, onHit: 16, onBlock: -11, range: 76, hitY: 94, balconyBreak: true, effectColor: '#ff2200' }),
        RAGE('Devil Blaster', 'df+1+2', { damage: 62, startup: 14, active: 10, recovery: 34, onHit: 20, onBlock: -22, range: 110, hitY: 80, launches: true, removesRecoverable: true, effectColor: '#ff00ff', damageScalesWithMissingHealth: true }),
        TH('Throw (front)', 'f+LP+LK', { damage: 22, startup: 5, active: 3, recovery: 25, onHit: 15, onBlock: 0, range: 58, hitY: 80, knockdown: true, techable: true, throwBreak: 9 }),
        CTH('Hell Twister', 'f,f+1+2', { damage: 28, startup: 5, active: 3, recovery: 27, onHit: 16, onBlock: 0, range: 56, hitY: 80, knockdown: true, techable: true, requiresHsdCharge: 0 }),
        HS('Heat Smash', 'Heat HP+HK', { damage: 40, startup: 18, active: 5, recovery: 30, onHit: 18, onBlock: 2, range: 96, hitY: 74, launches: true, effectColor: '#ffaa00', requiresTwoBars: true }),
        HE('Heat Burst (Flame Pillar)', 'Heat HP+HK', { damage: 16, startup: 15, active: 3, recovery: 24, onHit: 4, onBlock: 1, range: 78, hitY: 96, heatEngager: true, heatBurst: true, effectColor: '#44ddff' }),
    ],
};

ROSTER.kazuya = {
    id: 'kazuya',
    name: 'KAZUYA MISHIMA',
    style: 'Mishima Style Martial Arts',
    blurb: 'The Devil. Demon-paw lasers and the unblockable rage art.',
    health: 1000,
    speed: 0.92,
    weight: 1.05,
    jumpPower: 0.98,
    height: 188,
    colors: { primary: '#2a1a3a', secondary: '#150c1f', accent: '#ff0044', skin: '#d4a574', hair: '#2a2a3a', aura: '#ff0044' },
    palette: { skin: '#d4a574', hair: '#2a2a3a', primary: '#2a1a3a', secondary: '#150c1f', accent: '#ff0044' },
    stats: { power: 5, speed: 3, range: 4, defense: 3, heat: 3 },
    moves: [
        N('Standing LP', '1', { damage: 7, startup: 9, active: 3, recovery: 13, onHit: 5, onBlock: -1, range: 62, hitY: 112, chainCancel: '1' }),
        N4('Standing HP', '2', { damage: 15, startup: 14, active: 4, recovery: 21, onHit: 8, onBlock: -6, range: 74, hitY: 100, chainCancel: '2' }),
        N2('Crouching LP', 'd1', { damage: 6, startup: 8, active: 3, recovery: 12, onHit: 4, onBlock: -1, requiresCrouch: true, range: 58, hitY: 30, chainCancel: 'd1' }),
        N3('Crouching HP', 'd2', { damage: 14, startup: 12, active: 4, recovery: 20, onHit: 7, onBlock: -6, requiresCrouch: true, range: 70, hitY: 28 }),
        N3('Crouching LK', 'd3', { damage: 8, startup: 14, active: 3, recovery: 17, onHit: 4, onBlock: -3, requiresCrouch: true, range: 66, hitY: 20 }),
        N('Jump LP', 'uj1', { damage: 10, startup: 6, active: 8, recovery: 12, onHit: 4, requiresAir: true, range: 60, hitY: 40, hitHeight: 50 }),
        N4('Jump HP', 'uj2', { damage: 17, startup: 8, active: 8, recovery: 17, onHit: 6, requiresAir: true, hitLevel: HitLevel.MID, range: 70, hitY: 40, hitHeight: 50 }),
        N2('Jump LK', 'uj3', { damage: 9, startup: 7, active: 6, recovery: 10, onHit: 3, requiresAir: true, range: 58, hitY: 20, hitHeight: 40 }),
        CMN('Demon Scissors', 'f+LP', { damage: 17, startup: 13, active: 4, recovery: 20, onHit: 6, onBlock: -3, range: 78, hitY: 100, chainCancel: 'f+LP' }),
        CMN('Demon Kick', 'f+HP', { damage: 25, startup: 17, active: 5, recovery: 25, onHit: 9, onBlock: -7, range: 86, hitY: 76, launches: true }),
        HE('Demon Paw', 'f,f+HP', { damage: 34, startup: 22, active: 5, recovery: 29, onHit: 12, onBlock: -7, range: 90, hitY: 70, launches: true, heatEngager: true, effectColor: '#ff0044' }),
        HE('Destruction Gate', 'f,f+HK', { damage: 40, startup: 25, active: 6, recovery: 33, onHit: 14, onBlock: -10, range: 96, hitY: 64, launches: true, heatEngager: true, effectColor: '#ff0044' }),
        HE('Demon Devastator', 'f+1+2', { damage: 28, startup: 18, active: 5, recovery: 26, onHit: 11, onBlock: -6, range: 84, hitY: 74, launches: true, heatEngager: true, effectColor: '#ff0044' }),
        SEN('Hell Stance', 'f+1+2', { damage: 0, startup: 0, active: 0, recovery: 14, onHit: 0, onBlock: 0, range: 0, hitY: 0, enterStance: Stance.DES, noHitbox: true }),
        N('DES 1 (Slicer)', 'DES1', { damage: 15, startup: 12, active: 3, recovery: 18, onHit: 5, onBlock: -4, stanceOnly: true, requiresStance: Stance.DES, range: 76, hitY: 98, chainCancel: 'DES1' }),
        N4('DES 2 (Low)', 'DES2', { damage: 20, startup: 16, active: 4, recovery: 22, onHit: 6, onBlock: -5, stanceOnly: true, requiresStance: Stance.DES, hitLevel: HitLevel.LOW, range: 78, hitY: 24 }),
        N3('DES 3 (Kicker)', 'DES3', { damage: 26, startup: 19, active: 5, recovery: 25, onHit: 9, onBlock: -7, stanceOnly: true, requiresStance: Stance.DES, range: 84, hitY: 72 }),
        CS('Demon Wall', 'DES f+1+2', { damage: 36, startup: 27, active: 6, recovery: 34, onHit: 15, onBlock: -12, stanceOnly: true, requiresStance: Stance.DES, range: 94, hitY: 66, launches: true, heatEngager: true, effectColor: '#ff0044' }),
        HCF('Lightning Reversal', '~1+2', { damage: 0, startup: 0, active: 0, recovery: 25, onHit: 0, onBlock: 0, range: 0, hitY: 0, reversal: true, noHitbox: true, invulnFrames: 8, hitLevel: HitLevel.MID, effectColor: '#44ddff' }),
        HCF('Lightning Palm', '~1+2 1+2', { damage: 22, startup: 16, active: 4, recovery: 25, onHit: 9, onBlock: -6, range: 88, hitY: 80, launches: true }),
        PK('Devil Laser', 'f+1+2', { damage: 30, startup: 20, active: 6, recovery: 30, onHit: 0, onBlock: -3, range: 0, hitY: 0, projectile: true, projSpeed: 11, range: 300, effectColor: '#ff0044' }),
        WALL_THROW('Hell Twister (Wall)', 'ub+LP+LK', { damage: 28, startup: 5, active: 3, recovery: 28, onHit: 20, onBlock: 0, hitY: 80, wallThrow: true, knockdown: true, techable: true, effectColor: '#ff0044' }),
        BALCONY('Demon Destruction Gate', 'ubf+1+2', { damage: 34, startup: 22, active: 6, recovery: 34, onHit: 18, onBlock: -10, range: 78, hitY: 96, balconyBreak: true, effectColor: '#ff0044' }),
        RAGE('Devil Beam (UNBLOCKABLE)', 'df+1+2', { damage: 70, startup: 15, active: 12, recovery: 36, onHit: 25, onBlock: 0, hitLevel: HitLevel.UNBLOCKABLE, range: 220, hitY: 80, removesRecoverable: true, effectColor: '#ff00ff', damageScalesWithMissingHealth: true }),
        TH('God Throw', 'f+LP+LK', { damage: 24, startup: 5, active: 3, recovery: 26, onHit: 16, onBlock: 0, range: 58, hitY: 80, knockdown: true, techable: true, throwBreak: 9 }),
        CTH('Hell Twister', 'f,f+1+2', { damage: 30, startup: 5, active: 3, recovery: 28, onHit: 18, onBlock: 0, range: 56, hitY: 80, knockdown: true, techable: true }),
        HS('Heat Smash (Hell Chop)', 'Heat HP+HK', { damage: 44, startup: 17, active: 5, recovery: 28, onHit: 20, onBlock: 3, range: 98, hitY: 72, launches: true, effectColor: '#ff0044', requiresTwoBars: true }),
    ],
};

ROSTER.paul = {
    id: 'paul',
    name: 'PAUL PHOENIX',
    style: 'Judo + Jeet Kune Do',
    blurb: 'Juggler machine. Chains and bouncers. Nothing survives Phoenix Smasher.',
    health: 1050,
    speed: 0.95,
    weight: 1.1,
    jumpPower: 0.96,
    height: 190,
    colors: { primary: '#c8322a', secondary: '#7a1a14', accent: '#ffd700', skin: '#c8a080', hair: '#8b4513', aura: '#ffd700' },
    palette: { skin: '#c8a080', hair: '#8b4513', primary: '#c8322a', secondary: '#7a1a14', accent: '#ffd700' },
    stats: { power: 5, speed: 3, range: 4, defense: 2, heat: 4 },
    moves: [
        N('Standing LP', '1', { damage: 7, startup: 9, active: 3, recovery: 12, onHit: 5, onBlock: -1, range: 64, hitY: 112, chainCancel: '1' }),
        N4('Standing HP', '2', { damage: 15, startup: 13, active: 4, recovery: 20, onHit: 8, onBlock: -5, range: 74, hitY: 100 }),
        N2('Crouching LP', 'd1', { damage: 6, startup: 8, active: 3, recovery: 11, onHit: 4, onBlock: -1, requiresCrouch: true, range: 60, hitY: 30, chainCancel: 'd1' }),
        N3('Crouching HP', 'd2', { damage: 14, startup: 12, active: 4, recovery: 19, onHit: 7, onBlock: -5, requiresCrouch: true, range: 72, hitY: 28 }),
        N3('Crouching LK', 'd3', { damage: 8, startup: 13, active: 3, recovery: 16, onHit: 4, onBlock: -3, requiresCrouch: true, range: 68, hitY: 20 }),
        N('Jump LP', 'uj1', { damage: 10, startup: 6, active: 8, recovery: 12, onHit: 4, requiresAir: true, range: 60, hitY: 40, hitHeight: 50 }),
        N4('Jump HP', 'uj2', { damage: 17, startup: 8, active: 8, recovery: 16, onHit: 6, requiresAir: true, hitLevel: HitLevel.MID, range: 70, hitY: 40, hitHeight: 50 }),
        N2('Jump LK', 'uj3', { damage: 9, startup: 7, active: 6, recovery: 10, onHit: 3, requiresAir: true, range: 58, hitY: 20, hitHeight: 40 }),
        N4('Phoenix Smasher', 'f+HP', { damage: 25, startup: 15, active: 5, recovery: 24, onHit: 10, onBlock: -6, range: 78, hitY: 92, launches: true, juggleReady: true }),
        N4('Knee (Pouncing PK)', 'f+1+2', { damage: 22, startup: 20, active: 6, recovery: 30, onHit: 14, onBlock: -14, range: 92, hitY: 100, knockdown: true, heatEngager: true, effectColor: '#ff6600' }),
        HE('Phoenix Smasher (Launcher)', 'f,f+2', { damage: 36, startup: 22, active: 5, recovery: 30, onHit: 15, onBlock: -9, range: 86, hitY: 88, launches: true, tornado: true, heatEngager: true, effectColor: '#ff8800' }),
        HE('Burning Kick', 'f,f+HK', { damage: 42, startup: 26, active: 6, recovery: 33, onHit: 15, onBlock: -11, range: 94, hitY: 62, launches: true, tornado: true, heatEngager: true, effectColor: '#ff4400' }),
        HCF('Iron Will', '~1+2', { damage: 0, startup: 0, active: 0, recovery: 26, onHit: 0, onBlock: 0, range: 0, hitY: 0, reversal: true, noHitbox: true, invulnFrames: 9, hitLevel: HitLevel.MID, effectColor: '#ffaa00' }),
        HCF('Iron Will Strike', '~1+2 1+2', { damage: 28, startup: 19, active: 5, recovery: 28, onHit: 12, onBlock: -8, range: 90, hitY: 78, launches: true }),
        HCF('Bouncer (Juggle extender)', '~1+2', { damage: 12, startup: 8, active: 6, recovery: 26, onHit: 20, onBlock: 5, range: 70, hitY: 40, requiresAir: false, tornado: true, bouncer: true, juggleOnly: true, effectColor: '#ffaa00' }),
        N('Pouncing PK (Bouncer finisher)', 'jumping 1+2', { damage: 10, startup: 5, active: 10, recovery: 20, onHit: 12, requiresAir: true, range: 60, hitY: 30, hitHeight: 60, bouncer: true, juggleOnly: true, followUpDelay: 8, effectColor: '#ffaa00' }),
        WALL_THROW('Paul Body Slam (Wall)', 'uf+LP+LK', { damage: 26, startup: 5, active: 3, recovery: 28, onHit: 18, onBlock: 0, hitY: 80, wallThrow: true, knockdown: true, techable: true, effectColor: '#ff8800' }),
        WALL_SPLAT('Knee Smash (Wall Splat)', 'ub+1+2', { damage: 22, startup: 17, active: 5, recovery: 28, onHit: 12, onBlock: -6, range: 72, hitY: 92, wallSplat: true, effectColor: '#ff8800' }),
        RAGE('Death Fist', 'df+1+2', { damage: 75, startup: 16, active: 14, recovery: 38, onHit: 28, onBlock: -30, range: 100, hitY: 84, launches: true, removesRecoverable: true, effectColor: '#ff2200', damageScalesWithMissingHealth: true }),
        TH('Throw', 'f+LP+LK', { damage: 24, startup: 5, active: 3, recovery: 26, onHit: 16, onBlock: 0, range: 60, hitY: 80, knockdown: true, techable: true, throwBreak: 9 }),
        HS('Heat Smash (Phoenix Smasher)', 'Heat HP+HK', { damage: 46, startup: 18, active: 6, recovery: 30, onHit: 22, onBlock: 2, range: 96, hitY: 84, launches: true, requiresTwoBars: true, effectColor: '#ff8800' }),
    ],
};

ROSTER.king = {
    id: 'king',
    name: 'KING',
    style: 'Pro Wrestling',
    blurb: 'Gigantic grizzly. Armor through jabs, command grabs, giant swings.',
    health: 1150,
    speed: 0.78,
    weight: 1.5,
    jumpPower: 0.85,
    height: 195,
    colors: { primary: '#1a4a2a', secondary: '#0d2814', accent: '#ff6600', skin: '#d4a574', hair: '#4a2a0a', aura: '#44ff44' },
    palette: { skin: '#d4a574', hair: '#4a2a0a', primary: '#1a4a2a', secondary: '#0d2814', accent: '#ff6600' },
    stats: { power: 5, speed: 2, range: 4, defense: 4, heat: 2 },
    moves: [
        N('Standing LP', '1', { damage: 8, startup: 11, active: 3, recovery: 14, onHit: 5, onBlock: -1, range: 64, hitY: 110, chainCancel: '1' }),
        N4('Standing HP', '2', { damage: 17, startup: 16, active: 4, recovery: 22, onHit: 9, onBlock: -7, range: 76, hitY: 98 }),
        N2('Crouching LP', 'd1', { damage: 7, startup: 10, active: 3, recovery: 13, onHit: 4, onBlock: -1, requiresCrouch: true, range: 60, hitY: 30, chainCancel: 'd1' }),
        N3('Crouching HP', 'd2', { damage: 15, startup: 14, active: 4, recovery: 21, onHit: 8, onBlock: -6, requiresCrouch: true, range: 72, hitY: 28 }),
        N3('Crouching LK', 'd3', { damage: 9, startup: 15, active: 3, recovery: 18, onHit: 4, onBlock: -4, requiresCrouch: true, range: 70, hitY: 20 }),
        N('Jump LP', 'uj1', { damage: 11, startup: 7, active: 8, recovery: 14, onHit: 4, requiresAir: true, range: 60, hitY: 40, hitHeight: 50 }),
        N4('Jump HP', 'uj2', { damage: 19, startup: 9, active: 8, recovery: 18, onHit: 6, requiresAir: true, hitLevel: HitLevel.MID, range: 70, hitY: 40, hitHeight: 50 }),
        N2('Jump LK', 'uj3', { damage: 10, startup: 8, active: 6, recovery: 12, onHit: 3, requiresAir: true, range: 58, hitY: 20, hitHeight: 40 }),
        N4('Giant Swing', 'f+HP', { damage: 28, startup: 17, active: 5, recovery: 26, onHit: 10, onBlock: -8, range: 80, hitY: 88, launches: true }),
        CS('Anaconda Vise', 'f,f+1+2', { damage: 30, startup: 5, active: 3, recovery: 30, onHit: 20, onBlock: 0, hitLevel: HitLevel.THROW, throwType: 'command', range: 60, hitY: 80, knockdown: true, techable: false, armor: { frames: 20, power: 'light' }, effectColor: '#44ff44' }),
        HE('Nasty Fight', 'f,f+3+4', { damage: 22, startup: 24, active: 5, recovery: 32, onHit: 16, onBlock: -12, range: 90, hitY: 64, launches: true, heatEngager: true, effectColor: '#44ff44' }),
        HE('Giant Spin', 'f,f+2', { damage: 26, startup: 20, active: 6, recovery: 29, onHit: 12, onBlock: -7, range: 88, hitY: 70, launches: true, heatEngager: true, effectColor: '#44ff44' }),
        N4('Trample', 'd+2', { damage: 18, startup: 20, active: 5, recovery: 26, onHit: 8, onBlock: -6, requiresCrouch: true, range: 74, hitY: 24, knockdown: true, hitLevel: HitLevel.LOW }),
        HCF('Giant Reversal', '~1+2', { damage: 0, startup: 0, active: 0, recovery: 28, onHit: 0, onBlock: 0, range: 0, hitY: 0, reversal: true, noHitbox: true, invulnFrames: 10, hitLevel: HitLevel.MID, effectColor: '#44ff44' }),
        HCF('Giant Swing (Reversal)', '~1+2 1+2', { damage: 26, startup: 18, active: 5, recovery: 28, onHit: 12, onBlock: -6, range: 84, hitY: 86, launches: true }),
        WALL_THROW('King Avalanche (Wall)', 'uf+LP+LK', { damage: 30, startup: 6, active: 3, recovery: 30, onHit: 20, onBlock: 0, hitY: 80, wallThrow: true, knockdown: true, techable: true, effectColor: '#44ff44' }),
        BALCONY('Kaiser Wave (Balcony Break)', 'ubf+1+2', { damage: 32, startup: 24, active: 6, recovery: 36, onHit: 18, onBlock: -12, range: 76, hitY: 94, balconyBreak: true, effectColor: '#44ff44' }),
        RAGE('Killing Machine', 'df+1+2', { damage: 85, startup: 20, active: 16, recovery: 40, onHit: 30, onBlock: -25, range: 92, hitY: 86, launches: true, hitLevel: HitLevel.THROW, throwType: 'command', knockdown: true, removesRecoverable: true, effectColor: '#00ff00', techable: false, damageScalesWithMissingHealth: true }),
        TH('Bear Slam', 'f+LP+LK', { damage: 28, startup: 6, active: 3, recovery: 28, onHit: 18, onBlock: 0, range: 62, hitY: 80, knockdown: true, techable: true, throwBreak: 9 }),
        HS('Heat Smash (Kaiser Driver)', 'Heat HP+HK', { damage: 50, startup: 20, active: 6, recovery: 32, onHit: 24, onBlock: 2, range: 94, hitY: 70, launches: true, requiresTwoBars: true, effectColor: '#44ff44' }),
    ],
};

ROSTER.xiaoyu = {
    id: 'xiaoyu',
    name: 'LING XIAOYU',
    style: 'Chinese Kenpo',
    blurb: 'Tornado goddess. Hypnotist stance, wall splats, and juggle loops.',
    health: 920,
    speed: 1.1,
    weight: 0.88,
    jumpPower: 1.04,
    height: 170,
    colors: { primary: '#c8327a', secondary: '#7a1a3d', accent: '#ffd700', skin: '#f0d0b0', hair: '#1a1a1a', aura: '#ff44aa' },
    palette: { skin: '#f0d0b0', hair: '#1a1a1a', primary: '#c8327a', secondary: '#7a1a3d', accent: '#ffd700' },
    stats: { power: 3, speed: 5, range: 3, defense: 2, heat: 5 },
    moves: [
        N('Standing LP', '1', { damage: 6, startup: 8, active: 3, recovery: 11, onHit: 5, onBlock: 0, range: 58, hitY: 108, chainCancel: '1' }),
        N4('Standing HP', '2', { damage: 13, startup: 12, active: 4, recovery: 19, onHit: 8, onBlock: -5, range: 70, hitY: 98 }),
        N2('Crouching LP', 'd1', { damage: 5, startup: 7, active: 3, recovery: 10, onHit: 4, onBlock: 0, requiresCrouch: true, range: 56, hitY: 28, chainCancel: 'd1' }),
        N3('Crouching HP', 'd2', { damage: 12, startup: 11, active: 4, recovery: 18, onHit: 7, onBlock: -5, requiresCrouch: true, range: 68, hitY: 26 }),
        N3('Crouching LK', 'd3', { damage: 7, startup: 12, active: 3, recovery: 15, onHit: 4, onBlock: -2, requiresCrouch: true, range: 64, hitY: 18 }),
        N('Jump LP', 'uj1', { damage: 9, startup: 5, active: 8, recovery: 11, onHit: 4, requiresAir: true, range: 58, hitY: 40, hitHeight: 50 }),
        N4('Jump HP', 'uj2', { damage: 15, startup: 7, active: 8, recovery: 15, onHit: 6, requiresAir: true, hitLevel: HitLevel.MID, range: 68, hitY: 40, hitHeight: 50 }),
        N2('Jump LK', 'uj3', { damage: 8, startup: 6, active: 6, recovery: 9, onHit: 3, requiresAir: true, range: 56, hitY: 20, hitHeight: 40 }),
        CMN('Chain Whip', 'f+LP', { damage: 16, startup: 12, active: 4, recovery: 18, onHit: 6, onBlock: -3, range: 74, hitY: 96, chainCancel: 'f+LP' }),
        CMN('Phoenix Flight (Tornado)', 'f+HP', { damage: 24, startup: 16, active: 5, recovery: 24, onHit: 10, onBlock: -6, range: 82, hitY: 70, launches: true, tornado: true }),
        HE('Aoi Hana (Whip Launcher)', 'f,f+1+2', { damage: 30, startup: 20, active: 5, recovery: 28, onHit: 14, onBlock: -8, range: 88, hitY: 80, launches: true, tornado: true, heatEngager: true, effectColor: '#ff44aa' }),
        HE('Sen Ryu (Wall Splat)', 'f,f+HK', { damage: 32, startup: 24, active: 5, recovery: 30, onHit: 16, onBlock: -9, range: 92, hitY: 64, wallCarry: true, wallSplat: true, heatEngager: true, effectColor: '#ff22aa' }),
        HE('Zen Thousand Flows', 'f+1+2', { damage: 22, startup: 16, active: 4, recovery: 24, onHit: 10, onBlock: -5, range: 80, hitY: 78, launches: true, heatEngager: true, effectColor: '#ff44aa' }),
        SEN('Hypnotist Stance', 'f+1+2', { damage: 0, startup: 0, active: 0, recovery: 15, onHit: 0, onBlock: 0, range: 0, hitY: 0, enterStance: Stance.HYP, noHitbox: true }),
        N('HYP 1 (Neck Twist)', 'HYP1', { damage: 14, startup: 12, active: 3, recovery: 18, onHit: 5, onBlock: -4, stanceOnly: true, requiresStance: Stance.HYP, range: 76, hitY: 104, chainCancel: 'HYP1' }),
        N3('HYP 2 (Low Kick)', 'HYP2', { damage: 18, startup: 15, active: 4, recovery: 22, onHit: 7, onBlock: -5, stanceOnly: true, requiresStance: Stance.HYP, hitLevel: HitLevel.LOW, range: 78, hitY: 24 }),
        N4('HYP 3 (Palm)', 'HYP3', { damage: 24, startup: 18, active: 4, recovery: 25, onHit: 9, onBlock: -7, stanceOnly: true, requiresStance: Stance.HYP, range: 82, hitY: 84 }),
        CS('Heaven Wrath', 'HYP d+1+2', { damage: 34, startup: 26, active: 6, recovery: 33, onHit: 16, onBlock: -12, stanceOnly: true, requiresStance: Stance.HYP, range: 90, hitY: 62, launches: true, heatEngager: true, effectColor: '#ff22aa' }),
        CS('Soul Tornado', 'HYP f+1+2', { damage: 30, startup: 22, active: 8, recovery: 30, onHit: 15, onBlock: -8, stanceOnly: true, requiresStance: Stance.HYP, range: 96, hitY: 58, launches: true, tornado: true, effectColor: '#ff44aa' }),
        HCF('Flower Bloom (Reversal)', '~1+2', { damage: 0, startup: 0, active: 0, recovery: 22, onHit: 0, onBlock: 0, range: 0, hitY: 0, reversal: true, noHitbox: true, invulnFrames: 7, hitLevel: HitLevel.MID, effectColor: '#44ddff' }),
        HCF('Flower Bloom Follow-up', '~1+2 1+2', { damage: 18, startup: 14, active: 4, recovery: 24, onHit: 8, onBlock: -5, range: 84, hitY: 78, launches: true }),
        WALL_THROW('Rising Fang (Wall Throw)', 'uf+LP+LK', { damage: 24, startup: 5, active: 3, recovery: 28, onHit: 18, onBlock: 0, hitY: 80, wallThrow: true, knockdown: true, techable: true, effectColor: '#ff44aa' }),
        WALL_SPLAT('Zen Thousand Flows (Splat)', 'ub+1+2', { damage: 20, startup: 18, active: 5, recovery: 30, onHit: 10, onBlock: -6, range: 70, hitY: 90, wallSplat: true, spiral: true, effectColor: '#ff44aa' }),
        RAGE('Ling Fury', 'df+1+2', { damage: 55, startup: 12, active: 10, recovery: 32, onHit: 22, onBlock: -24, range: 104, hitY: 76, launches: true, tornado: true, removesRecoverable: true, effectColor: '#ff00aa', damageScalesWithMissingHealth: true }),
        TH('Throw', 'f+LP+LK', { damage: 18, startup: 5, active: 3, recovery: 22, onHit: 14, onBlock: 0, range: 56, hitY: 78, knockdown: true, techable: true, throwBreak: 9 }),
        HS('Heat Smash (Ling Fei Fen)', 'Heat HP+HK', { damage: 38, startup: 16, active: 5, recovery: 28, onHit: 19, onBlock: 3, range: 94, hitY: 70, launches: true, requiresTwoBars: true, effectColor: '#ff44aa' }),
    ],
};

ROSTER.law = {
    id: 'law',
    name: 'MARSHALL LAW',
    style: 'Jeet Kune Do + Tiger Kung Fu',
    blurb: 'Dragon. Fast dragon rush that snowballs, and a teleport kick.',
    health: 950,
    speed: 1.05,
    weight: 0.95,
    jumpPower: 1.0,
    height: 180,
    colors: { primary: '#1a4a7a', secondary: '#0d283d', accent: '#ffd700', skin: '#e8c8a0', hair: '#2a1a0a', aura: '#44aaff' },
    palette: { skin: '#e8c8a0', hair: '#2a1a0a', primary: '#1a4a7a', secondary: '#0d283d', accent: '#ffd700' },
    stats: { power: 3, speed: 4, range: 4, defense: 3, heat: 3 },
    moves: [
        N('Standing LP', '1', { damage: 6, startup: 8, active: 3, recovery: 11, onHit: 5, onBlock: 0, range: 60, hitY: 110, chainCancel: '1' }),
        N4('Standing HP', '2', { damage: 14, startup: 12, active: 4, recovery: 19, onHit: 8, onBlock: -5, range: 72, hitY: 98 }),
        N2('Crouching LP', 'd1', { damage: 5, startup: 7, active: 3, recovery: 10, onHit: 4, onBlock: 0, requiresCrouch: true, range: 58, hitY: 28, chainCancel: 'd1' }),
        N3('Crouching HP', 'd2', { damage: 13, startup: 11, active: 4, recovery: 18, onHit: 7, onBlock: -5, requiresCrouch: true, range: 70, hitY: 26 }),
        N3('Crouching LK', 'd3', { damage: 7, startup: 12, active: 3, recovery: 15, onHit: 4, onBlock: -2, requiresCrouch: true, range: 66, hitY: 18 }),
        N('Jump LP', 'uj1', { damage: 9, startup: 5, active: 8, recovery: 11, onHit: 4, requiresAir: true, range: 58, hitY: 40, hitHeight: 50 }),
        N4('Jump HP', 'uj2', { damage: 16, startup: 7, active: 8, recovery: 15, onHit: 6, requiresAir: true, hitLevel: HitLevel.MID, range: 68, hitY: 40, hitHeight: 50 }),
        N2('Jump LK', 'uj3', { damage: 8, startup: 6, active: 6, recovery: 9, onHit: 3, requiresAir: true, range: 56, hitY: 20, hitHeight: 40 }),
        CMN('Dragon Rush (Chain)', 'f+LP', { damage: 15, startup: 11, active: 4, recovery: 17, onHit: 6, onBlock: -3, range: 76, hitY: 98, chainCancel: 'f+LP' }),
        CMN('Dragon Kick', 'f+HP', { damage: 22, startup: 15, active: 5, recovery: 23, onHit: 9, onBlock: -6, range: 84, hitY: 74, launches: true }),
        HE('Dragon Burst', 'f,f+HP', { damage: 30, startup: 21, active: 5, recovery: 28, onHit: 12, onBlock: -8, range: 88, hitY: 70, launches: true, heatEngager: true, effectColor: '#4488ff' }),
        HE('Dragon Tail', 'f,f+HK', { damage: 36, startup: 25, active: 6, recovery: 32, onHit: 14, onBlock: -10, range: 94, hitY: 62, launches: true, tornado: true, heatEngager: true, effectColor: '#2266ff' }),
        HE('Dragon Claw', 'f+1+2', { damage: 24, startup: 17, active: 5, recovery: 25, onHit: 10, onBlock: -6, range: 82, hitY: 76, launches: true, heatEngager: true, effectColor: '#4488ff' }),
        SEN('Dragon Stance', 'f+1+2', { damage: 0, startup: 0, active: 0, recovery: 13, onHit: 0, onBlock: 0, range: 0, hitY: 0, enterStance: Stance.DB, noHitbox: true }),
        N('DB 1 (Gatling)', 'DB1', { damage: 13, startup: 10, active: 3, recovery: 16, onHit: 5, onBlock: -3, stanceOnly: true, requiresStance: Stance.DB, range: 72, hitY: 100, chainCancel: 'DB1' }),
        N4('DB 2 (Spin Kick)', 'DB2', { damage: 20, startup: 14, active: 4, recovery: 21, onHit: 8, onBlock: -5, stanceOnly: true, requiresStance: Stance.DB, range: 80, hitY: 72 }),
        CS('Dragon Raid', 'DB 1+2', { damage: 28, startup: 22, active: 5, recovery: 29, onHit: 13, onBlock: -9, stanceOnly: true, requiresStance: Stance.DB, range: 90, hitY: 66, launches: true, heatEngager: true, effectColor: '#4488ff' }),
        HCF('Teleport Reversal', '~1+2', { damage: 0, startup: 0, active: 0, recovery: 21, onHit: 0, onBlock: 0, range: 0, hitY: 0, reversal: true, noHitbox: true, invulnFrames: 7, hitLevel: HitLevel.MID, effectColor: '#44ddff' }),
        HCF('Teleport Kick', '~1+2 1+2', { damage: 26, startup: 10, active: 5, recovery: 24, onHit: 16, onBlock: 2, range: 70, hitY: 76, hitLevel: HitLevel.MID, teleport: true, requiresHsdCharge: 1, effectColor: '#44ddff' }),
        HCF('Teleport Follow-up', '~1+2 1+2 1+2', { damage: 20, startup: 13, active: 4, recovery: 26, onHit: 8, onBlock: -5, range: 86, hitY: 78, launches: true }),
        WALL_THROW('Dragon Wall Throw', 'ub+LP+LK', { damage: 25, startup: 5, active: 3, recovery: 27, onHit: 18, onBlock: 0, hitY: 78, wallThrow: true, knockdown: true, techable: true, effectColor: '#4488ff' }),
        RAGE('Dragon Dance', 'df+1+2', { damage: 60, startup: 14, active: 12, recovery: 34, onHit: 24, onBlock: -26, range: 100, hitY: 78, launches: true, removesRecoverable: true, effectColor: '#0044ff', damageScalesWithMissingHealth: true }),
        TH('Throw', 'f+LP+LK', { damage: 20, startup: 5, active: 3, recovery: 24, onHit: 15, onBlock: 0, range: 58, hitY: 78, knockdown: true, techable: true, throwBreak: 9 }),
        HS('Heat Smash (Dragon Kick)', 'Heat HP+HK', { damage: 40, startup: 17, active: 5, recovery: 28, onHit: 19, onBlock: 3, range: 96, hitY: 68, launches: true, requiresTwoBars: true, effectColor: '#4488ff' }),
    ],
};

ROSTER.nina = {
    id: 'nina',
    name: 'NINA WILLIAMS',
    style: 'Assassination Arts',
    blurb: 'Assassin. Whiff-punishable, but hits like a truck when she connects.',
    health: 900,
    speed: 1.08,
    weight: 0.9,
    jumpPower: 1.05,
    height: 176,
    colors: { primary: '#7a1a5a', secondary: '#3d0a2d', accent: '#ff8800', skin: '#f0d0b0', hair: '#4a0a2a', aura: '#cc44ff' },
    palette: { skin: '#f0d0b0', hair: '#4a0a2a', primary: '#7a1a5a', secondary: '#3d0a2d', accent: '#ff8800' },
    stats: { power: 4, speed: 5, range: 3, defense: 2, heat: 3 },
    moves: [
        N('Standing LP', '1', { damage: 6, startup: 8, active: 3, recovery: 11, onHit: 4, onBlock: -1, range: 58, hitY: 108, chainCancel: '1' }),
        N4('Standing HP', '2', { damage: 13, startup: 12, active: 4, recovery: 19, onHit: 7, onBlock: -6, range: 70, hitY: 96 }),
        N2('Crouching LP', 'd1', { damage: 5, startup: 7, active: 3, recovery: 10, onHit: 3, onBlock: -1, requiresCrouch: true, range: 56, hitY: 28, chainCancel: 'd1' }),
        N3('Crouching HP', 'd2', { damage: 12, startup: 11, active: 4, recovery: 18, onHit: 6, onBlock: -6, requiresCrouch: true, range: 68, hitY: 26 }),
        N3('Crouching LK', 'd3', { damage: 7, startup: 12, active: 3, recovery: 15, onHit: 4, onBlock: -3, requiresCrouch: true, range: 64, hitY: 18 }),
        N('Jump LP', 'uj1', { damage: 9, startup: 5, active: 8, recovery: 11, onHit: 3, requiresAir: true, range: 58, hitY: 40, hitHeight: 50 }),
        N4('Jump HP', 'uj2', { damage: 15, startup: 7, active: 8, recovery: 15, onHit: 5, requiresAir: true, hitLevel: HitLevel.MID, range: 68, hitY: 40, hitHeight: 50 }),
        N2('Jump LK', 'uj3', { damage: 8, startup: 6, active: 6, recovery: 9, onHit: 3, requiresAir: true, range: 56, hitY: 20, hitHeight: 40 }),
        CMN('Assassin Kick', 'f+LP', { damage: 15, startup: 12, active: 4, recovery: 18, onHit: 5, onBlock: -4, range: 74, hitY: 94, chainCancel: 'f+LP' }),
        CMN('Blade Assault', 'f+HP', { damage: 23, startup: 16, active: 5, recovery: 24, onHit: 9, onBlock: -8, range: 82, hitY: 72, launches: true }),
        HE('Blonde Bomb', 'f,f+HP', { damage: 32, startup: 22, active: 5, recovery: 30, onHit: 13, onBlock: -11, range: 88, hitY: 68, launches: true, heatEngager: true, effectColor: '#cc44ff' }),
        HE('Demonic Blade', 'f,f+HK', { damage: 38, startup: 26, active: 6, recovery: 34, onHit: 15, onBlock: -12, range: 94, hitY: 60, launches: true, heatEngager: true, effectColor: '#aa22ff' }),
        HE('Assassin Rush', 'f+1+2', { damage: 24, startup: 18, active: 5, recovery: 26, onHit: 10, onBlock: -6, range: 82, hitY: 74, launches: true, heatEngager: true, effectColor: '#cc44ff' }),
        SEN('Assassin Stance', 'f+1+2', { damage: 0, startup: 0, active: 0, recovery: 12, onHit: 0, onBlock: 0, range: 0, hitY: 0, enterStance: Stance.RWF, noHitbox: true }),
        N('RWF 1 (Slash)', 'RWF1', { damage: 14, startup: 12, active: 3, recovery: 18, onHit: 5, onBlock: -4, stanceOnly: true, requiresStance: Stance.RWF, range: 76, hitY: 96, chainCancel: 'RWF1' }),
        N3('RWF 2 (Leg Cut)', 'RWF2', { damage: 18, startup: 15, active: 4, recovery: 22, onHit: 6, onBlock: -6, stanceOnly: true, requiresStance: Stance.RWF, hitLevel: HitLevel.LOW, range: 78, hitY: 24 }),
        N4('RWF 3 (Stab)', 'RWF3', { damage: 25, startup: 19, active: 4, recovery: 26, onHit: 10, onBlock: -9, stanceOnly: true, requiresStance: Stance.RWF, range: 84, hitY: 80 }),
        CS('Assassin Edge', 'RWF 1+2', { damage: 34, startup: 27, active: 6, recovery: 34, onHit: 16, onBlock: -13, stanceOnly: true, requiresStance: Stance.RWF, range: 92, hitY: 64, launches: true, heatEngager: true, effectColor: '#cc44ff' }),
        HCF('Vanishing Step (Reversal)', '~1+2', { damage: 0, startup: 0, active: 0, recovery: 20, onHit: 0, onBlock: 0, range: 0, hitY: 0, reversal: true, noHitbox: true, invulnFrames: 6, hitLevel: HitLevel.MID, effectColor: '#cc44ff' }),
        HCF('Vanishing Step Follow-up', '~1+2 1+2', { damage: 19, startup: 15, active: 4, recovery: 25, onHit: 8, onBlock: -6, range: 86, hitY: 76, launches: true }),
        WALL_THROW('Blade Wall Throw', 'ub+LP+LK', { damage: 24, startup: 5, active: 3, recovery: 26, onHit: 17, onBlock: 0, hitY: 78, wallThrow: true, knockdown: true, techable: true, effectColor: '#cc44ff' }),
        BALCONY('Assassin Balcony Drop', 'ubf+1+2', { damage: 28, startup: 22, active: 6, recovery: 33, onHit: 16, onBlock: -10, range: 76, hitY: 94, balconyBreak: true, effectColor: '#8800ff' }),
        RAGE('Assassin Strike', 'df+1+2', { damage: 52, startup: 12, active: 10, recovery: 30, onHit: 21, onBlock: -28, range: 102, hitY: 74, launches: true, removesRecoverable: true, effectColor: '#8800ff', damageScalesWithMissingHealth: true }),
        TH('Throw', 'f+LP+LK', { damage: 19, startup: 5, active: 3, recovery: 23, onHit: 14, onBlock: 0, range: 56, hitY: 78, knockdown: true, techable: true, throwBreak: 9 }),
        HS('Heat Smash (Blonde Bomb)', 'Heat HP+HK', { damage: 36, startup: 16, active: 5, recovery: 27, onHit: 18, onBlock: 4, range: 94, hitY: 66, launches: true, requiresTwoBars: true, effectColor: '#cc44ff' }),
    ],
};

ROSTER.bryan = {
    id: 'bryan',
    name: 'BRYAN FURY',
    style: 'Kickboxing',
    blurb: 'Rage machine. Fights angry, hits angry, walks through your guard.',
    health: 1080,
    speed: 0.9,
    weight: 1.12,
    jumpPower: 0.95,
    height: 185,
    colors: { primary: '#8b0000', secondary: '#4a0000', accent: '#ff4400', skin: '#c8a080', hair: '#1a1a1a', aura: '#ff2200' },
    palette: { skin: '#c8a080', hair: '#1a1a1a', primary: '#8b0000', secondary: '#4a0000', accent: '#ff4400' },
    stats: { power: 5, speed: 3, range: 4, defense: 2, heat: 3 },
    moves: [
        N('Standing LP', '1', { damage: 7, startup: 9, active: 3, recovery: 12, onHit: 5, onBlock: -1, range: 62, hitY: 112, chainCancel: '1' }),
        N4('Standing HP', '2', { damage: 15, startup: 13, active: 4, recovery: 20, onHit: 8, onBlock: -6, range: 74, hitY: 100 }),
        N2('Crouching LP', 'd1', { damage: 6, startup: 8, active: 3, recovery: 11, onHit: 4, onBlock: -1, requiresCrouch: true, range: 60, hitY: 30, chainCancel: 'd1' }),
        N3('Crouching HP', 'd2', { damage: 14, startup: 12, active: 4, recovery: 19, onHit: 7, onBlock: -6, requiresCrouch: true, range: 72, hitY: 28 }),
        N3('Crouching LK', 'd3', { damage: 8, startup: 13, active: 3, recovery: 16, onHit: 4, onBlock: -3, requiresCrouch: true, range: 68, hitY: 20 }),
        N('Jump LP', 'uj1', { damage: 10, startup: 6, active: 8, recovery: 12, onHit: 4, requiresAir: true, range: 60, hitY: 40, hitHeight: 50 }),
        N4('Jump HP', 'uj2', { damage: 17, startup: 8, active: 8, recovery: 16, onHit: 6, requiresAir: true, hitLevel: HitLevel.MID, range: 70, hitY: 40, hitHeight: 50 }),
        N2('Jump LK', 'uj3', { damage: 9, startup: 7, active: 6, recovery: 10, onHit: 3, requiresAir: true, range: 58, hitY: 20, hitHeight: 40 }),
        N4('Bite Back', 'f+HP', { damage: 26, startup: 16, active: 5, recovery: 25, onHit: 11, onBlock: -7, range: 78, hitY: 86, launches: true }),
        HE('Rage Cutter', 'f,f+HP', { damage: 34, startup: 22, active: 5, recovery: 30, onHit: 13, onBlock: -9, range: 88, hitY: 70, launches: true, heatEngager: true, effectColor: '#ff4400' }),
        HE('Fury Drive', 'f,f+HK', { damage: 40, startup: 26, active: 6, recovery: 33, onHit: 15, onBlock: -11, range: 94, hitY: 62, launches: true, heatEngager: true, effectColor: '#ff2200' }),
        HE('Rage Smash', 'f+1+2', { damage: 26, startup: 18, active: 5, recovery: 27, onHit: 11, onBlock: -6, range: 84, hitY: 76, launches: true, heatEngager: true, effectColor: '#ff4400' }),
        N4('Hot Head (Overhead)', 'ubf+HP', { damage: 28, startup: 22, active: 5, recovery: 28, onHit: 10, onBlock: -8, hitLevel: HitLevel.OVERHEAD, range: 76, hitY: 120, knockdown: true }),
        HCF('Rage Reversal', '~1+2', { damage: 0, startup: 0, active: 0, recovery: 26, onHit: 0, onBlock: 0, range: 0, hitY: 0, reversal: true, noHitbox: true, invulnFrames: 8, hitLevel: HitLevel.MID, effectColor: '#ff4400' }),
        HCF('Rage Reversal Follow-up', '~1+2 1+2', { damage: 24, startup: 17, active: 5, recovery: 27, onHit: 11, onBlock: -7, range: 88, hitY: 76, launches: true }),
        WALL_THROW('Rage Wall Throw', 'ub+LP+LK', { damage: 26, startup: 5, active: 3, recovery: 28, onHit: 18, onBlock: 0, hitY: 80, wallThrow: true, knockdown: true, techable: true, effectColor: '#ff4400' }),
        WALL_SPLAT('Fury Wall Smash', 'ubf+1+2', { damage: 22, startup: 18, active: 5, recovery: 29, onHit: 12, onBlock: -7, range: 72, hitY: 92, wallSplat: true, effectColor: '#ff4400' }),
        RAGE('Fury Unleashed', 'df+1+2', { damage: 78, startup: 18, active: 15, recovery: 38, onHit: 29, onBlock: -24, range: 96, hitY: 80, launches: true, removesRecoverable: true, effectColor: '#ff1100', damageScalesWithMissingHealth: true }),
        TH('Throw', 'f+LP+LK', { damage: 25, startup: 5, active: 3, recovery: 26, onHit: 17, onBlock: 0, range: 60, hitY: 80, knockdown: true, techable: true, throwBreak: 9 }),
        HS('Heat Smash (Rage Cutter)', 'Heat HP+HK', { damage: 48, startup: 19, active: 6, recovery: 31, onHit: 23, onBlock: 2, range: 96, hitY: 68, launches: true, requiresTwoBars: true, effectColor: '#ff4400' }),
    ],
};

ROSTER.yoshimitsu = {
    id: 'yoshimitsu',
    name: 'YOSHIMITSU',
    style: 'Manji Ninjutsu',
    blurb: 'Robot ninja. Spinning blade strings and lightning cradle of death.',
    health: 980,
    speed: 1.06,
    weight: 0.92,
    jumpPower: 1.02,
    height: 182,
    colors: { primary: '#1a6a4a', secondary: '#0d3826', accent: '#44ff88', skin: '#d0d0d8', hair: '#e8e8f0', aura: '#44ff88' },
    palette: { skin: '#d0d0d8', hair: '#e8e8f0', primary: '#1a6a4a', secondary: '#0d3826', accent: '#44ff88' },
    stats: { power: 4, speed: 4, range: 4, defense: 3, heat: 3 },
    moves: [
        N('Standing LP', '1', { damage: 6, startup: 8, active: 3, recovery: 11, onHit: 5, onBlock: 0, range: 60, hitY: 110, chainCancel: '1' }),
        N4('Standing HP', '2', { damage: 14, startup: 12, active: 4, recovery: 19, onHit: 8, onBlock: -5, range: 72, hitY: 98 }),
        N2('Crouching LP', 'd1', { damage: 5, startup: 7, active: 3, recovery: 10, onHit: 4, onBlock: 0, requiresCrouch: true, range: 58, hitY: 28, chainCancel: 'd1' }),
        N3('Crouching HP', 'd2', { damage: 13, startup: 11, active: 4, recovery: 18, onHit: 7, onBlock: -5, requiresCrouch: true, range: 70, hitY: 26 }),
        N3('Crouching LK', 'd3', { damage: 7, startup: 12, active: 3, recovery: 15, onHit: 4, onBlock: -2, requiresCrouch: true, range: 66, hitY: 18 }),
        N('Jump LP', 'uj1', { damage: 9, startup: 5, active: 8, recovery: 11, onHit: 4, requiresAir: true, range: 58, hitY: 40, hitHeight: 50 }),
        N4('Jump HP', 'uj2', { damage: 16, startup: 7, active: 8, recovery: 15, onHit: 6, requiresAir: true, hitLevel: HitLevel.MID, range: 68, hitY: 40, hitHeight: 50 }),
        N2('Jump LK', 'uj3', { damage: 8, startup: 6, active: 6, recovery: 9, onHit: 3, requiresAir: true, range: 56, hitY: 20, hitHeight: 40 }),
        CMN('Yoshimura Blade', 'f+LP', { damage: 16, startup: 12, active: 4, recovery: 18, onHit: 6, onBlock: -3, range: 76, hitY: 96, chainCancel: 'f+LP' }),
        CMN('Spinning Slash', 'f+HP', { damage: 24, startup: 16, active: 5, recovery: 24, onHit: 9, onBlock: -6, range: 84, hitY: 72, launches: true }),
        HE('Unblockable Slash (Kaiten)', 'f,f+1+2', { damage: 30, startup: 20, active: 6, recovery: 28, onHit: 14, onBlock: 0, hitLevel: HitLevel.UNBLOCKABLE, range: 86, hitY: 78, launches: true, heatEngager: true, effectColor: '#44ff88' }),
        HE('Falling Talon', 'f,f+HK', { damage: 34, startup: 24, active: 6, recovery: 31, onHit: 14, onBlock: -10, range: 92, hitY: 60, launches: true, heatEngager: true, effectColor: '#22dd66' }),
        HE('Ninjutsu Slice', 'f+1+2', { damage: 24, startup: 17, active: 5, recovery: 25, onHit: 10, onBlock: -5, range: 80, hitY: 78, launches: true, heatEngager: true, effectColor: '#44ff88' }),
        SEN('Ninjutsu Stance', 'f+1+2', { damage: 0, startup: 0, active: 0, recovery: 13, onHit: 0, onBlock: 0, range: 0, hitY: 0, enterStance: Stance.RWF, noHitbox: true }),
        N('NSF 1 (Slash)', 'NSF1', { damage: 15, startup: 12, active: 3, recovery: 18, onHit: 5, onBlock: -4, stanceOnly: true, requiresStance: Stance.RWF, range: 76, hitY: 96, chainCancel: 'NSF1' }),
        N3('NSF 2 (Low Cut)', 'NSF2', { damage: 19, startup: 15, active: 4, recovery: 22, onHit: 7, onBlock: -5, stanceOnly: true, requiresStance: Stance.RWF, hitLevel: HitLevel.LOW, range: 78, hitY: 24 }),
        N4('NSF 3 (Uppercut)', 'NSF3', { damage: 26, startup: 19, active: 5, recovery: 26, onHit: 10, onBlock: -8, stanceOnly: true, requiresStance: Stance.RWF, range: 84, hitY: 90, launches: true }),
        CS('Cradle of Death', 'NSF 1+2', { damage: 36, startup: 27, active: 6, recovery: 34, onHit: 16, onBlock: -13, stanceOnly: true, requiresStance: Stance.RWF, range: 92, hitY: 64, launches: true, tornado: true, heatEngager: true, effectColor: '#44ff88' }),
        HCF('Ninjutsu Reversal', '~1+2', { damage: 0, startup: 0, active: 0, recovery: 21, onHit: 0, onBlock: 0, range: 0, hitY: 0, reversal: true, noHitbox: true, invulnFrames: 7, hitLevel: HitLevel.MID, effectColor: '#44ddff' }),
        HCF('Ninjutsu Follow-up', '~1+2 1+2', { damage: 19, startup: 14, active: 4, recovery: 24, onHit: 8, onBlock: -5, range: 86, hitY: 78, launches: true }),
        WALL_THROW('Ninja Wall Throw', 'ub+LP+LK', { damage: 24, startup: 5, active: 3, recovery: 26, onHit: 18, onBlock: 0, hitY: 78, wallThrow: true, knockdown: true, techable: true, effectColor: '#44ff88' }),
        SPIRAL('Spiral Arrow (Wall)', 'ubf+1+2', { damage: 22, startup: 5, active: 3, recovery: 27, onHit: 16, onBlock: 0, hitY: 80, spiral: true, knockdown: true, techable: true, effectColor: '#44ff88' }),
        RAGE('Falling Lightning Blade', 'df+1+2', { damage: 58, startup: 15, active: 14, recovery: 34, onHit: 23, onBlock: -22, range: 98, hitY: 80, launches: true, removesRecoverable: true, effectColor: '#00ff88', damageScalesWithMissingHealth: true }),
        TH('Throw', 'f+LP+LK', { damage: 20, startup: 5, active: 3, recovery: 24, onHit: 15, onBlock: 0, range: 58, hitY: 78, knockdown: true, techable: true, throwBreak: 9 }),
        HS('Heat Smash (Cradle)', 'Heat HP+HK', { damage: 40, startup: 17, active: 5, recovery: 28, onHit: 20, onBlock: 3, range: 94, hitY: 68, launches: true, requiresTwoBars: true, effectColor: '#44ff88' }),
    ],
};

export const CHARACTERS = Object.values(ROSTER);

export function getCharacter(id) {
    return ROSTER[id] || CHARACTERS[0];
}
