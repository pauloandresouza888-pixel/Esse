import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../gameStore';
import { storage } from '@/platform/storage';

/**
 * Store tests run against a real localStorage (jsdom), which is what a browser
 * uses. They cover the risky parts: boot with/without a save, corrupt data
 * recovery from the backup and settings persistence.
 */
const initial = { bootStatus: 'idle' as const, save: null, storageWarning: null };

/** Simulates closing and reopening the app: only in-memory state is lost. */
function simulateAppRestart() {
  useGameStore.setState(initial);
}

beforeEach(() => {
  storage.clear();
  window.localStorage.clear();
  useGameStore.setState(initial);
});

afterEach(() => {
  storage.clear();
  window.localStorage.clear();
  useGameStore.setState(initial);
});

describe('gameStore boot', () => {
  it('starts without a save on a fresh device', () => {
    useGameStore.getState().load();
    expect(useGameStore.getState().bootStatus).toBe('ready');
    expect(useGameStore.getState().save).toBeNull();
  });

  it('creates a guest profile with a friendly code and a starter house', () => {
    useGameStore.getState().createProfile({ displayName: 'Ana' });
    const save = useGameStore.getState().save;
    expect(save).not.toBeNull();
    expect(save?.profile.displayName).toBe('Ana');
    expect(save?.profile.friendCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(save?.world.house.house.items.length).toBeGreaterThan(5);
    expect(save?.world.money).toBe(400);
    expect(storage.readSave()).toBeTypeOf('string');
  });

  it('restores a save after a reload', () => {
    useGameStore.getState().createProfile({ displayName: 'Bia' });
    useGameStore.getState().flushSave();
    const created = useGameStore.getState().save;

    simulateAppRestart();
    useGameStore.getState().load();
    const loaded = useGameStore.getState().save;
    expect(loaded?.profile.id).toBe(created?.profile.id);
    // The sessions counter goes up on every app start.
    expect(loaded?.stats.sessions).toBe((created?.stats.sessions ?? 1) + 1);
  });

  it('recovers from the backup copy when the main save is corrupt', () => {
    useGameStore.getState().createProfile({ displayName: 'Caio' });
    useGameStore.getState().flushSave();
    // A second write moves the previous version into the backup slot.
    useGameStore.getState().updateSettings({ largeText: true });
    useGameStore.getState().flushSave();
    // Half-written save, e.g. the browser was killed mid-write.
    window.localStorage.setItem('vida:save', '{"version":1,"savedAt":');

    simulateAppRestart();
    useGameStore.getState().load();
    const save = useGameStore.getState().save;
    expect(save).not.toBeNull();
    expect(save?.profile.displayName).toBe('Caio');
    expect(useGameStore.getState().storageWarning).toBe('backup');
  });
});

describe('gameStore settings', () => {
  it('persists settings inside the save', () => {
    useGameStore.getState().createProfile({ displayName: 'Duda' });
    useGameStore.getState().updateSettings({ language: 'en', quality: 'low', reducedMotion: true });
    useGameStore.getState().flushSave();

    simulateAppRestart();
    useGameStore.getState().load();
    const settings = useGameStore.getState().save?.settings;
    expect(settings?.language).toBe('en');
    expect(settings?.quality).toBe('low');
    expect(settings?.reducedMotion).toBe(true);
  });

  it('keeps a settings draft before the first save exists', () => {
    useGameStore.getState().updateSettings({ language: 'en' });
    const raw = storage.readSettings();
    expect(raw).toContain('"language":"en"');
  });

  it('resets the save and creates a brand new profile', () => {
    useGameStore.getState().createProfile({ displayName: 'Edu' });
    const oldId = useGameStore.getState().save?.profile.id;
    useGameStore.getState().resetSave();
    const newId = useGameStore.getState().save?.profile.id;
    expect(newId).toBeDefined();
    expect(newId).not.toBe(oldId);
  });
});
