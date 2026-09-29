import { Fighter, State } from '../js/game/Fighter.js';
import { Game } from '../js/game/Game.js';
import { getCharacter, CHARACTERS } from '../js/data/roster.js';
import { HitLevel } from '../js/game/Move.js';
import { WALL, WALL_LIMIT, isAgainstWall, canWallCarry, clampToStage } from '../js/game/WallGame.js';

let pass = 0, fail = 0;
const out = [];
function test(name, fn) {
    try { fn(); pass++; out.push(`  PASS  ${name}`); }
    catch (e) { fail++; out.push(`  FAIL  ${name}\n          ${e.message}`); }
}
const A = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const E = (a, b, m) => { if (a !== b) throw new Error(`${m || 'eq'}: got ${a}, want ${b}`); };

const NEUTRAL = { up:false, down:false, left:false, right:false, leftPunch:false, rightPunch:false,
                  punch:false, kick:false, block:false, heat:false, rage:false, special:false };

function pair(idA = 'xiaoyu', idB = 'king', aX = 420, bX = 495) {
    const a = new Fighter(getCharacter(idA), aX, 1, 1);
    const b = new Fighter(getCharacter(idB), bX, -1, 2);
    a.opponent = b; b.opponent = a;
    return [a, b];
}

console.log('\n=== WALL GAME ===\n');

test('wall limit constant is shared', () => {
    E(WALL.LIMIT, WALL_LIMIT, 'WALL.LIMIT matches export');
    E(WALL.SOFT_LIMIT, 460, 'soft limit');
    E(WALL.CARRY_ZONE, 380, 'carry zone');
});

test('clampToStage holds fighters inside the stage', () => {
    const f = { x: 800 };
    E(clampToStage(f), 'right', 'clamped right');
    E(f.x, WALL_LIMIT, 'clamped to limit');
    const g = { x: -800 };
    E(clampToStage(g), 'left', 'clamped left');
    E(g.x, -WALL_LIMIT, 'clamped to -limit');
    const h = { x: 10 };
    E(clampToStage(h), null, 'center untouched');
});

test('isAgainstWall respects range argument', () => {
    A(isAgainstWall({ x: 495 }, 0), 'at wall');
    A(!isAgainstWall({ x: 300 }, 0), 'far from wall');
    A(isAgainstWall({ x: 450 }, 60), 'within 60 of wall');
    A(!isAgainstWall({ x: 400 }, 60), 'outside 60 of wall');
});

test('fighter cannot leave stage bounds while airborne', () => {
    const f = new Fighter(getCharacter('paul'), 0, 1, 1);
    f.opponent = null;
    f.vx = 40;
    f.vz = 6;
    f.z = 20;
    for (let i = 0; i < 60; i++) f.update(NEUTRAL, null, i);
    A(f.x <= WALL_LIMIT, `clamped at ${f.x}`);
});

test('wall splat move splats an airborne opponent at the wall', () => {
    const [atk, def] = pair();
    const mv = atk.config.moves.find(m => m.wallSplat);
    A(mv, 'attacker has a wall splat move');
    def.z = 60;
    def.grounded = false;
    def.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: atk, victim: def }, atk);
    E(def.state, State.WALL_SPLAT, 'victim splatted');
    A(def.wallSplattedBy === atk, 'splat credited to attacker');
    E(def.juggleCount, 0, 'juggle reset on splat');
});

test('wall splat does nothing away from the wall', () => {
    const [atk, def] = pair();
    def.x = 0;
    const mv = atk.config.moves.find(m => m.wallSplat);
    def.z = 60;
    def.grounded = false;
    def.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: atk, victim: def }, atk);
    A(def.state !== State.WALL_SPLAT, 'no splat at center stage');
});

test('wall splat transitions to bounce then knockdown', () => {
    const [atk, def] = pair();
    const mv = atk.config.moves.find(m => m.wallSplat);
    def.z = 60; def.grounded = false;
    def.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: atk, victim: def }, atk);
    for (let i = 0; i < 40; i++) def.update(NEUTRAL, atk, i);
    E(def.state, State.WALL_BOUNCE, 'became wall bounce');
    for (let i = 0; i < 40; i++) def.update(NEUTRAL, atk, i);
    E(def.state, State.KNOCKDOWN, 'settled to knockdown');
});

test('wall bounce sends victim away from the wall', () => {
    const [atk, def] = pair('xiaoyu', 'king', 420, 495);
    const mv = atk.config.moves.find(m => m.wallSplat);
    def.z = 60; def.grounded = false;
    def.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: atk, victim: def }, atk);
    for (let i = 0; i < 40; i++) def.update(NEUTRAL, atk, i);
    A(def.vx < 0, `bounced inward (vx=${def.vx})`);
    A(def.invulnFrames > 0, 'bounce has brief invuln');
});

