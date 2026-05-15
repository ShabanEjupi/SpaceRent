import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Menu, X } from 'lucide-react';
import Home from './pages/home';
import Search from './pages/search';
import AuthPage from './pages/auth';
import SignupPage from './pages/signup';
import PartnerPage from './pages/partner';
import AdminPage from './pages/admin';
import PartnerDashboardPage from './pages/partner-dashboard';
import { useAuthStore } from './store/authStore';

function AppContent() {
  const { t, i18n } = useTranslation();
  const { user, logout, initAuth } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col">
      {/* Navbar */}
      <header className="h-20 bg-black/50 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="h-full px-4 sm:px-8 max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="hidden sm:flex w-12 h-12 bg-gradient-to-br from-[#E2B808] to-[#9A7D0A] rounded-xl items-center justify-center shadow-[0_0_20px_rgba(226,184,8,0.2)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
            </Link>
            <Link to="/" className="flex flex-col">
              <h1 className="text-xl font-black tracking-[0.2em] uppercase leading-none">SpaceRent</h1>
              <span className="text-[10px] tracking-[0.4em] text-[#E2B808] font-bold">KOSOVO MISSION CONTROL</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-8">
            <nav className="hidden md:flex gap-6 text-[11px] font-bold tracking-widest uppercase">
              <Link to="/" className={`transition-colors ${location.pathname === '/' || location.pathname === '/search' ? 'text-[#E2B808] border-b-2 border-[#E2B808] pb-1' : 'text-white/40 hover:text-white'}`}>{t('fleet')}</Link>
              <Link to="/partner" className={`transition-colors ${location.pathname === '/partner' ? 'text-[#E2B808] border-b-2 border-[#E2B808] pb-1' : 'text-white/40 hover:text-white'}`}>{t('partner')}</Link>
              {user?.role === 'partner' && (
                <Link to="/partner-dashboard" className={`transition-colors ${location.pathname === '/partner-dashboard' ? 'text-[#E2B808] border-b-2 border-[#E2B808] pb-1' : 'text-white/40 hover:text-white'}`}>{t('partner_panel')}</Link>
              )}
              {user?.role === 'admin' && (
                <Link to="/admin" className={`transition-colors ${location.pathname === '/admin' ? 'text-[#E2B808] border-b-2 border-[#E2B808] pb-1' : 'text-white/40 hover:text-white'}`}>{t('admin_panel')}</Link>
              )}
            </nav>

              <div className="hidden sm:flex bg-white/5 rounded-full p-1 border border-white/10 ring-1 ring-white/5">
                <button 
                  onClick={() => changeLanguage('sq')}
                  className={`px-4 py-1.5 text-[10px] font-black rounded-full transition-all ${i18n.language === 'sq' ? 'bg-[#E2B808] text-black shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                >
                  AL
                </button>
                <button 
                  onClick={() => changeLanguage('en')}
                  className={`px-4 py-1.5 text-[10px] font-black rounded-full transition-all ${i18n.language === 'en' ? 'bg-[#E2B808] text-black shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                >
                  EN
                </button>
              </div>

              <div className="hidden sm:flex ml-2">
                {user ? (
                  <button onClick={logout} className="text-[10px] font-bold tracking-widest uppercase text-white/40 hover:text-white transition-colors">
                    {t('logout')}
                  </button>
                ) : (
                  <Link to="/auth" className="bg-[#E2B808] text-black px-4 py-2 text-[10px] uppercase font-black tracking-widest rounded-xl shadow-[0_2px_10px_rgba(226,184,8,0.2)] hover:scale-105 transition-transform">
                    {t('login')}
                  </Link>
                )}
              </div>

              <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2 text-white/60 hover:text-white">
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
          
          {/* Mobile Menu */}
          {menuOpen && (
            <div className="sm:hidden absolute top-20 left-0 w-full bg-black/95 border-b border-white/10 p-4 flex flex-col gap-4">
              <Link to="/" onClick={() => setMenuOpen(false)} className="text-xs font-bold uppercase tracking-widest text-white/70">{t('fleet')}</Link>
              <Link to="/partner" onClick={() => setMenuOpen(false)} className="text-xs font-bold uppercase tracking-widest text-white/70">{t('partner')}</Link>
              {user?.role === 'partner' && (
                <Link to="/partner-dashboard" onClick={() => setMenuOpen(false)} className="text-xs font-bold uppercase tracking-widest text-[#E2B808]">{t('partner_panel')}</Link>
              )}
              {user?.role === 'admin' && (
                <Link to="/admin" onClick={() => setMenuOpen(false)} className="text-xs font-bold uppercase tracking-widest text-[#E2B808]">{t('admin_panel')}</Link>
              )}
              {user ? (
                <button onClick={() => { logout(); setMenuOpen(false); }} className="text-left text-xs font-bold uppercase tracking-widest text-white/40">{t('logout')}</button>
              ) : (
                <Link to="/auth" onClick={() => setMenuOpen(false)} className="text-xs font-bold uppercase tracking-widest text-white/70">{t('login')}</Link>
              )}
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-grow flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/signup/:token" element={<SignupPage />} />
            <Route path="/partner" element={<PartnerPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/partner-dashboard" element={<PartnerDashboardPage />} />
          </Routes>
        </main>
        
        <footer className="h-12 px-4 sm:px-8 bg-black border-t border-white/5 flex items-center justify-between text-[9px] font-black tracking-[0.3em] uppercase text-white/20">
          <div className="flex gap-8">
            <span className="hidden sm:inline">SpaceRent App</span>
            <span>{"KOSOVO MISSION CONTROL"}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-500/50">
              <span className="hidden sm:inline">Status: Operational</span>
            </div>
          </div>
        </footer>
      </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

