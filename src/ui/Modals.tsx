import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  Award, Briefcase, Camera, Check, ChevronRight, Circle, Clock, Coins, Download, Grid3X3,
  Hammer, Heart, HelpCircle, Info, Maximize2, MousePointer2, PanelTop, Play, RefreshCw,
  RotateCcw, Save, Settings as SettingsIcon, SlidersHorizontal, Sparkles, Star, Sun, Target,
  Timer, Trophy, Upload, UserPlus, Users, Volume2, VolumeX, WandSparkles, X,
} from 'lucide-react';
import {
  ASPIRATIONS, ASPIRATION_BY_ID, CAREERS, CAREER_BY_ID, ACHIEVEMENTS, HAIR_STYLES,
  HAIR_COLORS, SKIN_TONES, EYE_COLORS, OUTFIT_COLORS, TRAITS,
} from '../game/data';
import { MAX_SIMS, SKILL_META, formatClock, formatMoney } from '../game/constants';
import { cloneAppearance } from '../game/lot';
import { getAutosaveInfo, getSlots, DEFAULT_SETTINGS, useGameStore, type CASPayload } from '../game/store';
import type { Appearance, SaveSlot, Settings, Sim } from '../game/types';
import { SimPreview } from './SimPreview';

interface ModalProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  onClose: () => void;
  children: ReactNode;
}

