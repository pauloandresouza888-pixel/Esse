import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { STORE_ITEMS, type CatalogItem } from '@vida/shared';
import { routes } from '@/app/router';
import { useGameStore } from '@/stores/gameStore';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { TopBar } from '@/ui/components/TopBar';
import styles from './StoreScreen.module.css';

type Tab = 'store' | 'build';
const itemEmoji: Record<string, string> = {
  bed: '🛏️', fridge: '🧊', shower: '🚿', toilet: '🚽', stove: '🍳', sink: '🚰',
  sofa: '🛋️', tv: '📺', plant: '🪴', lamp: '💡', desk: '🪑', bookshelf: '📚',
  coffeeTable: '🪵', catBed: '🐈', rug: '🟫', piano: '🎹', treadmill: '🏃',
  mirror: '🪞', painting: '🖼️', bench: '🪑',
};

export function StoreScreen() {
  const { t } = useTranslation();
  const save = useGameStore((state) => state.save);
  const buyFurniture = useGameStore((state) => state.buyFurniture);
  const placeFurniture = useGameStore((state) => state.placeFurniture);
  const unplaceFurniture = useGameStore((state) => state.unplaceFurniture);
  const pushToast = useUiStore((state) => state.pushToast);
  const [tab, setTab] = useState<Tab>('store');
  const [category, setCategory] = useState('all');
  const localizedName = (item: CatalogItem) => t(`items.${item.id}`, { defaultValue: item.id });

  const inventory = save?.world.house.inventory ?? [];
  const placed = save?.world.house.placed ?? [];
  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of inventory) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, [inventory]);
  const visibleItems = STORE_ITEMS.filter((item) => category === 'all' || item.category === category);

  const purchase = (item: CatalogItem) => {
    if (buyFurniture(item.id)) {
      pushToast({ message: t('store.bought', { item: localizedName(item) }), tone: 'success' });
    } else {
      pushToast({ message: t('store.notEnough'), tone: 'warning' });
    }
  };

  const place = (itemId: string) => {
    if (placeFurniture(itemId)) {
      pushToast({ message: t('store.placed', { item: localizedName(STORE_ITEMS.find((item) => item.id === itemId)!) }), tone: 'success' });
    } else {
      pushToast({ message: t('store.noSpace'), tone: 'warning' });
    }
  };

  if (!save) {
    return (
      <main className="screen">
        <TopBar title={t('store.title')} backTo={routes.menu} />
        <Card><p>{t('menu.noSave')}</p><Link to={routes.creator}><Button>{t('menu.createCharacter')}</Button></Link></Card>
      </main>
    );
  }

  const categories = ['all', 'furniture', 'appliance', 'electronics', 'decor', 'outdoor'];
  return (
    <main className={`screen ${styles.screen}`}>
      <TopBar title={t('store.title')} backTo={routes.menu} />
      <Card tone="warm" className={styles.balance}>
        <span>{t('store.balance')}</span><strong>🪙 {save.world.money}</strong>
      </Card>
      <div className={styles.tabs} role="tablist" aria-label={t('store.title')}>
        <button role="tab" aria-selected={tab === 'store'} className={tab === 'store' ? styles.activeTab : ''} onClick={() => setTab('store')}>{t('store.tabStore')}</button>
        <button role="tab" aria-selected={tab === 'build'} className={tab === 'build' ? styles.activeTab : ''} onClick={() => setTab('build')}>{t('store.tabBuild')} <span>{inventory.length}</span></button>
      </div>

      {tab === 'store' ? (
        <>
          <div className={styles.filters} aria-label={t('store.categories')}>
            {categories.map((key) => <button key={key} className={category === key ? styles.filterActive : ''} onClick={() => setCategory(key)}>{t(`store.categories.${key}`)}</button>)}
          </div>
          <section className={styles.items} aria-label={t('store.catalog')}>
            {visibleItems.map((item) => (
              <Card key={item.id} className={styles.itemCard}>
                <span className={styles.emoji} aria-hidden="true">{itemEmoji[item.id] ?? '🪑'}</span>
                <div className={styles.itemInfo}>
                  <strong>{localizedName(item)}</strong>
                  <small>{t('store.price', { amount: item.price })}</small>
                </div>
                <Button size="md" variant="secondary" onClick={() => purchase(item)} disabled={save.world.money < item.price}>{t('store.buy')}</Button>
              </Card>
            ))}
          </section>
        </>
      ) : (
        <section className={styles.buildSection}>
          <Card><p>{t('store.buildHint')}</p></Card>
          {inventory.length > 0 ? (
            <div className={styles.items}>
              {Array.from(itemCounts, ([id, count]) => {
                const item = STORE_ITEMS.find((entry) => entry.id === id);
                if (!item) return null;
                return <Card key={id} className={styles.itemCard}>
                  <span className={styles.emoji} aria-hidden="true">{itemEmoji[id] ?? '🪑'}</span>
                  <div className={styles.itemInfo}><strong>{localizedName(item)}</strong><small>{t('store.quantity', { count })}</small></div>
                  <Button variant="primary" onClick={() => place(id)}>{t('store.place')}</Button>
                </Card>;
              })}
            </div>
          ) : <Card><p>{t('store.emptyInventory')}</p></Card>}
          {placed.length > 0 && <>
            <h2 className={styles.subheading}>{t('store.placedTitle')}</h2>
            <div className={styles.items}>{placed.map((piece) => {
              const item = STORE_ITEMS.find((entry) => entry.id === piece.itemId);
              if (!item) return null;
              return <Card key={piece.id} className={styles.itemCard}>
                <span className={styles.emoji} aria-hidden="true">{itemEmoji[piece.itemId] ?? '🪑'}</span>
                <div className={styles.itemInfo}><strong>{localizedName(item)}</strong><small>{t('store.location', { x: piece.x + 1, y: piece.y + 1 })}</small></div>
                <Button variant="ghost" onClick={() => unplaceFurniture(piece.id)}>{t('store.remove')}</Button>
              </Card>;
            })}</div>
          </>}
          <Link className={styles.playLink} to={routes.play}><Button fullWidth>{t('store.seeRoom')}</Button></Link>
        </section>
      )}
    </main>
  );
}
