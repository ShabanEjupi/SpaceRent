import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { format } from "date-fns";
import { DateRangePicker } from '../components/DateRangePicker';

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [locations, setLocations] = useState<{id: string, name: string}[]>([]);
  const [pickupConfig, setPickupConfig] = useState({ loc: '', date: ''});
  const [dropoffConfig, setDropoffConfig] = useState({ loc: '', date: ''});

  useEffect(() => {
    fetch('/api/locations')
      .then(res => res.json())
      .then(data => setLocations(data))
      .catch(console.error);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      ploc: pickupConfig.loc,
      pdate: pickupConfig.date,
      dloc: dropoffConfig.loc,
      ddate: dropoffConfig.date
    });
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="relative">
      {/* Hero Section */}
      <div className="absolute inset-0 bg-gray-900 h-[60vh]">
        <img 
          src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=2000" 
          alt="Road trip"
          className="w-full h-full object-cover opacity-40 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent bottom-0 h-32 top-auto"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        <h1 className="text-4xl md:text-6xl font-black text-white max-w-3xl leading-tight mb-6">
          {t('hero_title_1')} <span className="text-[#E2B808]">{t('hero_title_2')}</span>
        </h1>
        <p className="text-xl text-white/60 mb-12 max-w-2xl font-medium">
          {t('hero_subtitle')}
        </p>

        {/* Search Widget */}
        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden max-w-5xl">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <svg width="200" height="200" viewBox="0 0 24 24" fill="white">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 relative z-10">
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('pickup_location')}</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <select 
                    value={pickupConfig.loc}
                    onChange={e => setPickupConfig({...pickupConfig, loc: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 appearance-none focus:outline-none focus:ring-1 focus:ring-[#E2B808] font-medium text-white/90"
                    required
                  >
                    <option value="" disabled className="bg-black text-white">{t('choose_location')}</option>
                    {locations.map(l => <option key={l.id} value={l.id} className="bg-black text-white">{l.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-black pl-1">{t('dropoff_location')}</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <select 
                    value={dropoffConfig.loc}
                    onChange={e => setDropoffConfig({...dropoffConfig, loc: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 appearance-none focus:outline-none focus:ring-1 focus:ring-white/40 font-medium text-white/90"
                    required
                  >
                    <option value="" disabled className="bg-black text-white">{t('choose_location')}</option>
                    {locations.map(l => <option key={l.id} value={l.id} className="bg-black text-white">{l.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('dates')}</label>
                <DateRangePicker 
                  startDate={pickupConfig.date}
                  endDate={dropoffConfig.date}
                  onStartDateChange={(date) => setPickupConfig({...pickupConfig, date})}
                  onEndDateChange={(date) => setDropoffConfig({...dropoffConfig, date})}
                />
              </div>
            </div>

            <div className="flex items-end md:w-56">
              <button 
                type="submit"
                className="w-full h-[52px] bg-[#E2B808] hover:bg-[#E2B808]/90 text-black font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(226,184,8,0.3)] hover:scale-[1.02] active:scale-95 transition-transform"
               >
                {t('search_cars')}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}
