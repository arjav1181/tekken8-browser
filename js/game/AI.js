import { State, T } from './Fighter.js';
import { HitLevel } from './Move.js';

export const Difficulty = {
    BEGINNER: 'beginner',
    CASUAL: 'casual',
    AMATEUR: 'amateur',
    PROFESSIONAL: 'professional',
    GODLIKE: 'godlike',
};

export const AIProfile = {
    [Difficulty.BEGINNER]: {
        reactionFrames: 26, blockChance: 0.25, punishChance: 0.10, pokeChance: 0.22,
        aggression: 0.25, comboSkill: 0.05, antiAir: 0.05, throwChance: 0.02,
        heatUsage: 0.05, rageUsage: 0.10, spacing: 110, whiffPunish: 0.0, movementSpeed: 0.6,
        reversals: 0.0, name: 'Beginner',
    },
    [Difficulty.CASUAL]: {
        reactionFrames: 18, blockChance: 0.40, punishChance: 0.20, pokeChance: 0.32,
        aggression: 0.38, comboSkill: 0.15, antiAir: 0.15, throwChance: 0.04,
        heatUsage: 0.15, rageUsage: 0.25, spacing: 140, whiffPunish: 0.05, movementSpeed: 0.75,
        reversals: 0.02, name: 'Casual',
    },
    [Difficulty.AMATEUR]: {
        reactionFrames: 12, blockChance: 0.55, punishChance: 0.35, pokeChance: 0.42,
        aggression: 0.50, comboSkill: 0.30, antiAir: 0.35, throwChance: 0.07,
        heatUsage: 0.30, rageUsage: 0.45, spacing: 165, whiffPunish: 0.20, movementSpeed: 0.85,
        reversals: 0.08, name: 'Amateur',
    },
    [Difficulty.PROFESSIONAL]: {
        reactionFrames: 8, blockChance: 0.70, punishChance: 0.55, pokeChance: 0.52,
        aggression: 0.62, comboSkill: 0.55, antiAir: 0.60, throwChance: 0.10,
        heatUsage: 0.50, rageUsage: 0.65, spacing: 190, whiffPunish: 0.45, movementSpeed: 0.95,
        reversals: 0.18, name: 'Professional',
    },
    [Difficulty.GODLIKE]: {
        reactionFrames: 4, blockChance: 0.85, punishChance: 0.78, pokeChance: 0.62,
        aggression: 0.75, comboSkill: 0.80, antiAir: 0.85, throwChance: 0.13,
        heatUsage: 0.70, rageUsage: 0.85, spacing: 215, whiffPunish: 0.70, movementSpeed: 1.0,
        reversals: 0.30, name: 'Godlike',
    },
};

export class AIController {
    constructor(difficulty = Difficulty.AMATEUR, character = null) {
        this.setDifficulty(difficulty, character);
        this.decisionFrame = 0;
        this.plan = null;
        this.planFrame = 0;
        this.comboStep = 0;
        this.comboMoves = [];
        this.reactionQueue = [];
        this.lastOppState = null;
        this.punishTarget = null;
        this.frustration = 0;
        this.lastDamageTaken = 0;
        this.history = [];
    }

    setDifficulty(difficulty, character) {
        this.difficulty = difficulty;
        this.profile = { ...AIProfile[difficulty] || AIProfile.AMATEUR };
        this.character = character;
    }

    reset() {
        this.decisionFrame = 0;
        this.plan = null;
        this.planFrame = 0;
        this.comboStep = 0;
        this.comboMoves = [];
        this.punishTarget = null;
        this.frustration = 0;
    }

