import { Fighter, State, T } from './Fighter.js';
import { AIController, Difficulty } from './AI.js';
import { getCharacter, CHARACTERS } from '../data/roster.js';
import { getStage } from '../data/stages.js';
import { WALL, WALL_LIMIT } from './WallGame.js';
import { HitLevel } from './Move.js';
import { toNumpad, toRelative, decodeInput, encodeInput } from './MotionInput.js';

export const GameMode = {
    ARCADE: 'arcade',
    VERSUS: 'versus',
    PRACTICE: 'practice',
    ONLINE: 'online',
};

export const Phase = {
    INTRO: 'intro',
    FIGHT: 'fight',
    KO: 'ko',
    ROUND_END: 'roundEnd',
    MATCH_END: 'matchEnd',
    REVERSAL_FREEZE: 'reversalFreeze',
};

export const RoundRules = {
    ROUNDS_TO_WIN: 2,
    ROUND_TIME: 99,
    INTRO_FRAMES: 150,
    KO_FREEZE: 200,
    ROUND_END_DELAY: 150,
};

export class Game {
    constructor(renderer, input) {
        this.renderer = renderer;
        this.input = input;
        this.mode = GameMode.VERSUS;
        this.difficulty = Difficulty.MEDIUM;

        this.p1 = null;
        this.p2 = null;
        this.ai = null;

        this.phase = Phase.INTRO;
        this.phaseFrame = 0;
        this.round = 1;
        this.roundTimer = RoundRules.ROUND_TIME * 60;
        this.matchWinner = null;
        this.matchLoser = null;
        this.paused = false;
        this.frameCount = 0;
        this.hitstop = 0;
        this.slowMotionScale = 1;
        this.slowMotionFrames = 0;
        this.reversalFreezeFrames = 0;
        this.announceText = '';
        this.announceSubtext = '';
        this.announceTimer = 0;
        this.winner = null;
        this.loser = null;
        this.cameraX = 0;
        this.cameraY = 0;
        this.cameraZoom = 1;
        this.cameraTargetX = 0;
        this.cameraTargetZoom = 1;
        this.shakeAmount = 0;
        this.stageIndex = 0;
        this.practiceMode = false;
        this.practiceDummyBehaviour = 'stand';
        this.practiceInfiniteHealth = false;
        this.practiceFrameDataDisplay = true;
        this.lastMoveExecuted = null;
        this.hitLog = [];
        this.onMatchEnd = null;
        this.onPhaseChange = null;
        this.onRemoteInput = null;
        this.remoteInputQueue = new Map();
        this.projectiles = [];
        this.effects = [];
        this.stage = null;
        this.stageTime = 0;
        this.backgroundParticles = [];
        this.initStageParticles();
    }

    queueRemoteInput(frame, input) {
        this.remoteInputQueue.set(frame, input);
    }

    takeRemoteInput(frame) {
        return this.remoteInputQueue.get(frame) || null;
    }

    emitLocalInput(frame, encoded) {
        if (this.onRemoteInput) {
            this.onRemoteInput(frame, encoded);
        }
    }

    initStageParticles() {
        this.backgroundParticles = [];
        for (let i = 0; i < 60; i++) {
            this.backgroundParticles.push({
                x: Math.random() * 1400,
                y: Math.random() * 800,
                size: Math.random() * 2.5 + 0.5,
                alpha: Math.random() * 0.4 + 0.1,
                speed: Math.random() * 0.4 + 0.1,
            });
        }
    }

    startMatch(mode, p1Id, p2Id, options = {}) {
        this.mode = mode;
        this.difficulty = options.difficulty || Difficulty.MEDIUM;
        const p1Char = getCharacter(p1Id);
        const p2Char = getCharacter(p2Id);
        this.p1 = new Fighter(p1Char, -180, 1, 1);
        this.p2 = new Fighter(p2Char, 180, -1, 2);
        this.p1.opponent = this.p2;
        this.p2.opponent = this.p1;
        this.p1.wins = 0;
        this.p2.wins = 0;
        this.matchWinner = null;
        this.matchLoser = null;
        this.arcadeQueue = options.arcadeQueue || null;
        this.practiceMode = mode === GameMode.PRACTICE;
        this.ai = null;
        if (mode === GameMode.ARCADE) {
            this.ai = new AIController(this.difficulty, p2Char);
        } else if (mode === GameMode.PRACTICE && options.useAI) {
            this.ai = new AIController(this.difficulty, p2Char);
        }
        if (this.practiceMode) {
            this.practiceDummyBehaviour = options.dummyBehaviour || 'stand';
            this.practiceInfiniteHealth = options.infiniteHealth !== false;
        }
        this.stageIndex = options.stageIndex || 0;
        this.stage = getStage(this.stageIndex);
        this.round = 1;
        this.remoteInputQueue.clear();
        this.frameCount = 0;
        this.initStageParticles();
        this.startRound();
    }

