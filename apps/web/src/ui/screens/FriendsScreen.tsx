import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidFriendCode } from '@vida/shared';
import { TopBar } from '@/ui/components/TopBar';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Icon } from '@/ui/components/Icon';
import { useGameStore } from '@/stores/gameStore';
import { useUiStore } from '@/stores/uiStore';
import { routes } from '@/app/router';
import styles from './FriendsScreen.module.css';

/**
 * Friends screen (Phase 0 shell).
 *
 * The friend code and the invite link already work locally: players can copy and
 * share them today, and Phase 3 turns the code into a real account lookup.
 * The "add" input is validated offline so the UX and error states exist before
 * the backend does.
 */
export function FriendsScreen() {
  const { t } = useTranslation();
  const profile = useGameStore((state) => state.save?.profile);
  const pushToast = useUiStore((state) => state.pushToast);
  const [code, setCode] = useState('');
  const [showCopyHint, setShowCopyHint] = useState(false);

  const friendCode = profile?.friendCode ?? '--------';
  const inviteLink = `${window.location.origin}/?amigo=${friendCode}`;

  const copy = async (text: string, successKey: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for browsers without the async clipboard (older Safari).
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      pushToast({ message: t(successKey), tone: 'success' });
    } catch {
      setShowCopyHint(true);
      pushToast({ message: t('friends.copyFailed'), tone: 'warning' });
    }
  };

  const share = async () => {
    const text = t('friends.shareText', { code: friendCode });
    if (navigator.share) {
      try {
        await navigator.share({ title: t('friends.shareTitle'), text, url: inviteLink });
        return;
      } catch {
        // User cancelled: fall through to copying.
      }
    }
    await copy(text, 'friends.copied');
  };

  const addFriend = () => {
    const normalized = code.trim().toUpperCase();
    if (!isValidFriendCode(normalized)) {
      pushToast({ message: t('friends.addInvalid'), tone: 'warning' });
      return;
    }
    pushToast({ message: t('menu.toastFriendsSoon'), tone: 'info' });
  };

  return (
    <main className="screen">
      <TopBar title={t('friends.title')} backTo={routes.menu} />

      <div className={styles.content}>
        <Card tone="mint" className={styles.codeCard}>
          <p className={styles.eyebrow}>{t('friends.codeTitle')}</p>
          <p className={styles.code} aria-label={friendCode} data-testid="friend-code">
            {friendCode}
          </p>
          {showCopyHint ? <p className={styles.manualHint}>{inviteLink}</p> : null}
          <div className={styles.codeActions}>
            <Button
              variant="secondary"
              icon={<Icon name="copy" size={18} />}
              onClick={() => copy(friendCode, 'friends.copied')}
            >
              {t('friends.copy')}
            </Button>
            <Button variant="primary" icon={<Icon name="share" size={18} />} onClick={share}>
              {t('friends.shareTitle')}
            </Button>
          </div>
        </Card>

        <section className={styles.addSection}>
          <label className={styles.addLabel} htmlFor="friend-code-input">
            {t('friends.addButton')}
          </label>
          <div className={styles.addRow}>
            <input
              id="friend-code-input"
              className={styles.input}
              value={code}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={8}
              placeholder={t('friends.addPlaceholder')}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addFriend();
              }}
            />
            <Button variant="primary" onClick={addFriend} icon={<Icon name="user-plus" size={18} />}>
              {t('friends.addButton')}
            </Button>
          </div>
        </section>

        <section className={styles.emptyState}>
          <div className={styles.emptyArt} aria-hidden="true">
            <Icon name="heart" size={34} />
          </div>
          <h2 className={styles.emptyTitle}>{t('friends.emptyTitle')}</h2>
          <p className={styles.emptyBody}>{t('friends.emptyBody')}</p>
          <span className={styles.soonBadge}>{t('friends.soon')}</span>
        </section>

        <p className={styles.footnote}>{t('friends.offlineNote')}</p>
      </div>
    </main>
  );
}