    update(self, opponent) {
        if (!self || !opponent) return {};

        this.decisionFrame++;
        this.planFrame++;

        const p = this.profile;
        const rand = () => Math.random();

        if (self.health < this.lastDamageTaken) {
            this.frustration = Math.min(1, this.frustration + 0.1);
        }
        this.lastDamageTaken = self.health;

        const dist = Math.abs(self.x - opponent.x);
        const inRange = dist < 110 * self.scale;
        const justGotHit = self.hitStunFrames > 0;
        const opponentAttacking = opponent.isAttacking && opponent.currentMove;
        const opponentInRecovery = this.isOpponentRecovering(opponent);
        const opponentAirborne = !opponent.grounded;
        const opponentCrouching = opponent.isCrouching;

        if (self.hitStunFrames > 0 || self.state === State.KNOCKDOWN) return {};
        if (self.currentMove && !self.canCancelFromAI()) return {};

        if (opponentAttacking && this.shouldReact()) {
            return this.reactToAttack(self, opponent, dist);
        }

        if (opponentInRecovery && this.shouldPunish()) {
            return this.punishOpponent(self, opponent, dist);
        }

        if (opponentAirborne && this.shouldAntiAir() && inRange) {
            return this.antiAir(self);
        }

        if (self.comboStep > 0 && this.comboMoves.length > 0) {
            return this.continueCombo(self, opponent);
        }

        if (self.rageActive && !self.rageUsed && rand() < p.rageUsage && inRange) {
            return this.doRageArt(self);
        }

        if (self.heatActive && self.heatEnergy > 0 && rand() < p.heatUsage && inRange) {
            return this.useHeatMove(self);
        }

        if (dist > p.spacing * 1.4) {
            if (rand() < p.aggression) return this.approach(self, opponent);
            return this.circleOrWait(self, opponent, dist, rand);
        }

        if (dist > p.spacing) {
            if (rand() < 0.4) return this.poke(self, opponent, rand);
            if (rand() < 0.5) return this.approach(self, opponent);
            return this.circleOrWait(self, opponent, dist, rand);
        }

        if (inRange) {
            return this.closeRangeAction(self, opponent, rand, dist);
        }

        return this.circleOrWait(self, opponent, dist, rand);
    }

    isOpponentRecovering(opponent) {
        if (!opponent.currentMove) return false;
        const mv = opponent.currentMove;
        if (!mv) return false;
        if (opponent.state === State.ATTACK && opponent.moveFrame >= mv.total - mv.recovery) {
            return true;
        }
        return false;
    }

    shouldReact() {
        return Math.random() < (this.profile.reactionFrames / 60) * 0.6;
    }

    shouldPunish() {
        return Math.random() < this.profile.punishChance;
    }

    shouldAntiAir() {
        return Math.random() < this.profile.antiAir;
    }

    canCancelFromAI() {
        return this.currentMove && this.currentMove.cancelInto && this.currentMove.cancelInto.length > 0;
    }

    approach(self, opponent) {
        if (Math.random() < 0.3) {
            return { right: self.facing === 1, left: self.facing === -1 };
        }
        return { right: self.facing === 1, left: self.facing === -1 };
    }

    circleOrWait(self, opponent, dist, rand) {
        const r = rand();
        if (r < 0.3) {
            return { right: self.facing === 1, left: self.facing === -1, down: true };
        }
        if (r < 0.5) {
            return { left: self.facing === -1, right: self.facing === 1 };
        }
        return {};
    }

    poke(self, opponent, rand) {
        const move = this.pickPoke(self, rand);
        if (!move) return this.approach(self, opponent);
        return this.executeNotation(move);
    }

    pickPoke(self, rand) {
        const moves = (self.character?.moves || []).filter(m =>
            m.damage > 0 && m.range > 60 && !m.throws && m.hitLevel !== HitLevel.THROW &&
            (m.onBlock || 0) >= -8 && !m.requiresAir && !m.requiresCrouch && !m.launches &&
            !m.stanceOnly && !m.reversal && m.category === 'normal'
        );
        if (moves.length === 0) return null;
        return moves[Math.floor(rand() * moves.length)];
    }

