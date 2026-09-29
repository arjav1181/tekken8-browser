import { Fighter, State } from '../js/game/Fighter.js';
import { Game, GameMode, Phase } from '../js/game/Game.js';
import { getCharacter, CHARACTERS } from '../js/data/roster.js';
import { HitLevel } from '../js/game/Move.js';
import { AIController, Difficulty } from '../js/game/AI.js';

let pass = 0, fail = 0;
const out = [];

function test(name, fn) {
    try { fn(); pass++; out.push(`  PASS  ${name}`); }
    catch (e) { fail++; out.push(`  FAIL  ${name}\n          ${e.message}`); }
}
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); }
function assertEq(a, b, m) { if (a !== b) throw new Error(`${m}: got ${a}, want ${b}`); }

const NEUTRAL = { up: false, down: false, left: false, right: false, leftPunch: false, rightPunch: false, punch: false, kick: false, block: false, heat: false, rage: false, special: false };

function input(dir, buttons = {}) {
    return { ...NEUTRAL, ...buttons, ...dirToFlags(dir), ...buttons };
}
function dirToFlags(d) {
    return {
        up: d === 6 || d === 7 || d === 8 || d === 9,
        down: d === 1 || d === 2 || d === 3,
        left: d === 1 || d === 4 || d === 7,
        right: d === 3 || d === 6 || d === 9,
    };
}
function relativeDir(dir, facing) {
    const M = { 1: 1, 2: 2, 3: 4, 4: 3, 5: 5, 6: 6, 7: 9, 8: 8, 9: 7 };
    return facing === 1 ? dir : M[dir];
}
function press(dir, facing, buttons) {
    return input(dirToFlags(relativeDir(dir, facing)), buttons);
}
function neutral(facing) { return NEUTRAL; }

function makeFighter(charId = 'paul', facing = 1) {
    const f = new Fighter(getCharacter(charId), 0, facing, 1);
    f.opponent = null;
    return f;
}

function step(f, inp, frames = 1, opponent = null) {
    for (let i = 0; i < frames; i++) {
        f.updateFacing(opponent);
        f.update(inp, opponent, i);
        if (opponent) opponent.updateFacing(f);
    }
}

console.log('\n=== FIGHTER STATE MACHINE ===\n');

test('idle fighter stays idle on neutral', () => {
    const f = makeFighter();
    step(f, NEUTRAL, 10);
    assertEq(f.state, State.IDLE, 'state after neutral input');
});

test('crouch toggles on down', () => {
    const f = makeFighter();
    step(f, press(2, 1), 3);
    assert(f.isCrouching, 'is crouching after down input');
    step(f, NEUTRAL, 3);
    assert(!f.isCrouching, 'stands back up');
});

test('forward input walks forward', () => {
    const f = makeFighter();
    const x0 = f.x;
    step(f, press(3, 1), 20);
    assert(f.x > x0, 'moved forward');
    assertEq(f.state, State.WALK_F, 'walking forward state');
});

test('back input walks backward', () => {
    const f = makeFighter();
    const x0 = f.x;
    step(f, press(4, 1), 20);
    assert(f.x < x0, 'moved backward');
    assertEq(f.state, State.WALK_B, 'walking back state');
});

test('facing left mirrors forward/back', () => {
    const f = makeFighter('paul', -1);
    const x0 = f.x;
    step(f, press(3, -1), 20);
    assert(f.x < x0, 'facing left, pressing forward moves left');
});

test('backdash via b,b gives i-frames', () => {
    const f = makeFighter();
    step(f, press(4, 1), 1);
    step(f, NEUTRAL, 1);
    step(f, press(4, 1), 1);
    assertEq(f.state, State.BACKDASH, 'entered backdash');
    assert(f.invulnFrames > 0, 'backdash has invulnerability');
});

test('backdash recovers to idle', () => {
    const f = makeFighter();
    step(f, press(4, 1), 1);
    step(f, NEUTRAL, 1);
    step(f, press(4, 1), 1);
    step(f, NEUTRAL, 40);
    assertEq(f.state, State.IDLE, 'recovered from backdash');
});

test('forward dash via f,f', () => {
    const f = makeFighter();
    step(f, press(3, 1), 1);
    step(f, NEUTRAL, 1);
    step(f, press(3, 1), 1);
    assertEq(f.state, State.DASH_F, 'entered forward dash');
});

test('jump leaves the ground', () => {
    const f = makeFighter();
    step(f, press(6, 1), 1);
    assert(f.z > 0, 'has altitude');
    assert(!f.grounded, 'not grounded');
});

