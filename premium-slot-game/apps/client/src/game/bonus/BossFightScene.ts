import gsap from 'gsap';
import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import type { BonusPickResponse, PublicBossFight } from '@neon/shared';
import { BOSS_CORE, BOSS_H, BOSS_W } from '../assets/art/characters';
import { FONT_DISPLAY } from '../assets/AssetFactory';
import { gradient, titleText } from '../animations/OverlayScene';
import type { ScreenFx } from '../animations/ScreenFx';
import type { AudioManager } from '../audio/AudioManager';
import type { CharacterAnimator } from '../character/CharacterAnimator';
import type { ParticleManager } from '../particles/ParticleManager';
import { formatCredits } from '../../services/format';
import type { Layout } from '../../stores/layoutStore';

interface Target {
  c: Container;
  hex: Graphics;
  label: Text;
  index: number;
}

/**
 * Interactive Boss Fight bonus. Rewards are fixed by the server when the round is generated;
 * picking a target only asks the server to reveal the next predetermined reward.
 */
export class BossFightScene extends Container {
  private readonly bg = new Graphics();
  private readonly boss: Sprite;
  private readonly bossRig = new Container();
  private readonly core: Sprite;
  private readonly hpBar = new Graphics();
  private readonly hpText: Text;
  private readonly title: Text;
  private readonly hint: Text;
  private readonly targetsLayer = new Container();
  private readonly fxLayer = new Container();
  private readonly heroSlot = new Container();
  private targets: Target[] = [];
  private hp = 100;
  private maxHp = 100;
  private layout: Layout | null = null;
  private idleTl: gsap.core.Timeline | null = null;
  private pickHandler: ((i: number) => void) | null = null;
  private resultText: Text | null = null;

  constructor(
    private readonly d: {
      tex: { boss: Texture; glow: Texture; spark: Texture; shard: Texture; ring: Texture; star: Texture; coin: Texture };
      particles: ParticleManager;
      audio: AudioManager;
      fx: ScreenFx;
      character: CharacterAnimator;
      onError(msg: string): void;
    },
  ) {
    super();
    this.visible = false;
    this.boss = new Sprite(d.tex.boss);
    this.boss.scale.set(1 / 1.25);
    this.boss.anchor.set(0.5);
    this.core = new Sprite(d.tex.glow);
    this.core.anchor.set(0.5);
    this.core.blendMode = 'add';
    this.core.tint = 0xff2bd6;
    this.core.scale.set(3);
    this.core.position.set(BOSS_CORE.x - BOSS_W / 2, BOSS_CORE.y - BOSS_H / 2);
    this.bossRig.addChild(this.boss, this.core);
    this.hpText = new Text({ text: '100%', style: { fontFamily: FONT_DISPLAY, fontWeight: '900', fontSize: 30, fill: '#ffffff', stroke: { color: '#2a0010', width: 5 } } });
    this.hpText.anchor.set(1, 0.5);
    this.title = titleText('BOSS FIGHT', 96, gradient(['#fff2b0', '#ff7a1a', '#ff1f3d']), '#2a0010', '#ff1f3d');
    this.hint = new Text({ text: 'PICK A TARGET TO DEAL DAMAGE', style: { fontFamily: FONT_DISPLAY, fontWeight: '700', fontSize: 34, fill: '#ffffff', letterSpacing: 4, stroke: { color: '#1a0030', width: 6 }, dropShadow: { color: '#ff2bd6', blur: 10, distance: 0 } } });
    this.hint.anchor.set(0.5);
    this.addChild(this.bg, this.heroSlot, this.bossRig, this.hpBar, this.hpText, this.title, this.hint, this.targetsLayer, this.fxLayer);
  }

