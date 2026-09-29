import { Phase, RoundRules } from '../game/Game.js';
import { drawHitboxDebug, drawHurtboxDebug } from '../game/FighterRender.js';

const COLORS = {
    p1: { name: '#4af', sub: '#2a88aa' },
    p2: { name: '#f55', sub: '#aa2a2a' },
};

export class HUD {
    constructor(renderer) {
        this.r = renderer;
        this.ctx = renderer.ctx;
        this.fontFamily = 'Impact, "Arial Black", sans-serif';
    }

    draw(game) {
        if (!game.p1 || !game.p2) return;
        this.drawHealthBars(game);
        this.drawHeatBars(game);
        this.drawTimer(game);
        this.drawRoundMarkers(game);
        this.drawCombo(game);
        this.drawAnnouncement(game);
        this.drawStageLabel(game);
        this.drawMatchResult(game);
        if (game.practiceMode) this.drawPracticeInfo(game);
        if (this.r.debug.frameData) this.drawFrameData(game);
        if (this.r.debug.hurtboxes || this.r.debug.hitboxes) this.drawBoxes(game);
        if (this.r.debug.inputs) this.drawInputDisplay(game);
    }

    drawHealthBars(game) {
        const ctx = this.ctx;
        const w = this.r.width;
        const pad = 26 * (this.r.width / 1280);
        const barW = w * 0.40;
        const barH = 26 * (this.r.height / 720);
        const y = 22 * (this.r.height / 720);

        this.drawBar(game.p1, pad, y, barW, barH, false, 1);
        this.drawBar(game.p2, w - pad - barW, y, barW, barH, true, 2);
    }