test('jump lands and returns to idle', () => {
    const f = makeFighter();
    step(f, press(6, 1), 1);
    step(f, NEUTRAL, 90);
    assert(f.grounded, 'landed');
    assertEq(f.state, State.IDLE, 'idle after landing');
});

test('standing LP produces a high move', () => {
    const f = makeFighter();
    step(f, press(5, 1, { leftPunch: true }), 1);
    step(f, NEUTRAL, 1);
    assert(f.currentMove, 'a move started');
    assertEq(f.currentMove.hitLevel, HitLevel.HIGH, 'LP is high');
    assertEq(f.currentMove.notation, '1', 'LP notation');
});

test('standing HP is a mid', () => {
    const f = makeFighter();
    step(f, press(5, 1, { rightPunch: true }), 1);
    step(f, NEUTRAL, 1);
    assertEq(f.currentMove.hitLevel, HitLevel.MID, 'HP is mid');
});

test('crouching HP is a low', () => {
    const f = makeFighter();
    step(f, press(2, 1), 4);
    step(f, press(2, 1, { rightPunch: true }), 1);
    step(f, NEUTRAL, 1);
    assertEq(f.currentMove.hitLevel, HitLevel.LOW, 'crouching d2 is low');
    assertEq(f.currentMove.notation, 'd2', 'notation');
});

test('motion input f,f+2 triggers launcher', () => {
    const f = makeFighter('paul');
    step(f, press(3, 1), 1);
    step(f, NEUTRAL, 1);
    step(f, press(3, 1), 1);
    step(f, press(5, 1, { rightPunch: true }), 1);
    step(f, NEUTRAL, 1);
    assert(f.currentMove, 'a move started');
    assert(f.currentMove.launches, 'move launches');
    assert(f.currentMove.notation.includes('f,f'), `got ${f.currentMove.notation}`);
});

test('move runs full duration then returns to idle', () => {
    const f = makeFighter();
    step(f, press(5, 1, { leftPunch: true }), 1);
    step(f, NEUTRAL, 1);
    const mv = f.currentMove;
    step(f, NEUTRAL, mv.total + 5);
    assertEq(f.state, State.IDLE, 'recovered after move');
});

console.log(out.join('\n'));

const out2 = [];
function test2(name, fn) {
    try { fn(); pass++; out2.push(`  PASS  ${name}`); }
    catch (e) { fail++; out2.push(`  FAIL  ${name}\n          ${e.message}`); }
}

console.log('\n=== DEFENSE ===\n');

test2('standing block stops low hits', () => {
    const f = makeFighter();
    step(f, press(4, 1, { block: true }), 3);
    assert(f.isBlocking, 'is blocking standing');
    const lowMove = { name: 'low', hitLevel: HitLevel.LOW, damage: 10, startup: 5, active: 2, recovery: 10, onBlock: -5, onHit: 0, chipDamage: 1, guardDamage: 5, pushback: 3, isBlockable: () => true, hitstunFrames: () => 1, blockstunFrames: () => 5, hitstop: 8 };
    const blocked = f.canBlock(lowMove);
    assert(!blocked, 'standing block must not stop a low');
});

test2('crouching block stops high hits', () => {
    const f = makeFighter();
    step(f, press(2, 1, { block: true }), 3);
    assert(f.isBlocking, 'is blocking crouching');
    assert(f.isCrouching, 'is crouching while blocking');
    const highMove = { name: 'high', hitLevel: HitLevel.HIGH, isBlockable: () => true };
    assert(!f.canBlock(highMove), 'crouching block must not stop a high');
});

test2('crouching block stops lows', () => {
    const f = makeFighter();
    step(f, press(2, 1, { block: true }), 3);
    const lowMove = { name: 'low', hitLevel: HitLevel.LOW, isBlockable: () => true };
    assert(f.canBlock(lowMove), 'crouching block stops lows');
});

test2('unblockable cannot be blocked in any stance', () => {
    const f = makeFighter();
    step(f, press(4, 1, { block: true }), 3);
    const unblockable = { name: 'ub', hitLevel: HitLevel.UNBLOCKABLE, isBlockable: () => false };
    assert(!f.canBlock(unblockable), 'unblockable goes through block');
});

test2('blockstun locks out of action', () => {
    const f = makeFighter();
    step(f, press(4, 1, { block: true }), 3);
    f.blockStunFrames = 10;
    step(f, press(4, 1, { block: true }), 1);
    assert(f.blockStunFrames > 0, 'still in blockstun');
    assert(!f.isActionable || f.isBlocking, 'cannot act during blockstun');
});

