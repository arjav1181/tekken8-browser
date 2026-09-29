import { MoveCategory, Move } from './Move.js';
import { isAgainstWall } from './WallGame.js';

const BUTTON_SETS = {
    LP: { leftPunch: true },
    HP: { rightPunch: true },
    LK: { leftPunch: true, kick: true },
    HK: { rightPunch: true, kick: true },
    LPHP: { leftPunch: true, rightPunch: true },
    LPK: { leftPunch: true, kick: true },
    HPK: { rightPunch: true, kick: true },
    LPHK: { leftPunch: true, rightPunch: true, kick: true },
    'LP+HK': { leftPunch: true, rightPunch: true, kick: true },
    B: { block: true },
};

function matchButtons(parser, buttons) {
    const set = BUTTON_SETS[buttons];
    if (!set) return false;
    for (const key of Object.keys(set)) {
        if (!parser.isPressed(key)) return false;
    }
    return true;
}

export class MoveSet {
    constructor(fighter) {
        this.fighter = fighter;
        this.defs = fighter.config.moves;
        this.moves = this.defs.map(d => (d instanceof Move ? d : new Move(d)));
        this.numpadMoves = this.buildNumpadIndex();
    }

    byName(name) {
        return this.moves.find(m => m.name === name) || null;
    }

    buildNumpadIndex() {
        const map = new Map();
        for (const mv of this.moves) {
            if (!mv.notation) continue;
            const numpad = parseNotation(mv.notation);
            if (numpad.length === 0) continue;
            if (!map.has(mv.notation)) map.set(mv.notation, []);
            map.get(mv.notation).push(mv);
        }
        return map;
    }

    canUse(move) {
        const f = this.fighter;
        if (move.requiresWall && !isAgainstWall(f, 60)) return false;
        if (move.noHitbox) {
            if (move.enterStance) return f.stance !== move.enterStance;
            return true;
        }
        if (move.stanceOnly && f.stance !== move.requiresStance) return false;
        if (move.requiresCrouch && !f.isCrouching) return false;
        if (move.requiresStand && f.isCrouching) return false;
        if (move.requiresAir && f.grounded) return false;
        if (move.requiresRage && !f.rageActive) return false;
        if (move.requiresHeat && !f.heatActive) return false;
        if (move.requiresTwoBars && f.heatEnergy < 2) return false;
        if (move.requiresStance && f.stance !== move.requiresStance) return false;
        if (move.requiresHsdCharge && f.hsdCharge < move.requiresHsdCharge) return false;
        if (move.chargeable && f.chargeLevel < 0.9 && !move.noHitbox) return false;
        if (move.heatEngager && f.heatActive) return false;
        if (move.category === MoveCategory.RAGE_ART && f.rageUsed) return false;
        return true;
    }

    find(parser) {
        const f = this.fighter;
        const candidates = [];

        for (const move of this.moves) {
            if (!this.canUse(move)) continue;
            if (!this.matches(move, parser)) continue;
            candidates.push(move);
        }

        if (candidates.length === 0) return null;
        const rank = (m) => (m.motion ? 10 : 0) + (m.priority || 0);
        return candidates.reduce((best, m) => (rank(m) > rank(best) ? m : best));
    }

    matches(move, parser) {
        if (move.enterStance) {
            if (!matchButtons(parser, move.buttons)) return false;
            if (move.motion && !parser.hasMotion(move.motion)) return false;
            return true;
        }

        if (move.category === MoveCategory.RAGE_ART) {
            if (!matchButtons(parser, 'LPHP')) return false;
            return parser.hasSequence([2, 3, 1, 2], 18) || parser.hasSequence([2, 3, 3], 14);
        }

        if (move.reversal) {
            if (!matchButtons(parser, 'LPHP')) return false;
            return parser.hasMotion([4, 1, 2, 3, 6]) || parser.hasMotion([6, 3, 2, 1, 4]);
        }

        if (!matchButtons(parser, move.buttons)) return false;

        if (move.motion) {
            const repeated = move.motion.length >= 2 &&
                move.motion[0] === move.motion[1] &&
                (move.motion[0] === 3 || move.motion[0] === 4);
            if (repeated) return parser.hasSequence(move.motion, 12);
            return parser.hasMotion(move.motion);
        }

        return true;
    }
}

export function parseNotation(notation) {
    const base = notation.split(' ')[0];
    const result = [];
    let i = 0;
    while (i < base.length) {
        if (base[i] === 'f') { result.push(3); i++; continue; }
        if (base[i] === 'b') { result.push(4); i++; continue; }
        if (base[i] === 'u') { result.push(6); i++; continue; }
        if (base[i] === 'd') { result.push(2); i++; continue; }
        if (base[i] === 'q') { result.push(1); i++; continue; }
        i++;
    }
    return result;
}

export function getMotionForNotation(notation) {
    const base = notation.split(' ')[0];
    if (base.includes('f,f')) return [3, 3];
    if (base.includes('~')) return [4, 1, 2, 3, 6];
    if (base === 'df') return [2, 3];
    if (base === 'db') return [2, 1];
    return null;
}
