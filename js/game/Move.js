export const HitLevel = {
    HIGH: 'high',
    MID: 'mid',
    LOW: 'low',
    OVERHEAD: 'overhead',
    UNBLOCKABLE: 'unblockable',
    THROW: 'throw',
    THROW_LOW: 'throw_low',
    THROW_HIGH: 'throw_high',
    PROJECTILE: 'projectile',
    ARMOR: 'armor',
};

export const MoveCategory = {
    NORMAL: 'normal',
    COMMAND_NORMAL: 'cmd',
    COMMAND_SPECIAL: 'cmd_special',
    SPECIAL: 'special',
    THROW: 'throw',
    RAGE_ART: 'rage_art',
    HEAT_SMASH: 'heat_smash',
    HEAT_ENGAGER: 'heat_engager',
    PROJECTILE: 'projectile',
    WAKEUP: 'wakeup',
    DOWNTECHNIQUE: 'down_tech',
    WALL: 'wall',
    TAUNT: 'taunt',
};

export const Stance = {
    NONE: null,
    HSD: 'hsd',
    BOK: 'bok',
    DB: 'db',
    DES: 'des',
    HYP: 'hyp',
    RWF: 'rwf',
    PHAL: 'phal',
    PBS: 'pbs',
};

let moveIdCounter = 0;

export class Move {
    constructor(def) {
        this.id = moveIdCounter++;
        this.name = def.name || 'Move';
        this.notation = def.notation || '';
        this.input = def.input || null;
        this.motion = def.motion || null;
        this.priority = def.priority || 0;
        this.buttons = def.buttons || null;
        this.category = def.category || MoveCategory.NORMAL;
        this.hitLevel = def.hitLevel || HitLevel.MID;
        this.damage = def.damage || 0;
        this.chipDamage = def.chipDamage != null ? def.chipDamage : (def.damage || 0) * 0.1;
        this.startup = def.startup || 10;
        this.active = def.active || 3;
        this.recovery = def.recovery != null ? def.recovery : 20;
        this.onBlock = def.onBlock != null ? def.onBlock : -5;
        this.onHit = def.onHit != null ? def.onHit : 0;
        this.onCounterHit = def.onCounterHit != null ? def.onCounterHit : (this.onHit + 5);
        this.guardDamage = def.guardDamage != null ? def.guardDamage : Math.ceil((def.damage || 0) * 0.6);
        this.pushback = def.pushback || 4;
        this.pushbackBlock = def.pushbackBlock != null ? def.pushbackBlock : (def.pushback || 4) * 1.4;
        this.launches = !!def.launches;
        this.airborne = !!def.airborne;
        this.knockdown = !!def.knockdown;
        this.downs = !!def.downs;
        this.wallCarry = def.wallCarry != null ? def.wallCarry : false;
        this.wallBounce = !!def.wallBounce;
        this.balconyBreak = !!def.balconyBreak;
        this.unblockable = def.hitLevel === HitLevel.UNBLOCKABLE;
        this.armor = def.armor || null;
        this.powerCrush = def.powerCrush || null;
        this.hitstop = def.hitstop != null ? def.hitstop : Math.max(6, Math.min(20, Math.round((def.damage || 0) * 0.15)));
        this.blockstunHits = def.blockstunHits || 0;
        this.tornado = !!def.tornado;
        this.spiral = !!def.spiral;
        this.scalingTier = def.scalingTier || null;
        this.range = def.range || 70;
        this.hitY = def.hitY != null ? def.hitY : 70;
        this.hitHeight = def.hitHeight != null ? def.hitHeight : 40;
        this.stance = def.stance || Stance.NONE;
        this.enterStance = def.enterStance || null;
        this.stanceMoves = def.stanceMoves || null;
        this.cancelInto = def.cancelInto || [];
        this.cancelOnHit = def.cancelOnHit !== false;
        this.cancelOnBlock = def.cancelOnBlock === true;
        this.chainCancel = def.chainCancel || null;
        this.chainTarget = def.chainTarget || null;
        this.requiresAir = !!def.requiresAir;
        this.requiresCrouch = !!def.requiresCrouch;
        this.requiresStand = !!def.requiresStand;
        this.requiresRage = def.requiresRage === true;
        this.requiresHeat = def.requiresHeat === true;
        this.requiresStance = def.requiresStance || null;
        this.requiresHsdCharge = def.requiresHsdCharge || 0;
        this.requiresTwoBars = def.requiresTwoBars === true;
        this.chargeable = !!def.chargeable;
        this.throwType = def.throwType || null;
        this.techable = def.techable !== false;
        this.throwBreak = def.throwBreak || null;
        this.stanceOnly = def.stanceOnly || false;
        this.lowCrushFrames = def.lowCrushFrames || 0;
        this.highCrushFrames = def.highCrushFrames || 0;
        this.juggleOnly = !!def.juggleOnly;
        this.followUp = def.followUp || null;
        this.followUpDelay = def.followUpDelay || 0;
        this.effectColor = def.effectColor || '#ffaa00';
        this.projSpeed = def.projSpeed || 8;
        this.projHeight = def.projHeight || 60;
        this.freezeTimer = def.freezeTimer || 0;
        this.superArmor = def.superArmor || 0;
        this.reversal = def.reversal === true;
        this.noHitbox = def.noHitbox === true;
        this.invulnFrames = def.invulnFrames || 0;
        this.projectile = def.projectile === true;
        this.teleport = def.teleport === true;
        this.multiHit = def.multiHit === true;
        this.breaksInvuln = def.breaksInvuln === true;
        this.heatEngager = def.heatEngager === true;
        this.heatBurst = def.heatBurst === true;
        this.removesRecoverable = def.removesRecoverable === true;
        this.damageScalesWithMissingHealth = def.damageScalesWithMissingHealth === true;
        this.bouncer = def.bouncer === true;
        this.wallSplat = def.wallSplat === true;
        this.launchOnWall = def.launchOnWall === true;
        this.cancelsIntoStance = def.cancelsIntoStance === true;
        this.juggleReady = def.juggleReady === true;
        this.wallThrow = def.wallThrow === true;
        this.requiresWall = def.wallThrow === true || def.wallSplat === true ||
                            def.balconyBreak === true || def.spiral === true;
    }