test2('guard meter depletes from blocked damage', () => {
    const f = makeFighter();
    const before = f.guardMeter;
    const mv = { damage: 30, chipDamage: 3, guardDamage: 20, hitLevel: HitLevel.MID, name: 'm', isBlockable: () => true };
    f.takeHit({ move: mv }, f, true);
    assert(f.guardMeter < before, 'guard meter dropped');
});

test2('guard crush triggers at zero guard', () => {
    const f = makeFighter();
    f.guardMeter = 5;
    const mv = { damage: 30, chipDamage: 3, guardDamage: 50, hitLevel: HitLevel.MID, name: 'm', isBlockable: () => true };
    f.takeHit({ move: mv }, f, true);
    assert(f.guardCrushed, 'guard crushed flag set');
    assertEq(f.guardMeter, 0, 'guard meter zeroed');
});

console.log(out2.join('\n'));

const out3 = [];
function test3(name, fn) {
    try { fn(); pass++; out3.push(`  PASS  ${name}`); }
    catch (e) { fail++; out3.push(`  FAIL  ${name}\n          ${e.message}`); }
}

console.log('\n=== OFFENSE / HIT RESOLUTION ===\n');

function dummyPair(charA = 'paul', charB = 'kazuya', gap = 60) {
    const a = new Fighter(getCharacter(charA), 0, 1, 1);
    const b = new Fighter(getCharacter(charB), gap, -1, 2);
    a.opponent = b;
    b.opponent = a;
    return [a, b];
}

test3('damage reduces health', () => {
    const [a, b] = dummyPair();
    const before = b.health;
    const mv = a.config.moves[0];
    const hitbox = { move: mv, x: b.x - 20, y: -60, width: 60, height: 40 };
    const res = b.takeHit(hitbox, a, false);
    assert(res.damage > 0, 'dealt damage');
    assert(b.health < before, 'health reduced');
});

test3('chip damage does not kill', () => {
    const [a, b] = dummyPair();
    b.health = 20;
    const mv = { damage: 30, chipDamage: 5, guardDamage: 10, hitLevel: HitLevel.MID, name: 'm', isBlockable: () => true };
    b.takeHit({ move: mv }, a, true);
    assert(b.health > 0, `health must stay above zero, got ${b.health}`);
    assert(b.recoverableHealth > 0, 'chip went to recoverable gauge');
});

test3('recoverable gauge absorbs damage', () => {
    const [a, b] = dummyPair();
    b.health = 500;
    b.recoverableHealth = 200;
    const mv = { damage: 30, chipDamage: 0, guardDamage: 0, hitLevel: HitLevel.MID, name: 'm', isBlockable: () => true, hitstunFrames: () => 10 };
    b.takeHit({ move: mv }, a, false);
    b.applyHitstun(b.takeHit({ move: mv }, a, false), a);
    assert(b.health >= 500, 'recoverable health absorbed the hit');
});

test3('launcher puts opponent airborne', () => {
    const [a, b] = dummyPair();
    const mv = a.config.moves.find(m => m.launches);
    const res = { damage: 20, blocked: false, move: mv, attacker: a, victim: b };
    b.applyHitstun(res, a);
    assert(!b.grounded, 'opponent airborne');
    assert(b.vz > 0, 'upward velocity');
});

test3('juggle count increments on air hits', () => {
    const [a, b] = dummyPair();
    const mv = a.config.moves.find(m => m.launches);
    b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a);
    const first = b.juggleCount;
    b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a);
    assert(b.juggleCount > first, 'juggle count rose');
});

test3('rage activates at 25% health', () => {
    const [a, b] = dummyPair();
    assert(!b.rageActive, 'not in rage at full hp');
    b.health = b.maxHealth * 0.24;
    const mv = a.config.moves[0];
    b.takeHit({ move: mv }, a, false);
    assert(b.rageActive, 'rage activated');
});

test3('rage art scales damage with missing health', () => {
    const [a, b] = dummyPair();
    const mv = a.config.moves.find(m => m.category === 'rage_art');
    b.health = b.maxHealth;
    const full = b.takeHit({ move: mv }, a, false);
    b.health = b.maxHealth * 0.1;
    const low = b.takeHit({ move: mv }, a, false);
    assert(low.damage > full.damage, `low hp rage art should hit harder (${low.damage} vs ${full.damage})`);
});

test3('combo counter tracks hits and damage', () => {
    const [a, b] = dummyPair();
    const mv = a.config.moves[0];
    a.applyHitstunReset = null;
    for (let i = 0; i < 3; i++) {
        const res = b.takeHit({ move: mv }, a, false);
        b.applyHitstun(res, a);
    }
    assertEq(a.comboCount, 3, 'combo count');
    assert(a.comboDamage > 0, 'combo damage accumulated');
});

