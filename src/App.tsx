import { useState, useEffect } from 'react'
import './App.css'
import { JwtDecoder } from './components/JwtDecoder'
import { SamlDecoder } from './components/SamlDecoder'
import { UrlParser } from './components/UrlParser'
import { EmailParser } from './components/EmailParser'
import { JsonParser } from './components/JsonParser'
import { XmlParser } from './components/XmlParser'
import { SqlFormatter } from './components/SqlFormatter'

type Tab = 'jwt' | 'saml' | 'url' | 'emails' | 'json' | 'xml' | 'sql'
type Theme = 'light' | 'dark'

const TABS: Tab[] = ['jwt', 'saml', 'url', 'emails', 'json', 'xml', 'sql']

function getInitialTheme(): Theme {
  const saved = localStorage.getItem('theme') as Theme | null
  if (saved === 'light' || saved === 'dark') return saved
  return 'light'
}

function getInitialTab(): Tab {
  const hash = window.location.hash.replace(/^#/, '') as Tab
  if (TABS.includes(hash)) return hash
  return 'jwt'
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (window.location.hash.replace(/^#/, '') !== activeTab) {
      history.replaceState(null, '', `#${activeTab}`)
    }
  }, [activeTab])

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '') as Tab
      if (TABS.includes(hash)) setActiveTab(hash)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

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
            <button
              className={activeTab === 'emails' ? 'active' : ''}
              onClick={() => setActiveTab('emails')}
            >
              Emails
            </button>
            <button
              className={activeTab === 'json' ? 'active' : ''}
              onClick={() => setActiveTab('json')}
            >
              JSON
            </button>
            <button
              className={activeTab === 'xml' ? 'active' : ''}
              onClick={() => setActiveTab('xml')}
            >
              XML
            </button>
            <button
              className={activeTab === 'sql' ? 'active' : ''}
              onClick={() => setActiveTab('sql')}
            >
              SQL
            </button>
          </div>
          <a
            className="header-link"
            href="https://github.com/capitaltg/debugger"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
            title="View source on GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-2.91-.88-2.91-2.9 0-.86.31-1.56.82-2.11-.07-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.15 1.92.08 2.12.51.55.82 1.25.82 2.11 0 2.03-1.14 2.7-2.92 2.9.3.26.56.76.56 1.54 0 1.11-.01 2.02-.01 2.29 0 .21.15.46.55.38A7.99 7.99 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>
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
        {activeTab === 'emails' && <EmailParser />}
        {activeTab === 'json' && <JsonParser />}
        {activeTab === 'xml' && <XmlParser />}
        {activeTab === 'sql' && <SqlFormatter />}
      </main>
      <footer>
        A free,{' '}
        <a href="https://github.com/capitaltg/debugger" target="_blank" rel="noopener noreferrer">
          open-source
        </a>{' '}
        debugging toolkit from{' '}
        <a href="https://www.capitaltg.com/labs" target="_blank" rel="noopener noreferrer">
          CTG Labs
        </a>
        . Everything is decoded in your browser — nothing you paste leaves this page.
      </footer>
    </div>
  )
}

export default App
