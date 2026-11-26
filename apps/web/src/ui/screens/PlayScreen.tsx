import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  actionProgress,
  approachCell,
  buildBlockedGrid,
  criticalNeeds,
  itemForNeed,
  placementForItem,
  readClock,
  TUTORIAL_STEPS,
  wellbeing,
  type InteractionId,
} from '@vida/shared';
import { GameCanvas } from '@/game/GameCanvas';
import type { GameHandle } from '@/game/mount';
import { GameHud } from '@/ui/game/GameHud';
import { CharacterPortrait } from '@/ui/game/CharacterPortrait';
import { ActionBar } from '@/ui/game/ActionBar';
import { ObjectSheet } from '@/ui/game/ObjectSheet';
import { TutorialCoach } from '@/ui/game/TutorialCoach';
import { Button } from '@/ui/components/Button';
import { useGameStore } from '@/stores/gameStore';
import { useUiStore } from '@/stores/uiStore';
import { useBannerStore } from '@/stores/notificationBanner';
import { hapticTap, sound } from '@/platform/audio';
import { routes } from '@/app/router';
import type { ClockSnapshot, ObjectTapPayload } from '@/game/sceneData';
import styles from './PlayScreen.module.css';

/** Simulation step: 4 ticks per second is smooth for needs and cheap on battery. */
const TICK_MS = 250;

/**
 * Collision grid built once: the house never changes in Phase 1. It is the same
 * grid the scene uses, so "walk in front of the fridge" means the same cell in
 * both places.
 */
const ROOM_GRID = buildBlockedGrid();

/**
 * Game screen.
 *
 * Stacking (bottom to top): Phaser canvas → HUD (React) → sheets. The HUD is
 * pointer-events:none except on its buttons, so taps reach the canvas.
 *
 * Data flow:
 *  - a 250 ms loop advances the world through `gameStore.tickWorld` (which runs
 *    the shared `advanceWorld` rules) and pushes the clock into the scene;
 *  - the scene reports taps; React decides to walk, open a sheet or start an
 *    action; whenever the action changes the scene is told to animate it.
 */