    punishOpponent(self, opponent, dist) {
        this.punishTarget = opponent.currentMove?.name;
        const p = this.profile;

        if (Math.random() < p.throwChance && dist < 80) {
            return this.doThrow(self);
        }

        const punishMoves = (self.character?.moves || []).filter(m =>
            m.damage > 8 && m.startup <= 18 &&
            (m.range >= dist * self.scale - 30) &&
            !m.requiresAir && !m.reversal &&
            (m.hitLevel !== HitLevel.THROW)
        );

        if (punishMoves.length > 0) {
            punishMoves.sort((a, b) => b.damage - a.damage);
            const idx = Math.min(punishMoves.length - 1, Math.floor(Math.random() * 3));
            const move = punishMoves[idx];
            const result = this.executeNotation(move);
            if (Math.random() < p.comboSkill) {
                this.setupCombo(move);
            }
            return result;
        }

        return this.poke(self, opponent, Math.random);
    }

    antiAir(self) {
        const aaMoves = (self.character?.moves || []).filter(m =>
            m.launches && m.startup <= 10
        );
        if (aaMoves.length > 0) {
            return this.executeNotation(aaMoves[0]);
        }
        const uppers = (self.character?.moves || []).filter(m =>
            m.hitLevel === 'mid' && m.startup <= 9 && !m.requiresAir
        );
        if (uppers.length > 0) {
            return this.executeNotation(uppers[0]);
        }
        return { up: true, right: self.facing === 1 };
    }

    reactToAttack(self, opponent, dist) {
        const p = this.profile;
        if (Math.random() > p.blockChance) {
            if (Math.random() < p.whiffPunish) {
                return this.backdashAway(self);
            }
            return this.jumpAway(self);
        }

        const mv = opponent.currentMove;
        let crouch = false;
        if (mv) {
            if (mv.hitLevel === HitLevel.LOW) crouch = true;
            else if (mv.hitLevel === HitLevel.HIGH) crouch = false;
            else crouch = Math.random() < 0.5;
        }

        if (Math.random() < p.reversals && self.hpPercent < 0.4) {
            return this.doReversal(self);
        }

        return { block: true, down: crouch };
    }

    closeRangeAction(self, opponent, rand, dist) {
        const p = this.profile;
        const r = rand();

        if (r < p.throwChance) return this.doThrow(self);
        if (r < p.throwChance + p.aggroThrow(self)) return this.doThrow(self);

        if (r < 0.35) {
            if (Math.random() < 0.4) {
                const lowMove = this.pickLow(self);
                if (lowMove) return this.executeNotation(lowMove);
            }
            return this.poke(self, opponent, rand);
        }

        if (r < 0.55) {
            const launcher = this.pickLauncher(self);
            if (launcher) {
                const result = this.executeNotation(launcher);
                if (Math.random() < p.comboSkill) this.setupCombo(launcher);
                return result;
            }
            return this.poke(self, opponent, rand);
        }

        if (r < 0.75) {
            return this.backdashAway(self);
        }

        if (r < 0.88) {
            return { up: true, right: self.facing === 1 };
        }

        return this.approach(self, opponent);
    }

    aggroThrow(self) {
        if (self.opponent && (self.opponent.isBlocking || self.opponent.isCrouching)) {
            return 0.15;
        }
        return 0.05;
    }

    pickLow(self) {
        const lows = (self.character?.moves || []).filter(m =>
            m.hitLevel === HitLevel.LOW && m.damage > 0 && !m.requiresAir && !m.stanceOnly && !m.requiresCrouch
        );
        if (lows.length === 0) return null;
        return lows[Math.floor(Math.random() * lows.length)];
    }

    pickLauncher(self) {
        const launchers = (self.character?.moves || []).filter(m =>
            m.launches && m.startup <= 24 && !m.requiresAir && !m.stanceOnly && !m.reversal &&
            m.hitLevel !== HitLevel.THROW
        );
        if (launchers.length === 0) return null;
        return launchers[Math.floor(Math.random() * launchers.length)];
    }

