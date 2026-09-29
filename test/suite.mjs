export function buildSuite(M) {
    const { Fighter, State, Game, GameMode, Phase, getCharacter, CHARACTERS, HitLevel,
            Move, MoveCategory, AIController, Difficulty, WALL, WALL_LIMIT,
            isAgainstWall, canWallCarry, clampToStage, MotionParser, toNumpad, toRelative } = M;

    const NEUTRAL = { up: false, down: false, left: false, right: false,
        leftPunch: false, rightPunch: false, punch: false, kick: false,
        block: false, heat: false, rage: false, special: false };

    const dirFlags = (d) => ({
        up: d === 6 || d === 7 || d === 8 || d === 9,
        down: d === 1 || d === 2 || d === 3,
        left: d === 1 || d === 4 || d === 7,
        right: d === 3 || d === 6 || d === 9,
    });
    const MIRROR = { 1: 1, 2: 2, 3: 4, 4: 3, 5: 5, 6: 6, 7: 9, 8: 8, 9: 7 };
    const rel = (d, f) => (f === 1 ? d : MIRROR[d]);
    const press = (d, f, b) => Object.assign(dirFlags(rel(d, f)), {
        leftPunch: false, rightPunch: false, punch: false, kick: false,
        block: false, heat: false, rage: false, special: false,
    }, b || {});

    const step = (f, inp, n, opp) => {
        for (let i = 0; i < n; i++) {
            if (opp) f.updateFacing(opp);
            f.update(inp, opp, i);
            if (opp) opp.updateFacing(f);
        }
    };

    const mk = (id = 'paul', facing = 1) => {
        const f = new Fighter(getCharacter(id), 0, facing, 1);
        f.opponent = null;
        return f;
    };

    const pair = (a = 'paul', b = 'kazuya', gap = 60) => {
        const A = new Fighter(getCharacter(a), 0, 1, 1);
        const B = new Fighter(getCharacter(b), gap, -1, 2);
        A.opponent = B; B.opponent = A;
        return [A, B];
    };

    const stubInput = { getP1: () => NEUTRAL, getP2: () => NEUTRAL, isPressed: () => false };
    const stubRenderer = { width: 1280, height: 720, ctx: {}, addShake() {}, setShake() {},
        spawnHitSpark() {}, spawnBlockSpark() {} };

    const T = [];
    const t = (group, name, fn) => T.push({ group, name, fn });
    const A = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
    const E = (a, b, m) => { if (a !== b) throw new Error(`${m || 'eq'}: got ${a}, want ${b}`); };

    // ---------- movement ----------
    t('movement', 'idle stays idle', () => { const f = mk(); step(f, NEUTRAL, 10); E(f.state, State.IDLE); });
    t('movement', 'crouch toggles', () => { const f = mk(); step(f, press(2, 1), 3); A(f.isCrouching); step(f, NEUTRAL, 3); A(!f.isCrouching); });
    t('movement', 'walk forward', () => { const f = mk(); const x = f.x; step(f, press(3, 1), 20); A(f.x > x); E(f.state, State.WALK_F); });
    t('movement', 'walk backward', () => { const f = mk(); const x = f.x; step(f, press(4, 1), 20); A(f.x < x); E(f.state, State.WALK_B); });
    t('movement', 'facing mirrors movement', () => { const f = mk('paul', -1); const x = f.x; step(f, press(3, -1), 20); A(f.x < x); });
    t('movement', 'jump leaves ground', () => { const f = mk(); step(f, press(6, 1), 1); A(f.z > 0); A(!f.grounded); });
    t('movement', 'jump lands and idles', () => { const f = mk(); step(f, press(6, 1), 1); step(f, NEUTRAL, 100); A(f.grounded); E(f.state, State.IDLE); });
    t('movement', 'f,f forward dash', () => { const f = mk(); step(f, press(3, 1), 1); step(f, NEUTRAL, 1); step(f, press(3, 1), 1); E(f.state, State.DASH_F); });
    t('movement', 'b,b backdash grants i-frames', () => { const f = mk(); step(f, press(4, 1), 1); step(f, NEUTRAL, 1); step(f, press(4, 1), 1); E(f.state, State.BACKDASH); A(f.invulnFrames > 0); });
    t('movement', 'backdash recovers', () => { const f = mk(); step(f, press(4, 1), 1); step(f, NEUTRAL, 1); step(f, press(4, 1), 1); step(f, NEUTRAL, 45); E(f.state, State.IDLE); });

    // ---------- attacks ----------
    t('attacks', 'LP is a high', () => { const f = mk(); step(f, press(5, 1, { leftPunch: true }), 1); step(f, NEUTRAL, 1); A(f.currentMove); E(f.currentMove.hitLevel, HitLevel.HIGH); E(f.currentMove.notation, '1'); });
    t('attacks', 'HP is a mid', () => { const f = mk(); step(f, press(5, 1, { rightPunch: true }), 1); step(f, NEUTRAL, 1); E(f.currentMove.hitLevel, HitLevel.MID); });
    t('attacks', 'd2 is a low', () => { const f = mk(); step(f, press(2, 1), 4); step(f, press(2, 1, { rightPunch: true }), 1); step(f, NEUTRAL, 1); E(f.currentMove.hitLevel, HitLevel.LOW); E(f.currentMove.notation, 'd2'); });
    t('attacks', 'f,f+2 produces a launcher', () => { const f = mk('paul'); step(f, press(3, 1), 1); step(f, NEUTRAL, 1); step(f, press(3, 1), 1); step(f, press(5, 1, { rightPunch: true }), 1); step(f, NEUTRAL, 1); A(f.currentMove, 'no move'); A(f.currentMove.launches, f.currentMove.notation); });
    t('attacks', 'motion move requires its motion', () => { const f = mk('paul'); step(f, press(5, 1, { rightPunch: true }), 1); step(f, NEUTRAL, 1); A(!f.currentMove || !f.currentMove.launches, 'plain HP should not be a launcher'); });
    t('attacks', 'move recovers to idle', () => { const f = mk(); step(f, press(5, 1, { leftPunch: true }), 1); step(f, NEUTRAL, 1); const tot = f.currentMove.total; step(f, NEUTRAL, tot + 6); E(f.state, State.IDLE); });

    // ---------- defense ----------
    t('defense', 'standing block does not stop a low', () => { const f = mk(); step(f, press(4, 1, { block: true }), 3); A(f.canBlock({ hitLevel: HitLevel.LOW, isBlockable: () => true }) === false); });
    t('defense', 'crouching block does not stop a high', () => { const f = mk(); step(f, press(2, 1, { block: true }), 3); A(f.isCrouching); A(f.canBlock({ hitLevel: HitLevel.HIGH, isBlockable: () => true }) === false); });
    t('defense', 'crouching block stops lows', () => { const f = mk(); step(f, press(2, 1, { block: true }), 3); A(f.canBlock({ hitLevel: HitLevel.LOW, isBlockable: () => true })); });
    t('defense', 'unblockable ignores block', () => { const f = mk(); step(f, press(4, 1, { block: true }), 3); A(f.canBlock({ hitLevel: HitLevel.UNBLOCKABLE, isBlockable: () => false }) === false); });
    t('defense', 'guard meter drops on block', () => { const [a, b] = pair(); const g = b.guardMeter; b.takeHit({ move: { damage: 30, chipDamage: 3, guardDamage: 20, hitLevel: HitLevel.MID, isBlockable: () => true } }, a, true); A(b.guardMeter < g); });
    t('defense', 'guard crush at zero', () => { const [a, b] = pair(); b.guardMeter = 5; b.takeHit({ move: { damage: 30, chipDamage: 3, guardDamage: 50, hitLevel: HitLevel.MID, isBlockable: () => true } }, a, true); A(b.guardCrushed); E(b.guardMeter, 0); });

    // ---------- offense ----------
    t('offense', 'hit reduces health', () => { const [a, b] = pair(); const h = b.health; b.takeHit({ move: a.config.moves[0] }, a, false); A(b.health < h); });
    t('offense', 'chip damage cannot kill', () => { const [a, b] = pair(); b.health = 20; b.takeHit({ move: { damage: 30, chipDamage: 5, guardDamage: 10, hitLevel: HitLevel.MID, isBlockable: () => true } }, a, true); A(b.health > 0, `hp ${b.health}`); A(b.recoverableHealth > 0); });
    t('offense', 'launcher puts victim airborne', () => { const [a, b] = pair(); const mv = a.config.moves.find(m => m.launches); b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a); A(!b.grounded); A(b.vz > 0); });
    t('offense', 'juggle count rises on air hits', () => { const [a, b] = pair(); const mv = a.config.moves.find(m => m.launches); b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a); const j = b.juggleCount; b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a); A(b.juggleCount > j); });
    t('offense', 'rage activates at 25%', () => { const [a, b] = pair(); A(!b.rageActive); b.health = b.maxHealth * 0.24; b.takeHit({ move: a.config.moves[0] }, a, false); A(b.rageActive); });
    t('offense', 'rage art scales with missing health', () => { const [a, b] = pair(); const mv = a.config.moves.find(m => m.category === 'rage_art'); b.health = b.maxHealth; const hi = b.takeHit({ move: mv }, a, false).damage; b.health = b.maxHealth * 0.1; const lo = b.takeHit({ move: mv }, a, false).damage; A(lo > hi, `${lo} vs ${hi}`); });
    t('offense', 'combo counter tracks hits', () => { const [a, b] = pair(); const mv = a.config.moves[0]; for (let i = 0; i < 3; i++) b.applyHitstun(b.takeHit({ move: mv }, a, false), a); E(a.comboCount, 3); A(a.comboDamage > 0); });
    t('offense', 'damage scales down in a combo', () => { const [a, b] = pair(); const mv = a.config.moves[0]; const d1 = b.takeHit({ move: mv }, a, false).damage; a.comboCount = 5; const d2 = b.takeHit({ move: mv }, a, false).damage; A(d2 < d1, `${d2} vs ${d1}`); });
    t('offense', 'combo resets on timeout', () => { const [a, b] = pair(); a.comboCount = 5; a.comboTimer = 1; a.update(NEUTRAL, b, 1); a.update(NEUTRAL, b, 1); E(a.comboCount, 0); });

    // ---------- throws ----------
    t('throws', 'throw is not blockable', () => { const [a] = pair(); const th = a.config.moves.find(m => m.hitLevel === HitLevel.THROW); A(th); A(!th.isBlockable()); });
    t('throws', 'techable throw can be teched', () => { const [a, b] = pair(); const th = a.config.moves.find(m => m.hitLevel === HitLevel.THROW && m.techable); b.throwTechWindow = 5; const r = b.takeThrow(th, a); A(r.teched); E(b.state, State.THROWN_TECH); E(a.comboCount, 0); });
    t('throws', 'throw lands outside tech window', () => { const [a, b] = pair(); const th = a.config.moves.find(m => m.hitLevel === HitLevel.THROW && m.techable); b.throwTechWindow = 0; const r = b.takeThrow(th, a); A(!r.teched); A(r.damage > 0); E(b.state, State.THROWN); });
    t('throws', 'downed opponent cannot be thrown', () => { const [a, b] = pair(); b.setState(State.KNOCKDOWN, 30); A(!b.canBeThrown()); });

    // ---------- wakeup ----------
    t('wakeup', 'knockdown recovers to actionable', () => { const [a, b] = pair(); const mv = a.config.moves.find(m => m.knockdown && m.hitLevel !== HitLevel.THROW) || a.config.moves[0]; b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a); for (let i = 0; i < 250 && b.state !== State.IDLE; i++) { b.update(NEUTRAL, a, i); a.update(NEUTRAL, b, i); } A(b.state === State.IDLE || b.state === State.WAKEUP, b.state); });
    t('wakeup', 'downback interrupts wakeup', () => { const [a, b] = pair(); const mv = a.config.moves.find(m => m.knockdown && m.hitLevel !== HitLevel.THROW) || a.config.moves[0]; b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a); b.setState(State.KNOCKDOWN, 34); b.stateFrame = 40; b.update({ block: true }, a, 1); A(b.state === State.DOWNTECHNIQUE || b.state === State.WAKEUP, b.state); });

    // ---------- heat / rage ----------
    t('heat', 'heat meter fills over time', () => { const f = mk(); f.heatMeter = 0; for (let i = 0; i < 400; i++) f.update(NEUTRAL, null, i); A(f.heatMeter > 0); });
    t('heat', 'burst grants one energy', () => { const f = mk(); f.heatMeter = f.maxHeatMeter; A(f.activateHeatBurst()); A(f.heatActive); E(f.heatEnergy, 1); });
    t('heat', 'engager grants two energy', () => { const f = mk(); f.heatMeter = f.maxHeatMeter; f.activateHeatEngager(); E(f.heatEnergy, 2); });
    t('heat', 'heat expires', () => { const f = mk(); f.heatMeter = f.maxHeatMeter; f.activateHeatBurst(); f.heatTimer = 1; for (let i = 0; i < 4; i++) f.update(NEUTRAL, null, i); A(!f.heatActive); });
    t('heat', 'heat pauses during opponent hitstun', () => { const [a, b] = pair(); a.heatMeter = a.maxHeatMeter; a.activateHeatBurst(); a.heatTimer = 10; b.hitStunFrames = 50; for (let i = 0; i < 5; i++) a.update(NEUTRAL, b, i); E(a.heatTimer, 10); });
    t('heat', 'heat smash needs two bars', () => { const f = mk('paul'); f.heatMeter = f.maxHeatMeter; f.activateHeatBurst(); E(f.heatEnergy, 1); const hs = f.config.moves.find(m => m.category === 'heat_smash'); A(!f.moveset.canUse(hs)); f.heatEnergy = 2; A(f.moveset.canUse(hs)); });
    t('heat', 'heat moves need heat active', () => { const f = mk('paul'); f.heatActive = false; const hs = f.config.moves.find(m => m.category === 'heat_smash'); A(!f.moveset.canUse(hs)); });
    t('heat', 'heat boosts damage', () => { const [a, b] = pair(); a.heatActive = true; const mv = a.config.moves[0]; const cold = new Fighter(getCharacter('paul'), 0, 1, 1); const d1 = b.takeHit({ move: mv }, cold, false).damage; const d2 = b.takeHit({ move: mv }, a, false).damage; A(d2 > d1, `${d2} vs ${d1}`); });
    t('rage', 'rage art is single use', () => { const f = mk('paul'); f.rageActive = true; const r = f.config.moves.find(m => m.category === 'rage_art'); A(f.moveset.canUse(r)); f.rageUsed = true; A(!f.moveset.canUse(r)); });
    t('rage', 'round reset clears heat and rage', () => { const f = mk(); f.heatMeter = 100; f.heatActive = true; f.rageActive = true; f.rageUsed = true; f.recoverableHealth = 300; f.resetForRound(0, 1); A(!f.heatActive); A(!f.rageActive); A(!f.rageUsed); E(f.recoverableHealth, 0); E(f.health, f.maxHealth); });

    // ---------- wall game ----------
    t('wall', 'stage clamp holds fighters inside bounds', () => { const f = mk(); f.x = 800; E(clampToStage(f), 'right'); E(f.x, WALL_LIMIT); });
    t('wall', 'isAgainstWall respects range', () => { A(isAgainstWall({ x: 495 }, 0)); A(!isAgainstWall({ x: 300 }, 0)); A(isAgainstWall({ x: 450 }, 60)); A(!isAgainstWall({ x: 400 }, 60)); });
    t('wall', 'airborne fighter cannot leave the stage', () => { const f = mk(); f.vx = 40; f.vz = 6; f.z = 20; for (let i = 0; i < 60; i++) f.update(NEUTRAL, null, i); A(f.x <= WALL_LIMIT, `x=${f.x}`); });
    t('wall', 'wall splat hits at the wall', () => { const [a, b] = pair('xiaoyu', 'king', 420, 495); const mv = a.config.moves.find(m => m.wallSplat); A(mv); b.z = 60; b.grounded = false; b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a); E(b.state, State.WALL_SPLAT); A(b.wallSplattedBy === a); E(b.juggleCount, 0); });
    t('wall', 'wall splat does nothing at center', () => { const [a, b] = pair('xiaoyu', 'king', 0, 0); const mv = a.config.moves.find(m => m.wallSplat); b.z = 60; b.grounded = false; b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a); A(b.state !== State.WALL_SPLAT); });
    t('wall', 'splat becomes bounce then knockdown', () => { const [a, b] = pair('xiaoyu', 'king', 420, 495); const mv = a.config.moves.find(m => m.wallSplat); b.z = 60; b.grounded = false; b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a); for (let i = 0; i < 40; i++) b.update(NEUTRAL, a, i); E(b.state, State.WALL_BOUNCE); for (let i = 0; i < 40; i++) b.update(NEUTRAL, a, i); E(b.state, State.KNOCKDOWN); });
    t('wall', 'wall bounce pushes inward with i-frames', () => { const [a, b] = pair('xiaoyu', 'king', 420, 495); const mv = a.config.moves.find(m => m.wallSplat); b.z = 60; b.grounded = false; b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a); for (let i = 0; i < 40; i++) b.update(NEUTRAL, a, i); A(b.vx < 0, `vx=${b.vx}`); A(b.invulnFrames > 0); });
    t('wall', 'balcony break flags a ring out', () => { const [a, b] = pair('king', 'kazuya', 430, 498); const mv = a.config.moves.find(m => m.balconyBreak); A(mv); b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a); E(b.state, State.BALCONY_BREAK); A(b.isBouncedOut); E(b.recoverableHealth, 0); });
    t('wall', 'balcony break does nothing at center', () => { const [a, b] = pair('king', 'kazuya', 0, 0); const mv = a.config.moves.find(m => m.balconyBreak); b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a); A(b.state !== State.BALCONY_BREAK); });
    t('wall', 'balcony break ends in ring out', () => { const [a, b] = pair('king', 'kazuya', 430, 498); const mv = a.config.moves.find(m => m.balconyBreak); b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a); for (let i = 0; i < 200; i++) b.update(NEUTRAL, a, i); A(b.isRingOut, `state=${b.state}`); });
    t('wall', 'wall carry pins the victim', () => { const [a, b] = pair(); const mv = a.config.moves.find(m => m.wallCarry); A(mv); b.x = 490; b.z = 50; b.grounded = false; const before = b.x; b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a); A(b.wallCarry); A(b.tornadoFrames > 0); for (let i = 0; i < 6; i++) b.update(NEUTRAL, a, i); A(Math.abs(b.x - before) < 6, `drifted ${(b.x - before).toFixed(1)}`); });
    t('wall', 'wall carry releases away from the wall', () => { const [a, b] = pair(); b.wallCarry = true; b.tornadoFrames = 10; b.x = 100; for (let i = 0; i < 20; i++) b.update(NEUTRAL, a, i); A(!b.wallCarry); });
    t('wall', 'tornado raises the juggle allowance', () => { const f = mk(); const base = f.juggleAllowance; f.tornadoFrames = 20; A(f.juggleAllowance > base, `${base} -> ${f.juggleAllowance}`); f.tornadoFrames = 0; f.wallCarry = true; A(f.juggleAllowance > base); });
    t('wall', 'tornado suspends the juggle counter', () => { const [a, b] = pair(); const mv = a.config.moves.find(m => m.tornado); A(mv); b.x = 490; b.z = 50; b.grounded = false; b.juggleCount = 0; b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a); A(b.tornadoFrames > 0); A(a.tornadoUsedThisCombo); E(b.juggleCount, 0); });
    t('wall', 'juggle limit stops infinite loops', () => { const [a, b] = pair(); const mv = a.config.moves.find(m => m.launches); for (let i = 0; i < 12; i++) { b.z = 50; b.grounded = false; b.applyHitstun({ damage: 20, blocked: false, move: mv, attacker: a, victim: b }, a); } A(b.juggleDropped); A(b.juggleCount <= b.juggleLimit + 1, `count ${b.juggleCount}`); });
    t('wall', 'wall moves unavailable at center stage', () => { const f = mk('xiaoyu'); const wm = f.config.moves.find(m => m.wallThrow); A(wm); A(!f.moveset.canUse(wm)); f.x = 490; A(f.moveset.canUse(wm)); });
    t('wall', 'wall splat only takes a wall throw', () => { const [a, b] = pair(); b.setState(State.WALL_SPLAT, WALL.SPLAT_FRAMES); A(!b.canBeThrown(false)); A(b.canBeThrown(true)); });
    t('wall', 'every character has a wall game move', () => { for (const c of CHARACTERS) { const w = c.moves.filter(m => m.wallThrow || m.wallSplat || m.balconyBreak || m.spiral); A(w.length > 0, c.id); } });
    t('wall', 'round reset clears wall state', () => { const f = mk('king'); f.tornadoFrames = 30; f.wallCarry = true; f.isBouncedOut = true; f.wallSide = 'right'; f.pendingWallBounce = true; f.juggleCount = 4; f.resetForRound(0, 1); E(f.tornadoFrames, 0); E(f.wallCarry, false); E(f.isBouncedOut, false); E(f.wallSide, null); E(f.pendingWallBounce, false); E(f.juggleCount, 0); });

    // ---------- roster ----------
    t('roster', 'roster size is 8-10', () => { A(CHARACTERS.length >= 8 && CHARACTERS.length <= 10, String(CHARACTERS.length)); });
    t('roster', 'ids and names are unique', () => { const ids = new Set(), nm = new Set(); for (const c of CHARACTERS) { A(!ids.has(c.id), c.id); A(!nm.has(c.name), c.name); ids.add(c.id); nm.add(c.name); } });
    t('roster', 'every character has a rage art', () => { for (const c of CHARACTERS) A(c.moves.find(m => m.category === MoveCategory.RAGE_ART), c.id); });
    t('roster', 'every character has a heat smash', () => { for (const c of CHARACTERS) A(c.moves.find(m => m.category === MoveCategory.HEAT_SMASH), c.id); });
    t('roster', 'every character has a heat engager', () => { for (const c of CHARACTERS) A(c.moves.filter(m => m.category === MoveCategory.HEAT_ENGAGER).length > 0, c.id); });
    t('roster', 'every character has a reversal', () => { for (const c of CHARACTERS) A(c.moves.find(m => m.reversal), c.id); });
    t('roster', 'every character has a techable throw', () => { for (const c of CHARACTERS) A(c.moves.find(m => m.hitLevel === HitLevel.THROW && m.techable), c.id); });
    t('roster', 'every character mixes high mid low', () => { for (const c of CHARACTERS) { const lv = new Set(c.moves.map(m => m.hitLevel)); A(lv.has(HitLevel.HIGH), c.id); A(lv.has(HitLevel.LOW), c.id); A(lv.has(HitLevel.MID), c.id); } });
    t('roster', 'command moves carry a motion', () => { let n = 0; for (const c of CHARACTERS) for (const m of c.moves) { if (m.category === MoveCategory.COMMAND_SPECIAL || m.category === MoveCategory.COMMAND_NORMAL || m.wallThrow) { A(m.motion, `${c.id}/${m.name} has no motion`); n++; } } A(n > 50, `only ${n} motion moves`); });
    t('roster', 'frame data is valid', () => { for (const c of CHARACTERS) for (const m of c.moves) { if (m.noHitbox) continue; A(m.startup >= 3, `${c.id}/${m.name}`); A(m.active >= 1, `${c.id}/${m.name}`); if (m.reversal) A(m.invulnFrames > 0, `${c.id}/${m.name}`); else if (m.wallThrow) A(m.range === 0, `${c.id}/${m.name}`); else A(m.range > 0, `${c.id}/${m.name}`); } });

    // ---------- AI ----------
    t('ai', 'AI returns input objects', () => { const [a, b] = pair(); const ai = new AIController('amateur', b.config); for (let i = 0; i < 60; i++) { const inp = ai.update(b, a); A(inp && typeof inp === 'object'); } });
    t('ai', 'all difficulty tiers load', () => { for (const d of ['beginner', 'casual', 'amateur', 'professional', 'godlike']) { const ai = new AIController(d, getCharacter('paul')); A(ai.profile && ai.profile.reactionFrames > 0, d); } });

    // ---------- match ----------
    t('match', 'match starts and simulates frames', () => { const g = new Game(stubRenderer, stubInput); g.startMatch('versus', 'paul', 'kazuya', { stageIndex: 0 }); A(g.p1 && g.p2); E(g.p1.health, g.p1.maxHealth); for (let i = 0; i < 400; i++) { g.p2.health = Math.max(1, g.p2.health - 1); g.update(1 / 60); } A(g.frameCount > 100, `frames ${g.frameCount}`); });
    t('match', 'every character simulates a full round', () => { for (const c of CHARACTERS) { const opp = CHARACTERS.find(x => x.id !== c.id); const g = new Game(stubRenderer, stubInput); g.startMatch('versus', c.id, opp.id, { stageIndex: 0 }); for (let i = 0; i < 200; i++) g.update(1 / 60); A(g.p1 && g.p2, c.id); } });
    t('match', 'wall game does not destabilise a round', () => { for (const c of CHARACTERS) { const opp = CHARACTERS.find(x => x.id !== c.id); const g = new Game(stubRenderer, stubInput); g.startMatch('versus', c.id, opp.id, { stageIndex: 0 }); for (let i = 0; i < 400; i++) { g.p1.vx = 9; g.p2.vx = -9; g.update(1 / 60); } A(Number.isFinite(g.p1.x), `${c.id} x=${g.p1.x}`); A(Math.abs(g.p1.x) <= WALL_LIMIT + 1, `${c.id} out of stage`); A(Number.isFinite(g.p1.health), `${c.id} health`); } });

    return T;
}

export function runSuite(M) {
    const T = buildSuite(M);
    const results = [];
    for (const { group, name, fn } of T) {
        try { fn(); results.push({ group, name, ok: true }); }
        catch (e) { results.push({ group, name, ok: false, err: e.message }); }
    }
    return results;
}
