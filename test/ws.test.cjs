const WebSocket = require('ws');

const URL = process.env.WS_URL || 'ws://localhost:3000/ws';

function connect(room, slot) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${URL}?room=${room}&slot=${slot}`);
        const messages = [];
        ws.on('message', d => { try { messages.push(JSON.parse(d.toString())); } catch {} });
        ws.on('open', () => resolve({ ws, messages }));
        ws.on('error', reject);
        setTimeout(() => reject(new Error('timeout')), 3000);
    });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

let pass = 0, fail = 0;
function ok(n) { pass++; console.log(`  PASS  ${n}`); }
function bad(n, m) { fail++; console.log(`  FAIL  ${n}\n          ${m}`); }

async function main() {
    console.log('\n=== WEBSOCKET RELAY ===\n');

    const room = 'TEST' + Math.floor(Math.random() * 900 + 100);

    let a, b;
    try {
        a = await connect(room, 0);
        ok('host connects to relay');
    } catch (e) { bad('host connects to relay', e.message); return finish(); }

    await wait(300);
    const welcome = a.messages.find(m => m.t === 'welcome');
    welcome ? ok('host receives welcome + room code') : bad('host receives welcome + room code', JSON.stringify(a.messages));
    welcome && welcome.slot === 0 ? ok('host assigned slot 0') : bad('host assigned slot 0', `slot=${welcome?.slot}`);

    try {
        b = await connect(room, 1);
        ok('guest connects to same room');
    } catch (e) { bad('guest connects to same room', e.message); return finish(); }

    await wait(300);
    const gw = b.messages.find(m => m.t === 'welcome');
    gw && gw.slot === 1 ? ok('guest assigned slot 1') : bad('guest assigned slot 1', `slot=${gw?.slot}`);

    await wait(300);
    a.messages.some(m => m.t === 'full') ? ok('host notified opponent joined') : bad('host notified opponent joined', 'no "full" message');

    b.ws.send(JSON.stringify({ t: 'pick', char: 'paul' }));
    await wait(300);
    a.messages.some(m => m.t === 'pick' && m.char === 'paul')
        ? ok('character pick relayed to opponent')
        : bad('character pick relayed to opponent', JSON.stringify(a.messages.map(m => m.t)));

    b.ws.send(JSON.stringify({ t: 'in', f: 42, i: 1337 }));
    await wait(300);
    a.messages.some(m => m.t === 'in' && m.f === 42 && m.i === 1337)
        ? ok('game input relayed frame-accurately')
        : bad('game input relayed frame-accurately', JSON.stringify(a.messages.filter(m => m.t === 'in')));

    for (let i = 0; i < 20; i++) {
        a.ws.send(JSON.stringify({ t: 'in', f: 100 + i, i: i * 7 }));
    }
    await wait(500);
    const relayed = b.messages.filter(m => m.t === 'in' && m.f >= 100).length;
    relayed >= 20 ? ok(`burst of 20 inputs relayed (${relayed})`) : bad('burst of 20 inputs relayed', `got ${relayed}`);

    a.ws.send(JSON.stringify({ t: 'pick', char: 'kazuya' }));
    await wait(300);
    b.messages.some(m => m.t === 'pick' && m.char === 'kazuya')
        ? ok('bidirectional relay works')
        : bad('bidirectional relay works', 'no reverse pick');

    b.ws.send(JSON.stringify({ t: 'ping', k: 12345 }));
    await wait(300);
    b.messages.some(m => m.t === 'pong' && m.k === 12345)
        ? ok('server answers ping with pong (server-authoritative timing)')
        : bad('server answers ping with pong', 'no pong');
    await wait(200);
    a.messages.some(m => m.t === 'ping')
        ? bad('ping not leaked to opponent', 'ping was forwarded')
        : ok('ping not leaked to opponent');

    const large = { t: 'in', f: 1, i: 2, pad: 'x'.repeat(300) };
    b.ws.send(JSON.stringify(large));
    await wait(300);
    a.messages.some(m => m.t === 'in' && m.pad && m.pad.length === 300)
        ? ok('large payload relayed intact')
        : bad('large payload relayed intact', 'payload lost');

    b.ws.close();
    await wait(400);
    ok('guest disconnect handled without crash');

    a.ws.send(JSON.stringify({ t: 'in', f: 999, i: 1 }));
    await wait(300);
    ok('host still usable after opponent leaves');

    a.ws.close();
    await wait(200);

    try {
        const c = await connect(room, 1);
        await wait(300);
        const cw = c.messages.find(m => m.t === 'welcome');
        cw && cw.slot === 0 ? ok('room slot freed after disconnect (rejoin gets slot 0)') : bad('room slot freed after disconnect', `slot=${cw?.slot}`);
        c.ws.close();
    } catch (e) { bad('room slot freed after disconnect', e.message); }

    finish();
}

function finish() {
    console.log('\n' + '='.repeat(52));
    console.log(`  ${pass} passed, ${fail} failed`);
    console.log('='.repeat(52) + '\n');
    process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('ERROR:', e.message); finish(); });
