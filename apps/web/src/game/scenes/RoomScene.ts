/**
 * RoomScene (Phase 1) — the playable apartment.
 *
 * Responsibilities (and only these):
 *  - draw the floor plan, the furniture and the character using the same
 *    geometry module the previews use;
 *  - turn taps into intents (`floor-tapped`, `object-tapped`);
 *  - walk the character along a path with simple interpolation;
 *  - animate the current action (sleeping: Zzz; shower: steam; kitchen: sparkles);
 *  - blend day/night light and pause when the tab is hidden.
 *
 * It never imports React or Zustand: React sends "walk there" and "play this
 * action" as commands, and listens to typed events. That keeps the 60 FPS loop
 * free of React reconciliation.
 */
import Phaser from 'phaser';
import {
  ambientForDayProgress,
  approachCell,
  buildBlockedGrid,
  createClock,
  findRoomPath,
  readClock,
  ROOM_PLACEMENTS,
  type GameClock,
  type InteractionId,
  type QualityLevel,
  type RoomPlacement,
} from '@vida/shared';
import {
  CHARACTER_DESIGN_WIDTH,
  cellToScreen,
  depthFor,
  projectRect,
  rowBottomY,
  screenToCell,
} from '../roomGeometry';
import { BACKGROUND_KEY, loadRoomTextures } from '../art/textures';
import { gameEvents } from '../events';
import type { ClockSnapshot, RoomSceneData } from '../sceneData';
import { SCENE_COLORS } from '../palette';

const WALK_SPEED_PX_PER_SEC = 74;

interface PlacedObject {
  placement: RoomPlacement;
  sprite: Phaser.GameObjects.Image;
}

interface Bubble {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  emoji: Phaser.GameObjects.Text;
}

export class RoomScene extends Phaser.Scene {
  static readonly KEY = 'RoomScene';

  private sceneData: RoomSceneData = {
    appearance: {
      skin: 'skin-2',
      height: 1,
      build: 1,
      body: 'average',
      hair: 'hair-2',
      hairStyle: 'bob',
      eyes: 'eyes-1',
      brows: 'brows-1',
      nose: 'nose-1',
      mouth: 'mouth-1',
      outfit: 'sweater',
      outfitColor: 'outfit-1',
      shoes: '#5B4B3A',
      accessory: 'none',
    },
    quality: 'high',
    reducedMotion: false,
    clockTotalMs: 0,
    dayLengthMs: 1_440_000,
    characterCell: { x: 11, y: 7 },
  };

  private clock!: GameClock;
  private grid = buildBlockedGrid();
  private objects = new Map<string, PlacedObject>();
  /** Walkable cell in front of each interactive object (shared rules). */
  private approachCells = new Map<string, { x: number; y: number }>();
  private character!: Phaser.GameObjects.Container;
  private characterSprite!: Phaser.GameObjects.Image;
  private characterShadow!: Phaser.GameObjects.Ellipse;
  private bubble?: Bubble;
  private actionItemId: string | null = null;
  private highlight?: Phaser.GameObjects.Ellipse;
  private glow?: Phaser.GameObjects.Image;
  private dustSprites: Phaser.GameObjects.Image[] = [];
  /** Base alpha of each dust sprite (the bob must not fade them out). */
  private dustBaseAlpha: number[] = [];
  private zzz?: Phaser.GameObjects.Text;
  private ambientOverlay?: Phaser.GameObjects.Rectangle;
  private lampGlows: Phaser.GameObjects.Image[] = [];
  private actionTimer?: Phaser.Time.TimerEvent;
  private currentTween: Phaser.Tweens.Tween | null = null;
  private walkId = 0;
  private stepFrame = 0;
  private pausedByVisibility = false;
  private pausedByUser = false;
  private destroyed = false;
  private ready = false;
  private currentCell: { x: number; y: number };

  constructor() {
    super({ key: RoomScene.KEY });
    this.currentCell = { x: 11, y: 7 };
  }

