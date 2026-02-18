import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

import { InstallPromptProvider } from './contexts/InstallPromptContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <InstallPromptProvider>
        <App />
      </InstallPromptProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

