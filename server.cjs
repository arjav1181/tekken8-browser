const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
};

const rooms = new Map();

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
        code = '';
        for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    } while (rooms.has(code));
    return code;
}

const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);

    if (parsed.pathname === '/api/room' && req.method === 'POST') {
        const code = generateCode();
        rooms.set(code, { slots: [null, null], created: Date.now() });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code, url: `ws://localhost:${PORT}/ws?room=${code}` }));
        return;
    }

    let filePath = path.join(ROOT, decodeURIComponent(parsed.pathname));
    if (parsed.pathname === '/') filePath = path.join(ROOT, 'index.html');

    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            fs.readFile(path.join(ROOT, 'index.html'), (err2, fallback) => {
                if (err2) {
                    res.writeHead(404);
                    res.end('Not found');
                } else {
                    res.writeHead(200, { 'Content-Type': MIME['.html'] });
                    res.end(fallback);
                }
            });
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

const wss = require('./ws.cjs').attach(server, rooms);

server.listen(PORT, () => {
    console.log(`\n  TEKKEN 8 Browser Edition`);
    console.log(`  ----------------------------------------`);
    console.log(`  Playing at:  http://localhost:${PORT}`);
    console.log(`  Relay:       ws://localhost:${PORT}/ws`);
    console.log(`  Rooms:       ${rooms.size} active\n`);
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    process.exit(0);
});
