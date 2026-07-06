import { createRoot } from 'react-dom/client';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import { storage } from './storage.js';
import App from './App.jsx';
import AuthGate from './AuthGate.jsx';
import './index.css';

window.storage = storage;

createRoot(document.getElementById('root')).render(
  <AuthGate>
    <App />
  </AuthGate>
);