    get hasHitbox() {
        return !this.noHitbox && !this.projectile;
    }

    get total() {
        return this.startup + this.active + this.recovery;
    }

    get activeStart() {
        return this.startup;
    }

    get activeEnd() {
        return this.startup + this.active;
    }

    isActiveAt(frame) {
        return frame >= this.activeStart && frame < this.activeEnd;
    }

    isBlockable() {
        return !this.unblockable && this.hitLevel !== HitLevel.THROW &&
               this.hitLevel !== HitLevel.THROW_LOW && this.hitLevel !== HitLevel.THROW_HIGH;
    }

    isLow() {
        return this.hitLevel === HitLevel.LOW;
    }

    isOverhead() {
        return this.hitLevel === HitLevel.HIGH || this.hitLevel === HitLevel.OVERHEAD;
    }

    isMid() {
        return this.hitLevel === HitLevel.MID;
    }

    blockstunFrames() {
        return this.onBlock < 0 ? -this.onBlock : 1;
    }

    hitstunFrames() {
        return this.onHit > 0 ? this.onHit : 1;
    }

    get punishOnBlock() {
        return this.onBlock < 0 ? -this.onBlock : 0;
    }

    isSafeOnBlock() {
        return this.onBlock >= 0;
    }

    punishFramesOnBlock() {
        return this.onBlock < 0 ? -this.onBlock : 0;
    }
}

export function getActiveFramesRemaining(move, frame) {
    return Math.max(0, move.activeEnd - frame);
}

export function getRecoveryRemaining(move, frame) {
    return Math.max(0, move.total - frame);
}

export function isFullyPunishable(move, frame) {
    return getRecoveryRemaining(move, frame) > 0;
}

export function getPenalizedDamage(baseDamage, comboCount, scaling) {
    let dmg = baseDamage;
    if (comboCount <= 1) return dmg;
    if (comboCount === 2) return Math.floor(dmg * 0.9);
    if (comboCount === 3) return Math.floor(dmg * 0.8);
    if (comboCount === 4) return Math.floor(dmg * 0.7);
    if (comboCount === 5) return Math.floor(dmg * 0.6);
    if (comboCount === 6) return Math.floor(dmg * 0.5);
    if (comboCount === 7) return Math.floor(dmg * 0.4);
    if (comboCount === 8) return Math.floor(dmg * 0.3);
    if (comboCount === 9) return Math.floor(dmg * 0.2);
    return 0;
}

export function getChipDamage(move, comboCount) {
    if (move.chipDamage <= 0) return 0;
    return Math.max(0, Math.ceil(getPenalizedDamage(move.chipDamage, comboCount) * 10) / 10);
}
