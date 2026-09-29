import { createMotionParser, toNumpad, toRelative } from './MotionInput.js';
import { MoveSet } from './MoveSet.js';
import {
    WALL,
    isAgainstWall,
    isInWallCarryZone,
    canWallCarry,
    applyWallCarry,
    applyWallSplat,
    applyWallBounce,
    applyBalconyBreak,
    applySpiral,
    updateWallGame,
    clampToStage,
    canWallThrow,
} from './WallGame.js';
import {
    Move, HitLevel, MoveCategory, Stance,
    getPenalizedDamage, getChipDamage,
} from './Move.js';

export const State = {
    IDLE: 'idle',
    WALK_F: 'walkF',
    WALK_B: 'walkB',
    CROUCH: 'crouch',
    DASH_F: 'dashF',
    DASH_B: 'dashB',
    BACKDASH: 'backdash',
    SIDESTEP_L: 'sideL',
    SIDESTEP_R: 'sideR',
    JUMP: 'jump',
    AIRBORNE: 'air',
    ATTACK: 'attack',
    BLOCK_HIGH: 'blockHigh',
    BLOCK_LOW: 'blockLow',
    BLOCK_MID: 'blockMid',
    HITSTUN: 'hitstun',
    HITSTUN_AIR: 'hitstunAir',
    HITSTUN_CRUMPLE: 'crumple',
    KNOCKDOWN: 'knockdown',
    WAKEUP: 'wakeup',
    WAKEUP_INVULN: 'wakeupInvuln',
    DOWNTECHNIQUE: 'downTech',
    THROW: 'throw',
    THROWN: 'thrown',
    THROWN_TECH: 'thrownTech',
    WALL_SPLAT: 'wallSplat',
    WALL_BOUNCE: 'wallBounce',
    BALCONY_BREAK: 'balconyBreak',
    RING_OUT: 'ringOut',
    RAGE_ART: 'rageArt',
    STANCE_ENTER: 'stanceEnter',
    STANCE_IDLE: 'stanceIdle',
    TELEPORT: 'teleport',
    WIN: 'win',
    LOSE: 'lose',
    FROZEN: 'frozen',
};

export const T = {
    DASH_F: 22, DASH_B: 24, BACKDASH: 26, SIDESTEP: 20,
    WAKEUP: 24, WAKEUP_INVULN: 40, KNOCKDOWN: 34, DOWNTECHNIQUE: 14,
    THROW_TECH: 12, HITSTUN_BASE: 14, WALL_SPLAT: 30, WALL_BOUNCE: 22,
    BALCONY_BREAK_FRAMES: 90,
    RING_OUT: 60, STANCE_ENTER: 10,
};

export class Fighter {
    constructor(config, x, facing, playerIndex) {
        this.config = config;
        this.playerIndex = playerIndex;
        this.x = x;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.facing = facing;
        this.z = 0;
        this.vz = 0;

        this.maxHealth = config.health || 1000;
        this.health = this.maxHealth;
        this.recoverableHealth = 0;
        this.ghostHealth = this.maxHealth;
        this.guardMeter = 100;
        this.maxGuardMeter = 100;

        this.heatMeter = 0;
        this.maxHeatMeter = 100;
        this.heatActive = false;
        this.heatTimer = 0;
        this.heatDuration = 600;
        this.heatEnergy = 0;
        this.heatBurstUsed = false;
        this.heatSmashUsed = false;

        this.rageActive = false;
        this.rageUsed = false;
        this.rageArtsUsed = 0;

        this.state = State.IDLE;
        this.stateFrame = 0;
        this.stateDuration = 0;

        this.currentMove = null;
        this.moveFrame = 0;
        this.moveHasHit = false;
        this.moveHitsThisInstance = 0;
        this.hitConfirmed = false;
        this.blockConfirmed = false;

        this.isCrouching = false;
        this.grounded = true;
        this.isJumping = false;
        this.stance = Stance.NONE;
        this.hsdCharge = 0;
        this.chargeLevel = 0;
        this.charging = false;
        this.holdingButton = null;
        this.holdTime = 0;

        this.blockStunFrames = 0;
        this.hitStunFrames = 0;
        this.invulnFrames = 0;
        this.armorFrames = 0;
        this.armorPower = 'light';
        this.armorHitsLeft = 0;
        this.superArmorHits = 0;

        this.comboCount = 0;
        this.comboDamage = 0;
        this.comboScaling = 100;
        this.comboTimer = 0;
        this.juggleCount = 0;
        this.juggleLimit = 5;

        this.throwTechWindow = 0;
        this.throwStartup = false;
        this.inThrowRange = false;
        this.thrownBy = null;

        this.wasHitStun = false;
        this.lastHitBy = null;
        this.lastMoveHit = null;
        this.punishable = false;
        this.punishWindow = 0;

        this.tornadoFrames = 0;
        this.spiralFrames = 0;
        this.wallCarry = false;
        this.wallCarrySide = null;
        this.wallSide = null;
        this.pendingWallBounce = false;
        this.isBouncedOut = false;
        this.tornadoRefreshes = 0;
        this.juggleDropped = false;
        this.balconyBrokenBy = null;
        this.wallSplattedBy = null;
        this.hitstopFrames = 0;
        this.damageTakenThisCombo = 0;
        this.guardCrushed = false;
        this.comboScalingActive = false;

        this.wins = 0;
        this.parser = createMotionParser();
        this.moveset = new MoveSet(this);
        this.floorBounces = 0;
        this.freezeFrames = 0;

        this.motionBufferLocked = false;
        this.lastMotion = null;
        this.moveHistory = [];

        this.scale = (config.height || 180) / 180;
        this.animState = 'idle';
        this.animFrame = 0;
        this.lean = 0;
        this.pose = null;
        this.lastHitDirection = 0;
    }