  setLayout(l: Layout) {
    this.layout = l;
    const W = l.designWidth;
    const H = l.designHeight;
    const portrait = l.orientation === 'portrait';
    this.bg.clear();
    this.bg.rect(-2000, -2000, W + 4000, H + 4000).fill({ color: 0x08010a, alpha: 0.55 });
    if (portrait) {
      const hpY = H - 600;
      this.bossRig.scale.set(Math.min(0.85, (hpY - 300) / 640));
      this.bossRig.position.set(W * 0.6, 260 + (hpY - 320) / 2);
      this.title.position.set(W / 2, 220);
      this.hpBar.position.set(W / 2 - 330, hpY);
      this.hpText.position.set(W / 2 + 330, hpY - 26);
      this.hint.position.set(W / 2, H - 470);
      this.targetsLayer.position.set(W / 2, H - 290);
      this.targetsLayer.scale.set(0.9);
    } else {
      this.bossRig.scale.set(0.85);
      this.bossRig.position.set(W * 0.64, 400);
      this.title.position.set(Math.max(420, W * 0.24), 170);
      this.hpBar.position.set(W * 0.64 - 330, 724);
      this.hpText.position.set(W * 0.64 + 330, 698);
      this.hint.position.set(W / 2, 822);
      this.targetsLayer.position.set(W / 2, 950);
      this.targetsLayer.scale.set(0.9);
    }
    this.drawHp();
    this.layoutTargets();
  }

  private drawHp() {
    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpBar.clear();
    this.hpBar.roundRect(0, 0, 660, 40, 20).fill({ color: 0x1a0612 }).stroke({ width: 4, color: 0xff2bd6 });
    if (pct > 0) this.hpBar.roundRect(5, 5, 650 * pct, 30, 15).fill(gradient(['#ff6a7a', '#ff1f3d', '#a0001a']));
    this.hpBar.roundRect(5, 7, 650 * pct, 8, 4).fill({ color: 0xffffff, alpha: 0.35 });
    this.hpText.text = `BOSS HP   ${Math.round(pct * 100)}%`;
  }

  private buildTargets(count: number) {
    this.targetsLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.targets = [];
    for (let i = 0; i < count; i++) {
      const c = new Container();
      const hex = new Graphics();
      const label = new Text({ text: '?', style: { fontFamily: FONT_DISPLAY, fontWeight: '900', fontSize: 70, fill: '#ffffff', stroke: { color: '#14002a', width: 8 }, dropShadow: { color: '#29e6ff', blur: 14, distance: 0 } } });
      label.anchor.set(0.5);
      c.addChild(hex, label);
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', () => this.pickHandler?.(i));
      c.on('pointerover', () => gsap.to(c.scale, { x: 1.08, y: 1.08, duration: 0.15 }));
      c.on('pointerout', () => gsap.to(c.scale, { x: 1, y: 1, duration: 0.15 }));
      c.label = `boss-target-${i}`;
      this.targetsLayer.addChild(c);
      this.targets.push({ c, hex, label, index: i });
      this.drawHex(this.targets[i], 0x29e6ff, false);
    }
    this.layoutTargets();
  }

  private layoutTargets() {
    const n = this.targets.length;
    const spacing = this.layout?.orientation === 'portrait' ? 270 : 280;
    this.targets.forEach((t, i) => t.c.position.set((i - (n - 1) / 2) * spacing, 0));
  }