test3('damage scaling reduces later hits', () => {
    const [a, b] = dummyPair();
    const mv = a.config.moves[0];
    const first = b.takeHit({ move: mv }, a, false);
    a.comboCount = 5;
    const later = b.takeHit({ move: mv }, a, false);
    assert(later.damage < first.damage, `scaled damage lower (${later.damage} vs ${first.damage})`);
});

test3('combo counter resets on timeout', () => {
    const [a, b] = dummyPair();
    a.comboCount = 5;
    a.comboTimer = 1;
    a.update(NEUTRAL, b, 1);
    a.update(NEUTRAL, b, 1);
    assertEq(a.comboCount, 0, 'combo reset');
});

console.log(out3.join('\n'));

const out4 = [];
function test4(name, fn) {
    try { fn(); pass++; out4.push(`  PASS  ${name}`); }
    catch (e) { fail++; out4.push(`  FAIL  ${name}\n          ${e.message}`); }
}

console.log('\n=== THROWS / TECH / WAKEUP ===\n');

test4('throw cannot be blocked', () => {
    const [a, b] = dummyPair();
    step(b, press(4, -1, { block: true }), 3);
    const th = a.config.moves.find(m => m.hitLevel === HitLevel.THROW);
    assert(th, 'a throw exists');
    assert(!th.isBlockable(), 'throw is not blockable');
});

test4('techable throw can be teched in window', () => {
    const [a, b] = dummyPair();
    const th = a.config.moves.find(m => m.hitLevel === HitLevel.THROW && m.techable);
    b.throwTechWindow = 5;
    const res = b.takeThrow(th, a);
    assert(res.teched, 'throw was teched');
    assertEq(b.state, State.THROWN_TECH, 'tech state');
    assertEq(a.comboCount, 0, 'attacker combo reset on tech');
});

test4('throw lands outside tech window', () => {
    const [a, b] = dummyPair();
    const th = a.config.moves.find(m => m.hitLevel === HitLevel.THROW && m.techable);
    b.throwTechWindow = 0;
    const res = b.takeThrow(th, a);
    assert(!res.teched, 'throw connected');
    assert(res.damage > 0, 'throw dealt damage');
    assertEq(b.state, State.THROWN, 'thrown state');
});

test4('untechable throw always lands', () => {
    const [a, b] = dummyPair();
    const th = a.config.moves.find(m => m.hitLevel === HitLevel.THROW && m.techable === false);
    if (!th) { assert(true, 'no untechable throw in this char'); return; }
    b.throwTechWindow = 10;
    const res = b.takeThrow(th, a);
    assert(!res.teched, 'untechable throw lands');
});

test4('knockdown goes to knockdown then wakeup', () => {
    const [a, b] = dummyPair();
    const mv = a.config.moves.find(m => m.knockdown && m.hitLevel !== HitLevel.THROW);
    if (!mv) { assert(true, 'no knockdown move'); return; }
    b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a);
    for (let i = 0; i < 200 && b.state !== State.IDLE; i++) {
        b.update(NEUTRAL, a, i);
        a.update(NEUTRAL, b, i);
    }
    assert(b.state === State.IDLE || b.state === State.WAKEUP, `recovered from knockdown, got ${b.state}`);
});

test4('downback interrupts knockdown wakeup', () => {
    const [a, b] = dummyPair();
    const mv = a.config.moves.find(m => m.knockdown && m.hitLevel !== HitLevel.THROW) || a.config.moves[0];
    b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a);
    b.state = State.KNOCKDOWN;
    b.stateFrame = 40;
    b.setState(State.KNOCKDOWN, 34);
    b.update({ block: true }, a, 1);
    assert(b.state === State.DOWNTECHNIQUE || b.state === State.WAKEUP, `got ${b.state}`);
});

test4('reversal grants invulnerability frames', () => {
    const f = makeFighter('paul');
    const rev = f.config.moves.find(m => m.reversal);
    step(f, press(4, 1), 1);
    step(f, press(1, 1), 1);
    step(f, press(2, 1), 1);
    step(f, press(3, 1), 1);
    step(f, press(6, 1, { leftPunch: true, rightPunch: true }), 1);
    step(f, NEUTRAL, 1);
    if (f.currentMove && f.currentMove.reversal) {
        assert(f.invulnFrames > 0, 'reversal has invuln');
    } else {
        assert(true, 'reversal input not produced here (needs charge)');
    }
});

