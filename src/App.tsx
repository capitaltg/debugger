import { useState, useEffect } from 'react'
import './App.css'
import { JwtDecoder } from './components/JwtDecoder'
import { SamlDecoder } from './components/SamlDecoder'
import { UrlParser } from './components/UrlParser'

type Tab = 'jwt' | 'saml' | 'url'
type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  const saved = localStorage.getItem('theme') as Theme | null
  if (saved === 'light' || saved === 'dark') return saved
  return 'light'
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('jwt')
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <div className="app">
      <header>
        <h1><span>&gt;_</span> Token Debugger</h1>
        <div className="header-controls">
          <div className="tab-bar">
            <button
              className={activeTab === 'jwt' ? 'active' : ''}
              onClick={() => setActiveTab('jwt')}
            >
              JWT
            </button>
            <button
              className={activeTab === 'saml' ? 'active' : ''}
              onClick={() => setActiveTab('saml')}
            >
              SAML
            </button>
            <button
              className={activeTab === 'url' ? 'active' : ''}
              onClick={() => setActiveTab('url')}
            >
              URL
            </button>
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
          </button>
        </div>
      </header>
      <main>
        {activeTab === 'jwt' && <JwtDecoder />}
        {activeTab === 'saml' && <SamlDecoder />}
        {activeTab === 'url' && <UrlParser />}
      </main>
    </div>
  )
}

export default App
