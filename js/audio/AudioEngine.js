export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.sfxBus = null;
        this.musicBus = null;
        this.enabled = true;
        this.musicEnabled = true;
        this.initialized = false;
        this.musicTimer = null;
        this.currentTrack = null;
        this.buffers = {};
        this.announcer = null;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.6;
            this.master.connect(this.ctx.destination);

            this.sfxBus = this.ctx.createGain();
            this.sfxBus.gain.value = 0.9;
            this.sfxBus.connect(this.master);

            this.musicBus = this.ctx.createGain();
            this.musicBus.gain.value = 0.22;
            this.musicBus.connect(this.master);

            this.initialized = true;
        } catch (e) {
            this.enabled = false;
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(v) {
        if (this.master) this.master.gain.value = v;
    }

    toggleSfx() {
        this.enabled = !this.enabled;
        if (this.sfxBus) this.sfxBus.gain.value = this.enabled ? 0.9 : 0;
        return this.enabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicBus) this.musicBus.gain.value = this.musicEnabled ? 0.22 : 0;
        return this.musicEnabled;
    }

    makeNoiseBuffer(duration) {
        const len = Math.floor(this.ctx.sampleRate * duration);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buf;
    }

    playNoise(duration, filterType, freqStart, freqEnd, gain, q = 1) {
        if (!this.initialized || !this.enabled) return;
        const now = this.ctx.currentTime;
        const buf = this.makeNoiseBuffer(duration);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;

        const filter = this.ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.setValueAtTime(freqStart, now);
        filter.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
        filter.Q.value = q;

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(gain, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);

        src.connect(filter);
        filter.connect(g);
        g.connect(this.sfxBus);
        src.start(now);
        src.stop(now + duration);
    }

    playTone(freqStart, freqEnd, duration, type = 'sine', gain = 0.3, delay = 0) {
        if (!this.initialized || !this.enabled) return;
        const now = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(gain, now + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(g);
        g.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + duration + 0.02);
    }

    playHit(damage, blocked = false) {
        if (!this.initialized) return;
        if (blocked) {
            this.playNoise(0.09, 'bandpass', 2200, 800, 0.35, 2.5);
            this.playTone(400, 200, 0.07, 'square', 0.14);
            return;
        }
        const power = Math.min(1, damage / 40);
        this.playNoise(0.14 + power * 0.1, 'lowpass', 1200 + power * 1800, 180, 0.5 + power * 0.4, 1.2);
        this.playTone(180 - power * 60, 50, 0.16, 'sine', 0.4 + power * 0.3);
        this.playTone(90, 40, 0.22, 'triangle', 0.25);
    }

    playWhiff() {
        this.playNoise(0.16, 'bandpass', 900, 2600, 0.14, 1.4);
    }

    playBlock() {
        this.playNoise(0.07, 'highpass', 1800, 1200, 0.2, 1);
    }

    playThrow() {
        this.playNoise(0.2, 'lowpass', 700, 120, 0.5, 1);
        this.playTone(120, 45, 0.24, 'sine', 0.4);
    }

    playJump() {
        this.playNoise(0.1, 'bandpass', 400, 900, 0.12, 1.5);
    }

    playLand() {
        this.playNoise(0.12, 'lowpass', 500, 100, 0.3, 1);
        this.playTone(80, 40, 0.14, 'sine', 0.25);
    }

    playDash() {
        this.playNoise(0.14, 'bandpass', 600, 1400, 0.14, 1.2);
    }

    playKO() {
        this.playTone(660, 660, 0.5, 'sawtooth', 0.28);
        this.playTone(880, 880, 0.5, 'sawtooth', 0.22, 0.05);
        this.playTone(1320, 1320, 0.7, 'sawtooth', 0.18, 0.1);
        this.playNoise(0.6, 'lowpass', 3000, 200, 0.4, 0.8);
    }

    playBell() {
        for (let i = 0; i < 3; i++) {
            this.playTone(880 + i * 220, 880 + i * 220, 1.4 - i * 0.3, 'sine', 0.2 - i * 0.05, i * 0.02);
        }
    }

    playHeatActivate() {
        this.playNoise(0.4, 'highpass', 400, 4000, 0.28, 0.7);
        this.playTone(200, 1600, 0.35, 'sawtooth', 0.18);
    }

    playRage() {
        this.playTone(60, 200, 0.7, 'sawtooth', 0.32);
        this.playNoise(0.7, 'lowpass', 200, 2000, 0.3, 0.6);
    }

    playReversal() {
        this.playTone(1200, 400, 0.25, 'square', 0.2);
        this.playNoise(0.3, 'bandpass', 3000, 800, 0.24, 3);
    }

    playUI() {
        this.playTone(600, 900, 0.06, 'square', 0.12);
    }

    playMenuSelect() {
        this.playTone(700, 1200, 0.1, 'square', 0.15);
    }

    playMenuBack() {
        this.playTone(600, 300, 0.1, 'square', 0.12);
    }

    playRoundStart() {
        this.playBell();
    }

    playAnnounce(text) {
        if (!this.initialized || !this.enabled) return;
        const patterns = {
            FIGHT: [[520, 0], [700, 0.12], [900, 0.24]],
            'K.O.': [[300, 0], [220, 0.15]],
            ROUND: [[400, 0], [500, 0.1]],
        };
        const seq = patterns[text] || [[500, 0]];
        for (const [freq, delay] of seq) {
            this.playTone(freq, freq * 1.1, 0.2, 'square', 0.2, delay);
        }
    }

    startMusic(trackName) {
        if (!this.initialized || !this.musicEnabled) return;
        if (this.currentTrack === trackName) return;
        this.stopMusic();
        this.currentTrack = trackName;
        this.musicTimer = setInterval(() => this.playMusicBeat(), 500);
    }

    stopMusic() {
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
        this.currentTrack = null;
    }

    playMusicBeat() {
        if (!this.initialized || !this.musicEnabled) return;
        const now = this.ctx.currentTime;
        const beat = (now * 2) % 1;

        const bassNotes = [55, 55, 65.4, 49];
        const idx = Math.floor(now / 2) % bassNotes.length;
        const freq = bassNotes[idx];

        this.playMusicTone(freq, 0.6, 'sine', 0.3);
        if (beat < 0.1) {
            this.playMusicTone(freq * 2, 0.3, 'triangle', 0.12);
        }
        if (beat > 0.45 && beat < 0.55) {
            this.playMusicNoise(0.12, 0.1);
        }
    }

    playMusicTone(freq, duration, type, gain) {
        if (!this.musicEnabled) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(gain, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(g);
        g.connect(this.musicBus);
        osc.start(now);
        osc.stop(now + duration + 0.02);
    }

    playMusicNoise(duration, gain) {
        if (!this.musicEnabled) return;
        const now = this.ctx.currentTime;
        const buf = this.makeNoiseBuffer(duration);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const f = this.ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 3000;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(gain, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);
        src.connect(f);
        f.connect(g);
        g.connect(this.musicBus);
        src.start(now);
        src.stop(now + duration);
    }
}

export const audio = new AudioEngine();