function Modal({ title, subtitle, icon, size = 'md', onClose, children }: ModalProps) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <div className="modal-title-wrap">
            {icon && <span className="modal-icon">{icon}</span>}
            <div>
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, description, icon }: {
  checked: boolean; onChange: (value: boolean) => void; label: string; description?: string; icon?: ReactNode;
}) {
  return (
    <button type="button" className={`toggle-row ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      <span className="toggle-icon">{icon}</span>
      <span className="toggle-text"><strong>{label}</strong>{description && <small>{description}</small>}</span>
      <span className="switch"><span /></span>
    </button>
  );
}

function Swatches({ label, colors, value, onChange }: {
  label: string; colors: string[]; value: string; onChange: (color: string) => void;
}) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="swatch-row">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className={`swatch ${value === color ? 'selected' : ''}`}
            style={{ background: color }}
            onClick={() => onChange(color)}
            aria-label={`${label}: ${color}`}
          >
            {value === color && <Check size={13} color="#10202a" strokeWidth={3} />}
          </button>
        ))}
      </div>
    </div>
  );
}

function makeCASForm(sim?: Sim): CASPayload {
  return {
    id: sim?.id,
    name: sim?.name ?? '',
    pronoun: sim?.pronoun ?? 'elu',
    appearance: cloneAppearance(sim?.appearance),
    traits: sim?.traits?.slice(0, 3) ?? ['creative', 'active'],
    aspirationId: sim?.aspirationId ?? ASPIRATIONS[0].id,
  };
}

function CASModal() {
  const targetId = useGameStore((s) => s.ui.casTargetId);
  const sims = useGameStore((s) => s.sims);
  const saveCAS = useGameStore((s) => s.saveCAS);
  const closeModals = useGameStore((s) => s.closeModals);
  const [form, setForm] = useState<CASPayload>(() => makeCASForm(sims.find((s) => s.id === targetId)));

  useEffect(() => {
    const current = useGameStore.getState().sims.find((s) => s.id === targetId);
    setForm(makeCASForm(current));
  }, [targetId]);

  const setAppearance = (patch: Partial<Appearance>) => {
    setForm((f) => ({ ...f, appearance: { ...f.appearance, ...patch } }));
  };
  const toggleTrait = (id: string) => {
    setForm((f) => {
      const has = f.traits.includes(id);
      const traits = has ? f.traits.filter((t) => t !== id) : [...f.traits, id].slice(-3);
      return { ...f, traits };
    });
  };
  const editing = !!form.id;
  const atLimit = !editing && sims.length >= MAX_SIMS;

  return (
    <Modal
      title={editing ? 'Editar morador' : 'Criar morador'}
      subtitle="Personalize aparência, traços e aspiração com pré-visualização 3D."
      icon={<WandSparkles size={20} />}
      size="lg"
      onClose={closeModals}
    >
      <div className="cas-layout">
        <div className="cas-form">
          <section className="modal-section">
            <div className="section-title"><UserPlus size={16} /> Identidade</div>
            <div className="form-grid two">
              <div className="form-group">
                <label>Nome</label>
                <input className="input" value={form.name} maxLength={24} placeholder="Ex.: Marina Alves" onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Pronome</label>
                <select className="select" value={form.pronoun} onChange={(e) => setForm((f) => ({ ...f, pronoun: e.target.value as CASPayload['pronoun'] }))}>
                  <option value="ela">Ela</option><option value="ele">Ele</option><option value="elu">Elu</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Aspiração</label>
              <select className="select" value={form.aspirationId} onChange={(e) => setForm((f) => ({ ...f, aspirationId: e.target.value }))}>
                {ASPIRATIONS.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name} — {a.description}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Traços <small>(até 3)</small></label>
              <div className="trait-grid">
                {TRAITS.map((trait) => (
                  <button key={trait.id} type="button" className={`trait-chip ${form.traits.includes(trait.id) ? 'selected' : ''}`} onClick={() => toggleTrait(trait.id)} title={trait.description}>
                    <span>{trait.icon}</span>{trait.name}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="modal-section">
            <div className="section-title"><Sparkles size={16} /> Aparência</div>
            <div className="form-group">
              <label>Penteado</label>
              <div className="pill-row">
                {HAIR_STYLES.map((style) => (
                  <button key={style.id} type="button" className={`pill ${form.appearance.hairStyle === style.id ? 'selected' : ''}`} onClick={() => setAppearance({ hairStyle: style.id })}>{style.label}</button>
                ))}
              </div>
            </div>
            <Swatches label="Tom de pele" colors={SKIN_TONES} value={form.appearance.skin} onChange={(skin) => setAppearance({ skin })} />
            <Swatches label="Cabelo" colors={HAIR_COLORS} value={form.appearance.hair} onChange={(hair) => setAppearance({ hair })} />
            <Swatches label="Olhos" colors={EYE_COLORS} value={form.appearance.eyes} onChange={(eyes) => setAppearance({ eyes })} />
            <Swatches label="Camisa" colors={OUTFIT_COLORS} value={form.appearance.top} onChange={(top) => setAppearance({ top })} />
            <Swatches label="Calça / saia" colors={OUTFIT_COLORS} value={form.appearance.bottom} onChange={(bottom) => setAppearance({ bottom })} />
            <Swatches label="Calçados" colors={OUTFIT_COLORS} value={form.appearance.shoes} onChange={(shoes) => setAppearance({ shoes })} />
            <div className="form-grid two">
              <div className="form-group">
                <label>Altura <b>{form.appearance.height.toFixed(2)}×</b></label>
                <input className="range" type="range" min="0.9" max="1.1" step="0.01" value={form.appearance.height} onChange={(e) => setAppearance({ height: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>Compleição <b>{form.appearance.build.toFixed(2)}×</b></label>
                <input className="range" type="range" min="0.88" max="1.14" step="0.01" value={form.appearance.build} onChange={(e) => setAppearance({ build: Number(e.target.value) })} />
              </div>
            </div>
            <div className="pill-row">
              <button type="button" className={`pill ${form.appearance.freckles ? 'selected' : ''}`} onClick={() => setAppearance({ freckles: !form.appearance.freckles })}>Sardas</button>
              <button type="button" className={`pill ${form.appearance.glasses ? 'selected' : ''}`} onClick={() => setAppearance({ glasses: !form.appearance.glasses })}>Óculos</button>
            </div>
          </section>
        </div>

        <aside className="cas-preview">
          <div className="preview-badge"><Sparkles size={14} /> Pré-visualização 3D</div>
          <SimPreview appearance={form.appearance} />
          <div className="preview-summary">
            <strong>{form.name || 'Novo morador'}</strong>
            <span>{ASPIRATION_BY_ID[form.aspirationId]?.name ?? 'Aspiração'} · {form.traits.length} traço(s)</span>
          </div>
          <div className="cas-actions">
            <button className="btn btn-ghost" onClick={closeModals}>Cancelar</button>
            <button
              className="btn btn-primary"
              disabled={!form.name.trim() || !form.traits.length || atLimit}
              onClick={() => saveCAS({ ...form, name: form.name.trim() })}
            >
              <Check size={16} /> {editing ? 'Salvar alterações' : atLimit ? 'Casa cheia' : 'Adicionar à família'}
            </button>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

function SaveModal() {
  const saveToSlot = useGameStore((s) => s.saveToSlot);
  const loadFromSlot = useGameStore((s) => s.loadFromSlot);
  const deleteSlot = useGameStore((s) => s.deleteSlot);
  const downloadSave = useGameStore((s) => s.downloadSave);
  const importSave = useGameStore((s) => s.importSave);
  const continueGame = useGameStore((s) => s.continueGame);
  const newGame = useGameStore((s) => s.newGame);
  const closeModals = useGameStore((s) => s.closeModals);
  const [slots, setSlots] = useState<Array<SaveSlot | null>>(() => getSlots());
  const [autosave, setAutosave] = useState(() => getAutosaveInfo());
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => { setSlots(getSlots()); setAutosave(getAutosaveInfo()); };
  useEffect(() => { refresh(); }, []);
  const date = (timestamp: number) => new Date(timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    importSave(text);
    event.target.value = '';
    refresh();
  };

  return (
    <Modal title="Saves" subtitle="Três slots locais, autosave e exportação em JSON." icon={<Save size={20} />} size="md" onClose={closeModals}>
      {autosave && (
        <div className="autosave-card">
          <div className="autosave-icon"><RefreshCw size={18} /></div>
          <div className="autosave-info">
            <strong>Autosave · {autosave.householdName}</strong>
            <span>Dia {autosave.day} · {autosave.simCount} moradores · {formatMoney(autosave.money)} · {date(autosave.timestamp)}</span>
          </div>
          <button className="btn btn-primary small" onClick={() => { continueGame(); closeModals(); }}><Play size={14} /> Continuar</button>
        </div>
      )}
      <div className="slot-grid">
        {slots.map((slot, index) => (
          <div key={index} className={`slot-card ${slot ? 'filled' : ''}`}>
            <div className="slot-number">0{index + 1}</div>
            <div className="slot-info">
              {slot ? (
                <>
                  <strong>{slot.label}</strong>
                  <span>Dia {slot.day} · {slot.simCount} moradores · {formatMoney(slot.money)}</span>
                  <small>{date(slot.timestamp)}</small>
                </>
              ) : (
                <><strong>Slot vazio</strong><span>Pronto para um novo registro.</span></>
              )}
            </div>
            <div className="slot-actions">
              <button className="icon-btn small" title="Salvar aqui" onClick={() => { saveToSlot(index); refresh(); }}><Save size={15} /></button>
              <button className="icon-btn small" title="Carregar" disabled={!slot} onClick={() => { loadFromSlot(index); closeModals(); }}><Play size={15} /></button>
              <button className="icon-btn small danger" title="Apagar" disabled={!slot} onClick={() => { deleteSlot(index); refresh(); }}><X size={15} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="modal-actions wrap">
        <button className="btn btn-ghost" onClick={downloadSave}><Download size={16} /> Exportar JSON</button>
        <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}><Upload size={16} /> Importar JSON</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
        <button className="btn btn-ghost" onClick={refresh}><RefreshCw size={16} /> Atualizar</button>
        <button
          className="btn btn-ghost danger"
          onClick={() => {
            if (window.confirm('Começar um novo jogo? O progresso atual será substituído.')) { newGame(); closeModals(); }
          }}
        >
          <RotateCcw size={16} /> Novo jogo
        </button>
      </div>
    </Modal>
  );
}

function SettingsModal() {
  const settings = useGameStore((s) => s.settings);
  const setSettings = useGameStore((s) => s.setSettings);
  const setCameraPreset = useGameStore((s) => s.setCameraPreset);
  const setTutorialStep = useGameStore((s) => s.setTutorialStep);
  const closeModals = useGameStore((s) => s.closeModals);
  return (
    <Modal title="Configurações" subtitle="Ajuste visual, áudio, automação e relógio." icon={<SettingsIcon size={20} />} size="md" onClose={closeModals}>
      <div className="settings-grid">
        <Toggle checked={settings.sound} onChange={(sound) => setSettings({ sound })} label="Áudio ambiente" description="Música suave, chuva, pássaros e efeitos de interface." icon={settings.sound ? <Volume2 size={17} /> : <VolumeX size={17} />} />
        <Toggle checked={settings.shadows} onChange={(shadows) => setSettings({ shadows })} label="Sombras dinâmicas" description="Sombras suaves acompanham o sol do dia." icon={<Sun size={17} />} />
        <Toggle checked={settings.showGrid} onChange={(showGrid) => setSettings({ showGrid })} label="Grade de construção" description="Mostra o grid no modo Construir." icon={<Grid3X3 size={17} />} />
        <Toggle checked={settings.showRoof} onChange={(showRoof) => setSettings({ showRoof })} label="Mostrar telhado" description="Alterna a cobertura moderna da casa." icon={<PanelTop size={17} />} />
        <Toggle checked={settings.showLabels} onChange={(showLabels) => setSettings({ showLabels })} label="Etiquetas dos moradores" description="Nomes, humor e atividade acima dos Sims." icon={<Users size={17} />} />
        <Toggle checked={settings.autosave} onChange={(autosave) => setSettings({ autosave })} label="Autosave" description="Grava automaticamente a cada minuto." icon={<Save size={17} />} />
      </div>
      <div className="form-grid two settings-controls">
        <div className="form-group">
          <label>Qualidade gráfica</label>
          <select className="select" value={settings.quality} onChange={(e) => setSettings({ quality: e.target.value as Settings['quality'] })}>
            <option value="high">Alta · bloom + SMAA + sombras 2K</option>
            <option value="low">Desempenho · render direto</option>
          </select>
        </div>
        <div className="form-group">
          <label><Timer size={14} /> Velocidade do relógio <b>{settings.minutesPerSecond} min/s</b></label>
          <input className="range" type="range" min="1" max="6" step="0.5" value={settings.minutesPerSecond} onChange={(e) => setSettings({ minutesPerSecond: Number(e.target.value) })} />
          <small className="hint">Em 4× o dia passa ainda mais rápido.</small>
        </div>
      </div>
      <div className="modal-actions wrap">
        <button className="btn btn-ghost" onClick={() => setCameraPreset('overview')}><Maximize2 size={16} /> Resetar câmera</button>
        <button className="btn btn-ghost" onClick={() => { setTutorialStep(0); closeModals(); }}><HelpCircle size={16} /> Reabrir tutorial</button>
        <button className="btn btn-ghost" onClick={() => setSettings(DEFAULT_SETTINGS)}><SlidersHorizontal size={16} /> Padrões</button>
      </div>
    </Modal>
  );
}

const SHORTCUTS: Array<[string, string]> = [
  ['Espaço', 'Pausar / retomar'], ['1 · 2 · 3', 'Velocidade 1× · 2× · 4×'], ['B', 'Alternar Viver / Construir'],
  ['R', 'Girar objeto ou pré-visualização'], ['Del', 'Remover objeto selecionado'], ['Ctrl+Z / Ctrl+Y', 'Desfazer / refazer'],
  ['P', 'Modo foto'], ['C', 'Próxima câmera'], ['F', 'Focar morador ativo'], ['Esc', 'Fechar painéis / deselecionar'],
];

function HelpModal() {
  const closeModals = useGameStore((s) => s.closeModals);
  const setTutorialStep = useGameStore((s) => s.setTutorialStep);
  return (
    <Modal title="Como jogar Aurora" subtitle="Um resumo completo dos controles e sistemas." icon={<HelpCircle size={20} />} size="lg" onClose={closeModals}>
      <div className="help-grid">
        <section className="modal-section">
          <div className="section-title"><MousePointer2 size={16} /> Controles</div>
          <p className="help-text">No modo <b>Viver</b>, arraste com o botão esquerdo para orbitar, botão direito para pan e a roda para zoom. Clique no chão para mover o morador ativo; clique em um objeto para ver interações; duplo clique executa a primeira ação.</p>
          <p className="help-text">No modo <b>Construir</b>, o botão esquerdo usa a ferramenta ativa. Use <kbd>Alt</kbd> + arraste para orbitar sem sair da ferramenta, ou botão do meio/direito para câmera.</p>
          <div className="shortcut-list">
            {SHORTCUTS.map(([keys, label]) => <div key={keys} className="shortcut-row"><kbd>{keys}</kbd><span>{label}</span></div>)}
          </div>
        </section>
        <section className="modal-section">
          <div className="section-title"><Sparkles size={16} /> Sistemas</div>
          <div className="feature-list">
            <div><Users size={18} /><span><b>Vida autônoma</b><small>Necessidades, humor, IA, caminhos com portas, trabalho, habilidades, relacionamentos e aspirações.</small></span></div>
            <div><Hammer size={18} /><span><b>Construção</b><small>Objetos, rotação, pisos, paredes, portas, janelas, cômodos, undo/redo e orçamento.</small></span></div>
            <div><Sun size={18} /><span><b>Mundo dinâmico</b><small>Ciclo dia/noite, estações, clima, chuva, tempestade, piscina animada e iluminação interna.</small></span></div>
            <div><Coins size={18} /><span><b>Economia</b><small>Salários, promoções, custos de materiais, revenda, contas e recompensas.</small></span></div>
            <div><Camera size={18} /><span><b>Modo foto</b><small>Esconda a interface, escolha ângulos e exporte PNG.</small></span></div>
            <div><Save size={18} /><span><b>Saves</b><small>Autosave, três slots e importação/exportação JSON.</small></span></div>
          </div>
        </section>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={closeModals}>Entendi</button>
        <button className="btn btn-primary" onClick={() => { setTutorialStep(0); closeModals(); }}><Sparkles size={16} /> Mostrar tutorial na tela</button>
      </div>
    </Modal>
  );
}

function AchievementsModal() {
  const achievements = useGameStore((s) => s.achievements);
  const stats = useGameStore((s) => s.stats);
  const clock = useGameStore((s) => s.clock);
  const money = useGameStore((s) => s.money);
  const closeModals = useGameStore((s) => s.closeModals);
  return (
    <Modal title="Conquistas" subtitle={`${achievements.length} de ${ACHIEVEMENTS.length} desbloqueadas`} icon={<Trophy size={20} />} size="lg" onClose={closeModals}>
      <div className="stat-grid">
        <div><span>Dias jogados</span><strong>{clock.day}</strong></div>
        <div><span>Interações</span><strong>{stats.interactions}</strong></div>
        <div><span>Objetos colocados</span><strong>{stats.objectsPlaced}</strong></div>
        <div><span>Paredes construídas</span><strong>{stats.wallsPlaced}</strong></div>
        <div><span>Promoções</span><strong>{stats.promotions}</strong></div>
        <div><span>Saldo</span><strong>{formatMoney(money)}</strong></div>
      </div>
      <div className="achievement-grid">
        {ACHIEVEMENTS.map((achievement) => {
          const unlocked = achievements.includes(achievement.id);
          return (
            <div key={achievement.id} className={`achievement-card ${unlocked ? 'unlocked' : ''}`}>
              <div className="achievement-icon">{unlocked ? achievement.icon : <Circle size={18} />}</div>
              <div><strong>{achievement.name}</strong><small>{achievement.description}</small></div>
              {unlocked ? <Check size={18} className="check" /> : <Target size={16} className="muted" />}
            </div>
          );
        })}
      </div>
      <div className="modal-actions"><button className="btn btn-primary" onClick={closeModals}><Award size={16} /> Continuar</button></div>
    </Modal>
  );
}

function CareersModal() {
  const sims = useGameStore((s) => s.sims);
  const activeSimId = useGameStore((s) => s.activeSimId);
  const assignJob = useGameStore((s) => s.assignJob);
  const quitJob = useGameStore((s) => s.quitJob);
  const closeModals = useGameStore((s) => s.closeModals);
  const sim = sims.find((s) => s.id === activeSimId) ?? sims[0];
  const current = sim?.job ? CAREER_BY_ID[sim.job.careerId] : undefined;
  if (!sim) return null;
  return (
    <Modal title="Carreiras" subtitle={`Escolha a trajetória profissional de ${sim.name}.`} icon={<Briefcase size={20} />} size="lg" onClose={closeModals}>
      {current && (
        <div className="current-job">
          <div className="current-job-icon">{current.icon}</div>
          <div>
            <strong>{current.name} · nível {sim.job?.level}</strong>
            <span>{current.levels[(sim.job?.level ?? 1) - 1]} · {formatClock(sim.job!.shiftStart)} às {formatClock(sim.job!.shiftEnd)} · desempenho {Math.round(sim.job!.performance)}%</span>
          </div>
          <button className="btn btn-ghost danger small" onClick={() => quitJob(sim.id)}><X size={14} /> Pedir demissão</button>
        </div>
      )}
      <div className="career-grid">
        {CAREERS.map((career) => {
          const active = sim.job?.careerId === career.id;
          const skill = SKILL_META[career.skill];
          return (
            <div key={career.id} className={`career-card ${active ? 'active' : ''}`}>
              <div className="career-head"><span className="career-icon">{career.icon}</span><div><strong>{career.name}</strong><small>{career.description}</small></div></div>
              <div className="career-meta">
                <span><Coins size={14} /> a partir de {formatMoney(career.baseSalary)}</span>
                <span><Star size={14} /> {skill.icon} {skill.label}</span>
                <span><Clock size={14} /> {formatClock(career.shiftStart)}–{formatClock(career.shiftEnd)}</span>
              </div>
              <div className="career-levels">{career.levels.map((level, i) => <span key={level} className={i === 0 ? 'first' : ''}>{i + 1}. {level}</span>)}</div>
              <button className={`btn ${active ? 'btn-ghost' : 'btn-primary'} small full`} disabled={active} onClick={() => { assignJob(sim.id, career.id); closeModals(); }}>
                {active ? <><Check size={14} /> Carreira atual</> : <><ChevronRight size={14} /> Contratar</>}
              </button>
            </div>
          );
        })}
      </div>
      <p className="hint center"><Info size={14} /> Trabalhar rende salário, desempenho e promoções conforme humor e habilidades. O morador pode ir automaticamente no horário do turno ou pelo botão “Ir ao trabalho”.</p>
    </Modal>
  );
}

export function Modals() {
  const showCAS = useGameStore((s) => s.ui.showCAS);
  const showSaves = useGameStore((s) => s.ui.showSaves);
  const showSettings = useGameStore((s) => s.ui.showSettings);
  const showHelp = useGameStore((s) => s.ui.showHelp);
  const showAchievements = useGameStore((s) => s.ui.showAchievements);
  const showCareers = useGameStore((s) => s.ui.showCareers);
  return (
    <>
      {showCAS && <CASModal />}
      {showSaves && <SaveModal />}
      {showSettings && <SettingsModal />}
      {showHelp && <HelpModal />}
      {showAchievements && <AchievementsModal />}
      {showCareers && <CareersModal />}
    </>
  );
}
