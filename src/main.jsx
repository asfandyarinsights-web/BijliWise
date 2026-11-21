import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PreferencesProvider from './context/PreferencesProvider.jsx'
import DemoModeProvider from './context/DemoModeProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PreferencesProvider>
      <DemoModeProvider>
        <App />
      </DemoModeProvider>
    </PreferencesProvider>
  </StrictMode>,
)