import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export default function PartnerPage() {
  const { t } = useTranslation();
  
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      const res = await fetch('/api/partner/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company_name: companyName, contact_number: contactNumber, business_number: businessNumber })
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        let errMsg = data.error || t('partner_failed');
        if (data.error === 'You already have a pending application') errMsg = t('error_pending_application');
        setMsg(errMsg);
      } else {
        setStatus('success');
        setMsg(t('partner_success_msg'));
        setCompanyName('');
        setContactNumber('');
        setEmail('');
        setBusinessNumber('');
      }
    } catch (e) {
      setStatus('error');
      setMsg(t('network_error'));
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 w-full">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-4">{t('partner_title')}</h1>
        <p className="text-white/40 font-medium leading-relaxed">{t('partner_desc')}</p>
      </div>

      <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-3 right-3 bg-[#E2B808]/10 text-[#E2B808] text-[9px] font-black px-2 py-1 rounded flex items-center gap-1 shadow-[0_2px_10px_rgba(226,184,8,0.1)]">
          <ShieldCheck className="w-3 h-3" />
          {t('secure_enrollment')}
        </div>

        {status === 'success' ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-green-500">
            <CheckCircle2 className="w-16 h-16 mb-4 opacity-80" />
            <h2 className="text-2xl font-black tracking-widest uppercase text-white mb-2">{t('request_received')}</h2>
            <p className="text-white/60 text-sm">{msg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 pt-4">
            {status === 'error' && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl text-xs font-bold">
                {msg}
              </div>
            )}
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('email')}</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[#E2B808] font-medium text-white/90"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('company_name')}</label>
              <input 
                type="text" 
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[#E2B808] font-medium text-white/90"
                required
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('business_number')} (Optional)</label>
              <input 
                type="text" 
                value={businessNumber}
                onChange={e => setBusinessNumber(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[#E2B808] font-medium text-white/90"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('contact_phone')}</label>
              <input 
                type="tel" 
                value={contactNumber}
                onChange={e => setContactNumber(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[#E2B808] font-medium text-white/90"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={status === 'loading'}
              className="w-full h-[46px] mt-4 bg-[#E2B808] hover:bg-[#E2B808]/90 text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_4px_15px_rgba(226,184,8,0.3)] hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50"
            >
              {status === 'loading' ? t('transmitting') : t('submit_credentials')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
