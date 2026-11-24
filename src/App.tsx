import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Activity, Award, Briefcase, Camera, Check, ChevronRight, CircleHelp, Clock3, Coins, Copy,
  DoorOpen, Eye, EyeOff, FastForward, Focus, Grid3X3, Hammer, Heart, Home, HousePlus, Info,
  Maximize2, Moon, MousePointer2, Move, Package, Paintbrush, PanelTop, Pause, Pipette, Play,
  Plus, Redo2, RotateCw, Save, Search, Settings, Sparkles, Star, Sun, Target, Trash2, Trophy,
  Undo2, UserPlus, Users, Volume2, VolumeX, WandSparkles, X, Zap,
} from 'lucide-react';

import { GameWorld } from './game/engine/world';
import { audio } from './game/engine/audio';
import {
  ASPIRATION_BY_ID, CAREER_BY_ID, CATEGORY_ORDER, FLOOR_ORDER, INTERACTIONS, OBJECT_BY_ID,
  OBJECTS, WALL_ORDER, getDef, type ObjectDef,
} from './game/data';
import {
  FLOOR_STYLES, MAX_SIMS, NEEDS_META, NEED_KEYS, SEASON_META, SKILL_KEYS, SKILL_META,
  WALL_KIND_META, WALL_STYLES, WEATHER_META, clamp, formatClock, formatDay, formatMoney, moodLabel,
} from './game/constants';
import { findObject, getLotSummary } from './game/lot';
import { useGameStore } from './game/store';
import type { ActivityType, BuildTool, CameraPreset, FloorStyleId, Sim, WallStyleId } from './game/types';
import { SimAvatar } from './ui/SimAvatar';
import { Modals } from './ui/Modals';
import { Splash } from './ui/Splash';
import { Tutorial } from './ui/Tutorial';

const CAMERA_PRESETS: Array<{ id: CameraPreset; label: string; icon: string }> = [
  { id: 'overview', label: 'Visão geral', icon: '🏡' },
  { id: 'front', label: 'Fachada', icon: '🏠' },
  { id: 'garden', label: 'Jardim', icon: '🌿' },
  { id: 'top', label: 'Planta', icon: '⬚' },
  { id: 'cinema', label: 'Cinematográfica', icon: '🎬' },
];

const BUILD_TOOLS: Array<{ id: BuildTool; label: string; hint: string; icon: ReactNode }> = [
  { id: 'select', label: 'Selecionar', hint: 'Clique em objetos para editar', icon: <MousePointer2 size={16} /> },
  { id: 'place', label: 'Objetos', hint: 'Compre itens do catálogo', icon: <Package size={16} /> },
  { id: 'move', label: 'Mover', hint: 'Arraste para outro tile', icon: <Move size={16} /> },
  { id: 'wall', label: 'Paredes', hint: 'Paredes, portas e janelas', icon: <DoorOpen size={16} /> },
  { id: 'floor', label: 'Pisos', hint: 'Pinte o chão', icon: <Paintbrush size={16} /> },
  { id: 'room', label: 'Cômodo', hint: 'Arraste uma área 2×2 ou maior', icon: <HousePlus size={16} /> },
  { id: 'delete', label: 'Vender', hint: 'Remova objetos ou paredes', icon: <Trash2 size={16} /> },
  { id: 'pipette', label: 'Conta-gotas', hint: 'Copie um objeto do lote', icon: <Pipette size={16} /> },
];

const QUICK_ACTIONS: ActivityType[] = [
  'cook', 'quickMeal', 'eat', 'sleep', 'shower', 'read', 'watchTv', 'workOut',
  'practiceArt', 'useComputer', 'garden', 'meditate', 'talk', 'socialize', 'clean', 'study',
];

function timeOfDay(minutes: number) {
  const hour = Math.floor(minutes / 60);
  if (hour < 6) return { label: 'Madrugada', icon: <Moon size={14} /> };
  if (hour < 12) return { label: 'Manhã', icon: <Sun size={14} /> };
  if (hour < 18) return { label: 'Tarde', icon: <Sun size={14} /> };
  return { label: 'Noite', icon: <Moon size={14} /> };
}

function ToolButton({ active, title, hint, icon, onClick, disabled }: {
  active?: boolean; title: string; hint?: string; icon: ReactNode; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button className={`tool-btn ${active ? 'active' : ''}`} onClick={onClick} disabled={disabled} title={hint ? `${title} · ${hint}` : title}>
      <span className="tool-icon">{icon}</span>
      <span>{title}</span>
    </button>
  );
}

