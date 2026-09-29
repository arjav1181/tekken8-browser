import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BASE = process.env.BASE_URL || 'http://localhost:3000';

const suiteSource = (
    fs.readFileSync(path.join(HERE, 'suite.mjs'), 'utf8')
        .replace(/^\s*export\s+(function|const|let|var|class)\s/gm, '$1 ')
        .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '')
        + '\n;module.exports = { buildSuite, runSuite };\n'
);


async function main() {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(String(e.message)));
    page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });

    const results = await page.evaluate(async ({ base, src }) => {
        const [MotionInput, Move, WallGame, roster, stages, FighterMod, GameMod, AI] =
            await Promise.all([
                import(`${base}/js/game/MotionInput.js`),
                import(`${base}/js/game/Move.js`),
                import(`${base}/js/game/WallGame.js`),
                import(`${base}/js/data/roster.js`),
                import(`${base}/js/data/stages.js`),
                import(`${base}/js/game/Fighter.js`),
                import(`${base}/js/game/Game.js`),
                import(`${base}/js/game/AI.js`),
            ]);

        const mod = { exports: {} };
        new Function('module', 'exports', src)(mod, mod.exports);
        return mod.exports.runSuite({
            ...MotionInput, ...Move, ...WallGame, ...roster, ...stages,
            ...FighterMod, ...GameMod, ...AI,
        });
    }, { base: BASE, src: suiteSource });

    await browser.close();

    const groups = new Map();
    let pass = 0, fail = 0;
    for (const r of results) {
        if (!groups.has(r.group)) groups.set(r.group, []);
        groups.get(r.group).push(r);
        if (r.ok) pass++; else fail++;
    }

    console.log('\n=== GAMEPLAY SUITE (browser) ===\n');
    for (const [group, items] of groups) {
        console.log(` ${group}:`);
        for (const r of items) {
            console.log(r.ok ? `   PASS  ${r.name}` : `   FAIL  ${r.name}\n           ${r.err}`);
        }
    }

    const realErrors = pageErrors.filter(e => !e.includes('favicon') && !e.includes('Failed to load resource'));
    console.log(`\n  page errors: ${realErrors.length}`);
    for (const e of realErrors.slice(0, 5)) console.log(`   ${e}`);

    console.log('\n' + '='.repeat(52));
    console.log(`  ${pass} passed, ${fail} failed`);
    console.log('='.repeat(52) + '\n');

    process.exit(fail > 0 || realErrors.length > 0 ? 1 : 0);
}

main().catch(e => { console.error('HARNESS ERROR:', e.message); process.exit(2); });
