export class AudioManager {
  constructor(settings = {}) {
    this.settings = { music: true, sound: true, musicVolume: 0.45, soundVolume: 0.7, ...settings };
    this.context = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.started = false;
    this.musicNodes = [];
    this.musicTimer = null;
  }

  ensureContext() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.context = new Ctx();
    this.master = this.context.createGain();
    this.musicBus = this.context.createGain();
    this.sfxBus = this.context.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(this.context.destination);
    this.master.gain.value = 0.85;
    this.applySettings();
  }

  start() {
    this.ensureContext();
    if (!this.context || this.started) return;
    this.started = true;
    if (this.settings.music) this.startAmbient();
  }

  startAmbient() {
    if (!this.context || this.musicNodes.length) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    // Procedural forest ambience: filtered wind noise plus a quiet original tonal motif.
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.2;
    const noise = ctx.createBufferSource(); noise.buffer = buffer; noise.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 420;
    const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.15;
    noise.connect(filter).connect(noiseGain).connect(this.musicBus); noise.start(now);
    const drone = ctx.createOscillator(); drone.type = 'sine'; drone.frequency.value = 73.42;
    const droneGain = ctx.createGain(); droneGain.gain.value = 0.035;
    drone.connect(droneGain).connect(this.musicBus); drone.start(now);
    const pad = ctx.createOscillator(); pad.type = 'triangle'; pad.frequency.value = 110;
    const padGain = ctx.createGain(); padGain.gain.value = 0.012;
    pad.connect(padGain).connect(this.musicBus); pad.start(now);
    this.musicNodes.push(noise, filter, noiseGain, drone, droneGain, pad, padGain);
    this.musicTimer = window.setInterval(() => this.playAmbientNote(), 2400);
  }

  playAmbientNote() {
    if (!this.context || !this.settings.music || !this.musicBus) return;
    const notes = [196, 220, 261.63, 293.66, 164.81];
    const freq = notes[Math.floor(Math.random() * notes.length)];
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now); osc.detune.value = -7 + Math.random() * 14;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.025, now + .55);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
    osc.connect(gain).connect(this.musicBus); osc.start(now); osc.stop(now + 2.25);
  }

  stopAmbient() {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    for (const node of this.musicNodes) {
      try { if (typeof node.stop === 'function') node.stop(); } catch {}
      try { node.disconnect(); } catch {}
    }
    this.musicNodes = [];
  }

  applySettings(settings = {}) {
    this.settings = { ...this.settings, ...settings };
    this.ensureContextNoRecursion();
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(this.settings.music ? this.settings.musicVolume : 0, this.context.currentTime, .08);
    if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(this.settings.sound ? this.settings.soundVolume : 0, this.context.currentTime, .05);
    if (this.settings.music && this.started) this.startAmbient();
    else if (!this.settings.music) this.stopAmbient();
  }

  ensureContextNoRecursion() {
    // The context is created by ensureContext; this method deliberately does not call it again.
  }

  play(type = 'tap') {
    if (!this.settings.sound) return;
    this.ensureContext();
    if (!this.context || !this.sfxBus) return;
    const presets = {
      tap: [520, .055, 'sine', .045], coin: [950, .13, 'sine', .11], gem: [1320, .23, 'triangle', .13],
      token: [730, .17, 'triangle', .1], jump: [280, .12, 'triangle', .09], slide: [180, .1, 'sawtooth', .045],
      crash: [85, .34, 'sawtooth', .15], power: [610, .26, 'sine', .12], chest: [460, .3, 'triangle', .14],
      success: [790, .27, 'sine', .1], revive: [530, .32, 'triangle', .13], gameover: [130, .42, 'triangle', .12]
    };
    const [freq, duration, wave, volume] = presets[type] || presets.tap;
    const ctx = this.context;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, now);
    if (type === 'coin' || type === 'gem' || type === 'success' || type === 'chest') osc.frequency.exponentialRampToValueAtTime(freq * 1.55, now + duration * .8);
    if (type === 'crash' || type === 'gameover') osc.frequency.exponentialRampToValueAtTime(freq * .42, now + duration);
    gain.gain.setValueAtTime(Math.max(.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain).connect(this.sfxBus);
    osc.start(now); osc.stop(now + duration + .02);
  }

  setMusic(enabled) { this.applySettings({ music: enabled }); }
  setSound(enabled) { this.applySettings({ sound: enabled }); }
  dispose() { this.stopAmbient(); if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {}); }
}
