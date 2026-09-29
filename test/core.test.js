import { createMotionParser, toNumpad, toRelative, encodeInput, decodeInput, InputBuffer } from '../js/game/MotionInput.js';
import { Move, HitLevel, MoveCategory, getPenalizedDamage } from '../js/game/Move.js';
import { CHARACTERS, ROSTER } from '../js/data/roster.js';
import { STAGES, getStage } from '../js/data/stages.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JS_ROOT = path.resolve(HERE, '..', 'js');

function listJs(dir, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) listJs(full, acc);
        else if (e.name.endsWith('.js')) acc.push(full);
    }
    return acc;
}

let pass = 0, fail = 0;
const out = [];
function test(name, fn) {
    try { fn(); pass++; out.push(`  PASS  ${name}`); }
    catch (e) { fail++; out.push(`  FAIL  ${name}\n          ${e.message}`); }
}
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); }
function assertEq(a, b, m) { if (a !== b) throw new Error(`${m || 'expected equal'}: got ${a}, want ${b}`); }

const MIRROR = { 1: 1, 2: 2, 3: 4, 4: 3, 5: 5, 6: 6, 7: 9, 8: 8, 9: 7 };

function feed(parser, seq, facing = 1) {
    parser.facing = facing;
    for (const [dir, buttons] of seq) {
        const d = typeof dir === 'number' ? dir : Number(dir);
        parser.update({
            up: d === 6 || d === 7 || d === 8 || d === 9,
            down: d === 1 || d === 2 || d === 3,
            left: d === 1 || d === 4 || d === 7,
            right: d === 3 || d === 9,
            ...(buttons || {}),
        });
        parser.tick();
    }
}

console.log('\n=== MOTION INPUT ENGINE ===\n');

test('numpad conversion basics', () => {
    assertEq(toNumpad(false, false, false, false), 5, 'neutral');
    assertEq(toNumpad(true, false, false, false), 6, 'up');
    assertEq(toNumpad(false, true, false, false), 2, 'down');
    assertEq(toNumpad(false, false, true, false), 4, 'left');
    assertEq(toNumpad(false, false, false, true), 3, 'right');
    assertEq(toNumpad(false, true, false, true), 3, 'down-right');
    assertEq(toNumpad(false, true, true, false), 1, 'down-left');
    assertEq(toNumpad(true, false, false, true), 9, 'up-right');
    assertEq(toNumpad(true, false, true, false), 7, 'up-left');
});

test('mirror flips horizontal axes only', () => {
    assertEq(toRelative(3, -1), 4, 'forward becomes back when facing left');
    assertEq(toRelative(4, -1), 3, 'back becomes forward when facing left');
    assertEq(toRelative(9, -1), 7, 'up-forward mirrors');
    assertEq(toRelative(1, -1), 1, 'down-back unchanged');
    assertEq(toRelative(2, -1), 2, 'down unchanged');
    assertEq(toRelative(6, -1), 6, 'up unchanged');
});

test('input encode/decode round-trips', () => {
    const input = { up: false, down: true, left: true, right: false,
                    leftPunch: true, rightPunch: false, punch: true, kick: false,
                    block: false, heat: false, rage: false, special: false };
    for (const facing of [1, -1]) {
        const dec = decodeInput(encodeInput(input, facing), facing);
        assertEq(dec.down, true, 'down survives round-trip');
        assertEq(dec.left, true, 'left survives round-trip');
        assertEq(dec.leftPunch, true, 'leftPunch survives round-trip');
        assertEq(dec.punch, true, 'punch survives round-trip');
        assertEq(dec.rightPunch, false, 'rightPunch stays false');
    }
});

test('qcf 236 detected', () => {
    const p = createMotionParser();
    feed(p, [[2], [3], [6]]);
    assert(p.hasMotion([2, 3, 6]), 'QCF should match');
});

test('qcb 214 detected', () => {
    const p = createMotionParser();
    feed(p, [[2], [1], [4]]);
    assert(p.hasMotion([2, 1, 4]), 'QCB should match');
});

