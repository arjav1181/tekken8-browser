export class TouchControls {
    constructor(container, input) {
        this.container = container;
        this.input = input;
        this.element = null;
        this.joystickActive = false;
        this.joystickStart = { x: 0, y: 0 };
        this.joystickCurrent = { x: 0, y: 0 };
        this.joystickTouchId = null;
        this.buttonTouches = {};
        this.isMobile = false;
    }

    detectMobile() {
        return 'ontouchstart' in window ||
               navigator.maxTouchPoints > 0 ||
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    show() {
        if (!this.detectMobile()) return false;
        this.isMobile = true;

        this.element = document.createElement('div');
        this.element.className = 'touch-controls';
        this.element.innerHTML = `
            <div class="touch-joystick" id="touch-joystick">
                <div class="joystick-base">
                    <div class="joystick-knob" id="joystick-knob"></div>
                </div>
            </div>
            <div class="touch-buttons">
                <button class="touch-btn" data-action="punch">P</button>
                <button class="touch-btn" data-action="kick">K</button>
                <button class="touch-btn" data-action="heavy">H</button>
                <button class="touch-btn" data-action="special">S</button>
                <button class="touch-btn touch-btn-block" data-action="block">BLK</button>
                <button class="touch-btn touch-btn-heat" data-action="heat">HEAT</button>
                <button class="touch-btn touch-btn-rage" data-action="rage">RAGE</button>
            </div>
        `;
        this.container.appendChild(this.element);

        this.setupJoystick();
        this.setupButtons();
        return true;
    }

    setupJoystick() {
        const joystick = this.element.querySelector('#touch-joystick');
        const knob = this.element.querySelector('#joystick-knob');
        const maxDist = 40;

        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.joystickActive = true;
            this.joystickTouchId = touch.identifier;
            const rect = joystick.getBoundingClientRect();
            this.joystickStart = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
            };
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!this.joystickActive) return;
            e.preventDefault();

            for (const touch of e.changedTouches) {
                if (touch.identifier === this.joystickTouchId) {
                    const dx = touch.clientX - this.joystickStart.x;
                    const dy = touch.clientY - this.joystickStart.y;
                    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
                    const angle = Math.atan2(dy, dx);

                    const knobX = Math.cos(angle) * dist;
                    const knobY = Math.sin(angle) * dist;
                    knob.style.transform = `translate(${knobX}px, ${knobY}px)`;

                    this.joystickCurrent = { x: dx, y: dy };
                    this.updateJoystickInput();
                }
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === this.joystickTouchId) {
                    this.joystickActive = false;
                    this.joystickTouchId = null;
                    this.joystickCurrent = { x: 0, y: 0 };
                    knob.style.transform = 'translate(0px, 0px)';
                    this.clearJoystickInput();
                }
            }
        });
    }

    updateJoystickInput() {
        const deadzone = 15;
        const { x, y } = this.joystickCurrent;

        this.input.touchState = this.input.touchState || {};
        this.input.touchState.left = x < -deadzone;
        this.input.touchState.right = x > deadzone;
        this.input.touchState.up = y < -deadzone;
        this.input.touchState.down = y > deadzone;
    }

    clearJoystickInput() {
        if (this.input.touchState) {
            this.input.touchState.left = false;
            this.input.touchState.right = false;
            this.input.touchState.up = false;
            this.input.touchState.down = false;
        }
    }

    setupButtons() {
        const buttons = this.element.querySelectorAll('.touch-btn');

        buttons.forEach(btn => {
            const action = btn.dataset.action;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.classList.add('active');
                this.input.touchState = this.input.touchState || {};
                this.input.touchState[action] = true;
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.classList.remove('active');
                this.input.touchState = this.input.touchState || {};
                this.input.touchState[action] = false;
            });

            btn.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                btn.classList.remove('active');
                this.input.touchState = this.input.touchState || {};
                this.input.touchState[action] = false;
            });
        });
    }

    hide() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
        this.isMobile = false;
    }

    update() {
    }
}
