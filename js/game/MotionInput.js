export const Dir = {
    N: 5, D: 2, DB: 1, L: 4, DL: 1, DR: 3,
    U: 6, UL: 7, UR: 9, R: 3, DR: 3, DL: 1,
    DB_: 1, DL_: 1, DR_: 3,
};

export function toNumpad(up, down, left, right) {
    let h = 0;
    let v = 0;
    if (left && !right) h = -1;
    else if (right && !left) h = 1;
    if (up && !down) v = 1;
    else if (down && !up) v = -1;

    if (h === 0 && v === 0) return 5;
    if (h === 0 && v === 1) return 6;
    if (h === 0 && v === -1) return 2;
    if (h === -1 && v === 1) return 7;
    if (h === -1 && v === 0) return 4;
    if (h === -1 && v === -1) return 1;
    if (h === 1 && v === 1) return 9;
    if (h === 1 && v === 0) return 3;
    if (h === 1 && v === -1) return 3;
    return 5;
}

const MIRROR = { 1: 1, 2: 2, 3: 4, 4: 3, 5: 5, 6: 6, 7: 9, 8: 8, 9: 7 };

export function toRelative(numpad, facing) {
    return facing === 1 ? numpad : MIRROR[numpad];
}

export const Motion = {
    F: [3], B: [4], D: [2], U: [6], DB: [1], DF: [3], UB: [7], UF: [9],
    QCF: [2, 3, 6], QCB: [2, 1, 4], DP: [6, 2, 3],
    HCF: [4, 1, 2, 3, 6], HCB: [6, 3, 2, 1, 4],
    FF: [3, 3], BB: [4, 4], DD: [2, 2], UD: [8, 2],
    RAGE: [2, 3, 1, 2],
};

export class InputBuffer {
    constructor(window = 22) {
        this.window = window;
        this.history = [];
        this.frame = 0;
        this.bufferedInput = null;
        this.bufferedFrames = 0;
    }

    push(numpad) {
        this.frame++;
        const last = this.history[this.history.length - 1];
        if (!last || last.dir !== numpad) {
            this.history.push({ dir: numpad, frame: this.frame });
        }
        const cutoff = this.frame - (this.window * 3);
        while (this.history.length && this.history[0].frame < cutoff) {
            this.history.shift();
        }
    }

    hasMotion(pattern) {
        if (!pattern || pattern.length === 0) return true;
        const chars = pattern.map(d => (typeof d === 'number' ? d : d.charCodeAt(0)));
        const window = this.window;

        for (let end = this.history.length - 1; end >= 0; end--) {
            if (this.matchBackward(chars, end, window)) {
                return true;
            }
        }
        return false;
    }

    matchBackward(pattern, endIdx, window) {
        let p = pattern.length - 1;
        let frameBudget = window;
        let startIdx = endIdx;

        for (let i = endIdx; i >= 0 && p >= 0; i--) {
            const entry = this.history[i];
            if (entry.dir === 5) continue;
            if (entry.dir === pattern[p]) {
                frameBudget = window;
                startIdx = i;
                p--;
            } else {
                frameBudget--;
                if (frameBudget <= 0) {
                    if (p === pattern.length - 1) continue;
                    return false;
                }
            }
        }
        return p < 0;
    }

    hasSequence(pattern, maxGap = 14) {
        const dirs = pattern.map(d => (typeof d === 'number' ? d : d.charCodeAt(0)));
        let p = 0;
        let lastFrame = -999;

        for (let i = 0; i < this.history.length; i++) {
            const entry = this.history[i];
            if (entry.dir === 5) continue;
            if (entry.dir === dirs[p]) {
                if (entry.frame - lastFrame > maxGap) {
                    if (p > 0) return false;
                }
                lastFrame = entry.frame;
                p++;
                if (p >= dirs.length) return true;
            }
        }
        return p >= dirs.length;
    }

    clear() {
        this.history = [];
    }

    recent(frames = 10) {
        return this.history.filter(e => this.frame - e.frame <= frames);
    }
}

export class MotionParser {
    constructor() {
        this.buffer = new InputBuffer();
        this.lastNumPad = 5;
        this.pressBuffer = {};
        this.prevButtons = {};
        this.commandHistory = [];
    }

    get facing() {
        return this._facing || 1;
    }

    set facing(f) {
        this._facing = f;
    }

    update(input) {
        const numpad = toNumpad(input.up, input.down, input.left, input.right);
        this.buffer.push(numpad);
        this.lastNumPad = numpad;

        const buttons = ['leftPunch', 'rightPunch', 'punch', 'kick', 'block', 'heat', 'rage', 'special'];
        for (const btn of buttons) {
            const pressed = !!input[btn];
            const wasPressed = !!this.prevButtons[btn];
            if (pressed && !wasPressed) {
                this.pressBuffer[btn] = 4;
            }
            this.prevButtons[btn] = pressed;
        }
    }

    isPressed(btn) {
        return (this.pressBuffer[btn] || 0) > 0;
    }

    consume(btn) {
        this.pressBuffer[btn] = 0;
    }

    tick() {
        for (const btn of Object.keys(this.pressBuffer)) {
            if (this.pressBuffer[btn] > 0) this.pressBuffer[btn]--;
        }
    }

    currentDir() {
        return this.lastNumPad;
    }

    hasMotion(pattern) {
        return this.buffer.hasMotion(pattern);
    }

    hasSequence(pattern, maxGap) {
        return this.buffer.hasSequence(pattern, maxGap);
    }

    facingDir(target) {
        const rel = toRelative(this.lastNumPad, this.facing);
        if (target === 'f') return rel === 3 || rel === 9 || rel === 6;
        if (target === 'b') return rel === 4 || rel === 7 || rel === 6;
        if (target === 'd') return rel === 1 || rel === 2 || rel === 3;
        if (target === 'u') return rel === 7 || rel === 8 || rel === 9;
        if (target === 'n') return rel === 5;
        return false;
    }

    getNeutral() {
        return this.lastNumPad === 5;
    }

    reset() {
        this.buffer.clear();
        this.pressBuffer = {};
        this.prevButtons = {};
    }
}

export function encodeInput(input, facing) {
    const numpad = toNumpad(input.up, input.down, input.left, input.right);
    const rel = toRelative(numpad, facing);
    let buttons = 0;
    if (input.leftPunch) buttons |= 1;
    if (input.rightPunch) buttons |= 2;
    if (input.punch) buttons |= 4;
    if (input.kick) buttons |= 8;
    if (input.block) buttons |= 16;
    if (input.heat) buttons |= 32;
    if (input.rage) buttons |= 64;
    if (input.special) buttons |= 128;
    return (rel & 0xF) | (buttons << 4);
}

export function decodeInput(encoded, facing) {
    const rel = encoded & 0xF;
    const buttons = (encoded >> 4) & 0xFF;
    const abs = facing === 1 ? rel : MIRROR[rel];

    let up = abs === 6 || abs === 7 || abs === 8 || abs === 9;
    let down = abs === 1 || abs === 2 || abs === 3;
    let left = abs === 1 || abs === 4 || abs === 7;
    let right = abs === 3 || abs === 6 || abs === 9;

    return {
        up, down, left, right,
        leftPunch: !!(buttons & 1),
        rightPunch: !!(buttons & 2),
        punch: !!(buttons & 4),
        kick: !!(buttons & 8),
        block: !!(buttons & 16),
        heat: !!(buttons & 32),
        rage: !!(buttons & 64),
        special: !!(buttons & 128),
    };
}
