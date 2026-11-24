import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/base.css';
import './styles/game-ui.css';
import './styles/overlays.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

createRoot(root).render(<App />);
