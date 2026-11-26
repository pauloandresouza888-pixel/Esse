/**
 * Safe local storage.
 *
 * Mobile browsers throw in private mode when the quota is exceeded, and Safari
 * may disable localStorage entirely. Every access goes through this module so a
 * failure degrades to "no saving" instead of crashing the game.
 */
const PREFIX = 'vida:';
const SAVE_KEY = 'vida:save';
const SAVE_BACKUP_KEY = 'vida:save:backup';
const SETTINGS_KEY = 'vida:settings';
const INSTALL_DISMISSED_KEY = 'vida:install-dismissed';
const CREATOR_DRAFT_KEY = 'vida:creator-draft';

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignored: storage may be unavailable.
  }
}

export const storage = {
  readSave(): string | null {
    return safeGet(SAVE_KEY);
  },
  /** Keeps one previous copy so a corrupt write never destroys the save. */
  writeSave(serialized: string): boolean {
    const previous = safeGet(SAVE_KEY);
    if (previous) safeSet(SAVE_BACKUP_KEY, previous);
    return safeSet(SAVE_KEY, serialized);
  },
  readSaveBackup(): string | null {
    return safeGet(SAVE_BACKUP_KEY);
  },
  clear(): void {
    safeRemove(SAVE_KEY);
    safeRemove(SAVE_BACKUP_KEY);
  },
  readSettings(): string | null {
    return safeGet(SETTINGS_KEY);
  },
  writeSettings(serialized: string): boolean {
    return safeSet(SETTINGS_KEY, serialized);
  },
  readCreatorDraft(): string | null {
    return safeGet(CREATOR_DRAFT_KEY);
  },
  writeCreatorDraft(serialized: string): boolean {
    return safeSet(CREATOR_DRAFT_KEY, serialized);
  },
  readInstallDismissed(): boolean {
    return safeGet(INSTALL_DISMISSED_KEY) === '1';
  },
  writeInstallDismissed(): void {
    safeSet(INSTALL_DISMISSED_KEY, '1');
  },
  /** Rough size of everything this game stores, in bytes. */
  usedBytes(): number {
    let total = 0;
    try {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (!key || !key.startsWith(PREFIX)) continue;
        total += (key.length + (window.localStorage.getItem(key)?.length ?? 0)) * 2;
      }
    } catch {
      return 0;
    }
    return total;
  },
} as const;
