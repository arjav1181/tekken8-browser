export class GameLoop {
    constructor(updateFn, renderFn, targetFPS = 60) {
        this.updateFn = updateFn;
        this.renderFn = renderFn;
        this.targetFPS = targetFPS;
        this.frameTime = 1000 / targetFPS;
        this.lastTime = 0;
        this.accumulator = 0;
        this.running = false;
        this.frameCount = 0;
        this.fps = 0;
        this.fpsCounter = 0;
        this.fpsTime = 0;
        this.rafId = null;
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.rafId = requestAnimationFrame((t) => this.loop(t));
    }

    stop() {
        this.running = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    loop(currentTime) {
        if (!this.running) return;

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.accumulator += deltaTime;

        this.fpsCounter++;
        this.fpsTime += deltaTime;
        if (this.fpsTime >= 1000) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsTime = 0;
        }

        while (this.accumulator >= this.frameTime) {
            this.updateFn(this.frameTime / 1000);
            this.accumulator -= this.frameTime;
            this.frameCount++;
        }

        const alpha = this.accumulator / this.frameTime;
        this.renderFn(alpha);

        this.rafId = requestAnimationFrame((t) => this.loop(t));
    }
}