    startRound() {
        this.p1.resetForRound(-180, 1);
        this.p2.resetForRound(180, -1);
        this.roundTimer = RoundRules.ROUND_TIME * 60;
        this.setPhase(Phase.INTRO);
        this.announce(`ROUND ${this.round}`, 'FIGHT', 100);
        this.projectiles = [];
        this.hitLog = [];
        this.hitstop = 0;
        this.slowMotionFrames = 0;
        this.slowMotionScale = 1;
        this.reversalFreezeFrames = 0;
        this.winner = null;
        this.loser = null;
        this.lastMoveExecuted = null;
        if (this.ai) this.ai.reset();
    }

    setPhase(phase) {
        this.phase = phase;
        this.phaseFrame = 0;
        if (this.onPhaseChange) this.onPhaseChange(phase);
    }

    announce(text, subtext = '', duration = 90) {
        this.announceText = text;
        this.announceSubtext = subtext;
        this.announceTimer = duration;
    }

    update(dt) {
        if (this.paused) return;
        if (!this.p1 || !this.p2) return;

        this.frameCount++;
        this.stageTime += dt;

        if (this.announceTimer > 0) this.announceTimer--;

        if (this.hitstop > 0) {
            this.hitstop--;
            this.updateEffectsOnly(dt);
            return;
        }

        if (this.slowMotionFrames > 0) {
            this.slowMotionFrames--;
            if (this.slowMotionFrames <= 0) this.slowMotionScale = 1;
        }

        if (this.reversalFreezeFrames > 0) {
            this.reversalFreezeFrames--;
            this.updateEffectsOnly(dt);
            return;
        }

        const scale = this.slowMotionScale;
        const scaledDt = dt * scale;

        this.phaseFrame++;

        this.updateCamera(scaledDt);

        if (this.phase === Phase.INTRO) {
            this.updateIntroFrame(scaledDt);
            this.updateEffectsOnly(scaledDt);
            return;
        }

        if (this.phase === Phase.KO) {
            this.updateKoFrame(scaledDt);
            this.updateEffectsOnly(scaledDt);
            return;
        }

        if (this.phase === Phase.ROUND_END) {
            this.p1.update(this.getP1Input(), this.p2, this.frameCount);
            this.p2.update(this.getP2Input(), this.p1, this.frameCount);
            this.updateProjectiles(scaledDt);
            this.updateEffectsOnly(scaledDt);
            return;
        }

        if (this.phase === Phase.MATCH_END) {
            this.p1.update(this.getP1Input(), this.p2, this.frameCount);
            this.p2.update(this.getP2Input(), this.p1, this.frameCount);
            this.updateEffectsOnly(scaledDt);
            return;
        }

        this.roundTimer--;

        const p1Input = this.getP1Input();
        const p2Input = this.getP2Input();

        if (this.mode === GameMode.ONLINE) {
            const enc = encodeInput(p1Input, this.p1.facing);
            this.emitLocalInput(this.frameCount, enc);
        }

        this.p1.update(p1Input, this.p2, this.frameCount);
        this.p2.update(p2Input, this.p1, this.frameCount);

        this.p1.updateFacing(this.p2);
        this.p2.updateFacing(this.p1);

        this.updateProjectiles(scaledDt);
        this.resolveCombat();
        this.updateWallInteractions();
        this.updateHeatTimers(scaledDt);
        this.updateGhostHealth();
        this.checkRoundEnd();
        this.updateEffectsOnly(scaledDt);
    }

