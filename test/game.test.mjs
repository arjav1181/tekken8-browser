import { runSuite } from './suite.mjs';

const [
    MotionInput, Move, WallGame, roster, stages, FighterMod, GameMod, AI,
] = await Promise.all([
    import('../js/game/MotionInput.js'),
    import('../js/game/Move.js'),
    import('../js/game/WallGame.js'),
    import('../js/data/roster.js'),
    import('../js/data/stages.js'),
    import('../js/game/Fighter.js'),
    import('../js/game/Game.js'),
    import('../js/game/AI.js'),
]);

const results = runSuite({
    ...MotionInput, ...Move, ...WallGame, ...roster, ...stages,
    ...FighterMod, ...GameMod, ...AI,
});

let group = '';
for (const r of results) {
    if (r.group !== group) { group = r.group; console.log(`\n ${group}:`); }
    console.log(r.ok ? `   PASS  ${r.name}` : `   FAIL  ${r.name}\n           ${r.err}`);
}

const pass = results.filter(r => r.ok).length;
const fail = results.length - pass;
console.log('\n' + '='.repeat(52));
console.log(`  ${pass} passed, ${fail} failed`);
console.log('='.repeat(52) + '\n');
process.exit(fail ? 1 : 0);
