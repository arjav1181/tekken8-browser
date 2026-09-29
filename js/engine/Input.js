const KEY_MAP = {
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'KeyW': 'up',
    'KeyS': 'down',
    'KeyA': 'left',
    'KeyD': 'right',
    'KeyJ': 'punch',
    'KeyK': 'kick',
    'KeyU': 'leftPunch',
    'KeyI': 'rightPunch',
    'KeyL': 'block',
    'Space': 'special',
    'ShiftLeft': 'heat',
    'ShiftRight': 'heat',
    'KeyQ': 'rage',
    'Escape': 'pause',
    'Enter': 'confirm',
};

const P2_KEY_MAP = {
    'Numpad8': 'up',
    'Numpad5': 'down',
    'Numpad4': 'left',
    'Numpad6': 'right',
    'Numpad1': 'punch',
    'Numpad2': 'kick',
    'Numpad7': 'leftPunch',
    'Numpad9': 'rightPunch',
    'Numpad3': 'block',
    'Numpad0': 'special',
    'NumpadAdd': 'heat',
    'NumpadSubtract': 'rage',
};

export class Input {
    constructor() {
        this.keys = {};
        this.prevKeys = {};
        this.p1State = {};
        this.p2State = {};
        this.p1Prev = {};
        this.p2Prev = {};
        this.gamepadStates = [{}, {}];
        this.gamepadPrev = [{}, {}];

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad.id);
        });
    }

    update() {
        this.p1Prev = { ...this.p1State };
        this.p2Prev = { ...this.p2State };

        this.p1State = this.readPlayerInput(KEY_MAP);
        this.p2State = this.readPlayerInput(P2_KEY_MAP);

        this.pollGamepads();
    }

    readPlayerInput(map) {
        const state = {};
        for (const [code, action] of Object.entries(map)) {
            state[action] = !!this.keys[code];
        }
        return state;
    }

    pollGamepads() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < Math.min(2, gamepads.length); i++) {
            const gp = gamepads[i];
            if (!gp) continue;

            this.gamepadPrev[i] = { ...this.gamepadStates[i] };
            const state = {
                up: gp.axes[1] < -0.5 || (gp.buttons[12] && gp.buttons[12].pressed),
                down: gp.axes[1] > 0.5 || (gp.buttons[13] && gp.buttons[13].pressed),
                left: gp.axes[0] < -0.5 || (gp.buttons[14] && gp.buttons[14].pressed),
                right: gp.axes[0] > 0.5 || (gp.buttons[15] && gp.buttons[15].pressed),
                punch: gp.buttons[2] && gp.buttons[2].pressed,
                kick: gp.buttons[3] && gp.buttons[3].pressed,
                leftPunch: gp.buttons[0] && gp.buttons[0].pressed,
                rightPunch: gp.buttons[1] && gp.buttons[1].pressed,
                block: gp.buttons[4] && gp.buttons[4].pressed,
                special: gp.buttons[5] && gp.buttons[5].pressed,
                heat: gp.buttons[6] && gp.buttons[6].pressed,
                rage: gp.buttons[7] && gp.buttons[7].pressed,
            };
            this.gamepadStates[i] = state;
        }
    }

    getP1() {
        return {
            ...this.p1State,
            ...this.gamepadStates[0],
            ...(this.touchState || {}),
        };
    }

    getP2() {
        return {
            ...this.p2State,
            ...this.gamepadStates[1],
        };
    }

    getP1Pressed() {
        const state = this.getP1();
        const prev = { ...this.p1Prev, ...this.gamepadPrev[0], ...(this.prevTouchState || {}) };
        const pressed = {};
        for (const key of Object.keys(state)) {
            pressed[key] = state[key] && !prev[key];
        }
        this.prevTouchState = { ...(this.touchState || {}) };
        return pressed;
    }

    getP2Pressed() {
        const state = this.getP2();
        const prev = { ...this.p2Prev, ...this.gamepadPrev[1] };
        const pressed = {};
        for (const key of Object.keys(state)) {
            pressed[key] = state[key] && !prev[key];
        }
        return pressed;
    }

    isPressed(player, action) {
        if (player === 1) {
            const state = this.getP1();
            const prev = { ...this.p1Prev, ...this.gamepadPrev[0] };
            return state[action] && !prev[action];
        } else {
            const state = this.getP2();
            const prev = { ...this.p2Prev, ...this.gamepadPrev[1] };
            return state[action] && !prev[action];
        }
    }

    isHeld(player, action) {
        if (player === 1) {
            return !!this.getP1()[action];
        } else {
            return !!this.getP2()[action];
        }
    }

    getSnapshot() {
        return {
            p1: this.getP1(),
            p2: this.getP2(),
        };
    }

    setSnapshot(snapshot) {
        this.p1State = { ...snapshot.p1 };
        this.p2State = { ...snapshot.p2 };
    }
}
