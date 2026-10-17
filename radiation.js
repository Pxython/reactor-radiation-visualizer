'use strict';

// All effects follow the rendered rod excursion; the analyser stays upstream.
class RadiationEffects {
  constructor(canvas, controls) {
    this.canvas = canvas;
    this.graphics = canvas.getContext('2d');
    this.controls = controls;
    this.level = 0;
    this.active = false;
    this.clicks = new Set();
    this.nextClick = 0;
    this.lastSnow = 0;
    this.resize = () => {
      canvas.width = Math.ceil(window.innerWidth);
      canvas.height = Math.ceil(window.innerHeight);
    };
    window.addEventListener('resize', this.resize);
    this.resize();
    for (const control of Object.values(controls)) {
      control.addEventListener('change', () => {
        if (!controls.snow.checked) this.clearSnow();
        this.updateAudio();
        if (!controls.geiger.checked) this.clearClicks();
      });
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.clearClicks();
        this.clearSnow();
      }
    });
  }

  connect(ctx, input, output) {
    this.ctx = ctx;
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.drive = ctx.createGain();
    this.shaper = ctx.createWaveShaper();
    const curve = new Float32Array(4096);
    for (let i = 0; i < curve.length; i++) {
      const x = i * 2 / (curve.length - 1) - 1;
      curve[i] = Math.tanh(2 * x) / Math.tanh(2);
    }
    this.shaper.curve = curve;
    this.shaper.oversample = '2x';
    this.wet.gain.value = 0;
    input.connect(this.dry);
    this.dry.connect(output);
    input.connect(this.drive);
    this.drive.connect(this.shaper);
    this.shaper.connect(this.wet);
    this.wet.connect(output);
    // Separate bus: microphone input is never monitored through the speakers.
    this.geiger = ctx.createGain();
    this.geiger.gain.value = 0;
    this.geiger.connect(ctx.destination);
    this.clickBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .014), ctx.sampleRate);
    const data = this.clickBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const time = i / ctx.sampleRate;
      data[i] = ((Math.random() * 2 - 1) * .7 + Math.sin(time * 2 * Math.PI * 2300) * .3)
        * Math.exp(-time * 550);
    }
    this.volume = .4;
    this.timer = window.setInterval(() => this.scheduleClicks(), 50);
  }

  update(rods, dt, active, time) {
    let squares = 0;
    for (const rod of rods) squares += Math.pow(Math.max(0, rod.h - .07) / 4.8, 2);
    this.level = Math.min(1, Math.sqrt(squares / Math.max(1, rods.length)));
    this.active = active;
    this.updateAudio();
    // Fixed drawing rate keeps grain stable across high refresh rate screens.
    if (time - this.lastSnow >= 1000 / 30) {
      this.lastSnow = time;
      this.drawSnow();
    }
  }

  updateAudio() {
    if (!this.ctx) return;
    const amount = this.controls.distortion.checked && this.active ? this.level : 0;
    const now = this.ctx.currentTime;
    this.dry.gain.setTargetAtTime(1 - amount, now, .035);
    this.wet.gain.setTargetAtTime(amount * .55, now, .035);
    this.drive.gain.setTargetAtTime(1 + amount * 28, now, .035);
    this.geiger.gain.setTargetAtTime(
      this.active && this.controls.geiger.checked && !document.hidden ? this.volume * .45 : 0,
      now, .015);
  }

  setVolume(volume) {
    this.volume = volume;
    this.updateAudio();
  }

  clearSnow() {
    this.graphics.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawSnow() {
    this.clearSnow();
    if (!this.controls.snow.checked || document.hidden) return;
    const { width, height } = this.canvas;
    const count = Math.min(14000, Math.floor(width * height * .009 * this.level * this.level));
    this.graphics.fillStyle = 'rgba(240,248,226,.70)';
    for (let i = 0; i < count; i++) {
      const size = Math.random() < .92 ? 1 : 2;
      this.graphics.fillRect(Math.random() * width, Math.random() * height, size, size);
    }
  }

  scheduleClicks() {
    if (!this.ctx || !this.active || !this.controls.geiger.checked ||
        document.hidden || this.ctx.state !== 'running') {
      this.nextClick = 0;
      return;
    }
    const now = this.ctx.currentTime;
    const rate = .7 + 65 * this.level * this.level;
    if (!this.nextClick || this.nextClick < now) this.nextClick = now;
    // Short lookahead and Poisson intervals produce irregular counter ticks.
    for (let n = 0; this.nextClick < now + .1 && n < 20; n++) {
      const click = this.ctx.createBufferSource();
      click.buffer = this.clickBuffer;
      click.connect(this.geiger);
      this.clicks.add(click);
      click.onended = () => { click.disconnect(); this.clicks.delete(click); };
      click.start(this.nextClick);
      this.nextClick += -Math.log(Math.max(.000001, Math.random())) / rate;
    }
    // Adapt promptly when amplitude changes instead of retaining a long quiet interval.
    this.nextClick = Math.min(this.nextClick, now + .1 + 1 / rate);
  }

  clearClicks() {
    for (const click of this.clicks) {
      click.onended = null;
      try { click.stop(); } catch {}
      click.disconnect();
    }
    this.clicks.clear();
    this.nextClick = 0;
  }

  stop() {
    this.active = false;
    this.clearClicks();
    this.updateAudio();
  }
}
