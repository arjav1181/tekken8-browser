const crypto = require('crypto');

function attach(httpServer, rooms) {
    const clients = new Map();

    const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

    function handleUpgrade(req, socket) {
        const key = req.headers['sec-websocket-key'];
        if (!key) {
            socket.destroy();
            return;
        }

        const accept = crypto.createHash('sha1')
            .update(key + GUID)
            .digest('base64');

        socket.write(
            'HTTP/1.1 101 Switching Protocols\r\n' +
            'Upgrade: websocket\r\n' +
            'Connection: Upgrade\r\n' +
            'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
        );
        socket.setNoDelay(true);

        const parsed = new URL(req.url, 'http://localhost');
        const roomCode = (parsed.searchParams.get('room') || '').toUpperCase();
        const requestedSlot = parseInt(parsed.searchParams.get('slot') || '1', 10);

        if (!roomCode) {
            sendFrame(socket, encodeText(JSON.stringify({ t: 'error', msg: 'no room' })));
            return;
        }

        if (!rooms.has(roomCode)) {
            rooms.set(roomCode, { slots: [null, null], created: Date.now() });
        }
        const room = rooms.get(roomCode);

        let slot = room.slots.indexOf(null);
        if (slot === -1) {
            sendFrame(socket, encodeText(JSON.stringify({ t: 'error', msg: 'room full' })));
            return;
        }

        const client = {
            socket,
            room: roomCode,
            slot,
            alive: true,
        };

        room.slots[slot] = client;
        clients.set(socket, client);

        sendFrame(socket, encodeText(JSON.stringify({ t: 'welcome', room: roomCode, slot })));

        const otherSlot = room.slots[1 - slot];
        if (otherSlot) {
            sendFrame(otherSlot.socket, encodeText(JSON.stringify({ t: 'full' })));
        }

        let buffer = Buffer.alloc(0);

        socket.on('data', (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
            while (true) {
                const frame = decodeFrame(buffer);
                if (!frame) break;
                buffer = buffer.slice(frame.consumed);

                if (frame.opcode === 0x8) {
                    handleClose(client);
                    return;
                }
                if (frame.opcode === 0x9) {
                    sendFrame(socket, encodeFrame(0xA, frame.payload));
                    continue;
                }
                if (frame.opcode !== 0x1) continue;

                let msg;
                try {
                    msg = JSON.parse(frame.payload.toString('utf8'));
                } catch (e) {
                    continue;
                }

                handleMessage(client, msg);
            }
        });

        socket.on('close', () => handleClose(client));
        socket.on('error', () => handleClose(client));
    }

    function handleMessage(client, msg) {
        if (msg.t === 'ping') {
            try {
                sendFrame(client.socket, encodeText(JSON.stringify({ t: 'pong', k: msg.k })));
            } catch (e) {
                handleClose(client);
            }
            return;
        }

        const room = rooms.get(client.room);
        if (!room) return;
        const other = room.slots[1 - client.slot];
        if (!other) return;

        const payload = encodeText(JSON.stringify(msg));
        try {
            sendFrame(other.socket, payload);
        } catch (e) {
            handleClose(other);
        }
    }

    function handleClose(client) {
        if (!client || !client.socket) return;
        const room = rooms.get(client.room);
        if (room) {
            if (room.slots[client.slot] === client) {
                room.slots[client.slot] = null;
            }
            if (!room.slots[0] && !room.slots[1]) {
                rooms.delete(client.room);
            }
        }
        clients.delete(client.socket);
        try {
            client.socket.destroy();
        } catch (e) {}
    }

    httpServer.on('upgrade', (req, socket) => {
        if (req.url.startsWith('/ws')) {
            handleUpgrade(req, socket);
        } else {
            socket.destroy();
        }
    });

    setInterval(() => {
        for (const client of clients.values()) {
            try {
                sendFrame(client.socket, encodeFrame(0x9, Buffer.alloc(0)));
            } catch (e) {
                handleClose(client);
            }
        }
    }, 25000);

    return { rooms, clients };
}

function encodeText(str) {
    return encodeFrame(0x1, Buffer.from(str, 'utf8'));
}

function encodeFrame(opcode, payload) {
    const len = payload.length;
    let header;

    if (len < 126) {
        header = Buffer.alloc(2);
        header[1] = len;
    } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[1] = 126;
        header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.alloc(10);
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
    }

    header[0] = 0x80 | opcode;
    return Buffer.concat([header, payload]);
}

function decodeFrame(buf) {
    if (buf.length < 2) return null;

    const opcode = buf[0] & 0x0f;
    const masked = (buf[1] & 0x80) !== 0;
    let len = buf[1] & 0x7f;
    let offset = 2;

    if (len === 126) {
        if (buf.length < 4) return null;
        len = buf.readUInt16BE(2);
        offset = 4;
    } else if (len === 127) {
        if (buf.length < 10) return null;
        len = Number(buf.readBigUInt64BE(2));
        offset = 10;
    }

    let maskKey = null;
    if (masked) {
        if (buf.length < offset + 4) return null;
        maskKey = buf.slice(offset, offset + 4);
        offset += 4;
    }

    if (buf.length < offset + len) return null;

    const payload = Buffer.from(buf.slice(offset, offset + len));
    if (masked && maskKey) {
        for (let i = 0; i < payload.length; i++) {
            payload[i] ^= maskKey[i % 4];
        }
    }

    return { opcode, payload, consumed: offset + len };
}

function sendFrame(socket, buffer) {
    if (!socket || socket.destroyed) return;
    socket.write(buffer);
}

module.exports = { attach };