  /** Phaser passes the object given to `scene.add(...)` as `init(data)`. */
  init(data: RoomSceneData): void {
    this.sceneData = { ...this.sceneData, ...data };
    this.currentCell = { ...(data.characterCell ?? { x: 11, y: 7 }) };
    this.objects = new Map();
    this.approachCells = new Map();
    this.lampGlows = [];
    this.dustSprites = [];
    this.dustBaseAlpha = [];
    this.zzz = undefined;
    this.destroyed = false;
    this.ready = false;
    this.actionItemId = null;
    this.pausedByVisibility = false;
    this.pausedByUser = false;
  }

  create(): void {
    this.clock = createClock(this.sceneData.dayLengthMs / 1000, 0, 0);
    this.clock.totalMs = this.sceneData.clockTotalMs;
    this.grid = buildBlockedGrid();

    this.cameras.main.setBackgroundColor(SCENE_COLORS.outside);
    this.scaleCamera();
    this.scale.on('resize', this.scaleCamera, this);
    this.bindVisibility();
    this.bindInput();
    this.startClock();

    void this.buildRoom();
  }

  /* ---------------------------------------------------------------------- */
  /*                                 BUILD                                  */
  /* ---------------------------------------------------------------------- */

  private async buildRoom(): Promise<void> {
    await loadRoomTextures(this, this.sceneData.appearance, this.sceneData.quality);
    if (this.destroyed) return;

    if (this.textures.exists(BACKGROUND_KEY)) {
      const background = this.add.image(0, 0, BACKGROUND_KEY);
      background.setOrigin(0, 0);
      background.setDisplaySize(400, 720);
      background.setDepth(-20000);
    }

    // Objects are created back-to-front so the display list already has the
    // right order; the depth value keeps it correct when the character walks.
    const sorted = [...ROOM_PLACEMENTS].sort((a, b) => {
      const rectA = projectRect(a.cell, a.footprint);
      const rectB = projectRect(b.cell, b.footprint);
      return depthFor(rectA.bottom, a.layer) - depthFor(rectB.bottom, b.layer);
    });

    for (const placement of sorted) {
      const textureKey = `room-${placement.itemId}`;
      if (!this.textures.exists(textureKey)) continue;
      const rect = projectRect(placement.cell, placement.footprint);
      const sprite = this.add.image(rect.centerX, rect.bottom, textureKey);
      sprite.setOrigin(0.5, 1);
      sprite.setDisplaySize(placement.art.w * placement.scale, placement.art.h * placement.scale);
      sprite.setFlipX(Boolean(placement.flip));
      sprite.setDepth(placement.flat ? -19000 : depthFor(rect.bottom, placement.layer));
      if (placement.itemId === 'lamp' || placement.itemId === 'bed') {
        this.addLampGlow(rect.centerX, rect.bottom - placement.art.h * placement.scale * 0.6, placement.itemId === 'lamp' ? 120 : 90);
      }
      this.objects.set(placement.id, { placement, sprite });
    }

    this.addCharacter();
    this.addAmbient();
    this.addDust();
    this.addObjectZones();
    this.addFloorZone();
    this.addHighlight();
    this.applyAmbient(true);
    this.startBlinkLoop();
    this.startCatBreathing();

    this.ready = true;
    gameEvents.emit('ready', { ts: Date.now() });
    this.emitClock();
  }

