import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { AlertCircle } from 'lucide-react';

export default function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'partner') navigate('/partner/dashboard');
      else navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || t('auth_failed');
        if (data.error === 'Invalid credentials') msg = t('invalid_credentials');
        setError(msg);
      } else {
        login(data.user, data.token);
        navigate('/');
      }
    } catch (err) {
      setError(t('network_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex justify-center items-center py-16 px-4">
      <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <svg width="200" height="200" viewBox="0 0 24 24" fill="white">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        
        <h2 className="text-2xl font-black text-white uppercase tracking-widest text-center mb-8 relative z-10">
          {t('login')}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl flex items-center gap-2 mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-bold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-black pl-1">{t('email')}</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[#E2B808] font-medium text-white/90"
              required
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-black pl-1">{t('password')}</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[#E2B808] font-medium text-white/90"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-[46px] bg-[#E2B808] hover:bg-[#E2B808]/90 text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_4px_15px_rgba(226,184,8,0.3)] hover:scale-[1.02] active:scale-95 transition-transform mt-4 disabled:opacity-50"
          >
            {loading ? t('processing') : t('login')}
          </button>
        </form>
      </div>
    </div>
  );
}