export function PlayScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const save = useGameStore((state) => state.save);
  const pushToast = useUiStore((state) => state.pushToast);
  const showBanner = useBannerStore((state) => state.show);

  const [clock, setClock] = useState<ClockSnapshot | null>(() =>
    save ? toSnapshot(save.world.clock.totalMs, save.world.clock.dayLengthMs) : null,
  );
  const [selected, setSelected] = useState<ObjectTapPayload | null>(null);
  const [paused, setPaused] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  const [ready, setReady] = useState(false);

  const handleRef = useRef<GameHandle | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const lastActionRef = useRef<string | null>(null);
  const lastTutorialStep = useRef<number>(save?.profile.tutorialStep ?? 0);

  const appearance = save?.world.character.appearance;
  const needs = save?.world.needs;
  const action = save?.world.action ?? null;
  const quality = save?.settings.quality ?? 'high';

  const tutorialStep = save && !save.profile.tutorialDone ? TUTORIAL_STEPS[save.profile.tutorialStep] : null;

  const handleClock = useCallback((reading: ClockSnapshot) => setClock(reading), []);

  /* ------------------------------------------------------------------ */
  /*                        SIMULATION LOOP                             */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const elapsed = now - last;
      last = now;
      const state = useGameStore.getState();
      if (!state.save) return;
      if (pausedRef.current || document.visibilityState === 'hidden') return;

      const events = state.tickWorld(elapsed);
      for (const event of events) {
        if (event.type === 'action-completed') {
          // Waking up sounds like a chime; any other finished action is a soft blip.
          sound.play(event.interactionId === 'sleep' ? 'wake' : 'complete');
          if (event.wokeReason === 'hunger') showBanner(t('play.sleepWokeHunger'));
          else if (event.interactionId === 'sleep') showBanner(t('play.sleepWokeEnergy'));
          handleRef.current?.stopAction();
        }
        if (event.type === 'need-critical') {
          sound.play('alert');
        }
      }

      // Keep the scene in sync with the authoritative clock.
      const latest = useGameStore.getState().save;
      if (latest) handleRef.current?.setClockMs(latest.world.clock.totalMs);

      // Tutorial finished?
      const profile = latest?.profile;
      if (profile && profile.tutorialStep !== lastTutorialStep.current) {
        lastTutorialStep.current = profile.tutorialStep;
        if (profile.tutorialDone) {
          sound.play('tutorial');
          showBanner(t('tutorial.done'));
        } else {
          sound.play('tutorial');
          const step = TUTORIAL_STEPS[profile.tutorialStep];
          if (step) showBanner(t(step.textKey));
        }
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [showBanner, t]);

  /* ------------------------------------------------------------------ */
  /*                     ACTION → SCENE ANIMATION                       */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    if (!action) {
      if (lastActionRef.current) handle.stopAction();
      lastActionRef.current = null;
      return;
    }
    const signature = `${action.itemId}:${action.interactionId}:${action.startedAtMs}`;
    if (lastActionRef.current === signature) return;
    lastActionRef.current = signature;
    // The scene only needs a rough duration for its visual loops; the HUD bar
    // itself is driven by the authoritative clock.
    handle.playAction(action.itemId, action.interactionId, action.durationMs);
  }, [action]);

  const handleReady = useCallback((handle: GameHandle) => {
    handleRef.current = handle;
    setReady(true);
    const state = useGameStore.getState();
    if (state.save) {
      handle.setClockMs(state.save.world.clock.totalMs);
      const act = state.save.world.action;
      if (act) handle.playAction(act.itemId, act.interactionId, act.durationMs / act.speed);
    }
  }, []);

  /* ------------------------------------------------------------------ */
  /*                          TAP HANDLERS                              */
  /* ------------------------------------------------------------------ */

  const walkToCell = useCallback((cell: { x: number; y: number }, then?: () => void) => {
    const handle = handleRef.current;
    if (!handle) {
      then?.();
      return;
    }
    const state = useGameStore.getState();
    if (state.save?.world.action) {
      // Walking cancels the current action: the player changed their mind.
      state.cancelInteraction();
    }
    handle.walkTo(cell, () => {
      useGameStore.getState().setPosition(cell.x, cell.y);
      then?.();
    });
  }, []);

  const handleFloorTap = useCallback(
    (cell: { x: number; y: number }) => {
      setSelected(null);
      walkToCell(cell);
      useGameStore.getState().signalTutorial({ type: 'walked' });
      hapticTap();
      sound.play('step');
    },
    [walkToCell],
  );

  const handleObjectTap = useCallback(
    (payload: ObjectTapPayload) => {
      hapticTap();
      sound.play('tap');
      setSelected(payload);
      // Walk in front of the object while its sheet opens.
      const placement = placementForItem(payload.itemId);
      const approach = placement ? approachCell(ROOM_GRID, placement) : null;
      if (approach) walkToCell(approach);
      useGameStore.getState().signalTutorial({ type: 'walked' });
    },
    [walkToCell],
  );

  const interact = useCallback(
    (interaction: InteractionId) => {
      if (!selected) return;
      const state = useGameStore.getState();
      if (state.save?.world.action) {
        pushToast({ message: t('play.finishFirst'), tone: 'warning' });
        return;
      }
      const ok = state.startInteraction(selected.itemId, interaction);
      if (!ok) {
        pushToast({ message: t('play.noActions'), tone: 'warning' });
        return;
      }
      sound.play(interaction === 'sleep' ? 'sleep' : interaction === 'eat' || interaction === 'cook' ? 'eat' : 'shower');
      setSelected(null);
    },
    [pushToast, selected, t],
  );

  const skip = useCallback(() => {
    useGameStore.getState().skipInteraction();
    handleRef.current?.stopAction();
  }, []);

  const cancel = useCallback(() => {
    useGameStore.getState().cancelInteraction();
    handleRef.current?.stopAction();
  }, []);

  /**
   * Highlights an object in the room and opens its action sheet.
   * Used by the HUD "!" shortcut and by the tutorial's "show me".
   */
  const focusObject = useCallback((itemId: string) => {
    const placement = placementForItem(itemId);
    if (!placement) return;
    setSelected({
      id: placement.id,
      itemId,
      labelKey: placement.labelKey,
      cell: { x: placement.cell.x, y: placement.cell.y },
    });
    // The scene pulses a ring under the object so the player sees where it is.
    handleRef.current?.tapObjectById(placement.id);
    sound.play('tap');
  }, []);

  /** HUD shortcut: jump to the object that fixes the most urgent need. */
  const focusNeed = useCallback(
    (need: string) => {
      const itemId = itemForNeed(need);
      if (!itemId) return;
      focusObject(itemId);
    },
    [focusObject],
  );

  /* ------------------------------------------------------------------ */
  /*                         DERIVED VALUES                             */
  /* ------------------------------------------------------------------ */

  const moodPercent = useMemo(() => (needs ? Math.round(wellbeing(needs) * 100) : 72), [needs]);
  const urgency = useMemo(() => (needs ? criticalNeeds(needs) : []), [needs]);
  const progress = action && save ? actionProgress(action, save.world.clock.totalMs) : 0;
  const suggested = tutorialStep?.interactionId ?? null;

  useEffect(() => {
    if (!save) return;
    if (!save.profile.tutorialDone) {
      showBanner(t(TUTORIAL_STEPS[save.profile.tutorialStep]?.textKey ?? 'tutorial.hint'));
    } else {
      showBanner(t('play.tapHint'));
    }
    // Only when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist clock + position when leaving the room.
  useEffect(() => {
    return () => {
      const state = useGameStore.getState();
      const current = state.save;
      if (!current) return;
      state.flushSave();
    };
  }, []);

  if (!save || !appearance) {
    return (
      <main className={`screen ${styles.missing}`}>
        <p>{t('menu.noSave')}</p>
        <Link to={routes.menu}>
          <Button variant="primary">{t('common.back')}</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className={styles.play}>
      <div className={styles.stage}>
        <GameCanvas
          appearance={appearance}
          quality={quality}
          settings={{ reducedMotion: save.settings.reducedMotion }}
          clockTotalMs={save.world.clock.totalMs}
          dayLengthMs={save.world.clock.dayLengthMs}
          characterCell={save.world.position ?? { x: 11, y: 7 }}
          paused={paused || !ready}
          onReady={handleReady}
          onObjectTap={handleObjectTap}
          onFloorTap={handleFloorTap}
          onClockChange={handleClock}
        />
      </div>

      <GameHud
        visible={hudVisible}
        clockLabel={clock?.label ?? '07:00'}
        phase={clock?.phase ?? 'morning'}
        day={clock?.day ?? 1}
        money={save.world.money}
        moodPercent={moodPercent}
        needs={needs}
        portrait={<CharacterPortrait appearance={appearance} name={save.world.character.name} />}
        urgentNeeds={urgency}
        onNeedShortcut={focusNeed}
        onTogglePause={() => {
          setPaused((value) => !value);
          sound.play(paused ? 'resume' : 'pause');
        }}
        paused={paused}
        onBack={() => {
          useGameStore.getState().flushSave();
          if (window.history.length > 1) window.history.back();
          else navigate(routes.menu);
        }}
        onHideHud={() => setHudVisible((value) => !value)}
      />

      <div className={styles.bottomStack}>
        {tutorialStep ? (
          <TutorialCoach
            profile={save.profile}
            onFocusObject={focusObject}
            onSkip={() => useGameStore.getState().skipTutorial()}
          />
        ) : null}
        {action ? (
          <ActionBar action={action} progress={progress} onCancel={cancel} onSkip={skip} />
        ) : null}
        {paused ? (
          <div className={styles.pausedPill} role="status">
            {t('play.paused')}
          </div>
        ) : null}
      </div>

      <ObjectSheet
        open={selected !== null}
        itemId={selected?.itemId ?? null}
        labelKey={selected?.labelKey ?? ''}
        needs={needs ?? null}
        suggestedInteraction={suggested}
        busy={action !== null}
        onClose={() => setSelected(null)}
        onInteract={interact}
      />
    </main>
  );
}

function toSnapshot(totalMs: number, dayLengthMs: number): ClockSnapshot {
  const reading = readClock({ totalMs, speed: 1, dayLengthMs });
  return {
    hour: reading.hour,
    minute: reading.minute,
    day: reading.day,
    phase: reading.phase,
    label: reading.label,
    dayProgress: reading.dayProgress,
  };
}