  private addCharacter(): void {
    const spawn = cellToScreen(this.currentCell);
    this.characterShadow = this.add
      .ellipse(spawn.x, spawn.y + 2, CHARACTER_DESIGN_WIDTH * 0.72, CHARACTER_DESIGN_WIDTH * 0.18, 0x784436, 0.16)
      .setDepth(spawn.y - 3);

    this.characterSprite = this.add.image(0, 0, 'character');
    this.characterSprite.setOrigin(0.5, 1);
    this.applyCharacterSize(this.characterSprite);

    this.character = this.add.container(spawn.x, spawn.y, [this.characterSprite]);
    this.character.setDepth(spawn.y);

    if (this.sceneData.reducedMotion) return;
    this.currentTween = this.tweens.add({
      targets: this.character,
      scaleY: 1.008,
      scaleX: 1.003,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Keeps the character at the design width while preserving the aspect ratio. */
  private applyCharacterSize(sprite: Phaser.GameObjects.Image): void {
    const texture = this.textures.exists(sprite.texture.key)
      ? this.textures.get(sprite.texture.key)
      : this.textures.get('character');
    const source = texture.getSourceImage() as { width?: number; height?: number };
    const width = source?.width ?? 120;
    const height = source?.height ?? 170;
    sprite.setDisplaySize(CHARACTER_DESIGN_WIDTH, (height / width) * CHARACTER_DESIGN_WIDTH);
  }

  private addLampGlow(x: number, y: number, size: number): void {
    if (!this.textures.exists('room-deco-glow')) return;
    const glow = this.add.image(x, y, 'room-deco-glow');
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDisplaySize(size, size);
    glow.setTint(0xffd9a0);
    glow.setAlpha(0);
    glow.setDepth(19000);
    glow.setData('intensity', 0.5);
    this.lampGlows.push(glow);
  }

  private addAmbient(): void {
    this.ambientOverlay = this.add
      .rectangle(200, 360, 900, 1600, 0x1b1e3c, 0)
      .setDepth(19500);
  }

  private addDust(): void {
    if (this.sceneData.quality === 'low' || !this.textures.exists('room-deco-dust')) return;
    const count = this.sceneData.quality === 'high' ? 14 : 8;
    for (let i = 0; i < count; i += 1) {
      const sprite = this.add.image(
        Phaser.Math.Between(20, 380),
        Phaser.Math.Between(240, 640),
        'room-deco-dust',
      );
      const base = Phaser.Math.FloatBetween(0.1, 0.32);
      sprite.setAlpha(base);
      sprite.setScale(Phaser.Math.FloatBetween(0.25, 0.5));
      sprite.setDepth(18500);
      this.dustSprites.push(sprite);
      this.dustBaseAlpha.push(base);
      this.animateDust(sprite);
    }
  }

  private animateDust(sprite: Phaser.GameObjects.Image): void {
    const float = () => {
      if (this.destroyed) return;
      this.tweens.add({
        targets: sprite,
        y: sprite.y - Phaser.Math.Between(20, 60),
        x: sprite.x + Phaser.Math.Between(-18, 18),
        duration: Phaser.Math.Between(6000, 11000),
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (this.destroyed) return;
          // Recycle from the bottom so the dust never runs out.
          sprite.setY(Phaser.Math.Between(300, 660));
          sprite.setX(Phaser.Math.Between(16, 384));
          float();
        },
      });
    };
    float();
  }

  private startCatBreathing(): void {
    const cat = this.objects.get('item-cat');
    if (!cat || this.sceneData.reducedMotion) return;
    this.tweens.add({
      targets: cat.sprite,
      scaleY: { from: cat.sprite.scaleY, to: cat.sprite.scaleY * 1.02 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /* ---------------------------------------------------------------------- */
  /*                                INPUT                                   */
  /* ---------------------------------------------------------------------- */

  private addFloorZone(): void {
    // A full-screen zone below the objects: taps that miss furniture walk.
    // Oversized on purpose: the camera letterboxes tall screens, and a tap on
    // the wall must still be ignored explicitly (checked below by worldY).
    const floor = this.add.zone(200, 360, 1200, 1800).setOrigin(0.5, 0.5).setInteractive();
    floor.setDepth(-30000);
    floor.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.ready || this.isInputBlocked()) return;
      const y = pointer.worldY;
      if (y < rowBottomY(0) + 4) return;
      const cell = screenToCell(pointer.worldX, y);
      gameEvents.emit('floor-tapped', { cell });
    });
  }

  private addObjectZones(): void {
    for (const placement of ROOM_PLACEMENTS) {
      if (placement.interactive === false) continue;
      const object = this.objects.get(placement.id);
      if (!object) continue;
      const rect = projectRect(placement.cell, placement.footprint);
      const width = Math.max(44, placement.hit.w);
      const height = Math.max(44, placement.hit.h);
      const zone = this.add.zone(rect.centerX, rect.bottom - height / 2, width, height);
      zone.setInteractive({ useHandCursor: true });
      zone.setDepth(20000);
      zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation?.();
        if (!this.ready || this.isInputBlocked()) return;
        this.tapObject(placement);
      });
      // Remember where the character should stand to use this object.
      const approach = approachCell(this.grid, placement);
      if (approach) this.approachCells.set(placement.id, approach);
    }
  }

  private isInputBlocked(): boolean {
    return this.pausedByUser || this.pausedByVisibility;
  }

  private addHighlight(): void {
    this.highlight = this.add
      .ellipse(200, 400, 40, 14, 0xffffff, 0.55)
      .setDepth(-18000)
      .setVisible(false);
    if (this.textures.exists('room-deco-glow')) {
      this.glow = this.add.image(200, 380, 'room-deco-glow');
      this.glow.setBlendMode(Phaser.BlendModes.ADD);
      this.glow.setDisplaySize(150, 150);
      this.glow.setTint(0xfff0c9);
      this.glow.setAlpha(0);
      this.glow.setDepth(19400);
    }
  }

  /** Public entry point used by `GameHandle.tapObject` (tests, tutorial). */
  tapObject(placement: RoomPlacement): void {
    this.setHighlight(placement);
    gameEvents.emit('object-tapped', {
      id: placement.id,
      itemId: placement.itemId,
      labelKey: placement.labelKey,
      cell: { x: placement.cell.x, y: placement.cell.y },
    });
  }

  /** Same as `tapObject` but by instance id (used by the HUD shortcut). */
  tapObjectById(id: string): boolean {
    const object = this.objects.get(id);
    if (!object) return false;
    this.tapObject(object.placement);
    return true;
  }

  /** Cell where the character should stand to use an object. */
  approachCellFor(id: string): { x: number; y: number } | null {
    return this.approachCells.get(id) ?? null;
  }

  private setHighlight(placement: RoomPlacement): void {
    if (!this.highlight) return;
    const rect = projectRect(placement.cell, placement.footprint);
    this.highlight.setPosition(rect.centerX, rect.bottom);
    this.highlight.setSize(Math.max(28, rect.width * 0.8), Math.max(12, rect.height * 0.28));
    this.highlight.setVisible(true);
    this.tweens.killTweensOf(this.highlight);
    this.highlight.setAlpha(0.7);
    this.tweens.add({ targets: this.highlight, alpha: 0.25, duration: 900, yoyo: true, repeat: -1 });
    if (this.glow) {
      this.glow.setPosition(rect.centerX, rect.bottom - rect.height * 0.5);
      this.tweens.killTweensOf(this.glow);
      this.glow.setAlpha(0.35);
      this.tweens.add({ targets: this.glow, alpha: 0.12, duration: 900, yoyo: true, repeat: -1 });
    }
  }

  private clearHighlight(): void {
    this.highlight?.setVisible(false);
    if (this.glow) {
      this.tweens.killTweensOf(this.glow);
      this.glow.setAlpha(0);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*                              MOVEMENT                                  */
  /* ---------------------------------------------------------------------- */

  /** Walks to a cell, using the shared BFS. Returns false when unreachable. */
  walkTo(cell: { x: number; y: number }, onArrive?: () => void): boolean {
    if (!this.character) return false;
    const path = findRoomPath(this.grid, this.currentCell, cell);
    if (path.length === 0) return false;
    const walkId = ++this.walkId;
    this.tweens.killTweensOf(this.character);
    this.character.setScale(1);
    gameEvents.emit('walk-started', { cell });

    let index = 1; // path[0] is the start cell
    const step = () => {
      if (this.destroyed || walkId !== this.walkId) return;
      const next = path[index];
      if (!next) {
        this.currentCell = path[path.length - 1] ?? this.currentCell;
        this.setWalkFrames(false, 0);
        this.tweens.add({ targets: this.character, scaleX: 1, scaleY: 1, duration: 120 });
        gameEvents.emit('walk-ended', { cell: this.currentCell });
        onArrive?.();
        return;
      }
      const from = { x: this.character.x, y: this.character.y };
      const to = cellToScreen(next);
      const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
      const duration = Math.max(110, (distance / WALK_SPEED_PX_PER_SEC) * 1000);
      if (Math.abs(to.x - from.x) > 0.5) this.characterSprite.setFlipX(to.x < from.x);
      this.setWalkFrames(true, to.x < from.x ? -1 : 1);
      this.tweens.add({
        targets: this.character,
        x: to.x,
        y: to.y,
        duration,
        ease: 'Linear',
        onComplete: () => {
          this.currentCell = next;
          index += 1;
          step();
        },
      });
    };
    // Immediate first step so a short tap feels responsive.
    this.characterSprite.setFlipX(false);
    step();
    return true;
  }

  private setWalkFrames(walking: boolean, direction: number): void {
    if (!this.characterSprite) return;
    if (!walking) {
      this.characterSprite.setTexture('character');
      this.applyCharacterSize(this.characterSprite);
      this.characterSprite.y = 0;
      return;
    }
    this.stepFrame += 1;
    const frame = this.stepFrame % 2 === 0 ? 'character-walk-a' : 'character-walk-b';
    if (this.textures.exists(frame)) {
      this.characterSprite.setTexture(frame);
      this.applyCharacterSize(this.characterSprite);
    }
    // A tiny horizontal sway sells the step without a real walk cycle.
    this.characterSprite.y = Math.sin(this.stepFrame * Math.PI) * 1.2 * direction;
  }

  /** Puts the character next to an object without turning the tap into a path. */
  faceObject(cell: { x: number; y: number }): void {
    const placement = ROOM_PLACEMENTS.find(
      (candidate) => candidate.cell.x === cell.x && candidate.cell.y === cell.y,
    );
    if (placement) this.setHighlight(placement);
  }

  /* ---------------------------------------------------------------------- */
  /*                               ACTIONS                                  */
  /* ---------------------------------------------------------------------- */

  /** Plays the visual part of an interaction (React owns the simulation). */
  playAction(itemId: string, interactionId: InteractionId, durationMs: number): void {
    if (!this.characterSprite) return;
    this.actionTimer?.remove();
    this.actionItemId = itemId;
    this.clearBubble();
    this.clearZzz();
    this.showBubble(interactionEmoji(itemId, interactionId));

    if (interactionId === 'sleep' || interactionId === 'nap') {
      if (this.textures.exists('character-sleep')) {
        this.characterSprite.setTexture('character-sleep');
        this.applyCharacterSize(this.characterSprite);
      }
      this.characterSprite.setAngle(-78);
      this.characterSprite.y = -6;
      this.showZzz();
    } else if (itemId === 'sofa' && (interactionId === 'sit' || interactionId === 'relax')) {
      if (this.textures.exists('character-sit')) {
        this.characterSprite.setTexture('character-sit');
        this.applyCharacterSize(this.characterSprite);
      }
    } else {
      // Busy sway for eating, showering, etc.
      if (!this.sceneData.reducedMotion) {
        this.currentTween?.stop();
        this.currentTween = this.tweens.add({
          targets: this.characterSprite,
          angle: { from: -3, to: 3 },
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }

    if (this.glow && (itemId === 'shower' || itemId === 'stove')) {
      this.tweens.add({
        targets: this.glow,
        alpha: { from: 0.12, to: 0.4 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    }

    // Safety: whatever happens in the simulation, the visuals reset on timeout.
    this.actionTimer = this.time.delayedCall(durationMs + 500, () => this.stopAction());
  }

  stopAction(): void {
    this.actionTimer?.remove();
    this.actionTimer = undefined;
    this.actionItemId = null;
    this.clearBubble();
    this.clearZzz();
    if (!this.characterSprite) return;
    this.currentTween?.stop();
    this.characterSprite.setAngle(0);
    this.characterSprite.y = 0;
    this.characterSprite.setTexture('character');
    this.applyCharacterSize(this.characterSprite);
    if (!this.sceneData.reducedMotion) this.startBreathing();
  }

  private startBreathing(): void {
    if (!this.character) return;
    this.currentTween = this.tweens.add({
      targets: this.character,
      scaleY: 1.008,
      scaleX: 1.003,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /* ---------------------------------------------------------------------- */
  /*                               BUBBLES                                  */
  /* ---------------------------------------------------------------------- */

  private showBubble(emoji: string): void {
    this.clearBubble();
    const box = this.add.graphics();
    box.fillStyle(0xfffdf8, 0.96);
    box.fillRoundedRect(-18, -20, 36, 30, 10);
    box.fillStyle(0xfffdf8, 0.96);
    box.fillTriangle(-5, 9, 5, 9, 0, 16);
    const text = this.add.text(0, -6, emoji, { fontSize: '17px' }).setOrigin(0.5, 0.5);
    const container = this.add.container(this.character.x, this.character.y - CHARACTER_DESIGN_WIDTH * 1.5, [box, text]);
    container.setDepth(21000);
    this.bubble = { container, label: text, emoji: text };
    if (this.sceneData.reducedMotion) return;
    this.tweens.add({
      targets: container,
      y: container.y - 5,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private showZzz(): void {
    if (!this.character) return;
    const zzz = this.add
      .text(this.character.x + 26, this.character.y - CHARACTER_DESIGN_WIDTH * 1.15, 'z z Z', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '15px',
        color: '#8C7BB0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 1)
      .setDepth(21000);
    this.tweens.add({
      targets: zzz,
      y: zzz.y - 26,
      alpha: { from: 0.95, to: 0 },
      duration: 2200,
      repeat: -1,
      ease: 'Sine.easeOut',
    });
    this.zzz = zzz;
  }

  private clearZzz(): void {
    if (!this.zzz) return;
    this.tweens.killTweensOf(this.zzz);
    this.zzz.destroy();
    this.zzz = undefined;
  }

  private clearBubble(): void {
    if (!this.bubble) return;
    this.tweens.killTweensOf(this.bubble.container);
    this.bubble.container.destroy(true);
    this.bubble = undefined;
  }

  /* ---------------------------------------------------------------------- */
  /*                                CLOCK                                   */
  /* ---------------------------------------------------------------------- */

  /**
   * The scene keeps a *visual* clock only: React owns the authoritative game
   * time (`advanceWorld`) and pushes it in through `setClockMs` 4x/second.
   * This avoids two clocks drifting apart, and keeps the HUD in sync with the
   * needs simulation.
   */
  private startClock(): void {
    this.emitClock();
  }

  private emitClock(): void {
    const reading = readClock(this.clock);
    const snapshot: ClockSnapshot = {
      hour: reading.hour,
      minute: reading.minute,
      day: reading.day,
      phase: reading.phase,
      label: reading.label,
      dayProgress: reading.dayProgress,
    };
    gameEvents.emit('hour-changed', snapshot);
  }

  /** React pushes the authoritative game time (in-game ms) into the scene. */
  setClockMs(totalMs: number): void {
    if (!Number.isFinite(totalMs)) return;
    const previous = readClock(this.clock);
    this.clock = { ...this.clock, totalMs };
    const current = readClock(this.clock);
    if (Math.abs(current.dayProgress - previous.dayProgress) > 0.0005) {
      this.applyAmbient(false);
    }
    if (current.hour !== previous.hour || current.minute !== previous.minute) this.emitClock();
  }

  /* ---------------------------------------------------------------------- */
  /*                              DAY / NIGHT                               */
  /* ---------------------------------------------------------------------- */

  private applyAmbient(instant: boolean): void {
    if (!this.ambientOverlay) return;
    const reading = readClock(this.clock);
    const ambient = ambientForDayProgress(reading.dayProgress);
    const targetTint = Phaser.Display.Color.HexStringToColor(ambient.tint).color;
    const targetAlpha = ambient.tintAlpha * 0.92;

    if (instant || this.sceneData.reducedMotion) {
      this.ambientOverlay.setFillStyle(targetTint, targetAlpha);
      for (const glow of this.lampGlows) {
        glow.setAlpha(ambient.isNight ? (glow.getData('intensity') as number) : 0);
      }
      return;
    }

    this.tweens.add({
      targets: this.ambientOverlay,
      duration: 1200,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const t = tween.progress;
        this.ambientOverlay?.setFillStyle(targetTint, targetAlpha * t);
      },
    });
    for (const glow of this.lampGlows) {
      this.tweens.add({
        targets: glow,
        alpha: ambient.isNight ? (glow.getData('intensity') as number) : 0,
        duration: 1200,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /* ---------------------------------------------------------------------- */
  /*                                CAMERA                                  */
  /* ---------------------------------------------------------------------- */

  private scaleCamera(): void {
    if (!this.cameras?.main) return;
    const camera = this.cameras.main;
    const width = this.scale.width;
    const height = this.scale.height;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 80 || height < 80) return;
    const zoom = Math.min(width / 400, height / 720);
    if (!Number.isFinite(zoom) || zoom <= 0) return;
    camera.setZoom(zoom);
    camera.centerOn(200, 360);
  }

  /* ---------------------------------------------------------------------- */
  /*                                 LOOP                                   */
  /* ---------------------------------------------------------------------- */

  private bindVisibility(): void {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        this.pausedByVisibility = true;
        this.scene.pause();
      } else if (this.pausedByVisibility) {
        this.pausedByVisibility = false;
        this.scene.resume();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', onVisibility);
      this.scale.off('resize', this.scaleCamera, this);
      this.destroyed = true;
      this.ready = false;
      this.sceneData.appearance; // keep the field "used" for the linter
    });
  }

  private bindInput(): void {
    // Tapping the background (wall) clears the selection.
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.worldY < rowBottomY(0)) this.clearHighlight();
    });
  }

  /** Called by `GameHandle.setPaused`. */
  setPaused(paused: boolean): void {
    this.pausedByUser = paused;
    if (paused) {
      this.tweens.pauseAll();
      this.time.paused = true;
    } else {
      this.tweens.resumeAll();
      this.time.paused = false;
    }
  }

  private startBlinkLoop(): void {
    if (this.sceneData.reducedMotion) return;
    const blink = () => {
      if (this.destroyed) return;
      const idle = this.actionItemId === null;
      if (idle && this.characterSprite?.active && this.textures.exists('character-blink')) {
        this.characterSprite.setTexture('character-blink');
        this.applyCharacterSize(this.characterSprite);
        this.time.delayedCall(130, () => {
          if (this.destroyed || !this.characterSprite?.active || this.actionItemId !== null) return;
          this.characterSprite.setTexture('character');
          this.applyCharacterSize(this.characterSprite);
        });
      }
      this.time.delayedCall(Phaser.Math.Between(2600, 5200), blink);
    };
    this.time.delayedCall(3000, blink);
  }

  update(time: number): void {
    if (!this.character) return;
    this.character.setDepth(this.character.y);
    this.characterShadow.setPosition(this.character.x, this.character.y + 2);
    this.characterShadow.setDepth(this.character.y - 3);
    if (this.bubble) {
      this.bubble.container.setPosition(this.character.x, this.character.y - CHARACTER_DESIGN_WIDTH * 1.5);
    }
    // Gentle idle bob for the dust.
    const seconds = time / 1000;
    for (let i = 0; i < this.dustSprites.length; i += 1) {
      const sprite = this.dustSprites[i];
      const base = this.dustBaseAlpha[i] ?? 0.2;
      if (!sprite) continue;
      // Fixed base + slow sine: the dust twinkles instead of fading away.
      sprite.setAlpha(base * (0.72 + Math.sin(seconds * 0.6 + i) * 0.28));
    }
  }
}

function interactionEmoji(itemId: string, interactionId: InteractionId): string {
  if (interactionId === 'sleep' || interactionId === 'nap') return '💤';
  if (interactionId === 'eat' || interactionId === 'cook') return '🍲';
  if (interactionId === 'shower' || interactionId === 'washHands') return '🫧';
  if (interactionId === 'toilet') return '✨';
  if (itemId === 'cat') return '💛';
  if (interactionId === 'read') return '📖';
  if (interactionId === 'coffee') return '☕';
  if (interactionId === 'relax' || interactionId === 'sit') return '🎵';
  return '✨';
}

/** Creates the Phaser game instance bound to a DOM element. */
export function createGame(
  parent: HTMLElement,
  sceneData: RoomSceneData,
  quality: QualityLevel,
): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: SCENE_COLORS.outside,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: parent.clientWidth || 400,
      height: parent.clientHeight || 720,
    },
    render: {
      antialias: quality !== 'low',
      roundPixels: quality === 'low',
      powerPreference: 'high-performance',
    },
    fps: {
      target: 60,
      min: quality === 'low' ? 24 : 30,
      smoothStep: true,
    },
    banner: false,
    audio: { noAudio: true },
    scene: [],
  });

  game.scene.add(RoomScene.KEY, RoomScene, true, sceneData);
  return game;
}
