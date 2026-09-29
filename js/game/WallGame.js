export const WALL_LIMIT = 500;

export const WALL = {
    LIMIT: WALL_LIMIT,
    SOFT_LIMIT: 460,
    CARRY_ZONE: 380,
    BOUNCE_VX: 7.5,
    BOUNCE_VZ: 6.2,
    SPLAT_FRAMES: 30,
    BOUNCE_FRAMES: 22,
    CARRY_DAMPING: 0.94,
    CARRY_MAX_VX: 3.2,
    TORNADO_FRAMES: 46,
    TORNADO_BOUND: 6,
    SPIRAL_FRAMES: 40,
    BALCONY_BREAK_FRAMES: 90,
    BALCONY_KNOCKDOWN_FRAMES: 46,
    WALL_THROW_WINDOW: 14,
    JUGGLE_CAP_WALL: 4,
};

export function wallDistance(fighter) {
    return Math.abs(WALL.LIMIT - Math.abs(fighter.x));
}

export function isAgainstWall(fighter, range = 0) {
    return Math.abs(fighter.x) >= WALL.LIMIT - range;
}

export function isInWallCarryZone(fighter) {
    return Math.abs(fighter.x) >= WALL.CARRY_ZONE;
}

export function wallSideOf(fighter) {
    return fighter.x > 0 ? 'right' : 'left';
}

export function canWallCarry(victim) {
    if (victim.isRingOut) return false;
    if (victim.state === 'wallSplat' || victim.state === 'wallBounce') return false;
    if (victim.state === 'knockdown') return false;
    return isInWallCarryZone(victim);
}

export function applyWallCarry(victim, attacker) {
    victim.wallCarry = true;
    victim.wallCarrySide = wallSideOf(victim);
    victim.vx = 0;
    victim.tornadoFrames = WALL.TORNADO_FRAMES;
    victim.animState = 'juggle';
}

export function applyWallSplat(victim, attacker, move) {
    victim.setState('wallSplat', WALL.SPLAT_FRAMES);
    victim.animState = 'wallSplat';
    victim.vx = 0;
    victim.vz = 0;
    victim.wallSide = wallSideOf(victim);
    victim.wallSplattedBy = attacker;
    victim.floorBounces = 0;
    victim.juggleCount = 0;
    victim.tornadoFrames = 0;
    victim.armorFrames = 0;
    return { splatted: true, wallSide: victim.wallSide };
}

export function applyWallBounce(victim) {
    victim.setState('wallBounce', WALL.BOUNCE_FRAMES);
    victim.animState = 'wallBounce';
    victim.wallSide = wallSideOf(victim);
    victim.vx = -Math.sign(victim.x || 1) * WALL.BOUNCE_VX;
    victim.vz = WALL.BOUNCE_VZ;
    victim.grounded = false;
    victim.floorBounces = 1;
    victim.juggleCount = 0;
    victim.invulnFrames = Math.max(victim.invulnFrames, 6);
    return { bounced: true };
}

export function applyBalconyBreak(victim, attacker) {
    victim.setState('balconyBreak', WALL.BALCONY_BREAK_FRAMES);
    victim.animState = 'wallSplat';
    victim.vx = 0;
    victim.vz = 0;
    victim.juggleCount = 0;
    victim.tornadoFrames = 0;
    victim.balconyBrokenBy = attacker;
    victim.health = Math.max(0, victim.health - 10);
    victim.recoverableHealth = 0;
    victim.isBouncedOut = true;
    return { balcony: true, pendingRingOut: true };
}

export function applySpiral(victim, attacker) {
    victim.spiralFrames = WALL.SPIRAL_FRAMES;
    victim.wallCarry = true;
    victim.wallCarrySide = wallSideOf(victim);
    victim.vx = 0;
    return { spiral: true };
}

export function updateWallGame(fighter, opponent) {
    const result = {};

    if (fighter.tornadoFrames > 0) {
        const hold = fighter.tornadoFrames;
        fighter.tornadoFrames--;
        if (fighter.z > 0) {
            fighter.vz = 0;
            fighter.vz = 0;
        }
        fighter.vx = 0;
        if (hold === 1) {
            fighter.wallCarry = false;
        }
    }

    if (fighter.spiralFrames > 0) {
        fighter.spiralFrames--;
        fighter.vx = 0;
        if (fighter.spiralFrames === 0) {
            fighter.wallCarry = false;
            fighter.spiralFrames = 0;
        }
    }

    if (fighter.wallCarry && !isInWallCarryZone(fighter)) {
        fighter.wallCarry = false;
        fighter.tornadoFrames = 0;
    }

    if (fighter.isBouncedOut && fighter.x * -1 > WALL.LIMIT) {
        fighter.setState('ringOut', 60);
        fighter.isRingOut = true;
        result.ringOut = true;
    }

    return result;
}

export function clampToStage(fighter) {
    if (fighter.x > WALL.LIMIT) {
        fighter.x = WALL.LIMIT;
        return 'right';
    }
    if (fighter.x < -WALL.LIMIT) {
        fighter.x = -WALL.LIMIT;
        return 'left';
    }
    return null;
}

export function canWallThrow(victim, attacker) {
    if (victim.isRingOut) return false;
    if (victim.state === 'wallSplat' || victim.state === 'wallBounce') return true;
    if (victim.state === 'knockdown' || victim.state === 'hitstun') {
        return isAgainstWall(victim, 0);
    }
    return false;
}