test('dp 623 detected', () => {
    const p = createMotionParser();
    feed(p, [[6], [2], [3]]);
    assert(p.hasMotion([6, 2, 3]), 'DP should match');
});

test('hcf 41236 detected', () => {
    const p = createMotionParser();
    feed(p, [[4], [1], [2], [3], [6]]);
    assert(p.hasMotion([4, 1, 2, 3, 6]), 'HCF should match');
});

test('neutral gaps allowed inside motion', () => {
    const p = createMotionParser();
    feed(p, [[2], [5], [3], [5], [6]]);
    assert(p.hasMotion([2, 3, 6]), 'neutral between inputs should be skipped');
});

test('double forward f,f detected as sequence', () => {
    const p = createMotionParser();
    feed(p, [[3], [5], [3]]);
    assert(p.hasSequence([3, 3], 10), 'ff should match (tap, release, tap)');
});

test('double back b,b detected', () => {
    const p = createMotionParser();
    feed(p, [[4], [5], [4]]);
    assert(p.hasSequence([4, 4], 10), 'bb should match');
});

test('held forward is not a double tap', () => {
    const p = createMotionParser();
    feed(p, [[3], [3], [3]]);
    assert(!p.hasSequence([3, 3], 4), 'holding forward is not ff');
});

test('rage motion 2312 detected', () => {
    const p = createMotionParser();
    feed(p, [[2], [3], [1], [2]]);
    assert(p.hasSequence([2, 3, 1, 2], 18), 'rage art motion should match');
});

test('reversal motion ~1+2 detected', () => {
    const p = createMotionParser();
    feed(p, [[4], [1], [2], [3], [6]]);
    assert(p.hasMotion([4, 1, 2, 3, 6]), 'reversal HCF should match');
});

test('button press is edge-buffered for 4 frames', () => {
    const p = createMotionParser();
    feed(p, [[5], [5, { leftPunch: true }]]);
    assert(p.isPressed('leftPunch'), 'pressed immediately');
    p.tick();
    assert(p.isPressed('leftPunch'), 'still buffered frame 2');
    p.tick(); p.tick(); p.tick();
    assert(!p.isPressed('leftPunch'), 'expired after window');
});

test('buffer history expires old inputs', () => {
    const b = new InputBuffer(20);
    b.push(3); b.push(5); b.push(3);
    assert(b.hasSequence([3, 3], 10), 'recent ff matches');
    for (let i = 0; i < 200; i++) { b.push(5); b.frame++; }
    assert(!b.hasSequence([3, 3], 10), 'stale ff should expire');
});

console.log(out.join('\n'));

const out2 = [];
function test2(name, fn) {
    try { fn(); pass++; out2.push(`  PASS  ${name}`); }
    catch (e) { fail++; out2.push(`  FAIL  ${name}\n          ${e.message}`); }
}

console.log('\n=== MOVE / FRAME DATA ===\n');

test2('move total = startup + active + recovery', () => {
    assertEq(new Move({ startup: 10, active: 3, recovery: 20 }).total, 33, 'total frames');
});

test2('active window boundaries correct', () => {
    const m = new Move({ startup: 10, active: 3, recovery: 20 });
    assertEq(m.activeStart, 10, 'activeStart');
    assertEq(m.activeEnd, 13, 'activeEnd');
    assert(!m.isActiveAt(9), 'not active before startup');
    assert(m.isActiveAt(10), 'active on first frame');
    assert(m.isActiveAt(12), 'active on last frame');
    assert(!m.isActiveAt(13), 'not active after window');
});

test2('blockstun/hitstun derived from frame advantage', () => {
    const m = new Move({ onBlock: -7, onHit: 5 });
    assertEq(m.blockstunFrames(), 7, 'blockstun is 7 frames on a -7 move');
    assertEq(m.hitstunFrames(), 5, 'hitstun is 5 frames on a +5 move');
    assertEq(m.punishFramesOnBlock(), 7, '7 punish frames on -7');
});