  private drawHex(t: Target, color: number, revealed: boolean) {
    const r = 110;
    const pts: number[] = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      pts.push(Math.cos(a) * r, Math.sin(a) * r);
    }
    t.hex.clear();
    t.hex.poly(pts).fill({ color: revealed ? 0x2a1206 : 0x0c0a2a, alpha: 0.95 });
    t.hex.poly(pts).stroke({ width: 18, color, alpha: 0.25 });
    t.hex.poly(pts).stroke({ width: 5, color });
    t.hex.roundRect(-46, -34, 92, 68, 10).fill({ color: 0x1a2a50, alpha: revealed ? 0 : 0.8 }).stroke({ width: 3, color: 0x5a7ac8, alpha: revealed ? 0 : 1 });
  }

  private setTargetsEnabled(on: boolean) {
    this.targets.forEach((t) => (t.c.eventMode = on ? 'static' : 'none'));
  }

  private resetTargets() {
    this.targets.forEach((t) => {
      t.label.text = '?';
      t.label.style.fontSize = 70;
      t.c.alpha = 1;
      t.c.scale.set(1);
      this.drawHex(t, 0x29e6ff, false);
    });
    gsap.fromTo(this.targets.map((t) => t.c.scale), { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(2)', stagger: 0.07 });
  }

  private startIdle() {
    this.idleTl?.kill();
    const tl = gsap.timeline({ repeat: -1 });
    tl.to(this.boss, { y: -14, duration: 1.4, ease: 'sine.inOut' }).to(this.boss, { y: 0, duration: 1.4, ease: 'sine.inOut' });
    gsap.to(this.core, { alpha: 0.5, duration: 0.6, yoyo: true, repeat: -1 });
    this.idleTl = tl;
  }

  private local(globalPt: { x: number; y: number }) {
    return this.toLocal(globalPt);
  }

  /** Player shot: muzzle flash → energy projectile → impact → HP reduction. */
  private async shoot(damage: number) {
    const { particles, tex, audio, fx, character } = this.d;
    character.shoot();
    audio.play('shoot');
    const from = this.local(character.gunTip());
    const to = this.local(this.core.getGlobalPosition());
    const proj = new Sprite(tex.glow);
    proj.anchor.set(0.5);
    proj.blendMode = 'add';
    proj.tint = 0x29e6ff;
    proj.scale.set(1.2, 0.6);
    proj.position.copyFrom(from);
    proj.rotation = Math.atan2(to.y - from.y, to.x - from.x);
    this.fxLayer.addChild(proj);
    await new Promise<void>((res) =>
      gsap.to(proj, {
        x: to.x,
        y: to.y,
        duration: 0.32,
        ease: 'power1.in',
        onUpdate: () => particles.emit({ texture: tex.spark, x: proj.x, y: proj.y, count: 1, container: this.fxLayer, speed: [0, 0.02], life: [150, 250], scale: [0.15, 0.25], tint: 0x29e6ff, additive: true }),
        onComplete: () => res(),
      }),
    );
    proj.destroy();
    audio.play('explode');
    fx.shake(14, 0.45);
    fx.flash(0xff2b4a, 0.35, 0.3);
    particles.emit({ texture: tex.spark, x: to.x, y: to.y, count: 40, container: this.fxLayer, speed: [0.2, 0.8], life: [300, 800], scale: [0.2, 0.5], tint: [0xff7a1a, 0xffd23a, 0xffffff], additive: true, drag: 0.003 });
    particles.emit({ texture: tex.shard, x: to.x, y: to.y, count: 14, container: this.fxLayer, speed: [0.3, 0.7], life: [400, 800], scale: [0.2, 0.35], tint: [0xff2bd6, 0x29e6ff], additive: true, spin: 0.03, gravity: 0.0015 });
    particles.emit({ texture: tex.ring, x: to.x, y: to.y, count: 1, container: this.fxLayer, speed: [0, 0], life: [400, 400], scale: [0.5, 0.5], scaleEnd: 4, tint: 0xff7a1a, additive: true });
    gsap.fromTo(this.boss, { tint: 0xff4466 }, { tint: 0xffffff, duration: 0.4 });
    gsap.fromTo(this.bossRig, { x: this.bossRig.x + 22 }, { x: this.bossRig.x, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    const dmg = new Text({ text: `-${damage}`, style: { fontFamily: FONT_DISPLAY, fontWeight: '900', fontSize: 64, fill: '#ff4466', stroke: { color: '#1a0008', width: 8 } } });
    dmg.anchor.set(0.5);
    dmg.position.set(to.x + 60, to.y - 60);
    this.fxLayer.addChild(dmg);
    gsap.to(dmg, { y: dmg.y - 90, alpha: 0, duration: 1.1, ease: 'power1.out', onComplete: () => dmg.destroy() });
    const state = { hp: this.hp };
    this.hp = Math.max(0, this.hp - damage);
    await new Promise<void>((res) => gsap.to(state, { hp: this.hp, duration: 0.6, ease: 'power2.out', onUpdate: () => { const cur = this.hp; this.hp = state.hp; this.drawHp(); this.hp = cur; }, onComplete: () => { this.drawHp(); res(); } }));
  }

  /** Boss counter-attack (presentation only). */
  private async bossAttack() {
    const { tex, particles, audio, character } = this.d;
    audio.play('bossAttack');
    await new Promise<void>((r) => gsap.to(this.core.scale, { x: 5, y: 5, duration: 0.35, yoyo: true, repeat: 1, onComplete: () => r() }));
    const from = this.local(this.core.getGlobalPosition());
    const to = this.local(character.toGlobal({ x: 0, y: -500 }));
    const beam = new Sprite(tex.glow);
    beam.anchor.set(0.5);
    beam.blendMode = 'add';
    beam.tint = 0xff1f3d;
    beam.position.copyFrom(from);
    this.fxLayer.addChild(beam);
    await new Promise<void>((r) => gsap.to(beam, { x: to.x, y: to.y, duration: 0.3, ease: 'power1.in', onComplete: () => r() }));
    beam.destroy();
    particles.emit({ texture: tex.spark, x: to.x, y: to.y, count: 20, container: this.fxLayer, speed: [0.1, 0.4], life: [200, 500], scale: [0.15, 0.3], tint: [0xff1f3d, 0xff7a1a], additive: true });
    gsap.fromTo(character, { alpha: 0.4 }, { alpha: 1, duration: 0.08, repeat: 3, yoyo: true });
  }

  private async intro() {
    const { fx, audio } = this.d;
    audio.play('bossIntro');
    fx.flash(0xff1f3d, 0.8, 0.6);
    this.alpha = 0;
    gsap.to(this, { alpha: 1, duration: 0.4 });
    const bx = this.bossRig.x;
    gsap.fromTo(this.bossRig, { x: bx + 700 }, { x: bx, duration: 0.9, ease: 'power3.out', delay: 0.2 });
    gsap.fromTo(this.title.scale, { x: 4, y: 4 }, { x: 1, y: 1, duration: 0.7, ease: 'expo.out', delay: 0.3 });
    gsap.fromTo(this.title, { alpha: 0 }, { alpha: 1, duration: 0.3, delay: 0.3 });
    await new Promise((r) => setTimeout(r, 1200));
  }

  /**
   * Runs the full boss fight. `pick` calls the server; already revealed picks (after a
   * reconnection) are restored first.
   */
  run(bf: PublicBossFight, pick: (targetIndex: number) => Promise<BonusPickResponse>): Promise<PublicBossFight> {
    this.visible = true;
    this.maxHp = bf.bossHp;
    this.hp = bf.hpRemaining;
    this.boss.alpha = 1;
    this.boss.scale.set(1 / 1.25);
    this.drawHp();
    this.buildTargets(bf.targets);
    if (this.layout) this.setLayout(this.layout);
    this.startIdle();
    this.hint.text = `PICK A TARGET TO DEAL DAMAGE  •  SHOT ${bf.picks.length + 1}/${bf.shots}`;

    return new Promise((resolve) => {
      let current = bf;
      const next = () => {
        if (current.completed) return void this.victory(current).then(() => resolve(current));
        this.hint.text = `PICK A TARGET TO DEAL DAMAGE  •  SHOT ${current.picks.length + 1}/${current.shots}`;
        this.resetTargets();
        this.setTargetsEnabled(true);
        this.pickHandler = async (i) => {
          this.setTargetsEnabled(false);
          this.pickHandler = null;
          this.d.audio.play('click');
          let res: BonusPickResponse;
          try {
            res = await pick(i);
          } catch (e) {
            this.d.onError((e as Error).message || 'Connection problem – try again');
            next();
            return;
          }
          current = res.bossFight;
          await this.shoot(res.pick.damage);
          this.reveal(i, res.pick.multiplier, res.pick.decoys);
          await new Promise((r) => setTimeout(r, 1300));
          if (!current.completed) await this.bossAttack();
          next();
        };
      };
      this.intro().then(next);
    });
  }

  private reveal(chosen: number, multiplier: number, decoys: number[]) {
    let d = 0;
    this.targets.forEach((t) => {
      const isChosen = t.index === chosen;
      const value = isChosen ? multiplier : decoys[d++] ?? 5;
      t.label.text = `${value}x`;
      t.label.style.fontSize = 64;
      this.drawHex(t, isChosen ? 0xffb020 : 0x55507a, true);
      t.c.alpha = isChosen ? 1 : 0.45;
      if (isChosen) {
        gsap.fromTo(t.c.scale, { x: 1.4, y: 1.4 }, { x: 1.1, y: 1.1, duration: 0.5, ease: 'back.out(2)' });
        this.d.particles.emit({ texture: this.d.tex.star, x: this.targetsLayer.x + t.c.x, y: this.targetsLayer.y + t.c.y, count: 20, container: this.fxLayer, speed: [0.1, 0.4], life: [500, 900], scale: [0.2, 0.4], tint: [0xffd23a, 0xffffff], additive: true, spin: 0.01 });
        this.d.audio.play('reveal');
      }
    });
  }

  private async victory(bf: PublicBossFight) {
    const { particles, tex, fx, audio } = this.d;
    this.setTargetsEnabled(false);
    audio.play('explode');
    fx.flash(0xffffff, 0.9, 0.8);
    fx.shake(26, 1);
    const c = this.local(this.core.getGlobalPosition());
    particles.emit({ texture: tex.spark, x: c.x, y: c.y, count: 120, container: this.fxLayer, speed: [0.3, 1.2], life: [600, 1300], scale: [0.2, 0.6], tint: [0xff7a1a, 0xffd23a, 0xff2bd6, 0xffffff], additive: true, drag: 0.002 });
    gsap.to(this.boss, { alpha: 0, duration: 0.8, delay: 0.3 });
    gsap.to(this.boss.scale, { x: 0.6, y: 0.6, duration: 0.8, delay: 0.3 });
    this.d.character.celebrate(2);
    await new Promise((r) => setTimeout(r, 900));
    audio.play('bigWin');
    const t = titleText(`BOSS DEFEATED!\n${bf.totalMultiplier}x  =  ${formatCredits(bf.totalWin)}`, 84, gradient(['#ffffff', '#ffd23a', '#ff7a1a']), '#2a0010', '#ff2bd6');
    t.position.set(this.bossRig.x, this.bossRig.y);
    this.fxLayer.addChild(t);
    this.resultText = t;
    gsap.fromTo(t.scale, { x: 0.2, y: 0.2 }, { x: 1, y: 1, duration: 0.6, ease: 'back.out(2)' });
    const coins = window.setInterval(() => particles.emit({ texture: tex.coin, x: this.bossRig.x + (Math.random() - 0.5) * 700, y: -60, count: 2, container: this.fxLayer, speed: [0.05, 0.15], angle: [Math.PI * 0.45, Math.PI * 0.55], gravity: 0.0011, life: [1500, 2000], scale: [0.3, 0.5], scaleEnd: 1, flip: true }), 90);
    await new Promise((r) => setTimeout(r, 3200));
    clearInterval(coins);
    await new Promise<void>((r) => gsap.to(this, { alpha: 0, duration: 0.5, onComplete: () => r() }));
    this.hide();
  }

  hide() {
    this.visible = false;
    this.alpha = 1;
    this.idleTl?.kill();
    gsap.killTweensOf(this.core);
    gsap.killTweensOf(this.core.scale);
    this.resultText?.destroy();
    this.resultText = null;
    this.d.particles.clear();
    this.pickHandler = null;
  }

  destroy() {
    this.hide();
    super.destroy({ children: true });
  }
}
