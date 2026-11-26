import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initI18n, resolveLanguage } from './i18n';
import { readSettingsDraft } from './stores/gameStore';
import { App } from './app/App';
import { installAudioUnlock } from './platform/audio';
import './ui/styles/global.css';

/**
 * Entry point.
 *
 * The language is resolved *before* React mounts so the very first paint is
 * already in the right language (no flash of Portuguese for English users).
 */
const draftSettings = readSettingsDraft();
const language = resolveLanguage(draftSettings.language ?? navigator.language);
initI18n(language);
document.documentElement.lang = language;

// Browsers only allow audio after a gesture; this arms the engine on the first tap.
installAudioUnlock();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root was not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