test2('punish window = recovery remaining minus blockstun', () => {
    const m = new Move({ startup: 12, active: 4, recovery: 25, onBlock: -6 });
    const remaining = m.total - 16;
    assert(remaining > m.blockstunFrames(), 'move is punishable mid-recovery');
    assertEq(remaining - m.blockstunFrames(), 19, 'punish frames available');
});

test2('safe move has no punish window on block', () => {
    assert(new Move({ onBlock: 0 }).isSafeOnBlock(), '0 frame move is safe');
    assert(new Move({ onBlock: 4 }).isSafeOnBlock(), 'plus frame move is safe');
    assertEq(new Move({ onBlock: 0 }).punishFramesOnBlock(), 0, 'no punish frames');
});

test2('damage scaling curve', () => {
    assertEq(getPenalizedDamage(100, 1), 100, 'no scaling on first hit');
    assertEq(getPenalizedDamage(100, 2), 90, '2nd hit 90%');
    assertEq(getPenalizedDamage(100, 4), 70, '4th hit 70%');
    assertEq(getPenalizedDamage(100, 10), 0, 'fully scaled');
});

test2('unblockable move not blockable', () => {
    assert(!new Move({ hitLevel: HitLevel.UNBLOCKABLE }).isBlockable(), 'unblockable cannot be blocked');
});

test2('throws are not blockable', () => {
    assert(!new Move({ hitLevel: HitLevel.THROW }).isBlockable(), 'throw cannot be blocked');
});

test2('reversal has no range requirement', () => {
    const m = new Move({ reversal: true, noHitbox: true, invulnFrames: 8, range: 0 });
    assert(m.reversal, 'is a reversal');
    assert(m.invulnFrames > 0, 'has invuln frames');
});

console.log(out2.join('\n'));

const out3 = [];
function test3(name, fn) {
    try { fn(); pass++; out3.push(`  PASS  ${name}`); }
    catch (e) { fail++; out3.push(`  FAIL  ${name}\n          ${e.message}`); }
}

console.log('\n=== ROSTER DATA INTEGRITY ===\n');

test3('roster has 8-10 characters', () => {
    assert(CHARACTERS.length >= 8 && CHARACTERS.length <= 10, `roster size ${CHARACTERS.length}`);
});

test3('every character has unique id and name', () => {
    const ids = new Set(), names = new Set();
    for (const c of CHARACTERS) {
        assert(!ids.has(c.id), `duplicate id ${c.id}`);
        assert(!names.has(c.name), `duplicate name ${c.name}`);
        ids.add(c.id); names.add(c.name);
    }
});

test3('every character has a full moveset', () => {
    for (const c of CHARACTERS) {
        assert(c.moves.length >= 15, `${c.id} has only ${c.moves.length} moves`);
        assert(c.health > 0, `${c.id} missing health`);
        assert(c.palette, `${c.id} missing palette`);
        assert(c.stats, `${c.id} missing stats`);
        assert(c.blurb, `${c.id} missing blurb`);
    }
});

test3('every character has a rage art', () => {
    for (const c of CHARACTERS) {
        assert(c.moves.find(m => m.category === MoveCategory.RAGE_ART), `${c.id} missing rage art`);
    }
});

test3('every character has a heat smash', () => {
    for (const c of CHARACTERS) {
        assert(c.moves.find(m => m.category === MoveCategory.HEAT_SMASH), `${c.id} missing heat smash`);
    }
});

test3('every character has a heat engager', () => {
    for (const c of CHARACTERS) {
        assert(c.moves.filter(m => m.category === MoveCategory.HEAT_ENGAGER).length > 0, `${c.id} missing heat engager`);
    }
});

test3('every character has a reversal', () => {
    for (const c of CHARACTERS) {
        assert(c.moves.find(m => m.reversal), `${c.id} missing reversal`);
    }
});

test3('every character has a techable throw', () => {
    for (const c of CHARACTERS) {
        assert(c.moves.find(m => m.hitLevel === HitLevel.THROW && m.techable), `${c.id} missing techable throw`);
    }
});