function Topbar() {
  const householdName = useGameStore((s) => s.householdName);
  const money = useGameStore((s) => s.money);
  const clock = useGameStore((s) => s.clock);
  const weather = useGameStore((s) => s.weather);
  const sims = useGameStore((s) => s.sims);
  const settings = useGameStore((s) => s.settings);
  const achievements = useGameStore((s) => s.achievements);
  const setHouseholdName = useGameStore((s) => s.setHouseholdName);
  const setSettings = useGameStore((s) => s.setSettings);
  const openModal = useGameStore((s) => s.openModal);
  const openCAS = useGameStore((s) => s.openCAS);
  const togglePhotoMode = useGameStore((s) => s.togglePhotoMode);
  const time = timeOfDay(clock.minutes);
  const weatherMeta = WEATHER_META[weather];
  const seasonMeta = SEASON_META[clock.season];

  return (
    <header className="topbar hud-panel">
      <div className="brand-block">
        <div className="brand-mark"><Sparkles size={18} /></div>
        <div className="brand-copy">
          <div className="brand-name">AURORA <span>vida em 3d</span></div>
          <label className="household-field">
            <input value={householdName} onChange={(e) => setHouseholdName(e.target.value)} maxLength={32} aria-label="Nome da família" />
            <span>{sims.length} morador{sims.length === 1 ? '' : 'es'}</span>
          </label>
        </div>
      </div>

      <div className="status-strip">
        <div className="status-chip"><span className="chip-icon">{seasonMeta.icon}</span><span><small>{formatDay(clock.day, clock.season)}</small><strong>{formatClock(clock.minutes)}</strong></span></div>
        <div className="status-chip"><span className="chip-icon">{time.icon}</span><span><small>{time.label}</small><strong>{clock.day === 1 ? 'Primeiro dia' : `Dia ${clock.day}`}</strong></span></div>
        <div className="status-chip weather"><span className="chip-icon">{weatherMeta.icon}</span><span><small>Clima</small><strong>{weatherMeta.label}</strong></span></div>
        <div className={`status-chip money ${money < 500 ? 'low' : ''}`}><span className="chip-icon"><Coins size={15} /></span><span><small>Saldo da casa</small><strong>{formatMoney(money)}</strong></span></div>
      </div>

      <div className="top-actions">
        <button className="icon-btn" onClick={() => openCAS(null)} title="Criar morador"><UserPlus size={17} /></button>
        <button className="icon-btn" onClick={() => openModal('showCareers')} title="Carreiras"><Briefcase size={17} /></button>
        <button className="icon-btn" onClick={() => openModal('showAchievements')} title="Conquistas">
          <Trophy size={17} />{achievements.length > 0 && <span className="icon-badge">{achievements.length}</span>}
        </button>
        <button className="icon-btn" onClick={() => openModal('showSaves')} title="Saves"><Save size={17} /></button>
        <button className="icon-btn" onClick={() => setSettings({ sound: !settings.sound })} title={settings.sound ? 'Silenciar' : 'Ativar áudio'}>
          {settings.sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
        <button className="icon-btn" onClick={() => setSettings({ showRoof: !settings.showRoof })} title={settings.showRoof ? 'Esconder telhado' : 'Mostrar telhado'}>
          {settings.showRoof ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
        <button className="icon-btn" onClick={togglePhotoMode} title="Modo foto"><Camera size={17} /></button>
        <button className="icon-btn" onClick={() => openModal('showSettings')} title="Configurações"><Settings size={17} /></button>
        <button className="icon-btn" onClick={() => openModal('showHelp')} title="Ajuda"><CircleHelp size={17} /></button>
      </div>
    </header>
  );
}

function Meter({ label, icon, value, color, low }: {
  label: string; icon: string; value: number; color: string; low?: string;
}) {
  const safe = clamp(value, 0, 100);
  return (
    <div className={`need-row ${safe < 25 ? 'critical' : safe < 45 ? 'low' : ''}`} title={safe < 45 ? low : undefined}>
      <div className="need-label"><span>{icon}</span><strong>{label}</strong><b>{Math.round(safe)}</b></div>
      <div className="meter-track"><div className="meter-fill" style={{ width: `${safe}%`, background: color }} /></div>
    </div>
  );
}

function ActiveSimDetails({ sim, sims }: { sim: Sim; sims: Sim[] }) {
  const cancelActivity = useGameStore((s) => s.cancelActivity);
  const goToWork = useGameStore((s) => s.goToWork);
  const openCAS = useGameStore((s) => s.openCAS);
  const openModal = useGameStore((s) => s.openModal);
  const focusSim = useGameStore((s) => s.focusSim);
  const removeSim = useGameStore((s) => s.removeSim);
  const mood = moodLabel(sim.mood);
  const aspiration = ASPIRATION_BY_ID[sim.aspirationId];
  const aspirationValue = aspiration ? (sim.counters[aspiration.counter] ?? 0) : 0;
  const aspirationPct = aspiration ? clamp((aspirationValue / aspiration.goal) * 100, 0, 100) : 0;
  const career = sim.job ? CAREER_BY_ID[sim.job.careerId] : undefined;
  const activity = sim.activity;
  const activityPct = activity ? clamp((1 - activity.remaining / activity.duration) * 100, 0, 100) : 0;
  const relationships = sims.filter((s) => s.id !== sim.id);

  return (
    <div className="active-sim-details">
      <div className="active-sim-head">
        <SimAvatar sim={sim} size={64} />
        <div className="active-sim-title">
          <h3>{sim.name}</h3>
          <span>{sim.pronoun === 'ela' ? 'Ela' : sim.pronoun === 'ele' ? 'Ele' : 'Elu'} · {sim.traits.length} traço(s)</span>
          <div className="mood-pill" style={{ color: mood.color, borderColor: `${mood.color}55`, background: `${mood.color}18` }}>
            {mood.icon} {mood.label}
          </div>
        </div>
        <div className="sim-head-actions">
          <button className="icon-btn small" onClick={() => focusSim(sim.id)} title="Focar câmera"><Focus size={15} /></button>
          <button className="icon-btn small" onClick={() => openCAS(sim.id)} title="Editar no Criar Sim"><WandSparkles size={15} /></button>
          <button className="icon-btn small danger" disabled={sims.length <= 1} onClick={() => {
            if (window.confirm(`Remover ${sim.name} da família?`)) removeSim(sim.id);
          }} title="Remover morador"><X size={15} /></button>
        </div>
      </div>

      {(activity || sim.pending || sim.atWork) && (
        <div className="activity-card">
          <div className="activity-icon">{activity?.type === 'work' || sim.atWork ? '💼' : sim.pending ? '🚶' : '✨'}</div>
          <div className="activity-copy">
            <strong>{activity?.label ?? (sim.pending ? 'A caminho…' : 'No trabalho')}</strong>
            <span>{sim.pending ? `${Math.max(0, (sim.path?.length ?? 0) - sim.pathIndex)} passos na rota` : activity ? `${Math.ceil(activity.remaining)} min restantes` : 'O expediente segue em andamento'}</span>
            <div className="meter-track slim"><div className="meter-fill" style={{ width: `${activityPct}%`, background: '#8ecbff' }} /></div>
          </div>
          <button className="icon-btn small" onClick={() => cancelActivity(sim.id)} title="Cancelar ação"><X size={14} /></button>
        </div>
      )}

      <section className="panel-section">
        <div className="section-heading"><span><Zap size={15} /> Necessidades</span><small>{Math.round(sim.mood)} humor</small></div>
        <div className="needs-grid">
          {NEED_KEYS.map((key) => {
            const meta = NEEDS_META[key];
            return <Meter key={key} label={meta.label} icon={meta.icon} value={sim.needs[key]} color={meta.color} low={meta.low} />;
          })}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading"><span><Star size={15} /> Habilidades</span><small>nível 1–10</small></div>
        <div className="skills-grid">
          {SKILL_KEYS.map((key) => {
            const meta = SKILL_META[key];
            const level = sim.skills[key] ?? 1;
            return (
              <div key={key} className="skill-chip" title={`${meta.label}: nível ${level}`}>
                <span>{meta.icon}</span>
                <div><small>{meta.label}</small><strong>{level}</strong></div>
                <div className="skill-track"><div style={{ width: `${level * 10}%`, background: meta.color }} /></div>
              </div>
            );
          })}
        </div>
      </section>

      {aspiration && (
        <section className="panel-section aspiration-card">
          <div className="section-heading"><span><Target size={15} /> Aspiração</span><small>{sim.aspirationDone ? 'concluída' : `${Math.min(aspirationValue, aspiration.goal)}/${aspiration.goal}`}</small></div>
          <strong>{aspiration.icon} {aspiration.name}</strong>
          <p>{aspiration.description} · recompensa {formatMoney(aspiration.reward)}</p>
          <div className="meter-track"><div className="meter-fill" style={{ width: `${sim.aspirationDone ? 100 : aspirationPct}%`, background: '#ffcf8a' }} /></div>
        </section>
      )}

      <section className="panel-section career-card">
        <div className="section-heading"><span><Briefcase size={15} /> Carreira</span><small>{career ? `nível ${sim.job?.level}/5` : 'desempregado'}</small></div>
        {career && sim.job ? (
          <>
            <strong>{career.icon} {career.levels[sim.job.level - 1]}</strong>
            <p>{career.name} · {formatClock(sim.job.shiftStart)} às {formatClock(sim.job.shiftEnd)} · desempenho {Math.round(sim.job.performance)}%</p>
            <div className="career-mini-actions">
              <button className="btn btn-ghost small" onClick={() => goToWork(sim.id)} disabled={sim.atWork || !!activity}><Play size={13} /> Ir ao trabalho</button>
              <button className="btn btn-ghost small" onClick={() => openModal('showCareers')}>Ver vagas <ChevronRight size={13} /></button>
            </div>
          </>
        ) : (
          <>
            <strong>Nenhuma carreira ativa</strong>
            <p>Escolha uma trajetória para ganhar salário, habilidades e promoções.</p>
            <button className="btn btn-primary small" onClick={() => openModal('showCareers')}><Briefcase size={14} /> Escolher carreira</button>
          </>
        )}
      </section>

      {relationships.length > 0 && (
        <section className="panel-section">
          <div className="section-heading"><span><Heart size={15} /> Relações</span><small>{relationships.length} morador(es)</small></div>
          <div className="relationship-list">
            {relationships.map((other) => {
              const value = sim.relationships[other.id] ?? 20;
              const label = value >= 65 ? 'Muito próximos' : value >= 30 ? 'Amigáveis' : value >= 0 ? 'Conhecidos' : 'Desavença';
              return (
                <div key={other.id} className="relationship-row">
                  <SimAvatar sim={other} size={28} showMood={false} />
                  <div><strong>{other.name}</strong><small>{label}</small></div>
                  <span className={value < 0 ? 'negative' : ''}>{value >= 0 ? '+' : ''}{Math.round(value)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function SimPanel() {
  const sims = useGameStore((s) => s.sims);
  const activeSimId = useGameStore((s) => s.activeSimId);
  const setActiveSim = useGameStore((s) => s.setActiveSim);
  const openCAS = useGameStore((s) => s.openCAS);
  const activeSim = sims.find((s) => s.id === activeSimId) ?? sims[0];
  return (
    <aside className="hud-panel sim-panel">
      <div className="panel-heading">
        <div><span className="panel-eyebrow"><Users size={13} /> Família</span><h2>Moradores</h2></div>
        <button className="btn btn-ghost small" onClick={() => openCAS(null)} disabled={sims.length >= MAX_SIMS} title={sims.length >= MAX_SIMS ? 'Casa cheia' : 'Criar novo morador'}>
          <Plus size={14} /> Novo
        </button>
      </div>
      <div className="sim-roster">
        {sims.map((sim) => {
          const mood = moodLabel(sim.mood);
          return (
            <button key={sim.id} className={`sim-roster-item ${sim.id === activeSim?.id ? 'active' : ''}`} onClick={() => setActiveSim(sim.id)}>
              <SimAvatar sim={sim} size={42} />
              <div className="roster-copy">
                <strong>{sim.name}</strong>
                <span>{sim.atWork ? '💼 No trabalho' : sim.activity ? sim.activity.label : `${mood.icon} ${mood.label}`}</span>
              </div>
              <ChevronRight size={15} className="roster-arrow" />
            </button>
          );
        })}
      </div>
      {activeSim && <ActiveSimDetails sim={activeSim} sims={sims} />}
    </aside>
  );
}

function InteractionButton({ id, simId, targetId, targetSimId, compact = false }: {
  id: ActivityType; simId: string; targetId?: string; targetSimId?: string; compact?: boolean;
}) {
  const startInteraction = useGameStore((s) => s.startInteraction);
  const sims = useGameStore((s) => s.sims);
  const active = sims.find((s) => s.id === simId);
  const def = INTERACTIONS[id];
  const needsSimTarget = def.target === 'sim';
  const disabled = !active || active.atWork || !!active.activity || (needsSimTarget && !targetSimId);
  const effects = Object.entries(def.effects).filter(([, value]) => (value ?? 0) >= 8).slice(0, 2);
  return (
    <button
      className={`interaction-btn ${compact ? 'compact' : ''}`}
      disabled={disabled}
      title={`${def.description}${def.cost ? ` · Custo ${formatMoney(def.cost)}` : ''}`}
      onClick={() => startInteraction(simId, id, targetId, targetSimId)}
    >
      <span className="interaction-icon">{def.icon}</span>
      <span className="interaction-copy">
        <strong>{def.label}</strong>
        <small>{def.duration} min{def.cost ? ` · ${formatMoney(def.cost)}` : effects.length ? ` · +${effects.map(([key]) => NEEDS_META[key as keyof typeof NEEDS_META].short).join(' / ')}` : ''}</small>
      </span>
      <ChevronRight size={15} />
    </button>
  );
}

function LivePanel() {
  const lot = useGameStore((s) => s.lot);
  const sims = useGameStore((s) => s.sims);
  const activeSimId = useGameStore((s) => s.activeSimId);
  const selectedObjectId = useGameStore((s) => s.selectedObjectId);
  const log = useGameStore((s) => s.ui.log);
  const money = useGameStore((s) => s.money);
  const stats = useGameStore((s) => s.stats);
  const selectObject = useGameStore((s) => s.selectObject);
  const goToWork = useGameStore((s) => s.goToWork);
  const openModal = useGameStore((s) => s.openModal);
  const activeSim = sims.find((s) => s.id === activeSimId);
  const selectedObject = findObject(lot, selectedObjectId);
  const selectedDef = selectedObject ? getDef(selectedObject.defId) : null;
  const other = sims.find((s) => s.id !== activeSimId && !s.atWork && !s.activity);
  const summary = useMemo(() => getLotSummary(lot), [lot]);
  const job = activeSim?.job;
  const career = job ? CAREER_BY_ID[job.careerId] : undefined;

  return (
    <aside className="hud-panel context-panel">
      <div className="panel-heading">
        <div><span className="panel-eyebrow"><Activity size={13} /> Modo Viver</span><h2>{selectedDef ? selectedDef.name : 'Histórias de hoje'}</h2></div>
        <span className="live-badge"><span /> mundo ativo</span>
      </div>

      {selectedDef && selectedObject ? (
        <section className="panel-section object-focus">
          <div className="object-focus-head">
            <span className="object-focus-icon">{selectedDef.icon}</span>
            <div><strong>{selectedDef.name}</strong><small>{selectedDef.category} · {selectedDef.footprint[0]}×{selectedDef.footprint[1]} · {formatMoney(selectedDef.price)}</small></div>
            <button className="icon-btn small" onClick={() => selectObject(null)} title="Desselecionar"><X size={14} /></button>
          </div>
          <p>{selectedDef.description}</p>
          <div className="section-heading"><span><Sparkles size={15} /> Interações disponíveis</span><small>{selectedDef.interactions.length} ações</small></div>
          <div className="interaction-list">
            {selectedDef.interactions.map((id) => (
              <InteractionButton key={id} id={id} simId={activeSimId} targetId={selectedObject.id} compact />
            ))}
          </div>
        </section>
      ) : (
        <section className="panel-section welcome-live">
          <div className="live-tip"><span>✨</span><div><strong>O mundo está vivo</strong><p>Clique em um objeto para ver ações, no chão para caminhar ou escolha uma ação rápida abaixo. Duplo clique executa a primeira interação.</p></div></div>
          <div className="quick-action-grid">
            {QUICK_ACTIONS.map((id) => (
              <InteractionButton
                key={id} id={id} simId={activeSimId} compact
                targetSimId={INTERACTIONS[id].target === 'sim' ? other?.id : undefined}
              />
            ))}
          </div>
        </section>
      )}

      <section className="panel-section career-quick">
        <div className="section-heading"><span><Briefcase size={15} /> Expediente</span><small>{career ? career.name : 'Sem carreira'}</small></div>
        <div className="career-quick-row">
          <div className="career-quick-icon">{career?.icon ?? '💼'}</div>
          <div className="career-quick-copy">
            <strong>{career ? career.levels[(job?.level ?? 1) - 1] : 'Escolha uma profissão'}</strong>
            <span>{career && job ? `${formatClock(job.shiftStart)}–${formatClock(job.shiftEnd)} · ${Math.round(job.performance)}% desempenho` : '7 carreiras com 5 níveis cada'}</span>
          </div>
          <button className="btn btn-primary small" onClick={() => (career ? goToWork(activeSimId) : openModal('showCareers'))} disabled={!!career && (activeSim?.atWork || !!activeSim?.activity)}>
            {career ? <><Play size={13} /> Trabalhar</> : <><Briefcase size={13} /> Vagas</>}
          </button>
        </div>
      </section>

      <section className="panel-section home-summary">
        <div className="section-heading"><span><Home size={15} /> Residência</span><small>{formatMoney(summary.value)} em patrimônio</small></div>
        <div className="home-stats">
          <div><strong>{summary.objects}</strong><span>objetos</span></div>
          <div><strong>{summary.walls}</strong><span>paredes</span></div>
          <div><strong>{summary.rooms}</strong><span>cômodos</span></div>
          <div><strong>{stats.interactions}</strong><span>ações</span></div>
        </div>
        <div className="home-stats-footer"><Coins size={13} /> Saldo {formatMoney(money)} · {stats.meals} refeições · {stats.promotions} promoções</div>
      </section>

      <section className="panel-section diary-section">
        <div className="section-heading"><span><Clock3 size={15} /> Diário da casa</span><small>últimos eventos</small></div>
        <div className="event-log">
          {log.length ? log.slice(0, 7).map((entry, i) => (
            <div key={`${entry}-${i}`} className="event-log-row"><span className="event-dot" /><p>{entry}</p></div>
          )) : <p className="empty-log">As histórias da família aparecerão aqui conforme o tempo passa.</p>}
        </div>
      </section>
    </aside>
  );
}

function WallKindButton({ kind }: { kind: keyof typeof WALL_KIND_META }) {
  const build = useGameStore((s) => s.build);
  const setWallKind = useGameStore((s) => s.setWallKind);
  const meta = WALL_KIND_META[kind];
  const icon = kind === 'door' ? <DoorOpen size={16} /> : kind === 'window' ? <Grid3X3 size={16} /> : kind === 'erase' ? <Trash2 size={16} /> : <span className="wall-glyph">▬</span>;
  return (
    <button className={`style-chip ${build.wallKind === kind && build.tool === 'wall' ? 'selected' : ''}`} onClick={() => setWallKind(kind as 'wall' | 'door' | 'window' | 'erase')}>
      <span className="style-icon">{icon}</span><span><strong>{meta.label}</strong><small>{meta.price ? formatMoney(meta.price) : 'Reembolso'}</small></span>
    </button>
  );
}

function BuildPanel() {
  const lot = useGameStore((s) => s.lot);
  const money = useGameStore((s) => s.money);
  const build = useGameStore((s) => s.build);
  const selectedObjectId = useGameStore((s) => s.selectedObjectId);
  const hoverTile = useGameStore((s) => s.hoverTile);
  const history = useGameStore((s) => s.history);
  const future = useGameStore((s) => s.future);
  const settings = useGameStore((s) => s.settings);
  const setBuildTool = useGameStore((s) => s.setBuildTool);
  const setRotation = useGameStore((s) => s.setRotation);
  const rotatePlacement = useGameStore((s) => s.rotatePlacement);
  const setFloorStyle = useGameStore((s) => s.setFloorStyle);
  const setWallStyle = useGameStore((s) => s.setWallStyle);
  const setBrushSize = useGameStore((s) => s.setBrushSize);
  const selectCatalogItem = useGameStore((s) => s.selectCatalogItem);
  const setObjectColor = useGameStore((s) => s.setObjectColor);
  const duplicateObject = useGameStore((s) => s.duplicateObject);
  const removeObject = useGameStore((s) => s.removeObject);
  const undo = useGameStore((s) => s.undo);
  const redo = useGameStore((s) => s.redo);
  const setSettings = useGameStore((s) => s.setSettings);
  const [category, setCategory] = useState<string>('Todos');
  const [query, setQuery] = useState('');
  const selectedId = selectedObjectId ?? build.selectedObjectId;
  const selectedObject = findObject(lot, selectedId);
  const selectedDef: ObjectDef | null = selectedObject ? getDef(selectedObject.defId) : null;
  const catalogDef = build.selectedDefId ? OBJECT_BY_ID[build.selectedDefId] : null;
  const summary = useMemo(() => getLotSummary(lot), [lot]);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => OBJECTS.filter((def) => {
    const inCategory = category === 'Todos' || def.category === category;
    const matches = !normalizedQuery || `${def.name} ${def.category} ${def.description} ${def.tags.join(' ')}`.toLowerCase().includes(normalizedQuery);
    return inCategory && matches;
  }), [category, normalizedQuery]);

  return (
    <aside className="hud-panel context-panel build-panel">
      <div className="panel-heading">
        <div><span className="panel-eyebrow"><Hammer size={13} /> Modo Construir</span><h2>Estúdio de arquitetura</h2></div>
        <div className="budget-pill"><Coins size={14} /> {formatMoney(money)}</div>
      </div>

      <div className="build-meta">
        <span><Grid3X3 size={13} /> {hoverTile ? `Tile ${hoverTile.x}, ${hoverTile.z}` : 'Passe o mouse no lote'}</span>
        <span><Package size={13} /> {summary.objects} itens</span>
        <span><DoorOpen size={13} /> {summary.walls} paredes</span>
      </div>

      <section className="panel-section build-tool-section">
        <div className="section-heading"><span><MousePointer2 size={15} /> Ferramentas</span><small>clique ou arraste</small></div>
        <div className="build-tool-grid">
          {BUILD_TOOLS.map((tool) => (
            <ToolButton key={tool.id} active={build.tool === tool.id} title={tool.label} hint={tool.hint} icon={tool.icon} onClick={() => setBuildTool(tool.id)} />
          ))}
        </div>
        <div className="build-mini-actions">
          <button className="btn btn-ghost small" onClick={undo} disabled={!history.length}><Undo2 size={14} /> Desfazer</button>
          <button className="btn btn-ghost small" onClick={redo} disabled={!future.length}><Redo2 size={14} /> Refazer</button>
          <button className="btn btn-ghost small" onClick={() => rotatePlacement()}><RotateCw size={14} /> Girar · R</button>
          <button className={`btn ${settings.showRoof ? 'btn-primary' : 'btn-ghost'} small`} onClick={() => setSettings({ showRoof: !settings.showRoof })}><PanelTop size={14} /> Telhado</button>
          <button className={`btn ${settings.showGrid ? 'btn-primary' : 'btn-ghost'} small`} onClick={() => setSettings({ showGrid: !settings.showGrid })}><Grid3X3 size={14} /> Grade</button>
        </div>
      </section>

      {(build.tool === 'floor' || build.tool === 'wall' || build.tool === 'room') && (
        <section className="panel-section style-section">
          <div className="section-heading"><span><Paintbrush size={15} /> Materiais</span><small>preços por tile / segmento</small></div>
          <div className="subheading">Revestimento de piso</div>
          <div className="style-grid compact">
            {FLOOR_ORDER.map((style: FloorStyleId) => {
              const meta = FLOOR_STYLES[style];
              return (
                <button key={style} className={`style-chip ${build.floorStyle === style && build.tool === 'floor' ? 'selected' : ''}`} onClick={() => setFloorStyle(style)}>
                  <span className="style-swatch" style={{ background: meta.color }}>{meta.icon}</span>
                  <span><strong>{meta.label}</strong><small>{meta.price ? formatMoney(meta.price) : 'Grátis'}</small></span>
                </button>
              );
            })}
          </div>
          <div className="subheading">Pincel</div>
          <div className="brush-row">
            {([1, 2, 3] as const).map((size) => (
              <button key={size} className={`pill ${build.brushSize === size ? 'selected' : ''}`} onClick={() => setBrushSize(size)}>{size}×{size}</button>
            ))}
          </div>
          <div className="subheading">Tipo de parede</div>
          <div className="style-grid compact">
            {(Object.keys(WALL_KIND_META) as Array<keyof typeof WALL_KIND_META>).map((kind) => <WallKindButton key={kind} kind={kind} />)}
          </div>
          <div className="subheading">Acabamento</div>
          <div className="style-grid compact">
            {WALL_ORDER.map((style: WallStyleId) => {
              const meta = WALL_STYLES[style];
              return (
                <button key={style} className={`style-chip ${build.wallStyle === style && build.tool === 'wall' ? 'selected' : ''}`} onClick={() => setWallStyle(style)}>
                  <span className="style-swatch" style={{ background: meta.color }}>{meta.icon}</span>
                  <span><strong>{meta.label}</strong><small>{formatMoney(meta.price)}</small></span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {(build.tool === 'place' || build.tool === 'pipette') && (
        <section className="panel-section catalog-section">
          <div className="section-heading"><span><Package size={15} /> Catálogo</span><small>{filtered.length} itens</small></div>
          {catalogDef && (
            <div className="catalog-selection">
              <span>{catalogDef.icon}</span>
              <div><strong>{catalogDef.name}</strong><small>{formatMoney(catalogDef.price)} · {catalogDef.footprint[0]}×{catalogDef.footprint[1]} · rotação {build.rotation * 90}°</small></div>
              <button className="btn btn-ghost small" onClick={() => setRotation(((build.rotation + 1) % 4) as 0 | 1 | 2 | 3)}><RotateCw size={13} /></button>
            </div>
          )}
          <label className="search-field"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar sofá, luz, jardim…" /></label>
          <div className="category-row">
            {['Todos', ...CATEGORY_ORDER].map((name) => (
              <button key={name} className={`pill ${category === name ? 'selected' : ''}`} onClick={() => setCategory(name)}>{name}</button>
            ))}
          </div>
          <div className="catalog-grid">
            {filtered.map((def) => (
              <button key={def.id} className={`catalog-card ${build.selectedDefId === def.id && build.tool === 'place' ? 'selected' : ''} ${money < def.price ? 'unaffordable' : ''}`} onClick={() => selectCatalogItem(def.id)} title={def.description}>
                <span className="catalog-icon">{def.icon}</span>
                <span className="catalog-copy"><strong>{def.name}</strong><small>{def.footprint[0]}×{def.footprint[1]} · {def.category}</small></span>
                <b>{formatMoney(def.price)}</b>
              </button>
            ))}
            {!filtered.length && <div className="catalog-empty"><Search size={20} /><span>Nenhum objeto encontrado.</span></div>}
          </div>
        </section>
      )}

      {selectedObject && selectedDef && (
        <section className="panel-section selection-editor">
          <div className="section-heading"><span><Focus size={15} /> Objeto selecionado</span><small>{selectedDef.category}</small></div>
          <div className="selection-head"><span>{selectedDef.icon}</span><div><strong>{selectedDef.name}</strong><small>tile {selectedObject.x}, {selectedObject.z} · rotação {selectedObject.rotation * 90}°</small></div></div>
          {selectedDef.colors && (
            <>
              <div className="subheading">Cor e acabamento</div>
              <div className="swatch-row small">
                {selectedDef.colors.map((color) => (
                  <button key={color} className={`swatch ${selectedObject.color === color ? 'selected' : ''}`} style={{ background: color }} onClick={() => setObjectColor(selectedObject.id, color)} aria-label={`Cor ${color}`}>
                    {selectedObject.color === color && <Check size={12} color="#10202a" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="selection-actions">
            <button className="btn btn-ghost small" onClick={() => { useGameStore.getState().setBuildTool('move'); useGameStore.getState().selectObject(selectedObject.id); }}><Move size={13} /> Mover</button>
            <button className="btn btn-ghost small" onClick={rotatePlacement}><RotateCw size={13} /> Girar</button>
            <button className="btn btn-ghost small" onClick={() => duplicateObject(selectedObject.id)}><Copy size={13} /> Duplicar</button>
            <button className="btn btn-ghost small danger" onClick={() => removeObject(selectedObject.id)}><Trash2 size={13} /> Vender</button>
          </div>
        </section>
      )}

      <div className="build-help"><Info size={14} /> <span><b>Dica:</b> use Alt + arraste para orbitar sem sair da ferramenta. Paredes e pisos podem ser pintados em sequência; Ctrl+Z desfaz o traço.</span></div>
    </aside>
  );
}

function ContextPanel() {
  const mode = useGameStore((s) => s.mode);
  return mode === 'build' ? <BuildPanel /> : <LivePanel />;
}

function BottomDock() {
  const mode = useGameStore((s) => s.mode);
  const speed = useGameStore((s) => s.speed);
  const cameraPreset = useGameStore((s) => s.ui.cameraPreset);
  const activeSimId = useGameStore((s) => s.activeSimId);
  const setMode = useGameStore((s) => s.setMode);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const togglePause = useGameStore((s) => s.togglePause);
  const setCameraPreset = useGameStore((s) => s.setCameraPreset);
  const focusSim = useGameStore((s) => s.focusSim);
  const togglePhotoMode = useGameStore((s) => s.togglePhotoMode);
  const requestScreenshot = useGameStore((s) => s.requestScreenshot);
  const cameraIndex = Math.max(0, CAMERA_PRESETS.findIndex((preset) => preset.id === cameraPreset));

  return (
    <footer className="bottom-dock hud-panel">
      <div className="dock-group mode-switch">
        <button className={mode === 'live' ? 'active' : ''} onClick={() => setMode('live')}><Users size={16} /> Viver</button>
        <button className={mode === 'build' ? 'active' : ''} onClick={() => setMode('build')}><Hammer size={16} /> Construir</button>
      </div>

      <div className="dock-divider" />

      <div className="dock-group playback">
        <button className="icon-btn play-btn" onClick={togglePause} title="Pausar / retomar · Espaço">
          {speed === 0 ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
        </button>
        {([1, 2, 4] as const).map((value) => (
          <button key={value} className={`speed-btn ${speed === value ? 'active' : ''}`} onClick={() => setSpeed(value)} title={`Velocidade ${value}×`}>
            {value === 4 ? <FastForward size={15} /> : null}{value}×
          </button>
        ))}
        <span className="dock-label"><Clock3 size={13} /> {mode === 'build' ? 'tempo pausado na obra' : speed === 0 ? 'pausado' : 'tempo passando'}</span>
      </div>

      <div className="dock-divider" />

      <div className="dock-group cameras">
        <button className="icon-btn small" onClick={() => setCameraPreset(CAMERA_PRESETS[(cameraIndex + CAMERA_PRESETS.length - 1) % CAMERA_PRESETS.length].id)} title="Câmera anterior"><Maximize2 size={15} /></button>
        {CAMERA_PRESETS.map((preset) => (
          <button key={preset.id} className={`camera-btn ${cameraPreset === preset.id ? 'active' : ''}`} onClick={() => setCameraPreset(preset.id)} title={preset.label}>
            <span>{preset.icon}</span><small>{preset.label}</small>
          </button>
        ))}
        <button className="icon-btn small" onClick={() => setCameraPreset(CAMERA_PRESETS[(cameraIndex + 1) % CAMERA_PRESETS.length].id)} title="Próxima câmera · C"><ChevronRight size={16} /></button>
        <button className="icon-btn small" onClick={() => focusSim(activeSimId)} title="Focar morador · F"><Focus size={15} /></button>
      </div>

      <div className="dock-divider" />

      <div className="dock-group photo-actions">
        <button className="btn btn-ghost small" onClick={togglePhotoMode}><Camera size={14} /> Foto <kbd>P</kbd></button>
        <button className="icon-btn small" onClick={requestScreenshot} title="Baixar captura PNG"><Save size={15} /></button>
      </div>

      <div className="dock-hint"><kbd>B</kbd> modo · <kbd>R</kbd> girar · <kbd>C</kbd> câmera · <kbd>Espaço</kbd> pausa</div>
    </footer>
  );
}

function Toasts() {
  const toasts = useGameStore((s) => s.ui.toasts);
  const dismissToast = useGameStore((s) => s.dismissToast);
  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <span className="toast-icon">{toast.icon}</span>
          <div><strong>{toast.title}</strong><p>{toast.message}</p></div>
          <button className="icon-btn small" onClick={() => dismissToast(toast.id)} aria-label="Fechar aviso"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

function PhotoBar() {
  const cameraPreset = useGameStore((s) => s.ui.cameraPreset);
  const settings = useGameStore((s) => s.settings);
  const setCameraPreset = useGameStore((s) => s.setCameraPreset);
  const setSettings = useGameStore((s) => s.setSettings);
  const togglePhotoMode = useGameStore((s) => s.togglePhotoMode);
  const requestScreenshot = useGameStore((s) => s.requestScreenshot);
  return (
    <div className="photo-bar hud-panel">
      <div className="photo-title"><Camera size={17} /><span><strong>Modo foto</strong><small>Interface oculta · clique em P para sair</small></span></div>
      <div className="photo-presets">
        {CAMERA_PRESETS.map((preset) => (
          <button key={preset.id} className={cameraPreset === preset.id ? 'active' : ''} onClick={() => setCameraPreset(preset.id)} title={preset.label}>{preset.icon}</button>
        ))}
      </div>
      <div className="photo-toggles">
        <button className={settings.showLabels ? 'active' : ''} onClick={() => setSettings({ showLabels: !settings.showLabels })}>Etiquetas</button>
        <button className={settings.showRoof ? 'active' : ''} onClick={() => setSettings({ showRoof: !settings.showRoof })}>Telhado</button>
        <button className={settings.quality === 'high' ? 'active' : ''} onClick={() => setSettings({ quality: settings.quality === 'high' ? 'low' : 'high' })}>Alta qualidade</button>
      </div>
      <button className="btn btn-primary small" onClick={requestScreenshot}><Camera size={14} /> Capturar PNG</button>
      <button className="icon-btn" onClick={togglePhotoMode} title="Sair do modo foto"><X size={17} /></button>
    </div>
  );
}

export default function App() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [worldError, setWorldError] = useState<string | null>(null);
  const showSplash = useGameStore((s) => s.ui.showSplash);
  const photoMode = useGameStore((s) => s.ui.photoMode);

  useEffect(() => {
    const host = viewportRef.current;
    if (!host) return;
    let world: GameWorld | null = null;
    try {
      world = new GameWorld(host);
      setWorldError(null);
    } catch (error) {
      setWorldError(error instanceof Error ? error.message : String(error));
    }
    return () => world?.dispose();
  }, []);

  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || !!target?.isContentEditable;
      const key = event.key.toLowerCase();
      const state = useGameStore.getState();
      const ui = state.ui;
      const anyModal = ui.showCAS || ui.showSaves || ui.showSettings || ui.showHelp || ui.showAchievements || ui.showCareers;

      if (typing) {
        if (key === 'escape') target?.blur();
        return;
      }
      if (key === 'escape') {
        if (anyModal) state.closeModals();
        else if (ui.photoMode) state.togglePhotoMode();
        else if (ui.tutorialStep >= 0) state.setTutorialStep(-1);
        else { state.selectObject(null); if (state.mode === 'build') state.setBuildTool('select'); }
        event.preventDefault();
        return;
      }
      if (ui.showSplash || anyModal) return;

      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) state.redo(); else state.undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === 'y') { event.preventDefault(); state.redo(); return; }
      if ((event.ctrlKey || event.metaKey) && key === 's') { event.preventDefault(); state.openModal('showSaves'); return; }

      if (event.code === 'Space') { event.preventDefault(); state.togglePause(); return; }
      if (key === '1') { state.setSpeed(1); return; }
      if (key === '2') { state.setSpeed(2); return; }
      if (key === '3') { state.setSpeed(4); return; }
      if (key === 'b') { state.setMode(state.mode === 'live' ? 'build' : 'live'); return; }
      if (key === 'r') { state.rotatePlacement(); return; }
      if (key === 'delete' || key === 'backspace') {
        const id = state.selectedObjectId ?? state.build.selectedObjectId;
        if (state.mode === 'build' && id) { event.preventDefault(); state.removeObject(id); }
        return;
      }
      if (key === 'p') { state.togglePhotoMode(); return; }
      if (key === 'f') { state.focusSim(state.activeSimId); return; }
      if (key === 'c') {
        const index = CAMERA_PRESETS.findIndex((preset) => preset.id === ui.cameraPreset);
        state.setCameraPreset(CAMERA_PRESETS[(index + 1) % CAMERA_PRESETS.length].id);
        return;
      }
      if (key === 'h' || key === '?') { state.openModal('showHelp'); return; }
      if (key === 't') { state.openModal('showAchievements'); return; }
      if (key === 'm') { state.openModal('showCareers'); return; }
      if (key === 'q') { state.openCAS(null); return; }
      if (key === 'g') { state.setSettings({ showGrid: !state.settings.showGrid }); return; }
      if (key === 'o') { state.setSettings({ showRoof: !state.settings.showRoof }); return; }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const hudVisible = !showSplash && !photoMode;

  return (
    <div className={`app-shell ${photoMode ? 'photo-active' : ''}`}>
      <div className="viewport" ref={viewportRef} aria-label="Mundo 3D de Aurora" />

      {worldError && (
        <div className="webgl-error">
          <div className="webgl-error-card">
            <span>⚠️</span>
            <h2>Não foi possível iniciar o WebGL</h2>
            <p>{worldError}</p>
            <small>Ative a aceleração de hardware no navegador ou tente uma janela menor. Seus saves continuam guardados neste dispositivo.</small>
            <button className="btn btn-primary" onClick={() => window.location.reload()}><RotateCw size={16} /> Tentar novamente</button>
          </div>
        </div>
      )}

      {hudVisible && (
        <div className="hud-layer">
          <Topbar />
          <div className="hud-columns"><SimPanel /><ContextPanel /></div>
          <BottomDock />
          <Toasts />
        </div>
      )}
      {photoMode && !showSplash && <PhotoBar />}

      <Tutorial />
      <Modals />
      <Splash />
    </div>
  );
}