test('balcony break flags a ring-out', () => {
    const [atk, def] = pair('king', 'kazuya', 430, 498);
    const mv = atk.config.moves.find(m => m.balconyBreak);
    A(mv, 'attacker has a balcony break move');
    def.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: atk, victim: def }, atk);
    E(def.state, State.BALCONY_BREAK, 'balcony break state');
    A(def.isBouncedOut, 'marked for ring out');
    E(def.recoverableHealth, 0, 'recoverable health cleared');
    A(def.health < def.maxHealth, 'took the break damage');
});

test('balcony break does nothing away from the wall', () => {
    const [atk, def] = pair('king', 'kazuya', 0, 0);
    const mv = atk.config.moves.find(m => m.balconyBreak);
    def.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: atk, victim: def }, atk);
    A(def.state !== State.BALCONY_BREAK, 'no balcony break at center');
});

test('balcony break leads to ring out', () => {
    const [atk, def] = pair('king', 'kazuya', 430, 498);
    const mv = atk.config.moves.find(m => m.balconyBreak);
    def.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: atk, victim: def }, atk);
    for (let i = 0; i < 200; i++) def.update(NEUTRAL, atk, i);
    A(def.isRingOut, `ring out reached (state=${def.state})`);
});

test('wall carry pins victim in place', () => {
    const [atk, def] = pair();
    const mv = atk.config.moves.find(m => m.wallCarry);
    A(mv, 'attacker has a wall carry move');
    def.x = 490;
    def.z = 50;
    def.grounded = false;
    const before = def.x;
    def.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: atk, victim: def }, atk);
    A(def.wallCarry, 'wall carry flag set');
    A(def.tornadoFrames > 0, 'tornado frames granted');
    for (let i = 0; i < 6; i++) def.update(NEUTRAL, atk, i);
    A(Math.abs(def.x - before) < 6, `pinned at wall (moved ${(def.x - before).toFixed(1)})`);
});

test('wall carry released when carried away from wall', () => {
    const [atk, def] = pair();
    def.x = 490;
    def.z = 50;
    def.grounded = false;
    def.wallCarry = true;
    def.tornadoFrames = 10;
    def.x = 100;
    for (let i = 0; i < 20; i++) def.update(NEUTRAL, atk, i);
    A(!def.wallCarry, 'wall carry released');
});

test('tornado raises the juggle allowance', () => {
    const f = new Fighter(getCharacter('paul'), 0, 1, 1);
    f.opponent = null;
    const base = f.juggleAllowance;
    f.tornadoFrames = 20;
    A(f.juggleAllowance > base, `tornado raises cap (${base} -> ${f.juggleAllowance})`);
    f.tornadoFrames = 0;
    f.wallCarry = true;
    A(f.juggleAllowance > base, 'wall carry raises cap');
});

test('tornado move suspends the juggle counter', () => {
    const [atk, def] = pair();
    const mv = atk.config.moves.find(m => m.tornado);
    A(mv, 'attacker has a tornado move');
    def.x = 490;
    def.z = 50;
    def.grounded = false;
    def.juggleCount = 0;
    def.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: atk, victim: def }, atk);
    A(def.tornadoFrames > 0, 'tornado active');
    A(atk.tornadoUsedThisCombo, 'attacker flagged tornado use');
    E(def.juggleCount, 0, 'juggle count not incremented by tornado');
});

test('juggle cap stops infinite air loops', () => {
    const [atk, def] = pair();
    const mv = atk.config.moves.find(m => m.launches);
    for (let i = 0; i < 12; i++) {
        def.z = 50;
        def.grounded = false;
        def.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: atk, victim: def }, atk);
    }
    A(def.juggleDropped, 'juggle limit flagged');
    A(def.juggleCount <= def.juggleLimit + 1, `juggle count bounded (${def.juggleCount})`);
});

test('wall moves are unavailable at center stage', () => {
    const f = new Fighter(getCharacter('xiaoyu'), 0, 1, 1);
    f.opponent = null;
    const wallMove = f.config.moves.find(m => m.wallThrow);
    A(wallMove, 'has a wall throw');
    A(!f.moveset.canUse(wallMove), 'wall throw blocked at center');
    f.x = 490;
    A(f.moveset.canUse(wallMove), 'wall throw available at wall');
});

test('wall-splatted victim cannot be normal-thrown', () => {
    const [atk, def] = pair();
    def.setState(State.WALL_SPLAT, WALL.SPLAT_FRAMES);
    A(!def.canBeThrown(false), 'normal throw blocked on wall splat');
    A(def.canBeThrown(true), 'wall throw allowed on wall splat');
});