test3('roster has unblockable options', () => {
    const withUB = CHARACTERS.filter(c => c.moves.some(m => m.hitLevel === HitLevel.UNBLOCKABLE));
    assert(withUB.length > 0, 'no unblockable moves in roster');
});

test3('moves have sane frame data', () => {
    for (const c of CHARACTERS) {
        for (const m of c.moves) {
            if (m.noHitbox) continue;
            assert(m.startup >= 3, `${c.id}/${m.name} startup too fast (${m.startup})`);
            assert(m.active >= 1, `${c.id}/${m.name} no active frames`);
            assert(m.recovery >= 0, `${c.id}/${m.name} negative recovery`);
            assert(m.damage >= 0, `${c.id}/${m.name} negative damage`);
            if (m.reversal) assert(m.invulnFrames > 0, `${c.id}/${m.name} reversal without invuln`);
            else if (m.wallThrow) assert(m.range === 0, `${c.id}/${m.name} wall throw should use wall-relative reach`);
            else assert(m.range > 0, `${c.id}/${m.name} zero range`);
        }
    }
});

test3('every character has high/mid/low mix', () => {
    for (const c of CHARACTERS) {
        const levels = new Set(c.moves.map(m => m.hitLevel));
        assert(levels.has(HitLevel.HIGH), `${c.id} has no high`);
        assert(levels.has(HitLevel.LOW), `${c.id} has no low`);
        assert(levels.has(HitLevel.MID), `${c.id} has no mid`);
    }
});

test3('no move is universally plus on block', () => {
    for (const c of CHARACTERS) {
        const safe = c.moves.filter(m => !m.noHitbox && m.onBlock >= 0 && m.hitLevel !== HitLevel.THROW);
        assert(safe.length < c.moves.length * 0.5, `${c.id} has too many safe moves (${safe.length})`);
    }
});

test3('stage catalog is valid', () => {
    assert(STAGES.length >= 6, `only ${STAGES.length} stages`);
    for (const s of STAGES) {
        assert(s.id && s.name, 'stage missing id/name');
        assert(s.skyTop && s.skyMid && s.skyBottom, `${s.id} missing sky colors`);
        assert(s.props, `${s.id} missing props`);
    }
    assert(getStage(0) === STAGES[0], 'getStage(0)');
    assert(getStage(STAGES.length) === STAGES[0], 'getStage wraps');
    assert(getStage(-1) === STAGES[STAGES.length - 1], 'getStage wraps negative');
});

test3('no module imports a name it does not use', () => {
    for (const file of listJs(JS_ROOT)) {
        const src = fs.readFileSync(file, 'utf8');
        const rel = path.relative(JS_ROOT, file);
        const importRe = /^\s*import\s+([\s\S]*?)\s+from\s*['"]([^'"]+)['"];?\s*$/gm;
        let m;
        while ((m = importRe.exec(src)) !== null) {
            const clause = m[1];
            const braced = clause.match(/\{([\s\S]*)\}/);
            if (!braced) continue;
            const names = braced[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
            const body = src.slice(0, m.index) + src.slice(m.index + m[0].length);
            for (const n of names) {
                const used = new RegExp(`\\b${n.replace(/\$/g, '\\$')}\\b`).test(body);
                assert(used, `${rel} imports '${n}' from ${m[2]} but never uses it`);
            }
        }
    }
});

test3('every relative import resolves to a real file', () => {
    for (const file of listJs(JS_ROOT)) {
        const src = fs.readFileSync(file, 'utf8');
        const rel = path.relative(JS_ROOT, file);
        const importRe = /^\s*import\s+[\s\S]*?\s+from\s*['"](\.[^'"]+)['"];?\s*$/gm;
        let m;
        while ((m = importRe.exec(src)) !== null) {
            const target = path.resolve(path.dirname(file), m[1]);
            assert(fs.existsSync(target), `${rel} imports ${m[1]} which does not exist`);
        }
    }
});

console.log(out3.join('\n'));

console.log(`\n${'='.repeat(52)}`);
console.log(`  ${pass} passed, ${fail} failed`);
console.log(`${'='.repeat(52)}\n`);
process.exit(fail > 0 ? 1 : 0);