    updateIntroFrame(dt) {
        this.p1.vx *= 0.8;
        this.p2.vx *= 0.8;
        if (this.phaseFrame >= RoundRules.INTRO_FRAMES) {
            this.setPhase(Phase.FIGHT);
        }
    }

    updateKoFrame(dt) {
        this.p1.updatePhysicsOnly ? this.p1.updatePhysicsOnly() : null;
        this.p2.updatePhysicsOnly ? this.p2.updatePhysicsOnly() : null;
        if (this.phaseFrame >= RoundRules.KO_FREEZE) {
            this.finishRound();
        }
    }

    updateEffectsOnly(dt) {
        this.updateWallDecor(dt);
        this.updateGhostHealth();
    }

    getP1Input() {
        const raw = this.input.getP1();
        if (this.practiceMode) return raw;
        return raw;
    }

    getP2Input() {
        if (this.mode === GameMode.ONLINE) {
            const queued = this.takeRemoteInput(this.frameCount);
            if (queued) return queued;
            return this.remoteInputQueue.get(this.frameCount - 1) || {};
        }
        if (this.mode === GameMode.VERSUS) return this.input.getP2();
        if (this.mode === GameMode.PRACTICE) {
            if (this.practiceDummyBehaviour === 'stand') return {};
            if (this.practiceDummyBehaviour === 'crouch') return { down: true };
            if (this.practiceDummyBehaviour === 'block') return { block: true };
        }
        if (this.ai) return this.ai.update(this.p2, this.p1);
        return {};
    }

    updateCamera(dt) {
        const midX = (this.p1.x + this.p2.x) / 2;
        const dist = Math.abs(this.p1.x - this.p2.x);
        const targetZoom = Math.max(0.62, Math.min(1.25, 900 / (dist + 260)));
        this.cameraTargetX = midX;
        this.cameraTargetZoom = targetZoom;
        this.cameraX += (this.cameraTargetX - this.cameraX) * 0.06;
        this.cameraZoom += (this.cameraTargetZoom - this.cameraZoom) * 0.06;
        const midY = (this.p1.y + this.p2.y) / 2;
        this.cameraY += (midY - this.cameraY) * 0.06;
    }

    updateWallDecor(dt) {
        for (const p of this.backgroundParticles) {
            p.x -= p.speed;
            if (p.x < -20) {
                p.x = 1420;
                p.y = Math.random() * 800;
            }
        }
    }

    resolveCombat() {
        this.checkStrikes(this.p1, this.p2);
        this.checkStrikes(this.p2, this.p1);
        this.checkThrows(this.p1, this.p2);
        this.checkThrows(this.p2, this.p1);
    }

    checkStrikes(attacker, defender) {
        const hitbox = attacker.getHitbox();
        if (!hitbox) return;
        if (attacker.moveHitsThisInstance >= 1 && !attacker.currentMove?.multiHit) return;
        if (defender.isInvulnerable && !attacker.currentMove?.breaksInvuln) return;

        const hurtbox = defender.getHurtbox();
        const stanceHurtbox = defender.getStanceHurtbox();
        const targetBox = (stanceHurtbox && defender.stance) ? stanceHurtbox : hurtbox;

        if (!this.boxesOverlap(hitbox, targetBox)) return;

        attacker.moveHitsThisInstance++;

        const mv = attacker.currentMove;
        const blocked = defender.canBlock(mv);

        this.hitstop = mv.hitstop;
        this.slowMotionScale = 0.25;
        this.slowMotionFrames = mv.damage >= 20 ? 25 : 10;
        this.shakeAmount = Math.min(14, 3 + mv.damage * 0.15);

        const result = defender.takeHit(hitbox, attacker, blocked);
        if (!result) return;

        defender.applyHitstun(result, attacker);

        if (blocked) {
            this.addEffect('blockSpark', defender.x + defender.facing * -20, defender.y - 90, mv);
        } else {
            this.addEffect('hitSpark', defender.x, defender.y - 90, mv);
            this.addEffect('bloodMist', defender.x, defender.y - 80, mv);
        }

        this.hitLog.push({
            frame: this.frameCount,
            attacker: attacker.playerIndex,
            move: mv.name,
            damage: result.damage,
            blocked,
            total: this.frameCount,
        });
        if (this.hitLog.length > 30) this.hitLog.shift();

        this.lastMoveExecuted = mv;

        if (mv.reversal) {
            this.reversalFreezeFrames = 20;
            this.announce('REVERSAL', '', 50);
        }

        if (attacker.heatActive && defender.grounded) {
            attacker.recoverHealth(Math.floor(mv.damage * 0.3));
        }

        if (this.practiceMode && this.practiceInfiniteHealth && defender === this.p2) {
            defender.health = defender.maxHealth;
        }

        if (defender.health <= 0) {
            this.handleKO(attacker, defender);
        }
    }