    get isActionable() {
        return [
            State.IDLE, State.WALK_F, State.WALK_B, State.CROUCH,
            State.DASH_F, State.DASH_B, State.BACKDASH,
            State.SIDESTEP_L, State.SIDESTEP_R,
            State.BLOCK_HIGH, State.BLOCK_LOW, State.BLOCK_MID,
            State.JUMP, State.AIRBORNE, State.STANCE_IDLE,
        ].includes(this.state);
    }

    get isBlocking() {
        return [State.BLOCK_HIGH, State.BLOCK_LOW, State.BLOCK_MID].includes(this.state);
    }

    get isAttacking() {
        return [State.ATTACK, State.RAGE_ART, State.THROW, State.TELEPORT].includes(this.state) ||
               (this.currentMove && !this.currentMove.noHitbox);
    }

    get canCancel() {
        if (!this.currentMove) return false;
        if (this.moveFrame < this.currentMove.startup) return false;
        if (this.currentMove.noHitbox) return false;
        if (this.blockConfirmed && !this.currentMove.cancelOnBlock) return false;
        if (!this.moveHasHit && !this.currentMove.chainCancel) return false;
        return true;
    }

    get isComboValid() {
        return this.comboCount < 12 && this.damageTakenThisCombo < 120;
    }

    get juggleAllowance() {
        if (this.tornadoFrames > 0) return WALL.JUGGLE_CAP_WALL + 4;
        if (this.wallCarry) return WALL.JUGGLE_CAP_WALL + 2;
        return this.juggleLimit;
    }

    get juggleCapped() {
        return this.juggleCount >= this.juggleAllowance;
    }

    get hurtboxHeight() {
        if (this.isCrouching) return this.scale * 82;
        if (this.state === State.KNOCKDOWN) return this.scale * 40;
        return this.scale * 128;
    }

    get hurtboxWidth() {
        return this.scale * 52;
    }

    get isInvulnerable() {
        if (this.invulnFrames > 0) return true;
        if (this.state === State.WALL_BOUNCE && this.stateFrame > 8) return true;
        if (this.state === State.RING_OUT) return true;
        if (this.state === State.THROWN) return true;
        if (this.state === State.THROWN_TECH) return true;
        return false;
    }

    setState(state, duration = 0) {
        this.state = state;
        this.stateFrame = 0;
        this.stateDuration = duration;
    }

    startMove(move) {
        this.currentMove = move;
        this.moveFrame = 0;
        this.moveHasHit = false;
        this.moveHitsThisInstance = 0;
        this.hitConfirmed = false;
        this.blockConfirmed = false;

        if (move.reversal) {
            this.invulnFrames = move.invulnFrames || 7;
        }

        if (move.armor) {
            this.armorFrames = move.armor.frames;
            this.armorPower = move.armor.power;
            this.armorHitsLeft = move.armor.hits || 1;
        }

        if (move.superArmor) {
            this.armorFrames = move.superArmor;
            this.armorPower = 'super';
            this.superArmorHits = 2;
        }

        if (move.stanceOnly || this.stance === move.requiresStance) {
            this.setState(State.ATTACK, move.total);
        } else if (move.requiresAir) {
            this.setState(State.AIRBORNE, move.total);
        } else {
            this.setState(State.ATTACK, move.total);
        }

        this.animState = 'attack';
        this.moveHistory.push({ name: move.name, frame: 0 });
        if (this.moveHistory.length > 8) this.moveHistory.shift();

        if (move.enterStance) {
            this.stance = move.enterStance;
        }

        if (move.heatEngager && !this.heatActive) {
            this.activateHeatEngager();
        }

        if (move.heatBurst && !this.heatActive) {
            this.activateHeatBurst();
        }

        if (move.chargeable) {
            this.charging = false;
            this.chargeLevel = 0;
            this.holdingButton = null;
        }

        if (move.teleport) {
            this.setState(State.TELEPORT, move.startup);
            const target = this.opponent;
            if (target) {
                this.teleportTarget = { x: target.x - this.facing * 70, y: target.y };
            }
        }

    }

    update(input, opponent, frameCount) {
        this.opponent = opponent;
        this.parser.facing = this.facing;
        this.parser.update(input);
        this.parser.tick();

        this.stateFrame++;
        this.animFrame++;

        this.updateTimers();
        this.updateCharging(input);
        this.updateGuards();
        this.updateMoves();
        this.updateStateMachine(input, opponent);
        this.updatePhysicalMotion(opponent);

        this.updateHsdCharge(input);
        this.updateComboTimer();
    }