    setupCombo(after) {
        const followups = (this.character?.moves || []).filter(m =>
            m.damage > 0 && m.startup <= 12 && !m.requiresAir && !m.launches &&
            m.hitLevel !== HitLevel.THROW && m.notation !== after.notation
        );
        if (followups.length === 0) {
            this.comboStep = 0;
            return;
        }
        const count = Math.random() < this.profile.comboSkill ? 2 : 1;
        this.comboMoves = [];
        for (let i = 0; i < count; i++) {
            this.comboMoves.push(followups[Math.floor(Math.random() * followups.length)]);
        }
        this.comboStep = this.comboMoves.length;
    }

    continueCombo(self, opponent) {
        if (this.comboMoves.length === 0) {
            this.comboStep = 0;
            return {};
        }
        const move = this.comboMoves.shift();
        this.comboStep--;
        if (this.comboMoves.length === 0) this.comboStep = 0;
        return this.executeNotation(move);
    }

    doThrow(self) {
        const throws = (self.character?.moves || []).filter(m => m.hitLevel === HitLevel.THROW && m.techable);
        if (throws.length > 0) {
            const t = throws[Math.floor(Math.random() * throws.length)];
            return this.executeNotation(t);
        }
        return { punch: true, kick: true };
    }

    doReversal(self) {
        const revs = (self.character?.moves || []).filter(m => m.reversal);
        if (revs.length > 0) return this.executeNotation(revs[0]);
        return { block: true, down: true };
    }

    doRageArt(self) {
        const rage = (self.character?.moves || []).find(m => m.category === 'rage_art');
        if (rage) return this.executeNotation(rage);
        return {};
    }

    useHeatMove(self) {
        const heat = (self.character?.moves || []).filter(m => m.category === 'heat_smash');
        if (heat.length > 0 && self.heatEnergy >= 2) {
            return this.executeNotation(heat[0]);
        }
        return {};
    }

    backdashAway(self) {
        return { left: self.facing === -1, right: self.facing === 1, left2: true };
    }

    jumpAway(self) {
        return { up: true, left: self.facing === -1 };
    }

    executeNotation(move) {
        if (!move || !move.notation) return {};
        return this.parseNotation(move.notation);
    }

    parseNotation(notation) {
        const input = {};
        const parts = notation.split(' ');
        const base = parts[0];

        if (base.includes('f,f')) {
            input.right = this.facing === 1;
            input.left = this.facing === -1;
            input.dash = true;
        } else if (base.includes('~')) {
            input.reversal = true;
        }

        if (base.includes('d+')) input.down = true;
        if (base.includes('u') || base.includes('uj')) input.up = true;
        if (base.includes('b') || base.includes('db')) { input.left = this.facing === -1; input.right = this.facing === 1; }
        if (base.includes('f') && !base.includes('f,f')) {
            input.right = this.facing === 1;
            input.left = this.facing === -1;
        }

        const hasL = base.includes('1');
        const hasR = base.includes('2');
        const hasK = base.includes('3') || base.includes('4');
        const both = base.includes('1+2') || base.includes('3+4');

        if (both || (hasL && hasR)) {
            input.leftPunch = true;
            input.rightPunch = true;
        } else if (hasL) {
            input.leftPunch = true;
        } else if (hasR) {
            input.rightPunch = true;
        }

        if (hasK) input.kick = true;

        if (base.includes('HP+HK') || base.includes('3+4') || base.includes('HP+LK')) {
            input.leftPunch = true;
            input.rightPunch = true;
            input.kick = true;
        }

        if (base.includes('LP+HK')) {
            input.leftPunch = true;
            input.rightPunch = true;
            input.kick = true;
        }

        if (base.includes('Heat')) {
            input.heat = true;
        }

        return input;
    }

    get hpPercent() {
        return this._lastHpPercent || 1;
    }

    set hpPercent(v) {
        this._lastHpPercent = v;
    }
}