    checkThrows(attacker, defender) {
        const mv = attacker.currentMove;
        if (!mv) return;
        if (mv.hitLevel !== HitLevel.THROW && mv.hitLevel !== HitLevel.THROW_LOW && mv.hitLevel !== HitLevel.THROW_HIGH) return;
        if (!mv.isActiveAt(attacker.moveFrame)) return;
        if (attacker.moveHasHit) return;

        const isWallThrow = !!mv.wallThrow;
        if (!defender.canBeThrown(isWallThrow)) return;

        const dist = Math.abs(attacker.x - defender.x);
        const reach = isWallThrow
            ? Math.abs(defender.x) + 40
            : mv.range * attacker.scale + defender.hurtboxWidth * 0.5;
        if (dist > reach) return;

        attacker.throwStartup = true;
        const result = defender.takeThrow(mv, attacker);
        attacker.throwStartup = false;

        if (isWallThrow && result && !result.teched) {
            this.announce('WALL THROW', '', 50);
            defender.vx = Math.sign(defender.x) * 9;
            defender.vz = 4;
            defender.grounded = false;
            defender.isBouncedOut = true;
        }

        if (result && result.teched) {
            this.addEffect('techThrow', (attacker.x + defender.x) / 2, -80, mv);
            this.announce('TECH', '', 40);
        } else {
            this.hitstop = mv.hitstop;
            this.shakeAmount = 8;
            this.addEffect('throwImpact', defender.x, -80, mv);
        }
    }

    boxesOverlap(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.x += proj.vx;
            proj.life--;

            const target = proj.owner === 1 ? this.p2 : this.p1;
            const hitbox = {
                x: proj.facing === 1 ? proj.x - 10 : proj.x - 60,
                y: proj.y - 30,
                width: 70,
                height: 40,
                move: proj.move,
            };
            const hurtbox = target.getHurtbox();
            if (this.boxesOverlap(hitbox, hurtbox)) {
                const blocked = target.canBlock(proj.move);
                const result = target.takeHit(hitbox, proj.owner === this.p1 ? this.p1 : this.p2, blocked);
                if (result) {
                    target.applyHitstun(result, proj.owner === this.p1 ? this.p1 : this.p2);
                    this.hitstop = proj.move.hitstop;
                    this.addEffect(blocked ? 'blockSpark' : 'hitSpark', proj.x, proj.y, proj.move);
                }
                this.projectiles.splice(i, 1);
                continue;
            }

            if (Math.abs(proj.x) > 620 || proj.life <= 0) {
                this.projectiles.splice(i, 1);
            }
        }