    updateTimers() {
        if (this.blockStunFrames > 0) this.blockStunFrames--;
        if (this.hitStunFrames > 0) this.hitStunFrames--;
        if (this.invulnFrames > 0) this.invulnFrames--;
        if (this.armorFrames > 0) this.armorFrames--;
        if (this.throwTechWindow > 0) this.throwTechWindow--;
        if (this.punishWindow > 0) this.punishWindow--;
        if (this.freezeFrames > 0) this.freezeFrames--;

        updateWallGame(this, this.opponent);

        if (this.heatActive) {
            const opp = this.opponent;
            const oppHurting = opp && (opp.hitStunFrames > 0 || opp.state === State.KNOCKDOWN || opp.state === State.HITSTUN_AIR);
            if (!oppHurting) this.heatTimer--;
            if (this.heatTimer <= 0) this.endHeat();
        } else if (!this.heatBurstUsed) {
            this.heatMeter = Math.min(this.maxHeatMeter, this.heatMeter + 0.2);
        }
    }

    updatePhysicalMotion(opponent) {
        if (this.freezeFrames > 0) return;

        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;

        if (this.z !== 0 || this.vz !== 0) {
            this.vz -= 0.7;
            if (this.vz < -14) this.vz = -14;
            this.z += this.vz;
            if (this.z < 0) {
                this.z = 0;
                this.vz = 0;
                this.onLand();
            }
        }

        this.vx *= 0.86;
        if (Math.abs(this.vx) < 0.01) this.vx = 0;
        this.vy *= 0.9;

        if (this.z === 0) {
            this.grounded = true;
        }

        const hitWall = clampToStage(this);
        if (hitWall) {
            this.wallSide = hitWall;
            this.onWallContact(hitWall);
        }

        if (this.y < -900) {
            this.setState(State.RING_OUT, T.RING_OUT);
            this.isRingOut = true;
        }
    }

    onWallContact(side) {
        if (this.state === State.WALL_SPLAT) return;
        if (this.pendingWallBounce) {
            this.pendingWallBounce = false;
            this.applyWallBounce();
            return;
        }
        if (this.state === State.HITSTUN_AIR && this.vz < -1) {
            this.vx = 0;
            this.vz *= 0.2;
        }
    }

    onLand() {
        if (this.floorBounces > 0) {
            this.floorBounces--;
            this.vz = 5;
            this.setState(State.HITSTUN_AIR, 40);
            return;
        }
        this.grounded = true;
        this.isJumping = false;
        if (this.state === State.HITSTUN_AIR) {
            this.setState(State.KNOCKDOWN, T.KNOCKDOWN);
        } else if (this.state === State.JUMP || this.state === State.AIRBORNE) {
            this.setState(State.IDLE);
        }
    }

    updateCharging(input) {
        const numpad = toNumpad(input.up, input.down, input.left, input.right);
        const rel = toRelative(numpad, this.facing);

        const back = rel === 4 || rel === 1 || rel === 7;
        const down = rel === 1 || rel === 2 || rel === 3;

        if (back && down) {
            this.charging = true;
            this.chargeLevel = Math.min(1, this.chargeLevel + 0.008);
            this.hsdCharge = Math.min(2, this.hsdCharge + 0.004);
        } else if (this.chargeLevel < 0.9) {
            this.charging = false;
            this.chargeLevel = Math.max(0, this.chargeLevel - 0.05);
        }
    }

    updateHsdCharge(input) {
        if (this.charging) {
            if (this.chargeLevel >= 1) this.hsdCharge = 1;
            if (this.chargeLevel >= 1.5) this.hsdCharge = 2;
        } else {
            this.hsdCharge = Math.max(0, this.hsdCharge - 0.002);
        }
    }

    updateGuards() {
        if (this.guardMeter < 0) {
            this.guardMeter = 0;
        }
        if (this.guardMeter >= this.maxGuardMeter) {
            this.guardMeter = this.maxGuardMeter;
        }
        if (this.guardMeter < 15 && this.isBlocking && this.stateFrame % 2 === 0) {
            if (this.guardCrushed) {
                this.setState(State.HITSTUN, 30);
                this.guardCrushed = false;
            }
        }
    }

