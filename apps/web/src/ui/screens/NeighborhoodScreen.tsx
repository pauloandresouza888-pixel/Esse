import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  NEIGHBORHOOD_LOCATIONS,
  npcsAtLocation,
  readClock,
  type NeighborhoodLocationId,
  type RelationshipAction,
} from '@vida/shared';
import { routes } from '@/app/router';
import { useGameStore } from '@/stores/gameStore';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { TopBar } from '@/ui/components/TopBar';
import styles from './NeighborhoodScreen.module.css';

export function NeighborhoodScreen() {
  const { t } = useTranslation();
  const save = useGameStore((state) => state.save);
  const interactWithNpc = useGameStore((state) => state.interactWithNpc);
  const pushToast = useUiStore((state) => state.pushToast);
  const [locationId, setLocationId] = useState<NeighborhoodLocationId>('plaza');

  if (!save) return <main className="screen"><TopBar title={t('neighborhood.title')} backTo={routes.menu} /><Card><p>{t('menu.noSave')}</p><Link to={routes.creator}><Button>{t('menu.createCharacter')}</Button></Link></Card></main>;

  const clock = readClock(save.world.clock);
  const present = npcsAtLocation(clock.hour, locationId);
  const makeInteraction = (npcId: string, action: RelationshipAction) => {
    const result = interactWithNpc(npcId, action);
    if (!result) return;
    pushToast({
      message: t(action === 'talk' ? 'neighborhood.talked' : 'neighborhood.flirted', { friendship: result.friendship, romance: result.romance }),
      tone: 'success',
    });
  };

  return (
    <main className={`screen ${styles.screen}`}>
      <TopBar title={t('neighborhood.title')} backTo={routes.menu} />
      <Card tone="warm" className={styles.clockCard}>
        <span>{t('neighborhood.gameTime')}</span><strong>🕒 {clock.label}</strong>
      </Card>
      <p className={styles.intro}>{t('neighborhood.intro')}</p>
      <section className={styles.locations} aria-label={t('neighborhood.locationsTitle')}>
        {NEIGHBORHOOD_LOCATIONS.map((location) => (
          <button key={location.id} className={`${styles.location} ${locationId === location.id ? styles.locationActive : ''}`} onClick={() => setLocationId(location.id)} aria-pressed={locationId === location.id}>
            <span aria-hidden="true">{location.icon}</span>
            <strong>{t(location.nameKey)}</strong>
          </button>
        ))}
      </section>
      <div className={styles.placeHeading}>
        <div><h2>{t(`neighborhood.locations.${locationId}`)}</h2><p>{t(`neighborhood.locationDescriptions.${locationId}`)}</p></div>
        <span>{t('neighborhood.peopleCount', { count: present.length })}</span>
      </div>
      {present.length ? <section className={styles.npcs}>
        {present.map((npc) => {
          const relationship = save.world.relationships?.[npc.id] ?? { friendship: 0, romance: 0, interactions: 0 };
          return <Card key={npc.id} className={styles.npcCard}>
            <div className={styles.npcHead}><span className={styles.avatar} aria-hidden="true">{npc.id === 'mia' ? '👩🏻' : npc.id === 'leo' ? '🧑🏽' : npc.id === 'bia' ? '👩🏾' : npc.id === 'caio' ? '🧔🏻' : '🧑🏼'}</span><div><h3>{t(npc.nameKey)}</h3><p>{t(npc.descriptionKey)}</p></div></div>
            <div className={styles.relationships}>
              <label><span>{t('neighborhood.friendship')}</span><progress max={100} value={relationship.friendship} /><b>{relationship.friendship}</b></label>
              <label><span>{t('neighborhood.romance')}</span><progress max={100} value={relationship.romance} /><b>{relationship.romance}</b></label>
            </div>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => makeInteraction(npc.id, 'talk')}>{t('neighborhood.talk')}</Button>
              <Button variant="ghost" onClick={() => makeInteraction(npc.id, 'flirt')}>{t('neighborhood.flirt')}</Button>
            </div>
          </Card>;
        })}
      </section> : <Card className={styles.empty}><span aria-hidden="true">🌙</span><p>{t('neighborhood.emptyPlace')}</p></Card>}
      <Link to={routes.play} className={styles.playLink}><Button fullWidth>{t('neighborhood.returnHome')}</Button></Link>
    </main>
  );
}
