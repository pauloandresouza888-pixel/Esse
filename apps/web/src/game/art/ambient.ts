/**
 * Ambient particle helper (dust motes, fireflies, snow).
 *
 * Phaser's particle emitter is powerful but heavy for a handful of drifting
 * dots; on a mid-range phone the per-particle overhead shows up in the profiler.
 * This helper animates N images with a single tween each and recycles them, with
 * a cost proportional to N (18 max by default).
 */
import Phaser from 'phaser';

export interface NoiseOptions {
  x: { min: number; max: number };
  y: { min: number; max: number };
  tint?: number;
  alpha?: { min: number; max: number };
  scale?: { min: number; max: number };
  duration?: { min: number; max: number };
}

export interface NoiseHandle {
  destroy: () => void;
}

export function subtleNoise(
  scene: Phaser.Scene,
  texture: string,
  count: number,
  options: NoiseOptions,
): NoiseHandle {
  const sprites: Phaser.GameObjects.Image[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];

  const animate = (sprite: Phaser.GameObjects.Image) => {
    const duration = Phaser.Math.Between(
      options.duration?.min ?? 9000,
      options.duration?.max ?? 16000,
    );
    const tween = scene.tweens.add({
      targets: sprite,
      y: sprite.y - Phaser.Math.Between(30, 90),
      x: sprite.x + Phaser.Math.Between(-26, 26),
      alpha: { from: sprite.alpha, to: 0 },
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        sprite.setPosition(
          Phaser.Math.Between(options.x.min, options.x.max),
          Phaser.Math.Between(options.y.min, options.y.max),
        );
        sprite.setAlpha(
          Phaser.Math.FloatBetween(options.alpha?.min ?? 0.15, options.alpha?.max ?? 0.45),
        );
        animate(sprite);
      },
    });
    tweens.push(tween);
  };

  for (let i = 0; i < count; i += 1) {
    const sprite = scene.add.image(
      Phaser.Math.Between(options.x.min, options.x.max),
      Phaser.Math.Between(options.y.min, options.y.max),
      texture,
    );
    sprite.setAlpha(Phaser.Math.FloatBetween(options.alpha?.min ?? 0.15, options.alpha?.max ?? 0.45));
    sprite.setScale(
      Phaser.Math.FloatBetween(options.scale?.min ?? 0.25, options.scale?.max ?? 0.6),
    );
    sprite.setDepth(2);
    if (options.tint !== undefined) sprite.setTint(options.tint);
    sprites.push(sprite);
    // Stagger starts so they do not drift in sync.
    scene.time.delayedCall(Phaser.Math.Between(0, 4000), () => animate(sprite));
  }

  return {
    destroy: () => {
      tweens.forEach((tween) => tween.stop());
      sprites.forEach((sprite) => sprite.destroy());
    },
  };
}