    updateComboTimer() {
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer === 0) this.resetCombo();
        }
    }

    updateMoves() {
        if (!this.currentMove) return;
        this.moveFrame++;
        this.moveHasHit = this.moveHasHit || this.moveHitsThisInstance > 0;
        if (this.currentMove.hitstop > 0 && this.hitstopFrames > 0) {
            this.hitstopFrames--;
        }
        if (this.moveFrame >= this.currentMove.total) {
            this.finishMove();
        }
    }

    finishMove() {
        const move = this.currentMove;
        this.currentMove = null;
        this.moveFrame = 0;
        this.moveHasHit = false;
        if (this.state === State.ATTACK || this.state === State.RAGE_ART || this.state === State.THROW) {
            this.setState(this.stance !== Stance.NONE ? State.STANCE_IDLE : State.IDLE);
        }
    }

    updateStateMachine(input, opponent) {
        const move = this.moveset.find(this.parser);

        const dashish = this.state === State.DASH_F || this.state === State.DASH_B ||
                        this.state === State.BACKDASH || this.state === State.SIDESTEP_L ||
                        this.state === State.SIDESTEP_R;
        if (dashish && move && move.motion) {
            for (const btn of Object.keys(BUTTON_ALIASES)) {
                if (this.parser.isPressed(btn)) this.parser.consume(btn);
            }
            this.parser.buffer.clear();
            this.startMove(move);
            return;
        }

        if (this.currentMove && this.canCancel) {
            if (move && this.canCancelInto(this.currentMove, move)) {
                for (const btn of Object.keys(BUTTON_ALIASES)) {
                    if (this.parser.isPressed(btn)) this.parser.consume(btn);
                }
                this.startMove(move);
                return;
            }
        }

        if (this.freezeFrames > 0) return;

        switch (this.state) {
            case State.IDLE:
            case State.WALK_F:
            case State.WALK_B:
            case State.CROUCH:
            case State.STANCE_IDLE:
                this.handleGroundInput(input, opponent, move);
                break;
            case State.DASH_F:
                this.updateDash(State.DASH_F, T.DASH_F, State.WALK_F);
                break;
            case State.DASH_B:
                this.updateDash(State.DASH_B, T.DASH_B, State.WALK_F);
                break;
            case State.BACKDASH:
                this.updateBackdash();
                break;
            case State.SIDESTEP_L:
            case State.SIDESTEP_R:
                this.updateSidestep();
                break;
            case State.JUMP:
            case State.AIRBORNE:
                this.handleAirInput(input, move);
                break;
            case State.BLOCK_HIGH:
            case State.BLOCK_LOW:
            case State.BLOCK_MID:
                this.handleBlockState(input, opponent, move);
                break;
            case State.HITSTUN:
                this.updateHitstun();
                break;
            case State.HITSTUN_AIR:
                break;
            case State.KNOCKDOWN:
                this.updateKnockdown(input);
                break;
            case State.DOWNTECHNIQUE:
                if (this.stateFrame >= T.DOWNTECHNIQUE) this.setState(State.WAKEUP, T.WAKEUP);
                break;
            case State.WAKEUP:
                if (this.stateFrame >= T.WAKEUP) this.setState(State.IDLE);
                break;
            case State.WAKEUP_INVULN:
                if (this.stateFrame >= T.WAKEUP_INVULN) this.setState(State.IDLE);
                break;
            case State.WALL_SPLAT:
                this.animState = 'wallSplat';
                if (this.stateFrame >= T.WALL_SPLAT) this.applyWallBounce();
                break;
            case State.WALL_BOUNCE:
                this.animState = 'wallBounce';
                if (this.stateFrame >= T.WALL_BOUNCE) {
                    if (this.isBouncedOut) {
                        this.setState(State.RING_OUT, T.RING_OUT);
                        this.isRingOut = true;
                    } else {
                        this.setState(State.KNOCKDOWN, T.KNOCKDOWN);
                    }
                }
                break;
            case State.BALCONY_BREAK:
                this.animState = 'wallSplat';
                if (this.stateFrame >= T.BALCONY_BREAK_FRAMES) {
                    this.applyWallBounce();
                    this.floorBounces = 0;
                    this.isBouncedOut = true;
                    this.invulnFrames = 0;
                }
                break;
            case State.RING_OUT:
                this.animState = 'ringOut';
                break;
            case State.THROWN:
                break;
            case State.THROWN_TECH:
                if (this.stateFrame >= T.THROW_TECH) {
                    this.setState(State.IDLE);
                    this.vx = 0;
                }
                break;
            case State.TELEPORT:
                if (this.stateFrame >= this.currentMove?.startup || 8) {
                    if (this.teleportTarget) {
                        this.x = this.teleportTarget.x;
                        this.setState(State.ATTACK, this.currentMove ? this.currentMove.total : 20);
                    } else {
                        this.finishMove();
                    }
                }
                break;
            case State.ATTACK:
            case State.RAGE_ART:
            case State.THROW:
                this.handleMoveRecovery(move);
                break;
            default:
                break;
        }
    }

    canCancelInto(current, next) {
        if (current.chainCancel) {
            if (current.chainTarget && current.chainTarget === next.notation) return true;
            if (next.notation === current.chainCancel) return true;
        }
        if (current.cancelInto && current.cancelInto.includes(next.notation)) {
            if (next.moveInputConsumes) {}
            return true;
        }
        if (this.hitConfirmed && current.cancelOnHit) {
            if (next.category === MoveCategory.NORMAL && next.notation === current.notation) return false;
            return true;
        }
        return false;
    }

    handleGroundInput(input, opponent, move) {
        if (move) {
            for (const btn of Object.keys(BUTTON_ALIASES)) {
                if (this.parser.isPressed(btn)) this.parser.consume(btn);
            }
            this.startMove(move);
            return;
        }

        const input2 = input;
        const rel = toRelative(toNumpad(input2.up, input2.down, input2.left, input2.right), this.facing);

        const forward = rel === 3 || rel === 6 || rel === 9;
        const back = rel === 4 || rel === 1 || rel === 7;
        const down = rel === 1 || rel === 2 || rel === 3;
        const up = rel === 6 || rel === 7 || rel === 8 || rel === 9;

        const dist = opponent ? Math.abs(this.x - opponent.x) : 200;

        const wm = (this.lastDashMotionFrame ?? -Infinity) + 1;
        if (this.parser.buffer.hasSequenceSince([3, 3], 10, wm) && this.state === State.IDLE) {
            this.startDash(State.DASH_F, 1);
            return;
        }
        if (this.parser.buffer.hasSequenceSince([4, 4], 10, wm)) {
            this.startBackdash();
            return;
        }

        if (this.parser.isPressed('heat') && !this.heatActive && this.heatMeter >= this.maxHeatMeter) {
            this.activateHeatBurst();
            return;
        }
        if (this.parser.isPressed('rage') && this.rageActive && !this.rageUsed) {
            const rageMove = this.moveset.moves.find(m => m.category === MoveCategory.RAGE_ART && this.moveset.canUse(m));
            if (rageMove) {
                for (const btn of Object.keys(BUTTON_ALIASES)) {
                    if (this.parser.isPressed(btn)) this.parser.consume(btn);
                }
                this.rageUsed = true;
                this.rageArtsUsed++;
                this.startMove(rageMove);
                return;
            }
        }

        if (input2.block || (down && this.parser.isPressed('block'))) {
            if (down) this.setState(State.BLOCK_LOW);
            else this.setState(State.BLOCK_HIGH);
            return;
        }

        if (up) {
            this.isJumping = true;
            this.grounded = false;
            this.vz = 14 * (this.config.jumpPower || 1) * this.scale;
            if (forward) { this.vx = this.facing * 4.5; this.setState(State.JUMP); }
            else if (back) { this.vx = -this.facing * 3.5; this.setState(State.JUMP); }
            else { this.setState(State.JUMP); }
            this.isCrouching = false;
            return;
        }

        if (down) {
            this.isCrouching = true;
            this.setState(State.CROUCH);
            if (back) this.vx = -this.facing * 2.2;
            else if (forward) this.vx = this.facing * 2.2;
            return;
        }

        this.isCrouching = false;

        if (forward) {
            this.setState(State.WALK_F);
            this.vx = this.facing * 3.4 * (this.config.speed || 1) * this.scale;
            this.animState = 'walkF';
        } else if (back) {
            this.setState(State.WALK_B);
            this.vx = -this.facing * 2.6 * (this.config.speed || 1) * this.scale;
            this.animState = 'walkB';
        } else {
            this.setState(this.stance !== Stance.NONE ? State.STANCE_IDLE : State.IDLE);
            this.animState = 'idle';
        }
    }

    handleBlockState(input, opponent, move) {
        if (this.blockStunFrames > 0) {
            this.animState = 'block';
            return;
        }

        const rel = toRelative(toNumpad(input.up, input.down, input.left, input.right), this.facing);
        const down = rel === 1 || rel === 2 || rel === 3;
        const holdingBlock = input.block;

        if (move) {
            this.setState(State.IDLE);
            this.startMove(move);
            return;
        }

        if (!holdingBlock) {
            this.setState(this.stance !== Stance.NONE ? State.STANCE_IDLE : State.IDLE);
            this.animState = 'idle';
            return;
        }

        this.setState(down ? State.BLOCK_LOW : State.BLOCK_HIGH);
        this.isCrouching = down;
        this.animState = 'block';

        if (rel === 4 || rel === 1 || rel === 7) this.vx = -1.8;
    }

    handleAirInput(input, move) {
        if (move && move.requiresAir) {
            for (const btn of Object.keys(BUTTON_ALIASES)) {
                if (this.parser.isPressed(btn)) this.parser.consume(btn);
            }
            this.startMove(move);
        }
    }

    handleMoveRecovery(move) {
        if (this.currentMove && this.stateFrame < this.currentMove.startup) {
            return;
        }
    }

    updateDash(type, duration, nextState) {
        if (this.stateFrame >= duration) {
            this.setState(nextState);
        }
        this.animState = type === State.DASH_F ? 'dashF' : 'dashB';
    }

    startDash(type, count) {
        this.lastDashMotionFrame = this.parser.buffer.frameOfLastMotion();
        this.setState(type, T.DASH_F);
        this.vx = (type === State.DASH_F ? 1 : -1) * 12 * (this.config.speed || 1);
        this.dashCount = count;
    }

    startBackdash() {
        this.lastDashMotionFrame = this.parser.buffer.frameOfLastMotion();
        this.setState(State.BACKDASH, T.BACKDASH);
        this.vx = -11;
        this.invulnFrames = 5;
        this.animState = 'backdash';
    }

    updateBackdash() {
        if (this.stateFrame >= T.BACKDASH) {
            this.setState(State.IDLE);
            this.animState = 'idle';
        }
    }

    startSidestep(direction) {
        this.setState(direction === 1 ? State.SIDESTEP_L : State.SIDESTEP_R, T.SIDESTEP);
        this.vx = 0;
        this.vz = 7.5;
        this.grounded = false;
        this.sidestepDir = direction;
        this.invulnFrames = 3;
        this.animState = 'sidestep';
    }

    updateSidestep() {
        if (this.stateFrame >= T.SIDESTEP && this.grounded) {
            this.setState(State.IDLE);
        }
    }

    updateHitstun() {
        if (this.hitStunFrames <= 0) {
            this.setState(State.IDLE);
            this.animState = 'idle';
        } else {
            this.animState = 'hitstun';
        }
    }

    updateKnockdown(input) {
        this.animState = 'knockdown';
        if (this.stateFrame < T.KNOCKDOWN) return;

        const canTech = (this.juggleCount === 0 && this.floorBounces === 0);

        if (canTech) {
            if (this.parser.isPressed('block') && this.parser.hasSequence([4, 1, 2, 3, 6], 16)) {
                this.setState(State.WAKEUP_INVULN, T.WAKEUP_INVULN);
                this.invulnFrames = T.WAKEUP_INVULN;
                this.animState = 'wakeup';
                this.consumeButtons();
                return;
            }
            if (input.block) {
                this.setState(State.DOWNTECHNIQUE, T.DOWNTECHNIQUE);
                this.vx = 0;
                return;
            }
            if (input.up) {
                this.setState(State.WAKEUP, T.WAKEUP);
                this.vx = -3;
                return;
            }
        }

        this.setState(State.WAKEUP, T.WAKEUP);
    }

    consumeButtons() {
        for (const btn of Object.keys(BUTTON_ALIASES)) {
            this.parser.consume(btn);
        }
    }

    updateFacing(opponent) {
        if (!opponent) return;
        if (this.state === State.HITSTUN || this.state === State.HITSTUN_AIR ||
            this.state === State.KNOCKDOWN || this.state === State.THROWN) return;
        if (this.currentMove) return;

        const newFacing = opponent.x > this.x ? 1 : -1;
        this.facing = newFacing;
    }

    getHurtbox() {
        const w = this.hurtboxWidth;
        const h = this.hurtboxHeight;
        return {
            x: this.x - w / 2,
            y: -h + this.z,
            width: w,
            height: h,
        };
    }

    getHitbox() {
        const mv = this.currentMove;
        if (!mv || mv.noHitbox) return null;
        if (!mv.isActiveAt(this.moveFrame)) return null;
        if (mv.projectile) return null;

        const range = mv.range * this.scale;
        const h = (mv.hitHeight || 40) * this.scale;
        const y = -mv.hitY * this.scale + this.z;
        return {
            x: this.facing === 1 ? this.x : this.x - range,
            y: this.z > 0 ? this.z - 8 : y,
            width: range,
            height: h,
            move: mv,
        };
    }

    getStanceHurtbox() {
        if (this.stance === Stance.NONE) return null;
        const w = this.hurtboxWidth * 1.1;
        return { x: this.x - w / 2, y: -this.hurtboxHeight + this.z, width: w, height: this.hurtboxHeight };
    }

    takeHit(hitbox, attacker, blocked) {
        const mv = hitbox.move || attacker.currentMove;
        if (!mv) return null;

        let damage = mv.damage;
        if (mv.damageScalesWithMissingHealth) {
            const missing = 1 - (this.health / this.maxHealth);
            damage = Math.floor(mv.damage * (0.55 + missing * 0.9));
        }
        damage = getPenalizedDamage(damage, attacker.comboCount);
        if (attacker.heatActive) damage = Math.floor(damage * 1.15);
        if (attacker.rageActive) damage = Math.floor(damage * 1.25);

        const result = {
            damage, blocked, move: mv,
            attacker, victim: this,
        };

        if (blocked) {
            const chip = getChipDamage(mv, attacker.comboCount);
            if (chip > 0) {
                this.health = Math.max(1, this.health - Math.ceil(chip));
                this.recoverableHealth = Math.min(this.maxHealth - this.health, this.recoverableHealth + Math.ceil(chip));
            }
            this.guardMeter -= mv.guardDamage;
            if (this.guardMeter <= 0) {
                this.guardCrushed = true;
                this.guardMeter = 0;
            }
            this.recoverableHealth = Math.min(this.maxHealth - this.health, this.recoverableHealth + Math.floor(mv.damage * 0.05));
            result.chipDamage = chip;
        } else {
            this.health = Math.max(0, this.health - damage);
            if (mv.removesRecoverable) {
                this.health = Math.max(0, this.health - this.recoverableHealth);
                this.recoverableHealth = 0;
            }
        }

        if (this.health <= this.maxHealth * 0.25 && !this.rageActive && !this.rageUsed) {
            this.activateRage();
        }

        if (this.health <= 0 && this.recoverableHealth <= 0) {
            this.health = 0;
        }

        return result;
    }

    canBlock(move) {
        if (!move.isBlockable()) return false;
        if (this.state === State.ATTACK || this.state === State.RAGE_ART) return false;
        if (this.hitStunFrames > 0) return false;
        if (!this.isBlocking) return false;
        if (move.hitLevel === HitLevel.LOW && !this.isCrouching) return false;
        if (move.hitLevel === HitLevel.HIGH && this.isCrouching) return false;
        return true;
    }

    applyHitstun(result, attacker) {
        const mv = result.move;

        if (result.blocked) {
            this.blockStunFrames = Math.max(this.blockStunFrames, Math.max(6, mv.blockstunFrames()));
            this.setState(this.isCrouching ? State.BLOCK_LOW : State.BLOCK_HIGH);
            this.animState = 'block';
            this.vx = this.facing * -mv.pushbackBlock * 0.8;
            attacker.blockConfirmed = true;
            this.hitstopFrames = mv.hitstop * 0.6;
            attacker.hitstopFrames = mv.hitstop * 0.6;
            attacker.moveHitsThisInstance++;
            attacker.moveHasHit = true;
            return;
        }

        this.recoverableHealth = Math.max(0, this.recoverableHealth - Math.floor(result.damage * 0.4));
        this.hitStunFrames = mv.hitstunFrames();
        this.hitstopFrames = mv.hitstop;
        attacker.hitstopFrames = mv.hitstop;
        attacker.moveHitsThisInstance++;
        attacker.moveHasHit = true;
        attacker.hitConfirmed = true;
        attacker.comboCount++;
        attacker.comboDamage += result.damage;
        attacker.comboTimer = 90;
        this.lastHitBy = attacker;
        this.lastHitDirection = -attacker.facing;
        this.guardMeter = Math.min(this.maxGuardMeter, this.guardMeter + 8);
        this.armorHitsLeft = 0;

        if (mv.armor && this.armorFrames > 0 && this.armorPower === mv.armor.power) {
            this.armorFrames = 0;
            attacker.comboCount = 0;
            return;
        }

        if (mv.armor && this.armorFrames > 0) {
            if (this.armorPower === 'super' || this.armorHitsLeft > 0) {
                this.armorHitsLeft--;
                attacker.comboCount = 0;
                return;
            }
        }

        if (mv.armor && attacker.currentMove && attacker.currentMove.powerCrush &&
            this.armorFrames > 0 && this.armorPower === 'super') {
            this.armorFrames = 0;
        }

        if (mv.unblockable) {
            this.blockStunFrames = 0;
        }

        if (mv.tornado && (this.z > 0 || this.tornadoFrames > 0)) {
            this.tornadoFrames = Math.max(this.tornadoFrames, WALL.TORNADO_FRAMES);
            attacker.tornadoUsedThisCombo = true;
        }

        if (mv.launches || mv.airborne) {
            this.vz = 11;
            this.grounded = false;
            this.setState(State.HITSTUN_AIR, 60);
            this.animState = 'hitstunAir';
            if (this.tornadoFrames > 0) {
                this.tornadoRefreshes = (this.tornadoRefreshes || 0) + 1;
                if (this.tornadoRefreshes % 3 === 0) {
                    this.tornadoFrames = Math.max(this.tornadoFrames, WALL.TORNADO_FRAMES);
                }
            } else if (!this.juggleCapped) {
                this.juggleCount++;
            } else {
                this.juggleDropped = true;
            }
            this.animState = 'juggle';
        } else if (mv.knockdown || mv.downs) {
            this.vz = 5;
            this.grounded = false;
            this.setState(State.HITSTUN_AIR, 40);
        } else if (this.z > 0) {
            this.vz = 1.5;
            this.setState(State.HITSTUN_AIR, 30);
        } else {
            this.vx = this.facing * mv.pushback * 0.6;
            this.setState(State.HITSTUN, 30);
            this.animState = 'hitstun';
        }

        this.resolveWallInteraction(mv, attacker);

        if (attacker.comboCount > 2) {
            this.comboScaling = true;
        }
    }

    resolveWallInteraction(mv, attacker) {
        const nearWall = this.nearWall();

        if (mv.balconyBreak && nearWall) {
            this.balconyBrokenBy = attacker;
            applyBalconyBreak(this, attacker);
            return;
        }

        if (mv.wallSplat && nearWall && this.z > 0) {
            applyWallSplat(this, attacker, mv);
            return;
        }

        if (mv.wallBounce && nearWall) {
            applyWallSplat(this, attacker, mv);
            this.pendingWallBounce = true;
            return;
        }

        if (mv.wallCarry && canWallCarry(this)) {
            applyWallCarry(this, attacker);
            this.vz = Math.max(this.vz, mv.launches ? 9 : 3);
            this.grounded = false;
            this.setState(State.HITSTUN_AIR, 90);
            this.animState = 'juggle';
            return;
        }

        if (mv.spiral && nearWall) {
            applySpiral(this, attacker);
        }

        if (nearWall && this.z > 0 && this.state === State.HITSTUN_AIR) {
            this.vx = Math.sign(this.x) * 0;
        }
    }

    nearWall() {
        return Math.abs(this.x) >= WALL.SOFT_LIMIT;
    }

    applyWallBounce() {
        const res = applyWallBounce(this);
        return res.bounced;
    }

    applyRingOut() {
        this.isRingOut = true;
        this.setState(State.RING_OUT, T.RING_OUT);
        this.vx = 0;
        this.vy = 6;
        this.animState = 'ringOut';
    }

    takeThrow(throwMove, attacker) {
        if (this.throwTechWindow > 0 && throwMove.techable) {
            this.setState(State.THROWN_TECH, T.THROW_TECH);
            attacker.setState(State.ATTACK, 20);
            attacker.currentMove = null;
            attacker.resetCombo();
            this.throwTechWindow = 0;
            attacker.throwTechWindow = T.THROW_TECH;
            return { teched: true };
        }

        const dmg = getPenalizedDamage(throwMove.damage, attacker.comboCount);
        this.health = Math.max(0, this.health - dmg);
        attacker.comboCount++;
        attacker.comboDamage += dmg;
        attacker.comboTimer = 90;
        this.setState(State.THROWN, 40);
        this.thrownBy = attacker;
        this.vx = -attacker.facing * 6;
        this.vz = 7;
        this.grounded = false;
        this.animState = 'thrown';
        this.hitstopFrames = throwMove.hitstop;
        attacker.hitstopFrames = throwMove.hitstop;
        attacker.moveHasHit = true;
        attacker.hitConfirmed = true;

        if (this.health <= this.maxHealth * 0.25 && !this.rageActive && !this.rageUsed) {
            this.activateRage();
        }

        return { teched: false, damage: dmg };
    }

    canBeThrown(wallThrow = false) {
        if (this.state === State.KNOCKDOWN && !wallThrow) return false;
        if (this.state === State.KNOCKDOWN && wallThrow && !isAgainstWall(this)) return false;
        if (this.state === State.WALL_SPLAT && !wallThrow) return false;
        if (this.state === State.WALL_SPLAT && wallThrow) return true;
        if (this.state === State.RING_OUT) return false;
        if (this.state === State.BALCONY_BREAK) return false;
        if (this.throwStartup) return false;
        if (this.state === State.THROWN || this.state === State.THROWN_TECH) return false;
        if (this.invulnFrames > 0) return false;
        if (this.z > 0) return false;
        if (this.currentMove && this.currentMove.armor) return false;
        return true;
    }

    activateHeatBurst() {
        if (this.heatActive || this.heatMeter < this.maxHeatMeter) return false;
        if (this.heatBurstUsed) return false;
        this.heatBurstUsed = true;
        this.heatActive = true;
        this.heatTimer = this.heatDuration;
        this.heatEnergy = 1;
        this.animState = 'heat';
        return true;
    }

    activateHeatEngager() {
        if (this.heatActive || this.heatMeter < this.maxHeatMeter) return false;
        this.heatActive = true;
        this.heatTimer = this.heatDuration;
        this.heatEnergy = 2;
        this.animState = 'heat';
        return true;
    }

    endHeat() {
        this.heatActive = false;
        this.heatEnergy = 0;
        this.heatBurstUsed = true;
    }

    useHeatEnergy(n) {
        this.heatEnergy = Math.max(0, this.heatEnergy - n);
        if (this.heatEnergy <= 0) this.endHeat();
    }

    activateRage() {
        this.rageActive = true;
        this.animState = 'rage';
    }

    recoverHealth(amount) {
        const fromRecoverable = Math.min(this.recoverableHealth, amount);
        this.recoverableHealth -= fromRecoverable;
        this.health = Math.min(this.maxHealth, this.health + fromRecoverable);
    }

    resetCombo() {
        this.comboCount = 0;
        this.comboDamage = 0;
        this.comboTimer = 0;
    }

    getGhostHealth() {
        if (this.ghostHealth > this.health) {
            this.ghostHealth = Math.max(this.health, this.ghostHealth - this.maxHealth * 0.004);
        } else {
            this.ghostHealth = this.health;
        }
        return this.ghostHealth;
    }

    resetForRound(x, facing) {
        this.x = x;
        this.y = 0;
        this.z = 0;
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
        this.facing = facing;
        this.health = this.maxHealth;
        this.recoverableHealth = 0;
        this.ghostHealth = this.maxHealth;
        this.guardMeter = this.maxGuardMeter;
        this.heatMeter = 0;
        this.heatActive = false;
        this.heatEnergy = 0;
        this.heatTimer = 0;
        this.heatBurstUsed = false;
        this.heatSmashUsed = false;
        this.rageActive = false;
        this.rageUsed = false;
        this.rageArtsUsed = 0;
        this.stance = Stance.NONE;
        this.hsdCharge = 0;
        this.chargeLevel = 0;
        this.charging = false;
        this.currentMove = null;
        this.moveFrame = 0;
        this.hitStunFrames = 0;
        this.blockStunFrames = 0;
        this.invulnFrames = 0;
        this.armorFrames = 0;
        this.juggleCount = 0;
        this.floorBounces = 0;
        this.throwTechWindow = 0;
        this.isRingOut = false;
        this.tornadoFrames = 0;
        this.spiralFrames = 0;
        this.wallCarry = false;
        this.wallCarrySide = null;
        this.wallSide = null;
        this.pendingWallBounce = false;
        this.isBouncedOut = false;
        this.tornadoRefreshes = 0;
        this.juggleDropped = false;
        this.floorBounces = 0;
        this.balconyBrokenBy = null;
        this.wallSplattedBy = null;
        this.juggleCount = 0;
        this.isJumping = false;
        this.isCrouching = false;
        this.grounded = true;
        this.parser.reset();
        this.resetCombo();
        this.setState(State.IDLE);
        this.animState = 'idle';
        this.moveHistory = [];
    }
}

const BUTTON_ALIASES = {
    leftPunch: 1, rightPunch: 1, punch: 1, kick: 1, block: 1,
    heat: 1, rage: 1, special: 1,
};
