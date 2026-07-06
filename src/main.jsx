import { createRoot } from 'react-dom/client';
import { storage } from './storage.js';
import App from './App.jsx';
import './index.css';

window.storage = storage;

createRoot(document.getElementById('root')).render(<App />);
