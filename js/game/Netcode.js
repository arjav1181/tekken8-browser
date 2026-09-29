import { encodeInput, decodeInput } from './MotionInput.js';

const DEFAULT_ROLLBACK_FRAMES = 8;
const INPUT_BYTE = 12;

export class RollbackSession {
    constructor(playerSlot) {
        this.playerSlot = playerSlot;
        this.connected = false;
        this.roomCode = null;
        this.role = playerSlot === 0 ? 'host' : 'guest';
        this.confirmedFrame = 0;
        this.localFrame = 0;
        this.localInputs = new Map();
        this.remoteInputs = new Map();
        this.stateHistory = new Map();
        this.snapshots = [];
        this.maxRollback = DEFAULT_ROLLBACK_FRAMES;
        this.remoteConfirmedFrame = 0;
        this.rollbackCount = 0;
        this.mispredictions = 0;
        this.ping = 0;
        this.jitter = 0;
        this.lastPingSent = 0;
        this.onInput = null;
        this.onMatchReady = null;
        this.onOpponentJoined = null;
        this.onDisconnect = null;
        this.myCharacter = null;
        this.opponentCharacter = null;
        this.matchStarted = false;
        this.ws = null;
        this.pingSamples = [];
        this.lastPongSent = 0;
    }

    async connect(roomCode) {
        if (this.role === 'host') {
            this.roomCode = this.generateRoomCode();
            return this.startRelayServer();
        }
        this.roomCode = roomCode;
        return this.connectToRelay(roomCode);
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    async startRelayServer() {
        try {
            const res = await fetch('/api/room', { method: 'POST' });
            if (!res.ok) throw new Error('Relay not available');
            const data = await res.json();
            this.roomCode = data.code;
            this.connected = true;
            this.localUrl = data.url;
            return true;
        } catch (e) {
            this.connected = false;
            return false;
        }
    }

    async connectToRelay(code) {
        return new Promise((resolve) => {
            try {
                const proto = location.protocol === 'https:' ? 'wss' : 'ws';
                const wsUrl = `${proto}://${location.host}/ws?room=${code}&slot=1`;
                this.ws = new WebSocket(wsUrl);
                this.ws.onopen = () => {
                    this.connected = true;
                    resolve(true);
                };
                this.ws.onmessage = (ev) => this.handleRelayMessage(ev.data);
                this.ws.onclose = () => {
                    this.connected = false;
                    if (this.onDisconnect) this.onDisconnect();
                };
                this.ws.onerror = () => {
                    this.connected = false;
                    resolve(false);
                };
                setTimeout(() => { if (!this.connected) resolve(false); }, 3000);
            } catch (e) {
                resolve(false);
            }
        });
    }

    handleRelayMessage(raw) {
        let msg;
        try {
            msg = JSON.parse(raw);
        } catch (e) {
            return;
        }

        switch (msg.t) {
            case 'welcome':
                this.roomCode = msg.room;
                this.slot = msg.slot;
                if (msg.room) {
                    this.playerSlot = msg.slot;
                    this.role = msg.slot === 0 ? 'host' : 'guest';
                }
                break;
            case 'full':
                if (this.onOpponentJoined) this.onOpponentJoined();
                break;
            case 'pick':
                if (this.myCharacter === null) {
                    this.myCharacter = msg.char;
                } else {
                    this.opponentCharacter = msg.char;
                }
                if (this.myCharacter && this.opponentCharacter && this.onMatchReady) {
                    const p1 = this.playerSlot === 0 ? this.myCharacter : this.opponentCharacter;
                    const p2 = this.playerSlot === 0 ? this.opponentCharacter : this.myCharacter;
                    this.matchStarted = true;
                    this.onMatchReady(p1, p2);
                }
                break;
            case 'in': {
                const f = msg.f;
                this.remoteConfirmedFrame = Math.max(this.remoteConfirmedFrame, f);
                if (!this.remoteInputs.has(f)) {
                    this.remoteInputs.set(f, msg.i);
                    if (f < this.localFrame) this.mispredictions++;
                    if (this.onInput) this.onInput(f, msg.i);
                }
                break;
            }
            case 'st':
                this.snapshots.push(msg);
                break;
            case 'ping':
                this.send({ t: 'pong', k: msg.k });
                break;
            case 'pong': {
                const rtt = performance.now() - msg.k;
                this.pingSamples.push(rtt);
                if (this.pingSamples.length > 20) this.pingSamples.shift();
                this.ping = this.pingSamples.reduce((a, b) => a + b, 0) / this.pingSamples.length;
                this.jitter = Math.max(...this.pingSamples) - Math.min(...this.pingSamples);
                break;
            }
            case 'bye':
                this.connected = false;
                if (this.onDisconnect) this.onDisconnect();
                break;
        }
    }

    send(obj) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(obj));
        }
    }

    sendCharacterPick(charId) {
        this.myCharacter = charId;
        this.send({ t: 'pick', char: charId });
    }

    sendInput(frame, encoded) {
        this.send({ t: 'in', f: frame, i: encoded });
    }

    update(game) {
        if (!this.connected || !this.matchStarted) return;
        if (game.paused) return;

        this.localFrame = game.frameCount;

        const now = performance.now();
        if (now - this.lastPingSent > 1000) {
            this.lastPingSent = now;
            this.send({ t: 'ping', k: now });
        }

        for (const [f, input] of this.remoteInputs) {
            if (f < game.frameCount - this.maxRollback - 1) {
                this.remoteInputs.delete(f);
            }
        }
    }

    getStats() {
        return {
            ping: Math.round(this.ping),
            jitter: Math.round(this.jitter),
            rollback: this.rollbackCount,
            mispredictions: this.mispredictions,
            frame: this.localFrame,
            remoteFrame: this.remoteConfirmedFrame,
        };
    }

    disconnect() {
        this.send({ t: 'bye' });
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }
}

export function gameFrameToNet(encodedInput) {
    return encodedInput;
}
