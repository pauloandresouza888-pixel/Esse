import { useEffect, useState } from 'react';
import {
  Award, Box, Briefcase, Check, CloudSun, Hammer, Heart, House, Map, Play, Save,
  Sparkles, Sun, Users, WandSparkles,
} from 'lucide-react';
import hero from '../assets/hero.jpg';
import { getAutosaveInfo, useGameStore } from '../game/store';
import { formatMoney, formatClock } from '../game/constants';

export function Splash() {
  const showSplash = useGameStore((s) => s.ui.showSplash);
  const continueGame = useGameStore((s) => s.continueGame);
  const newGame = useGameStore((s) => s.newGame);
  const openModal = useGameStore((s) => s.openModal);
  const setTutorialStep = useGameStore((s) => s.setTutorialStep);
  const [autosave, setAutosave] = useState(() => getAutosaveInfo());

  useEffect(() => { if (showSplash) setAutosave(getAutosaveInfo()); }, [showSplash]);
  if (!showSplash) return null;

  const startNew = () => { newGame(); setTutorialStep(0); };

  return (
    <div className="splash">
      <div className="splash-image" style={{ backgroundImage: `url(${hero})` }} />
      <div className="splash-veil" />
      <div className="splash-noise" />
      <header className="splash-top">
        <div className="splash-logo"><span className="logo-mark"><Sparkles size={18} /></span><span>AURORA</span></div>
        <div className="splash-tag">VIDA EM 3D · simulação contemporânea</div>
      </header>

      <main className="splash-content">
        <div className="splash-copy">
          <div className="eyebrow"><span /> Seu novo mundo começa aqui</div>
          <h1>Uma casa.<br /><em>Histórias sem fim.</em></h1>
          <p>Crie moradores, desenhe cada ambiente e acompanhe uma vida que continua — com autonomia, clima, carreiras, relacionamentos e luz que muda com o dia.</p>
          <div className="splash-actions">
            {autosave && (
              <button className="btn btn-primary hero-btn" onClick={continueGame}>
                <Play size={18} fill="currentColor" /> Continuar dia {autosave.day}
              </button>
            )}
            <button className={`btn ${autosave ? 'btn-glass' : 'btn-primary hero-btn'}`} onClick={startNew}>
              <Sparkles size={18} /> {autosave ? 'Nova história' : 'Começar nova história'}
            </button>
            <button className="btn btn-glass" onClick={() => openModal('showSaves')}><Save size={17} /> Carregar save</button>
          </div>
          {autosave && (
            <div className="autosave-note">
              <Check size={14} /> Autosave disponível · {autosave.householdName} · {autosave.simCount} moradores · {formatMoney(autosave.money)} · {formatClock(autosave.minute)}
            </div>
          )}
        </div>

        <div className="splash-feature-card">
          <div className="feature-card-head"><span><House size={16} /> Residência Alves</span><b>PRONTA PARA MORAR</b></div>
          <div className="feature-card-stats">
            <div><strong>3</strong><span>moradores</span></div>
            <div><strong>6</strong><span>ambientes</span></div>
            <div><strong>22²</strong><span>terreno</span></div>
          </div>
          <div className="feature-card-list">
            <div><Users size={16} /><span>IA autônoma, necessidades, humor e ambições</span></div>
            <div><Hammer size={16} /><span>Construção com pisos, paredes e objetos PBR</span></div>
            <div><CloudSun size={16} /><span>Ciclo solar, estações, chuva e tempestades</span></div>
            <div><Briefcase size={16} /><span>8 carreiras, habilidades, promoções e economia</span></div>
            <div><WandSparkles size={16} /><span>Criar Sim com preview 3D e traços</span></div>
            <div><Save size={16} /><span>Autosave, slots e exportação de mundos</span></div>
          </div>
          <div className="feature-card-foot"><span><Box size={14} /> WebGL · materiais procedurais</span><span><Award size={14} /> 18 conquistas</span></div>
        </div>
      </main>

      <footer className="splash-bottom">
        <div className="splash-chips">
          <span><Sun size={14} /> Iluminação dinâmica</span>
          <span><Heart size={14} /> Relacionamentos</span>
          <span><Map size={14} /> Pathfinding</span>
          <span><Sparkles size={14} /> Texturas PBR</span>
        </div>
        <small>Feito para o navegador · seu progresso fica neste dispositivo</small>
      </footer>
    </div>
  );
}
