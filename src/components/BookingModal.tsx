import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Vehicle } from './CarCard';
import { X } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';

interface BookingModalProps {
  car: Vehicle;
  onClose: () => void;
  onConfirm: (contactData: { name: string, phone: string, email: string }, pdate: string, ddate: string) => void;
  pdate: string;
  ddate: string;
}

export default function BookingModal({ car, onClose, onConfirm, pdate: initPdate, ddate: initDdate }: BookingModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [pdate, setPdate] = useState(initPdate);
  const [ddate, setDdate] = useState(initDdate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({ name, phone, email }, pdate, ddate);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-white uppercase tracking-widest">{t('complete_booking')}</h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/5">
          <div className="font-bold text-white">{car.make} {car.model}</div>
          <div className="text-[#E2B808] font-black mt-2">€{car.price_per_day} / {t('day')}</div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('dates')}</label>
            <DateRangePicker 
              startDate={pdate}
              endDate={ddate}
              onStartDateChange={setPdate}
              onEndDateChange={setDdate}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('full_name')}</label>
            <input 
              required 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[#E2B808] text-sm text-white" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('phone_number')}</label>
            <input 
              required 
              type="tel"
              value={phone} 
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[#E2B808] text-sm text-white" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('email_address')}</label>
            <input 
              required 
              type="email"
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[#E2B808] text-sm text-white" 
            />
          </div>
          <button 
            type="submit" 
            className="w-full h-[46px] mt-4 bg-[#E2B808] hover:bg-[#E2B808]/90 text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-[1.02] active:scale-95 transition-transform"
          >
            {t('confirm_booking')}
          </button>
        </form>
      </div>
    </div>
  );
}
