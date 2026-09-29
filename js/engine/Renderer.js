export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.width = 1280;
        this.height = 720;
        this.baseHeight = 760;
        this.scale = 1;
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeAmount = 0;
        this.hitstopFlash = 0;
        this.flashAlpha = 0;
        this.flashColor = '#ffffff';
        this.chromaAmount = 0;
        this.vignette = 0.35;
        this.particles = [];
        this.sparks = [];
        this.floaters = [];
        this.motionTrails = [];
        this.debug = { hurtboxes: false, hitboxes: false, frameData: false, inputs: false };
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const aspect = 16 / 9;
        let w = vw;
        let h = w / aspect;
        if (h > vh) {
            h = vh;
            w = h * aspect;
        }
        this.canvas.width = Math.floor(w);
        this.canvas.height = Math.floor(h);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.width = w;
        this.height = h;
        this.scale = h / this.baseHeight;
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    setShake(amount) {
        this.shakeAmount = Math.min(28, Math.max(this.shakeAmount, amount));
    }

    updateShake() {
        if (this.shakeAmount > 0.1) {
            this.shakeX = (Math.random() - 0.5) * this.shakeAmount * 2;
            this.shakeY = (Math.random() - 0.5) * this.shakeAmount * 2;
            this.shakeAmount *= 0.86;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
            this.shakeAmount = 0;
        }
    }

    flash(alpha, color = '#ffffff') {
        this.flashAlpha = Math.max(this.flashAlpha, alpha);
        this.flashColor = color;
    }

    spawnHitSpark(x, y, color, power = 1) {
        const count = Math.floor(8 + power * 10);
        for (let i = 0; i < count; i++) {
            const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
            const sp = (4 + Math.random() * 9) * power;
            this.sparks.push({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: 1,
                decay: 0.05 + Math.random() * 0.04,
                len: 6 + Math.random() * 12 * power,
                color: i % 3 === 0 ? '#ffffff' : color,
            });
        }
        this.particles.push({
            x, y, vx: 0, vy: 0, life: 1, decay: 0.04,
            size: 12 + power * 16, color: '#ffffff', glow: true,
        });
    }

    spawnBlockSpark(x, y) {
        for (let i = 0; i < 6; i++) {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
            const sp = 3 + Math.random() * 5;
            this.sparks.push({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: 1, decay: 0.07, len: 5 + Math.random() * 6,
                color: i % 2 === 0 ? '#aaccff' : '#ffffff',
            });
        }
    }

    spawnImpactRing(x, y, color) {
        this.particles.push({
            x, y, vx: 0, vy: 0, life: 1, decay: 0.08,
            size: 6, color, ring: true, glow: true,
        });
    }

    spawnDust(x, y, amount = 1) {
        for (let i = 0; i < 4 * amount; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 24,
                y,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 2.2,
                life: 0.7,
                decay: 0.02,
                size: 3 + Math.random() * 4,
                color: 'rgba(180, 170, 150, 0.5)',
            });
        }
    }

    spawnFloater(x, y, text, color) {
        this.floaters.push({ x, y, text, color, life: 1, decay: 0.012, vy: -1.2 });
    }

    addMotionTrail(x, y, facing, color, width) {
        this.motionTrails.push({ x, y, facing, color, width, life: 0.4, decay: 0.05 });
    }

    update(dt) {
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vx *= 0.9;
            s.vy = s.vy * 0.9 + 0.2;
            s.life -= s.decay;
            if (s.life <= 0) this.sparks.splice(i, 1);
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity || 0;
            p.life -= p.decay;
            if (p.ring) p.size += 3;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
        for (let i = this.floaters.length - 1; i >= 0; i--) {
            const f = this.floaters[i];
            f.y += f.vy;
            f.vy *= 0.94;
            f.life -= f.decay;
            if (f.life <= 0) this.floaters.splice(i, 1);
        }
        for (let i = this.motionTrails.length - 1; i >= 0; i--) {
            const t = this.motionTrails[i];
            t.life -= t.decay;
            if (t.life <= 0) this.motionTrails.splice(i, 1);
        }
        if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - 0.06);
    }

    renderEffects() {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.particles) {
            ctx.globalAlpha = p.life;
            if (p.ring) {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2 + p.life * 3;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.stroke();
            } else if (p.glow) {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalCompositeOperation = 'source-over';
        for (const s of this.sparks) {
            ctx.globalAlpha = s.life;
            ctx.strokeStyle = s.color;
            ctx.lineWidth = 2 * s.life + 0.5;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x - s.vx * s.len * 0.3, s.y - s.vy * s.len * 0.3);
            ctx.stroke();
        }
        ctx.restore();
    }

    renderFloaters() {
        const ctx = this.ctx;
        ctx.save();
        ctx.textAlign = 'center';
        for (const f of this.floaters) {
            ctx.globalAlpha = Math.min(1, f.life * 1.6);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 22px Arial';
            ctx.fillText(f.text, f.x + 2, f.y + 2);
            ctx.fillStyle = f.color;
            ctx.fillText(f.text, f.x, f.y);
        }
        ctx.restore();
    }

    renderTrails() {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const t of this.motionTrails) {
            ctx.globalAlpha = t.life * 0.35;
            ctx.fillStyle = t.color;
            ctx.beginPath();
            ctx.ellipse(t.x, t.y, t.width * 8, t.width * 4, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    renderFlash() {
        if (this.flashAlpha <= 0) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = this.flashAlpha;
        ctx.fillStyle = this.flashColor;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
    }

    renderVignette() {
        const ctx = this.ctx;
        const g = ctx.createRadialGradient(
            this.width / 2, this.height / 2, this.height * 0.35,
            this.width / 2, this.height / 2, this.height * 0.85
        );
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(0,0,0,${this.vignette})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    worldTransform(cameraX, cameraY, zoom) {
        const ctx = this.ctx;
        ctx.translate(this.width / 2 + this.shakeX, this.height * 0.80 + this.shakeY);
        ctx.scale(zoom, zoom);
        ctx.translate(-cameraX, -cameraY);
    }

    screenToWorld(sx, sy, cameraX, cameraY, zoom) {
        return {
            x: (sx - this.width / 2) / zoom + cameraX,
            y: (sy - this.height * 0.80) / zoom + cameraY,
        };
    }
}
