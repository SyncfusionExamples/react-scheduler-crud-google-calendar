import React from 'react';
import { createRoot } from 'react-dom/client'; // ⬅️ new import in React 18
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker'; // keep if you have this file

const container = document.getElementById('root');
const root = createRoot(container); // ⬅️ create a root once

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


serviceWorker.unregister();