        for (const fighter of [this.p1, this.p2]) {
            const mv = fighter.currentMove;
            if (mv && mv.projectile && !fighter.projectileSpawned && mv.isActiveAt(fighter.moveFrame)) {
                fighter.projectileSpawned = true;
                this.projectiles.push({
                    x: fighter.x + fighter.facing * 60,
                    y: fighter.y - 70,
                    vx: fighter.facing * mv.projSpeed,
                    facing: fighter.facing,
                    owner: fighter.playerIndex,
                    move: mv,
                    life: 200,
                });
            }
            if (fighter.currentMove !== mv || !mv) {
                fighter.projectileSpawned = false;
            }
        }
    }

    updateWallInteractions() {
        for (const fighter of [this.p1, this.p2]) {
            if (fighter.state === State.WALL_SPLAT && fighter.stateFrame === 8) {
                this.shakeAmount = Math.max(this.shakeAmount, 12);
                this.addEffect('wallImpact', fighter.x, -80, null);
            }
            if (fighter.isBouncedOut && fighter.x * -1 > WALL_LIMIT - 14) {
                this.announce('RING OUT', '', 90);
            }
        }
    }

    updateHeatTimers(dt) {
        for (const f of [this.p1, this.p2]) {
            if (!f.heatActive) {
                f.heatMeter = Math.min(f.maxHeatMeter, f.heatMeter + 0.2);
            }
        }
    }

    updateGhostHealth() {
        this.p1.getGhostHealth();
        this.p2.getGhostHealth();
    }

    checkRoundEnd() {
        if (this.p1.isRingOut && !this.p2.isRingOut) {
            this.handleKO(this.p2, this.p1, true);
            return;
        }
        if (this.p2.isRingOut && !this.p1.isRingOut) {
            this.handleKO(this.p1, this.p2, true);
            return;
        }
        if (this.roundTimer <= 0) {
            this.handleTimeout();
        }
    }

    handleKO(winner, loser, ringOut = false) {
        if (this.phase === Phase.KO || this.phase === Phase.ROUND_END) return;
        this.setPhase(Phase.KO);
        this.announce(ringOut ? 'RING OUT' : 'K.O.', winner ? `${winner.config.name} WINS` : '', RoundRules.KO_FREEZE);
        this.winner = winner;
        this.loser = loser;
        this.slowMotionScale = 0.15;
        this.slowMotionFrames = RoundRules.KO_FREEZE;
        this.shakeAmount = 20;
        this.addEffect('koBurst', loser.x, loser.y - 80, null);
        loser.setState(State.LOSE);
        loser.animState = 'lose';
        if (winner) {
            winner.setState(State.WIN);
            winner.animState = 'win';
        }
        if (this.practiceMode && this.practiceInfiniteHealth) {
            this.practiceInfiniteHealth = false;
        }
    }

    handleTimeout() {
        if (this.p1.health > this.p2.health) {
            this.handleKO(this.p1, this.p2);
        } else if (this.p2.health > this.p1.health) {
            this.handleKO(this.p2, this.p1);
        } else {
            this.announce('DRAW', '', 120);
            this.setPhase(Phase.ROUND_END);
        }
    }

    finishRound() {
        if (this.winner) {
            this.winner.wins++;
        }

        const roundsToWin = RoundRules.ROUNDS_TO_WIN;

        if (this.p1.wins >= roundsToWin || this.p2.wins >= roundsToWin) {
            this.setPhase(Phase.MATCH_END);
            this.matchWinner = this.p1.wins >= roundsToWin ? this.p1 : this.p2;
            this.matchLoser = this.p1.wins >= roundsToWin ? this.p2 : this.p1;
            this.announce(`${this.matchWinner.config.name} WINS`, '', 240);
            if (this.onMatchEnd) this.onMatchEnd(this.matchWinner, this.matchLoser);
        } else {
            this.setPhase(Phase.ROUND_END);
            this.announce(this.winner ? `${this.winner.config.name} WINS ROUND ${this.round}` : 'DRAW', '', RoundRules.ROUND_END_DELAY);
        }
    }

    addEffect(type, x, y, move) {
        this.effects.push({
            type, x, y, life: 1, decay: 0.06,
            color: move?.effectColor || '#ffaa00',
            move,
        });
        if (type === 'koBurst') {
            this.effects.push({ type: 'hitSpark', x, y, life: 1, decay: 0.03, color: '#ff2200' });
        }
    }

    updateEffects() {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].life -= this.effects[i].decay;
            if (this.effects[i].life <= 0) this.effects.splice(i, 1);
        }
    }

    updateEffectTimers() {
        this.updateEffects();
        if (this.shakeAmount > 0) this.shakeAmount = Math.max(0, this.shakeAmount - 0.5);
    }

    effectiveHealthOf(f) {
        if (this.practiceMode && this.practiceInfiniteHealth && f === this.p2) {
            return this.p2.maxHealth;
        }
        return f.health;
    }

    reset() {
        this.p1 = null;
        this.p2 = null;
        this.ai = null;
        this.phase = Phase.INTRO;
        this.round = 1;
        this.matchWinner = null;
        this.matchLoser = null;
        this.hitLog = [];
        this.effects = [];
        this.projectiles = [];
        this.remoteInputQueue.clear();
    }

    get timeString() {
        const seconds = Math.ceil(this.roundTimer / 60);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}
