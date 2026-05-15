import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Car, Calendar, Plus, Trash2 } from 'lucide-react';

export default function PartnerDashboardPage() {
  const { t } = useTranslation();
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<{ vehicles: any[], bookings: any[] } | null>(null);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCar, setNewCar] = useState<{
    make: string;
    model: string;
    transmission: string;
    fuel_type: string;
    price_per_day: string;
    ac: boolean;
    image_urls: string[];
  }>({
    make: '', model: '', transmission: 'Automatic', fuel_type: 'Diesel', price_per_day: '', ac: true, image_urls: []
  });

  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [vehicleEdits, setVehicleEdits] = useState({ make: '', model: '', transmission: 'Automatic', fuel_type: 'Diesel', price_per_day: '', ac: true });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/partner/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!user || (user.role !== 'partner' && user.role !== 'admin')) {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate, token]);

  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    try {
      const res = await fetch(`/api/partner/edit-vehicle/${editingVehicle.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(vehicleEdits)
      });
      if (res.ok) {
        setEditingVehicle(null);
        fetchData();
      } else {
        const err = await res.json().catch(() => null);
        alert(`Failed to update vehicle: ${err?.error || res.statusText}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error while updating vehicle.');
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      const res = await fetch(`/api/partner/delete-vehicle/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(`Failed to update booking status: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/partner/vehicles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...newCar, price_per_day: Number(newCar.price_per_day) })
      });
      if (res.ok) {
        setShowAddForm(false);
        setNewCar({ make: '', model: '', transmission: 'Automatic', fuel_type: 'Diesel', price_per_day: '', ac: true, image_urls: [] });
        fetchData();
      } else {
        const errorData = await res.json().catch(() => null);
        alert(`Failed to add car: ${errorData?.error || res.statusText || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error while adding car.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter(file => file.size <= 2 * 1024 * 1024);
      
      if (validFiles.length < fileArray.length) {
        alert("Some files were larger than 2MB and were skipped.");
      }

      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewCar(prev => ({ ...prev, image_urls: [...prev.image_urls, reader.result as string] }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  if (!data) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 w-full flex flex-col gap-8">
      <h1 className="text-3xl font-black text-white tracking-widest uppercase">{t('partner_dashboard_title')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6">
          <div className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black mb-2">{t('my_car_fleet')}</div>
          <div className="text-4xl font-black text-white">{data.vehicles.length}</div>
        </div>
        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6">
          <div className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black mb-2">{t('total_bookings')}</div>
          <div className="text-4xl font-black text-white">{data.bookings.length}</div>
        </div>
      </div>

      <div className="flex justify-between items-end border-b border-white/10 pb-4 mt-4">
        <h2 className="text-sm font-black text-white tracking-widest uppercase">{t('my_vehicles')}</h2>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-[#E2B808] text-black px-4 py-2 text-[10px] uppercase font-black tracking-widest rounded-xl hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" /> {t('add_vehicle')}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddCar} className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <input placeholder={t('make_placeholder')} value={newCar.make} onChange={e => setNewCar({...newCar, make: e.target.value})} required className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white" />
          <input placeholder={t('model_placeholder')} value={newCar.model} onChange={e => setNewCar({...newCar, model: e.target.value})} required className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white" />
          <select value={newCar.transmission} onChange={e => setNewCar({...newCar, transmission: e.target.value})} className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-sm text-white">
            <option>{t('automatic')}</option>
            <option>{t('manual')}</option>
          </select>
          <select value={newCar.fuel_type} onChange={e => setNewCar({...newCar, fuel_type: e.target.value})} className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-sm text-white">
            <option>{t('diesel')}</option>
            <option>{t('petrol')}</option>
            <option>{t('hybrid')}</option>
            <option>{t('electric')}</option>
          </select>
          <input type="number" placeholder={t('price_per_day_placeholder')} value={newCar.price_per_day} onChange={e => setNewCar({...newCar, price_per_day: e.target.value})} required className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white" />
          <div className="flex flex-col gap-2">
            <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white file:bg-[#E2B808] file:text-black file:font-black file:border-0 file:rounded file:px-2 file:text-xs file:uppercase file:mr-2 hover:file:opacity-90" />
            {newCar.image_urls.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {newCar.image_urls.map((url, idx) => (
                   <img key={idx} src={url} alt="preview" className="h-10 w-16 object-cover rounded shadow" />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 col-span-full">
            <input type="checkbox" checked={newCar.ac} onChange={e => setNewCar({...newCar, ac: e.target.checked})} id="ac" className="w-4 h-4" />
            <label htmlFor="ac" className="text-xs text-white/80">{t('has_ac')}</label>
          </div>
          <div className="col-span-full flex justify-end">
             <button type="submit" className="bg-[#E2B808] text-black px-6 py-2 text-xs uppercase font-black rounded-lg">{t('save_vehicle')}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.vehicles.map(v => {
          let displayUrl = v.image_url;
          try {
            const parsed = JSON.parse(v.image_url);
            if (Array.isArray(parsed) && parsed.length > 0) {
              displayUrl = parsed[0];
            }
          } catch {}

          return (
          <div key={v.id} className="bg-[#0d0d0d] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="h-40 bg-white/5 relative">
              {displayUrl ? (
                <img src={displayUrl} alt={v.model} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20"><Car size={40} /></div>
              )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{v.make} {v.model}</h3>
                <span className="text-[#E2B808] font-black">€{v.price_per_day}/d</span>
              </div>
              <div className="text-xs text-white/50 flex items-center gap-2 mb-4">
                <span>{v.transmission}</span> • <span>{v.fuel_type}</span>
              </div>
              <div className="mt-auto flex justify-end gap-2 pt-4 border-t border-white/10">
                <button onClick={() => {
                  setEditingVehicle(v);
                  setVehicleEdits({
                    make: v.make,
                    model: v.model,
                    transmission: v.transmission,
                    fuel_type: v.fuel_type,
                    price_per_day: v.price_per_day,
                    ac: !!v.ac
                  });
                }} className="px-3 py-1 bg-white/10 text-white rounded-lg hover:bg-white/20 text-[10px] font-bold uppercase tracking-widest">
                  {t('edit')}
                </button>
                <button onClick={() => handleDeleteVehicle(v.id)} className="px-3 py-1 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                  {t('delete')}
                </button>
              </div>
              {editingVehicle?.id === v.id && (
                <form onSubmit={handleUpdateVehicle} className="mt-4 flex flex-col gap-2 bg-black/50 p-4 rounded-lg -mx-4 -mb-4">
                  <input value={vehicleEdits.make} onChange={e => setVehicleEdits({...vehicleEdits, make: e.target.value})} placeholder={t('make_placeholder')} className="bg-white/5 border border-white/10 rounded p-2 text-xs text-white" />
                  <input value={vehicleEdits.model} onChange={e => setVehicleEdits({...vehicleEdits, model: e.target.value})} placeholder={t('model_placeholder')} className="bg-white/5 border border-white/10 rounded p-2 text-xs text-white" />
                  <select value={vehicleEdits.transmission} onChange={e => setVehicleEdits({...vehicleEdits, transmission: e.target.value})} className="bg-white/5 border border-white/10 rounded p-2 text-xs text-white">
                    <option>{t('automatic')}</option>
                    <option>{t('manual')}</option>
                  </select>
                  <select value={vehicleEdits.fuel_type} onChange={e => setVehicleEdits({...vehicleEdits, fuel_type: e.target.value})} className="bg-white/5 border border-white/10 rounded p-2 text-xs text-white">
                    <option>{t('petrol')}</option>
                    <option>{t('diesel')}</option>
                    <option>{t('electric')}</option>
                    <option>{t('hybrid')}</option>
                  </select>
                  <input type="number" value={vehicleEdits.price_per_day} onChange={e => setVehicleEdits({...vehicleEdits, price_per_day: e.target.value})} placeholder={t('price_per_day_placeholder')} className="bg-white/5 border border-white/10 rounded p-2 text-xs text-white" />
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={vehicleEdits.ac} onChange={e => setVehicleEdits({...vehicleEdits, ac: e.target.checked})} id={`ac-${v.id}`} />
                    <label htmlFor={`ac-${v.id}`} className="text-xs text-white/80">{t('has_ac')}</label>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => setEditingVehicle(null)} className="px-3 py-1 bg-white/10 text-white rounded text-[10px] font-bold uppercase">{t('cancel')}</button>
                    <button type="submit" className="px-3 py-1 bg-[#E2B808] text-black rounded text-[10px] font-bold uppercase tracking-widest">{t('save')}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
          )
        })}
      </div>

      <h2 className="text-sm font-black text-white tracking-widest uppercase border-b border-white/10 pb-4 mt-8">{t('recent_bookings_vehicles')}</h2>
      <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        {data.bookings.length === 0 ? (
          <p className="text-xs text-white/40">{t('no_bookings_yet')}</p>
        ) : (
          data.bookings.map(b => (
             <div key={b.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
               <div className="flex justify-between items-start">
                 <div>
                   <span className="font-bold text-white text-sm block">{b.make} {b.model}</span>
                   <span className="text-[10px] text-white/50">{b.contact_name || b.user_email || t('unknown')} • {b.contact_phone || t('no_phone')}</span>
                 </div>
                 <div className="flex flex-col items-end gap-2">
                   <span className="text-[#E2B808] font-bold text-xs">€{b.total_price}</span>
                   <select 
                     value={b.status || 'pending'} 
                     onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                     className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-[#1a1a1a] border border-white/10 ${
                       b.status === 'accepted' ? 'text-green-500' :
                       b.status === 'rejected' || b.status === 'cancelled' ? 'text-red-500' :
                       'text-yellow-500'
                     }`}
                   >
                     <option value="pending">{t('status_pending')}</option>
                     <option value="accepted">{t('status_accepted')}</option>
                     <option value="rejected">{t('status_rejected')}</option>
                     <option value="cancelled">{t('status_cancelled')}</option>
                   </select>
                 </div>
               </div>
               <div className="text-xs text-white/60 flex items-center gap-2 mt-2">
                 <Calendar className="w-3 h-3" /> {b.start_date} to {b.end_date}
               </div>
               <div className="text-[10px] text-white/40 font-mono mt-1">{t('ref')}: {b.id}</div>
            </div>
          ))
        )}
      </div>

      <h2 className="text-sm font-black text-white tracking-widest uppercase border-b border-white/10 pb-4 mt-8">Contact Admin / Request Profile Update</h2>
      <form onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        try {
          const res = await fetch('/api/support/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ subject: data.get('subject'), message: data.get('message') })
          });
          if (res.ok) {
            alert('Request sent to admin.');
            (e.target as HTMLFormElement).reset();
          }
        } catch (err) {
          console.error(err);
        }
      }} className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <input name="subject" placeholder="Subject (e.g. Update Business Number)" required className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white" />
        <textarea name="message" placeholder="Describe your request..." required className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white h-32 resize-none"></textarea>
        <div className="flex justify-end">
          <button type="submit" className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 text-xs uppercase font-black rounded-lg transition-colors">Send Message</button>
        </div>
      </form>

    </div>
  );
}