test('wall throw sets up ring out', () => {
    const input = { getP1: () => NEUTRAL, getP2: () => NEUTRAL, isPressed: () => false };
    const renderer = { width:1280, height:720, ctx:{}, addShake(){}, setShake(){}, spawnHitSpark(){}, spawnBlockSpark(){} };
    const g = new Game(renderer, input);
    g.startMatch('versus', 'xiaoyu', 'king', { stageIndex: 0 });
    g.p2.x = WALL_LIMIT - 4;
    g.p2.setState(State.WALL_SPLAT, WALL.SPLAT_FRAMES);
    g.p1.x = WALL_LIMIT - 60;
    const wallThrow = g.p1.config.moves.find(m => m.wallThrow);
    A(wallThrow, 'xiaoyu has a wall throw');
    g.p1.startMove(wallThrow);
    g.p1.moveFrame = wallThrow.startup;
    for (let i = 0; i < 4; i++) {
        g.p1.update(NEUTRAL, g.p2, i);
        g.p2.update(NEUTRAL, g.p1, i);
    }
    A(g.p2.isBouncedOut || g.p2.state === State.THROWN, `wall throw engaged (state=${g.p2.state}, bounced=${g.p2.isBouncedOut})`);
});

test('every character has at least one wall-game move', () => {
    for (const c of CHARACTERS) {
        const wall = c.moves.filter(m => m.wallThrow || m.wallSplat || m.balconyBreak || m.spiral);
        A(wall.length > 0, `${c.id} has no wall game moves`);
    }
});

test('wall moves have valid frame data', () => {
    for (const c of CHARACTERS) {
        for (const m of c.moves) {
            if (!m.wallThrow && !m.wallSplat && !m.balconyBreak && !m.spiral) continue;
            A(m.startup >= 3, `${c.id}/${m.name} wall move startup`);
            if (!m.wallThrow) A(m.active >= 1, `${c.id}/${m.name} wall move active`);
            if (m.wallThrow) A(m.techable === true, `${c.id}/${m.name} wall throw techable`);
        }
    }
});

test('round reset clears all wall state', () => {
    const f = new Fighter(getCharacter('king'), 0, 1, 1);
    f.opponent = null;
    f.tornadoFrames = 30;
    f.wallCarry = true;
    f.isBouncedOut = true;
    f.wallSide = 'right';
    f.pendingWallBounce = true;
    f.juggleCount = 4;
    f.resetForRound(0, 1);
    E(f.tornadoFrames, 0, 'tornado cleared');
    E(f.wallCarry, false, 'wall carry cleared');
    E(f.isBouncedOut, false, 'bounce cleared');
    E(f.wallSide, null, 'wall side cleared');
    E(f.pendingWallBounce, false, 'pending bounce cleared');
    E(f.juggleCount, 0, 'juggle cleared');
});

test('wall game does not break a normal round sim', () => {
    const input = { getP1: () => NEUTRAL, getP2: () => NEUTRAL, isPressed: () => false };
    const renderer = { width:1280, height:720, ctx:{}, addShake(){}, setShake(){}, spawnHitSpark(){}, spawnBlockSpark(){} };
    for (const c of CHARACTERS) {
        const opp = CHARACTERS.find(x => x.id !== c.id);
        const g = new Game(renderer, input);
        g.startMatch('versus', c.id, opp.id, { stageIndex: 0 });
        for (let i = 0; i < 400; i++) {
            g.p1.vx = 9;
            g.p2.vx = -9;
            g.update(1 / 60);
        }
        A(Number.isFinite(g.p1.x), `${c.id} p1 x is finite (${g.p1.x})`);
        A(Math.abs(g.p1.x) <= WALL_LIMIT + 1, `${c.id} p1 inside stage (${g.p1.x})`);
        A(Number.isFinite(g.p1.health), `${c.id} health finite`);
    }
});

test('spiral move pins against the wall', () => {
    const f = new Fighter(getCharacter('yoshimitsu'), 0, 1, 1);
    f.opponent = null;
    const spiral = f.config.moves.find(m => m.spiral);
    A(spiral, 'yoshimitsu has a spiral throw');
    f.x = 492;
    f.applyHitstun({ damage: 20, blocked: false, move: spiral, attacker: f, victim: f }, f);
    A(f.spiralFrames > 0, 'spiral frames active');
});

console.log(out.join('\n'));

console.log('\n' + '='.repeat(52));
console.log(`  ${pass} passed, ${fail} failed`);
console.log('='.repeat(52) + '\n');
process.exit(fail > 0 ? 1 : 0);
