import { GameLoop } from './engine/GameLoop.js';
import { Input } from './engine/Input.js';
import { Renderer } from './engine/Renderer.js';
import { Game, GameMode } from './game/Game.js';
import { HUD } from './ui/HUD.js';
import { TouchControls } from './ui/TouchControls.js';
import { drawStage, getStage } from './data/stages.js';
import { drawFighter } from './game/FighterRender.js';
import { audio } from './audio/AudioEngine.js';
import { RollbackSession } from './game/Netcode.js';
import { CHARACTERS, getCharacter } from './data/roster.js';
import { Difficulty } from './game/AI.js';

class App {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.uiContainer = document.getElementById('ui-overlay');
        this.renderer = new Renderer(this.canvas);
        this.input = new Input();
        this.game = new Game(this.renderer, this.input);
        this.hud = new HUD(this.renderer);
        this.touch = new TouchControls(this.uiContainer, this.input);
        this.state = 'menu';
        this.menuIndex = 0;
        this.selectIndex = 0;
        this.selectStage = 0;
        this.difficulty = Difficulty.AMATEUR;
        this.netSession = null;
        this.onlineRole = null;
        this.roomCode = null;
        this.touchVisible = false;

        this.setupUI();
        this.setupDebugKeys();
        this.loop = new GameLoop(
            (dt) => this.update(dt),
            () => this.render(),
            60
        );
        this.loop.start();
        this.renderMenu();
    }

    setupUI() {
        this.uiContainer.innerHTML = '';

        this.menuEl = document.createElement('div');
        this.menuEl.className = 'menu-screen';
        this.uiContainer.appendChild(this.menuEl);

        this.selectEl = null;
        this.lobbyEl = null;
        this.resultEl = null;
    }

    setupDebugKeys() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'F1') { e.preventDefault(); this.renderer.debug.hurtboxes = !this.renderer.debug.hurtboxes; }
            if (e.code === 'F2') { e.preventDefault(); this.renderer.debug.hitboxes = !this.renderer.debug.hitboxes; }
            if (e.code === 'F3') { e.preventDefault(); this.renderer.debug.frameData = !this.renderer.debug.frameData; }
            if (e.code === 'F4') { e.preventDefault(); this.renderer.debug.inputs = !this.renderer.debug.inputs; }
        });
    }

    showTouchControls() {
        if (this.touchVisible) return;
        this.touchVisible = this.touch.show();
    }

    hideTouchControls() {
        if (!this.touchVisible) return;
        this.touch.hide();
        this.touchVisible = false;
    }

    renderMenu() {
        this.state = 'menu';
        this.menuIndex = 0;
        this.hideTouchControls();
        this.uiContainer.innerHTML = '';
        this.menuEl = document.createElement('div');
        this.menuEl.className = 'menu-screen';

        const difficultyOptions = Object.values(Difficulty).map(d => {
            const names = {
                beginner: 'Beginner', casual: 'Casual', amateur: 'Amateur',
                professional: 'Professional', godlike: 'Godlike',
            };
            return `<button class="menu-btn ${d === this.difficulty ? 'primary' : ''}" data-diff="${d}">${names[d]}</button>`;
        }).join('');

        this.menuEl.innerHTML = `
            <div class="menu-brand">
                <div class="menu-title-small">KING OF IRON FIST</div>
                <div class="menu-title">TEKKEN</div>
                <div class="menu-title-num">8</div>
                <div class="menu-subtitle">Browser Fighting Edition</div>
            </div>
            <div class="menu-buttons">
                <button class="menu-btn" data-mode="arcade">Arcade</button>
                <button class="menu-btn" data-mode="versus">Versus</button>
                <button class="menu-btn" data-mode="practice">Training</button>
                <button class="menu-btn" data-mode="online">Online</button>
            </div>
            <div class="difficulty-label">AI Difficulty</div>
            <div class="difficulty-buttons">${difficultyOptions}</div>
            <div class="controls-hint">
                <b>P1</b> WASD move &middot; J/K/L buttons &middot; Shift heat &middot; Q rage &middot; F1-F4 training overlays<br>
                <b>P2</b> Arrows &middot; Numpad 1/2/3 &middot; NumpadAdd heat &middot; NumpadSubtract rage
            </div>
        `;
        this.uiContainer.appendChild(this.menuEl);

        this.menuEl.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                audio.init();
                audio.playMenuSelect();
                this.selectMode(btn.dataset.mode);
            });
        });

        this.menuEl.querySelectorAll('[data-diff]').forEach(btn => {
            btn.addEventListener('click', () => {
                audio.playUI();
                this.difficulty = btn.dataset.diff;
                this.renderMenu();
            });
        });
    }

    selectMode(mode) {
        this.pendingMode = mode;
        if (mode === 'online') {
            this.renderLobby();
        } else {
            this.renderCharacterSelect(mode);
        }
    }

    renderCharacterSelect(mode) {
        this.state = 'select';
        this.selectIndex = 0;
        this.playerSelectIndex = 1;
        this.selectMode = mode;
        this.uiContainer.innerHTML = '';

        const el = document.createElement('div');
        el.className = 'character-select';
        el.innerHTML = `
            <div class="select-header">
                <h2 id="select-title">${mode === 'versus' ? 'PLAYER 1 — SELECT YOUR FIGHTER' : 'SELECT YOUR FIGHTER'}</h2>
                <button class="back-btn" id="select-back">Back</button>
            </div>
            <div class="select-body">
                <div class="character-grid">
                    ${CHARACTERS.map((c, i) => `
                        <div class="character-card" data-id="${c.id}">
                            <div class="char-preview"><canvas class="preview-canvas" width="120" height="150"></canvas></div>
                            <div class="char-name">${c.name}</div>
                            <div class="char-style">${c.style}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="char-detail" id="char-detail"></div>
            </div>
            <div class="stage-picker">
                <span class="stage-label">Stage</span>
                <button class="stage-btn" id="stage-prev">&#9664;</button>
                <span class="stage-name" id="stage-name"></span>
                <button class="stage-btn" id="stage-next">&#9654;</button>
            </div>
        `;
        this.uiContainer.appendChild(el);
        this.selectEl = el;

        this.updateStageLabel();

        el.querySelectorAll('.character-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                const c = getCharacter(card.dataset.id);
                this.showCharacterDetail(c);
                audio.playUI();
            });
            card.addEventListener('click', () => {
                audio.playMenuSelect();
                this.confirmCharacter(card.dataset.id);
            });
        });

        el.querySelector('#select-back').addEventListener('click', () => {
            audio.playMenuBack();
            this.renderMenu();
        });

        el.querySelector('#stage-prev').addEventListener('click', () => {
            this.selectStage = (this.selectStage + 7) % 8;
            this.updateStageLabel();
            audio.playUI();
        });
        el.querySelector('#stage-next').addEventListener('click', () => {
            this.selectStage = (this.selectStage + 1) % 8;
            this.updateStageLabel();
            audio.playUI();
        });

        this.showCharacterDetail(CHARACTERS[0]);
    }

    updateStageLabel() {
        const el = document.getElementById('stage-name');
        if (el) el.textContent = getStage(this.selectStage).name;
    }

    showCharacterDetail(char) {
        const el = document.getElementById('char-detail');
        if (!el || !char) return;
        const statBar = (label, v) => {
            const dots = '●'.repeat(v) + '○'.repeat(5 - v);
            return `<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-dots">${dots}</span></div>`;
        };
        el.innerHTML = `
            <div class="detail-name">${char.name}</div>
            <div class="detail-style">${char.style}</div>
            <div class="detail-blurb">${char.blurb}</div>
            <div class="detail-stats">
                ${statBar('Power', char.stats.power)}
                ${statBar('Speed', char.stats.speed)}
                ${statBar('Range', char.stats.range)}
                ${statBar('Defense', char.stats.defense)}
                ${statBar('Heat', char.stats.heat)}
            </div>
            <div class="detail-health">Health ${char.health} &middot; Weight ${char.weight.toFixed(2)}x &middot; Speed ${char.speed.toFixed(2)}x</div>
        `;
    }

    confirmCharacter(id) {
        if (this.selectMode === 'versus' && this.playerSelectIndex === 1) {
            this.p1Pick = id;
            this.playerSelectIndex = 2;
            const title = document.getElementById('select-title');
            if (title) title.textContent = 'PLAYER 2 — SELECT YOUR FIGHTER';
            this.selectEl.querySelectorAll('.character-card').forEach(c => c.classList.remove('picked-p2'));
            this.selectEl.querySelector(`[data-id="${id}"]`).classList.add('picked-p2');
            return;
        }

        if (this.selectMode === 'versus' && this.playerSelectIndex === 2) {
            this.startMatch(GameMode.VERSUS, this.p1Pick, id);
        } else {
            this.startMatch(this.selectMode, id, this.randomOpponent(id));
        }
    }

    randomOpponent(exclude) {
        const pool = CHARACTERS.filter(c => c.id !== exclude);
        return pool[Math.floor(Math.random() * pool.length)].id;
    }

    startMatch(mode, p1Id, p2Id) {
        this.uiContainer.innerHTML = '';
        this.state = 'match';
        this.game.startMatch(mode, p1Id, p2Id, {
            difficulty: this.difficulty,
            stageIndex: this.selectStage,
        });
        this.game.stage = getStage(this.selectStage);
        this.game.onMatchEnd = (winner, loser) => {
            setTimeout(() => this.renderResult(winner, loser), 2400);
        };
        this.showTouchControls();
        audio.init();
        audio.resume();
        audio.startMusic('fight');
    }

    renderResult(winner, loser) {
        this.state = 'result';
        this.hideTouchControls();
        audio.stopMusic();
        const el = document.createElement('div');
        el.className = 'result-screen';
        el.innerHTML = `
            <div class="result-banner">${winner.config.name} WINS</div>
            <div class="result-score">${winner.wins} &ndash; ${loser.wins}</div>
            <div class="menu-buttons">
                <button class="menu-btn" id="rematch">Rematch</button>
                <button class="menu-btn secondary" id="to-select">Character Select</button>
                <button class="menu-btn secondary" id="to-menu">Main Menu</button>
            </div>
        `;
        this.uiContainer.appendChild(el);
        el.querySelector('#rematch').addEventListener('click', () => {
            audio.playMenuSelect();
            this.startMatch(this.game.mode, winner.config.id, loser.config.id);
        });
        el.querySelector('#to-select').addEventListener('click', () => {
            audio.playMenuBack();
            this.renderCharacterSelect(this.game.mode === GameMode.VERSUS ? 'versus' : this.game.mode);
        });
        el.querySelector('#to-menu').addEventListener('click', () => {
            audio.playMenuBack();
            this.renderMenu();
        });
    }

    renderLobby() {
        this.state = 'lobby';
        this.uiContainer.innerHTML = '';
        const el = document.createElement('div');
        el.className = 'lobby-screen';
        el.innerHTML = `
            <div class="lobby-title">ONLINE MATCHMAKING</div>
            <div class="lobby-status" id="lobby-status">Choose how you want to play</div>
            <div class="lobby-buttons">
                <button class="menu-btn" id="create-room">Create Room</button>
                <button class="menu-btn secondary" id="join-room">Join Room</button>
                <button class="menu-btn secondary" id="local-lobby">Local Split-Screen (Offline)</button>
            </div>
            <div class="room-panel" id="room-panel" style="display:none">
                <div class="room-code-label">Room Code</div>
                <div class="room-code" id="room-code">----</div>
                <button class="copy-btn" id="copy-code">Copy Link</button>
                <div class="lobby-wait" id="lobby-wait">Waiting for opponent...</div>
            </div>
            <div class="net-stats" id="net-stats"></div>
            <button class="back-btn" id="lobby-back">Back</button>
        `;
        this.uiContainer.appendChild(el);

        el.querySelector('#create-room').addEventListener('click', async () => {
            audio.playMenuSelect();
            await this.connectOnline(true);
        });
        el.querySelector('#join-room').addEventListener('click', async () => {
            const code = prompt('Enter room code:');
            if (code) {
                audio.playMenuSelect();
                await this.connectOnline(false, code.toUpperCase());
            }
        });
        el.querySelector('#local-lobby').addEventListener('click', () => {
            audio.playMenuSelect();
            this.renderCharacterSelect('versus');
        });
        el.querySelector('#lobby-back').addEventListener('click', () => {
            audio.playMenuBack();
            this.renderMenu();
        });
        el.querySelector('#copy-code').addEventListener('click', () => {
            const url = `${location.origin}${location.pathname}?room=${this.roomCode}`;
            navigator.clipboard?.writeText(url);
            const b = el.querySelector('#copy-code');
            b.textContent = 'Copied!';
            setTimeout(() => (b.textContent = 'Copy Link'), 1500);
        });
    }

    async connectOnline(isHost, code) {
        const status = document.getElementById('lobby-status');
        status.textContent = isHost ? 'Creating room...' : 'Joining room...';

        const params = new URLSearchParams(location.search);
        const urlFromQuery = params.get('room');

        this.netSession = new RollbackSession(isHost ? 0 : 1);
        const connected = await this.netSession.connect(
            isHost ? undefined : (code || urlFromQuery)
        );

        if (!connected) {
            status.textContent = 'No server available. Use Local Split-Screen instead.';
            return;
        }

        const panel = document.getElementById('room-panel');
        panel.style.display = 'block';
        this.roomCode = this.netSession.roomCode;
        document.getElementById('room-code').textContent = this.roomCode;
        status.textContent = 'Connected to relay';

        this.netSession.onOpponentJoined = () => {
            document.getElementById('lobby-wait').textContent = 'Opponent found! Selecting fighters...';
            setTimeout(() => {
                this.uiContainer.innerHTML = '';
                this.state = 'net-select';
                this.netSelectUI();
            }, 800);
        };

        this.netSession.onDisconnect = () => {
            const s = document.getElementById('lobby-status');
            if (s) s.textContent = 'Disconnected from server';
        };
    }

    netSelectUI() {
        const el = document.createElement('div');
        el.className = 'character-select';
        el.innerHTML = `
            <div class="select-header">
                <h2>ONLINE — SELECT YOUR FIGHTER</h2>
            </div>
            <div class="select-body">
                <div class="character-grid">
                    ${CHARACTERS.map(c => `
                        <div class="character-card" data-id="${c.id}">
                            <div class="char-preview"><canvas class="preview-canvas" width="120" height="150"></canvas></div>
                            <div class="char-name">${c.name}</div>
                            <div class="char-style">${c.style}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="char-detail" id="char-detail"></div>
            </div>
        `;
        this.uiContainer.appendChild(el);
        this.selectEl = el;
        el.querySelectorAll('.character-card').forEach(card => {
            card.addEventListener('click', () => {
                audio.playMenuSelect();
                this.netSession.sendCharacterPick(card.dataset.id);
                card.classList.add('picked-p2');
                el.querySelector('h2').textContent = 'Waiting for opponent pick...';
            });
        });
        this.showCharacterDetail(CHARACTERS[0]);

        this.netSession.onMatchReady = (p1Id, p2Id) => {
            this.state = 'match';
            this.uiContainer.innerHTML = '';
            this.game.startMatch(GameMode.ONLINE, p1Id, p2Id, { stageIndex: this.selectStage });
            this.game.stage = getStage(this.selectStage);
            this.netSession.onInput = (frame, encoded) => {
                this.game.queueRemoteInput(frame, decodeInput(encoded, 1));
            };
            this.game.onRemoteInput = (frame, encoded) => {
                this.netSession.sendInput(frame, encoded);
            };
            this.showTouchControls();
            audio.init();
            audio.resume();
            audio.startMusic('fight');
        };
    }

    update(dt) {
        this.input.update();

        if (this.state === 'match') {
            if (this.input.isPressed(1, 'pause')) {
                this.game.paused = !this.game.paused;
                if (this.game.paused) audio.stopMusic();
                else audio.startMusic('fight');
            }
            if (this.netSession) {
                this.netSession.update(this.game);
            }
            this.game.update(dt);
            this.updateMatchAudio();
        }

        this.renderer.update(dt);
        this.renderer.updateShake();
    }

    updateMatchAudio() {
        const g = this.game;
        if (g.hitstop > 0 && !this._hitstopAudio) {
            this._hitstopAudio = true;
        }
        if (g.hitLog.length && g.hitLog[g.hitLog.length - 1].frame !== this._lastHitFrame) {
            const hit = g.hitLog[g.hitLog.length - 1];
            if (hit.frame !== this._lastHitFrame) {
                this._lastHitFrame = hit.frame;
                audio.playHit(hit.damage, hit.blocked);
                this.renderer.spawnHitSpark(
                    hit.blocked ? (hit.attacker === 1 ? g.p2.x : g.p1.x) : (hit.attacker === 1 ? g.p2.x : g.p1.x),
                    -95,
                    hit.blocked ? '#88aaff' : '#ffaa33',
                    Math.min(2, hit.damage / 20)
                );
            }
        }
    }

    render() {
        const r = this.renderer;
        r.clear();

        if (this.state !== 'match' || !this.game.p1) {
            return;
        }

        const g = this.game;
        const ctx = r.ctx;

        ctx.save();
        r.worldTransform(g.cameraX, g.cameraY, g.cameraZoom);

        drawStage(ctx, g.stage || getStage(0), g.cameraX, g.stageTime);

        r.renderTrails();

        const fighters = [g.p1, g.p2].sort((a, b) => a.y - b.y);
        for (const f of fighters) {
            drawFighter(ctx, f);
        }

        for (const proj of g.projectiles) {
            ctx.save();
            ctx.fillStyle = proj.move.effectColor || '#ff4400';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 24;
            ctx.beginPath();
            ctx.ellipse(proj.x, proj.y, 22, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        r.renderEffects();
        r.renderFloaters();

        ctx.restore();

        r.renderVignette();
        this.hud.draw(g);
        r.renderFlash();
    }
}

if (typeof window !== 'undefined' && !globalThis.__TEKKEN_NO_BOOTSTRAP__) {
    window.addEventListener('DOMContentLoaded', () => new App());
    if (document.readyState !== 'loading') new App();
}

export { App };
