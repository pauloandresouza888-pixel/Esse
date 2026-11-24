import { ArrowLeft, ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { useGameStore } from '../game/store';

interface Step {
  title: string;
  body: string;
  icon: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    title: 'Bem-vindo(a) à Aurora',
    body: 'Você está em uma casa contemporânea com três moradores. O mundo já está vivo: necessidades, horários, clima e relacionamentos seguem avançando.',
    icon: '✨', accent: '#ffcf8a',
  },
  {
    title: 'Controle o tempo',
    body: 'Use a barra inferior para pausar, acelerar ou observar. Atalhos: Espaço pausa; 1, 2 e 3 alternam velocidades.',
    icon: '⏱️', accent: '#8ecbff',
  },
  {
    title: 'Viva cada história',
    body: 'Selecione um morador, clique em um objeto e escolha uma interação. Duplo clique executa a primeira ação. Clique no chão para caminhar até lá.',
    icon: '💬', accent: '#a8e6a3',
  },
  {
    title: 'Construa e decore',
    body: 'Tecle B ou use o botão de modo. Escolha objetos no catálogo, pinte pisos, levante paredes, crie cômodos e use R para girar.',
    icon: '🔨', accent: '#f6b26b',
  },
  {
    title: 'Cuide da carreira',
    body: 'Interaja com o computador para trabalhar ou abrir vagas. Humor e habilidades influenciam salário, desempenho e promoções.',
    icon: '💼', accent: '#c8b6ff',
  },
  {
    title: 'A casa é sua',
    body: 'Salve em slots, crie novos moradores, capture fotos, explore conquistas e deixe as estações transformarem o bairro. Divirta-se!',
    icon: '🏡', accent: '#ff9f9f',
  },
];

export function Tutorial() {
  const step = useGameStore((s) => s.ui.tutorialStep);
  const showSplash = useGameStore((s) => s.ui.showSplash);
  const photoMode = useGameStore((s) => s.ui.photoMode);
  const modalOpen = useGameStore((s) => (
    s.ui.showCAS || s.ui.showSaves || s.ui.showSettings || s.ui.showHelp
    || s.ui.showAchievements || s.ui.showCareers
  ));
  const setTutorialStep = useGameStore((s) => s.setTutorialStep);
  const closeModals = useGameStore((s) => s.closeModals);
  if (showSplash || photoMode || modalOpen || step < 0 || step >= STEPS.length) return null;
  const item = STEPS[step];
  return (
    <div className="tutorial-overlay">
      <div className="tutorial-card" style={{ ['--tutorial-accent' as string]: item.accent }}>
        <button className="icon-btn small tutorial-close" onClick={() => setTutorialStep(-1)} aria-label="Fechar tutorial"><X size={15} /></button>
        <div className="tutorial-progress">
          {STEPS.map((_, i) => <span key={i} className={i === step ? 'active' : i < step ? 'done' : ''} />)}
        </div>
        <div className="tutorial-icon">{item.icon}</div>
        <div className="tutorial-count">PASSO {step + 1} DE {STEPS.length}</div>
        <h2>{item.title}</h2>
        <p>{item.body}</p>
        <div className="tutorial-actions">
          {step > 0 && <button className="btn btn-ghost small" onClick={() => setTutorialStep(step - 1)}><ArrowLeft size={15} /> Voltar</button>}
          <button className="btn btn-primary small" onClick={() => {
            if (step === STEPS.length - 1) { setTutorialStep(-1); closeModals(); }
            else setTutorialStep(step + 1);
          }}>
            {step === STEPS.length - 1 ? <><Check size={15} /> Começar a jogar</> : <>Próximo <ArrowRight size={15} /></>}
          </button>
        </div>
        <div className="tutorial-brand"><Sparkles size={12} /> AURORA · VIDA EM 3D</div>
      </div>
    </div>
  );
}