    drawBar(fighter, x, y, w, h, flip, player) {
        const ctx = this.ctx;
        const healthPct = Math.max(0, fighter.health / fighter.maxHealth);
        const ghostPct = Math.max(0, fighter.getGhostHealth() / fighter.maxHealth);
        const recPct = Math.max(0, (fighter.recoverableHealth) / fighter.maxHealth);
        const ragePct = fighter.rageActive ? (fighter.health / (fighter.maxHealth * 0.25)) : 0;

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(x, y, w, h);

        const drawFill = (pct, color, yOff = 0, height = h) => {
            if (pct <= 0) return;
            const fw = w * Math.min(1, pct);
            ctx.fillStyle = color;
            if (flip) {
                ctx.fillRect(x + w - fw, y + yOff, fw, height);
            } else {
                ctx.fillRect(x, y + yOff, fw, height);
            }
        };

        drawFill(ghostPct, 'rgba(255,255,255,0.22)');

        const grad = ctx.createLinearGradient(0, y, 0, y + h);
        if (fighter.rageActive) {
            grad.addColorStop(0, '#ffdd33');
            grad.addColorStop(0.5, '#ff8811');
            grad.addColorStop(1, '#cc2200');
        } else {
            grad.addColorStop(0, player === 1 ? '#7fe8ff' : '#ffb0b0');
            grad.addColorStop(0.45, player === 1 ? '#1a8fc0' : '#c02a2a');
            grad.addColorStop(1, player === 1 ? '#0a4a70' : '#701010');
        }
        drawFill(healthPct, grad);

        if (recPct > 0) {
            drawFill(healthPct + recPct, 'rgba(255,255,255,0.5)', h * 0.62, h * 0.38);
        }

        if (fighter.rageActive) {
            ctx.strokeStyle = `rgba(255, 180, 40, ${0.6 + Math.sin(Date.now() * 0.012) * 0.4})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = `bold ${Math.round(13 * (this.r.height / 720))}px Arial`;
        ctx.textAlign = flip ? 'right' : 'left';
        ctx.fillText(fighter.config.name, flip ? x + w : x, y + h + 15 * (this.r.height / 720));
        ctx.restore();
    }

    drawHeatBars(game) {
        const ctx = this.ctx;
        const w = this.r.width;
        const pad = 26 * (this.r.width / 1280);
        const barW = w * 0.28;
        const barH = 9 * (this.r.height / 720);
        const y = 54 * (this.r.height / 720);

        this.drawHeatBar(game.p1, pad, y, barW, barH, false);
        this.drawHeatBar(game.p2, w - pad - barW, y, barW, barH, true);
    }

    drawHeatBar(fighter, x, y, w, h, flip) {
        const ctx = this.ctx;
        const pct = Math.max(0, Math.min(1, fighter.heatMeter / fighter.maxHeatMeter));
        const energyPct = fighter.heatActive ? (fighter.heatEnergy / 2) : 0;

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
        ctx.fillStyle = '#081018';
        ctx.fillRect(x, y, w, h);

        const fw = w * pct;
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, fighter.heatActive ? '#aaf' : '#2a5a8a');
        grad.addColorStop(1, fighter.heatActive ? '#fff' : '#4a9fd0');
        ctx.fillStyle = grad;
        if (flip) ctx.fillRect(x + w - fw, y, fw, h);
        else ctx.fillRect(x, y, fw, h);

        if (fighter.heatActive) {
            ctx.fillStyle = '#ffffff';
            const ew = w * energyPct;
            if (flip) ctx.fillRect(x + w - ew, y, ew, h);
            else ctx.fillRect(x, y, ew, h);
        }

        ctx.strokeStyle = fighter.heatActive ? '#88e8ff' : 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }

    drawTimer(game) {
        const ctx = this.ctx;
        const cx = this.r.width / 2;
        const s = Math.round(52 * (this.r.height / 720));
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = `${s}px ${this.fontFamily}`;
        const time = game.timeString;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(time, cx + 3, s * 0.95 + 3);
        const urgent = game.roundTimer < 10 * 60;
        ctx.fillStyle = urgent && Math.floor(Date.now() / 250) % 2 === 0 ? '#ff4433' : '#ffffff';
        ctx.fillText(time, cx, s * 0.95);
        ctx.restore();
    }

    drawRoundMarkers(game) {
        const ctx = this.ctx;
        const s = Math.round(11 * (this.r.height / 720));
        const y = 78 * (this.r.height / 720);
        const spacing = s * 2.4;
        const cx = this.r.width / 2;

        for (let side = 0; side < 2; side++) {
            const f = side === 0 ? game.p1 : game.p2;
            const dir = side === 0 ? -1 : 1;
            for (let i = 0; i < RoundRules.ROUNDS_TO_WIN; i++) {
                const x = cx + dir * (spacing * 0.7 + i * spacing);
                const won = i < f.wins;
                ctx.save();
                ctx.beginPath();
                if (won) {
                    ctx.fillStyle = side === 0 ? COLORS.p1.name : COLORS.p2.name;
                    ctx.arc(x, y, s * 0.45, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
                    ctx.lineWidth = 2;
                    ctx.arc(x, y, s * 0.45, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }
    }

    drawCombo(game) {
        const ctx = this.ctx;
        const s = Math.round(20 * (this.r.height / 720));
        const s2 = Math.round(40 * (this.r.height / 720));

        const draw = (fighter, side) => {
            if (fighter.comboCount < 2) return;
            const x = side === 1 ? 60 * (this.r.width / 1280) : this.r.width - 60 * (this.r.width / 1280);
            const y = 150 * (this.r.height / 720);
            const alpha = Math.min(1, fighter.comboTimer / 30);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.textAlign = side === 1 ? 'left' : 'right';
            ctx.font = `${s2}px ${this.fontFamily}`;
            ctx.fillStyle = '#000';
            ctx.fillText(fighter.comboCount, x + 2, y + 2);
            ctx.fillStyle = fighter.comboCount >= 6 ? '#ff4422' : '#ffaa11';
            ctx.fillText(fighter.comboCount, x, y);
            ctx.font = `${s}px ${this.fontFamily}`;
            ctx.fillStyle = '#fff';
            ctx.fillText('HITS', x + (side === 1 ? s2 * 0.9 : -s2 * 0.9), y);
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = `bold ${Math.round(15 * (this.r.height / 720))}px Arial`;
            ctx.fillText(`${fighter.comboDamage} dmg`, x, y + 24 * (this.r.height / 720));
            ctx.restore();
        };

        draw(game.p1, 1);
        draw(game.p2, 2);
    }

    drawAnnouncement(game) {
        if (game.announceTimer <= 0) return;
        const ctx = this.ctx;
        const alpha = Math.min(1, game.announceTimer / 30);
        const big = Math.round(78 * (this.r.height / 720));
        const sub = Math.round(24 * (this.r.height / 720));
        const cx = this.r.width / 2;
        const cy = this.r.height * 0.38;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1 + (1 - alpha) * 0.1, 1 + (1 - alpha) * 0.1);
        ctx.font = `${big}px ${this.fontFamily}`;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillText(game.announceText, 4, 5);
        const grad = ctx.createLinearGradient(0, -big * 0.5, 0, big * 0.4);
        grad.addColorStop(0, '#fff5d0');
        grad.addColorStop(0.5, '#ffaa22');
        grad.addColorStop(1, '#cc2200');
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(255, 100, 0, 0.6)';
        ctx.shadowBlur = 24;
        ctx.fillText(game.announceText, 0, 0);
        ctx.restore();

        if (game.announceSubtext) {
            ctx.font = `${sub}px ${this.fontFamily}`;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillText(game.announceSubtext, cx + 2, cy + 40 * (this.r.height / 720) + 2);
            ctx.fillStyle = '#fff';
            ctx.fillText(game.announceSubtext, cx, cy + 40 * (this.r.height / 720));
        }
        ctx.restore();
    }

    drawStageLabel(game) {
        const stage = game.stage;
        if (!stage) return;
        const ctx = this.ctx;
        const s = Math.round(13 * (this.r.height / 720));
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#fff';
        ctx.font = `${s}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(stage.name, 26 * (this.r.width / 1280), this.r.height - 18 * (this.r.height / 720));
        ctx.restore();
    }

    drawMatchResult(game) {
        if (game.phase !== Phase.MATCH_END) return;
    }

    drawPracticeInfo(game) {
        const ctx = this.ctx;
        const s = Math.round(13 * (this.r.height / 720));
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(this.r.width - 230 * (this.r.width / 1280), 100 * (this.r.height / 720),
                     210 * (this.r.width / 1280), 150 * (this.r.height / 720));
        ctx.fillStyle = '#7fe8ff';
        ctx.font = `${s}px Arial`;
        ctx.textAlign = 'left';
        const x = this.r.width - 218 * (this.r.width / 1280);
        let y = 120 * (this.r.height / 720);
        ctx.fillText('TRAINING MODE', x, y);
        y += 20 * (this.r.height / 720);
        ctx.fillStyle = '#fff';
        ctx.fillText(`Dummy: ${game.practiceDummyBehaviour}`, x, y);
        y += 18 * (this.r.height / 720);
        ctx.fillText(`Stage: ${game.stage?.name || '-'}`, x, y);
        y += 18 * (this.r.height / 720);
        ctx.fillText('F1: hurtboxes  F2: hitboxes', x, y);
        y += 18 * (this.r.height / 720);
        ctx.fillText('F3: frame data  F4: inputs', x, y);
        ctx.restore();
    }

    drawFrameData(game) {
        const ctx = this.ctx;
        const s = Math.round(12 * (this.r.height / 720));
        const f = game.p1;
        const mv = f.currentMove;
        const y = 200 * (this.r.height / 720);

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(26 * (this.r.width / 1280), y - 20 * (this.r.height / 720),
                     260 * (this.r.width / 1280), 150 * (this.r.height / 720));
        ctx.fillStyle = '#7fe8ff';
        ctx.font = `${s}px monospace`;
        ctx.textAlign = 'left';
        const x = 34 * (this.r.width / 1280);
        let ly = y;

        if (mv) {
            ctx.fillStyle = '#ffdd44';
            ctx.fillText(`> ${mv.name}`, x, ly); ly += 16;
            ctx.fillStyle = '#fff';
            ctx.fillText(`startup ${mv.startup}  active ${mv.active}  rec ${mv.recovery}`, x, ly); ly += 16;
            ctx.fillText(`onHit ${mv.onHit > 0 ? '+' : ''}${mv.onHit}  onBlock ${mv.onBlock > 0 ? '+' : ''}${mv.onBlock}`, x, ly); ly += 16;
            ctx.fillText(`dmg ${mv.damage}  level ${mv.hitLevel}`, x, ly); ly += 16;
            ctx.fillText(`frame ${f.moveFrame}/${mv.total}`, x, ly); ly += 16;
            const punishable = mv.total - f.moveFrame;
            ctx.fillStyle = punishable > mv.blockstunFrames() ? '#ff5544' : '#88ff88';
            ctx.fillText(punishable > 0 ? `punish window: ${punishable}F` : 'safe', x, ly); ly += 16;
        } else {
            ctx.fillStyle = '#888';
            ctx.fillText('no move active', x, ly);
        }
        ctx.restore();
    }

    drawBoxes(game) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = 0.9;
        if (this.r.debug.hurtboxes) {
            drawHurtboxDebug(ctx, game.p1);
            drawHurtboxDebug(ctx, game.p2);
        }
        if (this.r.debug.hitboxes) {
            drawHitboxDebug(ctx, game.p1);
            drawHitboxDebug(ctx, game.p2);
        }
        ctx.restore();
    }

    drawInputDisplay(game) {
        const ctx = this.ctx;
        const s = Math.round(11 * (this.r.height / 720));
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(26 * (this.r.width / 1280), this.r.height - 70 * (this.r.height / 720),
                     300 * (this.r.width / 1280), 56 * (this.r.height / 720));
        ctx.fillStyle = '#88ff88';
        ctx.font = `${s}px monospace`;
        ctx.textAlign = 'left';
        const x = 34 * (this.r.width / 1280);
        let y = this.r.height - 52 * (this.r.height / 720);
        ctx.fillText(`dir ${game.p1.parser.currentDir()}`, x, y);
        y += 14 * (this.r.height / 720);
        ctx.fillStyle = '#ffdd44';
        const recent = game.p1.parser.buffer.history.slice(-8).map(e => e.dir).join(' ');
        ctx.fillText(`hist [${recent}]`, x, y);
        ctx.restore();
    }
}