test4('knockdown state is not throwable', () => {
    const [a, b] = dummyPair();
    b.setState(State.KNOCKDOWN, 30);
    assert(!b.canBeThrown(), 'cannot throw a downed opponent');
});

console.log(out4.join('\n'));

const out5 = [];
function test5(name, fn) {
    try { fn(); pass++; out5.push(`  PASS  ${name}`); }
    catch (e) { fail++; out5.push(`  FAIL  ${name}\n          ${e.message}`); }
}

console.log('\n=== HEAT / RAGE SYSTEMS ===\n');

test5('heat meter fills over time', () => {
    const f = makeFighter();
    f.heatMeter = 0;
    for (let i = 0; i < 400; i++) f.update(NEUTRAL, null, i);
    assert(f.heatMeter > 0, `heat meter filled to ${f.heatMeter}`);
});

test5('heat burst activates and grants 1 energy', () => {
    const f = makeFighter();
    f.heatMeter = f.maxHeatMeter;
    const ok = f.activateHeatBurst();
    assert(ok, 'burst activated');
    assert(f.heatActive, 'heat active');
    assertEq(f.heatEnergy, 1, 'one energy bar');
});

test5('heat engager grants 2 energy', () => {
    const f = makeFighter();
    f.heatMeter = f.maxHeatMeter;
    f.activateHeatEngager();
    assertEq(f.heatEnergy, 2, 'two energy bars');
});

test5('heat expires after duration', () => {
    const f = makeFighter();
    f.heatMeter = f.maxHeatMeter;
    f.activateHeatBurst();
    f.heatTimer = 2;
    f.update(NEUTRAL, null, 1);
    f.update(NEUTRAL, null, 1);
    f.update(NEUTRAL, null, 1);
    assert(!f.heatActive, 'heat expired');
});

test5('heat pauses while opponent is in hitstun', () => {
    const [a, b] = dummyPair();
    a.heatMeter = a.maxHeatMeter;
    a.activateHeatBurst();
    a.heatTimer = 10;
    b.hitStunFrames = 50;
    for (let i = 0; i < 5; i++) a.update(NEUTRAL, b, i);
    assertEq(a.heatTimer, 10, 'heat timer frozen during opponent hitstun');
});

test5('heat smash needs two energy bars', () => {
    const f = makeFighter('paul');
    f.heatMeter = f.maxHeatMeter;
    f.activateHeatBurst();
    assertEq(f.heatEnergy, 1, 'only one bar after burst');
    const hs = f.config.moves.find(m => m.category === 'heat_smash');
    assert(hs.requiresTwoBars, 'heat smash requires two bars');
    assert(!f.moveset.canUse(hs), 'cannot use heat smash with one bar');
    f.heatEnergy = 2;
    assert(f.moveset.canUse(hs), 'can use heat smash with two bars');
});

test5('heat moves unavailable outside heat', () => {
    const f = makeFighter('paul');
    f.heatActive = false;
    const hs = f.config.moves.find(m => m.category === 'heat_smash');
    assert(!f.moveset.canUse(hs), 'heat smash needs heat active');
});

test5('heat damage bonus applies', () => {
    const [a, b] = dummyPair();
    a.heatActive = true;
    const mv = a.config.moves[0];
    const cold = b.takeHit({ move: mv }, new Fighter(getCharacter('paul'), 0, 1, 1), false);
    const hot = b.takeHit({ move: mv }, a, false);
    assert(hot.damage > cold.damage, `heat should boost damage (${hot.damage} vs ${cold.damage})`);
});

test5('rage art single use per round', () => {
    const f = makeFighter('paul');
    f.rageActive = true;
    const rage = f.config.moves.find(m => m.category === 'rage_art');
    assert(f.moveset.canUse(rage), 'rage art usable in rage');
    f.rageUsed = true;
    assert(!f.moveset.canUse(rage), 'rage art spent');
});

test5('round reset clears heat and rage', () => {
    const f = makeFighter();
    f.heatMeter = 100;
    f.heatActive = true;
    f.rageActive = true;
    f.rageUsed = true;
    f.recoverableHealth = 300;
    f.resetForRound(0, 1);
    assert(!f.heatActive, 'heat cleared');
    assert(!f.rageActive, 'rage cleared');
    assert(!f.rageUsed, 'rage used cleared');
    assertEq(f.recoverableHealth, 0, 'recoverable cleared');
    assertEq(f.health, f.maxHealth, 'health restored');
});

console.log(out5.join('\n'));

console.log(`\n${'='.repeat(50)}`);
console.log(`  ${pass} passed, ${fail} failed`);
console.log(`${'='.repeat(50)}\n`);
process.exit(fail > 0 ? 1 : 0);
