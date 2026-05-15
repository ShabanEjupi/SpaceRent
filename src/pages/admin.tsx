import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, Plus, X } from 'lucide-react';

export default function AdminPage() {
  const { t } = useTranslation();
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<{ metrics: any, applications: any[], bookings: any[], partners: any[], vehicles: any[], supportRequests: any[], users: any[] } | null>(null);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCar, setNewCar] = useState<{
    make: string;
    model: string;
    transmission: string;
    fuel_type: string;
    price_per_day: string;
    ac: boolean;
    image_urls: string[];
    partner_id: string;
  }>({
    make: '', model: '', transmission: 'Automatic', fuel_type: 'Diesel', price_per_day: '', ac: true, image_urls: [], partner_id: ''
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/dashboard', {
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
    if (!user) {
      navigate('/auth');
      return;
    }
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate, token]);

  const handleAction = async (id: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/partners/${id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePartner = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/delete-partner/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/delete-vehicle/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
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

  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [partnerEdits, setPartnerEdits] = useState({ email: '', company_name: '', contact_number: '' });

  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [vehicleEdits, setVehicleEdits] = useState({ make: '', model: '', transmission: 'Automatic', fuel_type: 'Diesel', price_per_day: '', ac: true, partner_id: '' });

  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    try {
      const res = await fetch(`/api/admin/edit-vehicle/${editingVehicle.id}`, {
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

  const handleUpdatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    try {
      const res = await fetch(`/api/admin/users/${editingPartner.id}/update`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(partnerEdits)
      });
      if (res.ok) {
        setEditingPartner(null);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveSupport = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/support/${id}/resolve`, {
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

  const handleRoleChange = async (id: string, role: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ role })
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Use the same endpoint as partners but authenticated as admin
      const res = await fetch('/api/partner/vehicles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          ...newCar, 
          price_per_day: Number(newCar.price_per_day),
          // If partner_id is provided, it will be saved. 
          // Note: server.ts uses req.user.id if not passed, but we can update server to respect partner_id if admin
        })
      });
      if (res.ok) {
        setShowAddForm(false);
        setNewCar({ make: '', model: '', transmission: 'Automatic', fuel_type: 'Diesel', price_per_day: '', ac: true, image_urls: [], partner_id: '' });
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

  if (!data) return <div className="p-8 text-white/40">Loading Command Center...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 w-full flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-white tracking-widest uppercase">{t('admin_title')}</h1>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-[#E2B808] text-black px-6 py-3 text-xs uppercase font-black tracking-widest rounded-xl hover:scale-105 transition-transform"
        >
          {showAddForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showAddForm ? 'Cancel' : t('add_vehicle')}
        </button>
      </div>
      
      {showAddForm && (
        <div className="bg-[#0d0d0d] border border-[#E2B808]/50 rounded-2xl p-8 mb-4 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#E2B808]"></div>
          <h2 className="text-xl font-black text-white uppercase tracking-widest mb-6">{t('initialize_asset')}</h2>
          <form onSubmit={handleAddCar} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('make_placeholder')}</label>
              <input value={newCar.make} onChange={e => setNewCar({...newCar, make: e.target.value})} required className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#E2B808]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('model_placeholder')}</label>
              <input value={newCar.model} onChange={e => setNewCar({...newCar, model: e.target.value})} required className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#E2B808]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('transmission')}</label>
              <select value={newCar.transmission} onChange={e => setNewCar({...newCar, transmission: e.target.value})} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#E2B808]">
                <option>{t('automatic')}</option>
                <option>{t('manual')}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('fuel_type') || 'Fuel Type'}</label>
              <select value={newCar.fuel_type} onChange={e => setNewCar({...newCar, fuel_type: e.target.value})} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#E2B808]">
                <option>{t('diesel')}</option>
                <option>{t('petrol')}</option>
                <option>{t('hybrid')}</option>
                <option>{t('electric')}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('price_per_day_placeholder')}</label>
              <input type="number" value={newCar.price_per_day} onChange={e => setNewCar({...newCar, price_per_day: e.target.value})} required className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#E2B808]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">Image Upload (Max 2MB)</label>
              <div className="flex flex-col gap-2">
                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#E2B808] file:bg-[#E2B808] file:text-black file:font-black file:border-0 file:rounded-lg file:px-4 file:py-1 file:mr-4 file:uppercase file:text-xs file:-ml-2 hover:file:opacity-90" />
                {newCar.image_urls.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {newCar.image_urls.map((url, idx) => (
                       <img key={idx} src={url} alt="preview" className="h-10 w-16 object-cover rounded shadow" />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black pl-1">{t('assign_partner')}</label>
              <input placeholder={t('admin_fleet_placeholder')} value={newCar.partner_id} onChange={e => setNewCar({...newCar, partner_id: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#E2B808]" />
            </div>
            <div className="flex items-center gap-3 col-span-full pt-4">
              <input type="checkbox" checked={newCar.ac} onChange={e => setNewCar({...newCar, ac: e.target.checked})} id="admin-ac" className="w-5 h-5 accent-[#E2B808]" />
              <label htmlFor="admin-ac" className="text-sm font-bold text-white/80 uppercase tracking-widest">{t('has_ac')}</label>
            </div>
            <div className="col-span-full flex justify-end mt-4">
               <button type="submit" className="bg-[#E2B808] text-black px-12 py-4 text-xs uppercase font-black tracking-widest rounded-xl shadow-lg hover:scale-105 transition-transform">{t('initialize_asset')}</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6">
          <div className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black mb-2">{t('total_bookings')}</div>
          <div className="text-4xl font-black text-white">{data.metrics.bookings}</div>
        </div>
        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6">
          <div className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black mb-2">{t('pending_partners')}</div>
          <div className="text-4xl font-black text-white">{data.applications.length}</div>
        </div>
        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6">
          <div className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black mb-2">{t('active_partners')}</div>
          <div className="text-4xl font-black text-white">{data.partners.length}</div>
        </div>
        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6">
          <div className="text-[10px] uppercase tracking-widest text-[#E2B808] font-black mb-2">{t('total_fleet')}</div>
          <div className="text-4xl font-black text-white">{data.vehicles.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        {/* Partner Applications */}
        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-sm font-black text-white tracking-widest uppercase border-b border-white/10 pb-4">{t('partner_links')}</h2>
          <div className="flex flex-col gap-3">
            {data.applications.length === 0 ? (
              <p className="text-xs text-white/40">{t('no_pending_partners')}</p>
            ) : (
              data.applications.map((app: any) => (
                <div key={app.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm text-white">{app.company_name}</div>
                    <div className="text-[10px] font-mono text-white/40 mb-2">{app.email} | {app.contact_number}{app.business_number ? ` | BN: ${app.business_number}` : ''}</div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAction(app.id, 'accept')}
                      className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-green-500/20 text-green-500 rounded hover:bg-green-500/30 transition-colors"
                    >
                      {t('accept')}
                    </button>
                    <button 
                      onClick={() => handleAction(app.id, 'reject')}
                      className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-red-500/20 text-red-500 rounded hover:bg-red-500/30 transition-colors"
                    >
                      {t('reject')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-sm font-black text-white tracking-widest uppercase border-b border-white/10 pb-4">{t('active_partners')}</h2>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[300px]">
            {data.partners.length === 0 ? (
              <p className="text-xs text-white/40">No active partners.</p>
            ) : (
              data.partners.map((p: any) => (
                <div key={p.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm text-white">{p.company_name || p.email}</div>
                      <div className="text-[10px] font-mono text-white/40 mb-2">
                         {p.email} | {p.contact_number || 'No contact info'} | ID: {p.id}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        setEditingPartner(p);
                        setPartnerEdits({ email: p.email, company_name: p.company_name || '', contact_number: p.contact_number || '' });
                      }} className="px-3 py-1 bg-white/10 text-white rounded-lg hover:bg-white/20 text-[10px] font-bold uppercase tracking-widest">
                        Edit
                      </button>
                      <button onClick={() => handleDeletePartner(p.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {editingPartner?.id === p.id && (
                    <form onSubmit={handleUpdatePartner} className="mt-2 flex flex-col gap-2 bg-black/50 p-4 rounded-lg">
                      <input value={partnerEdits.email} onChange={e => setPartnerEdits({...partnerEdits, email: e.target.value})} placeholder="Email" className="bg-white/5 border border-white/10 rounded p-2 text-xs text-white" />
                      <input value={partnerEdits.company_name} onChange={e => setPartnerEdits({...partnerEdits, company_name: e.target.value})} placeholder="Company Name" className="bg-white/5 border border-white/10 rounded p-2 text-xs text-white" />
                      <input value={partnerEdits.contact_number} onChange={e => setPartnerEdits({...partnerEdits, contact_number: e.target.value})} placeholder="Contact Number" className="bg-white/5 border border-white/10 rounded p-2 text-xs text-white" />
                      <div className="flex justify-end gap-2 mt-2">
                        <button type="button" onClick={() => setEditingPartner(null)} className="px-3 py-1 bg-white/10 text-white rounded text-[10px] font-bold uppercase">Cancel</button>
                        <button type="submit" className="px-3 py-1 bg-[#E2B808] text-black rounded text-[10px] font-bold uppercase tracking-widest">Save</button>
                      </div>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 lg:col-span-2">
          <h2 className="text-sm font-black text-white tracking-widest uppercase border-b border-white/10 pb-4">Partner Support Requests ({data.supportRequests?.filter((r: any) => r.status === 'pending').length || 0})</h2>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[300px]">
            {data.supportRequests?.length === 0 ? (
              <p className="text-xs text-white/40">No pending support requests.</p>
            ) : (
              data.supportRequests?.map((req: any) => (
                <div key={req.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm text-white">{req.subject}</div>
                      <div className="text-[10px] font-mono text-[#E2B808] mb-2">From: {req.email} | Date: {new Date(req.created_at).toLocaleString()}</div>
                    </div>
                    {req.status === 'pending' ? (
                      <button onClick={() => handleResolveSupport(req.id)} className="px-3 py-1 bg-green-500/20 text-green-500 rounded hover:bg-green-500/30 text-[10px] uppercase font-black tracking-widest">Mark Resolved</button>
                    ) : (
                      <span className="px-3 py-1 text-white/40 text-[10px] uppercase font-black tracking-widest">Resolved</span>
                    )}
                  </div>
                  <p className="text-xs text-white/70 bg-black/30 p-3 rounded mt-2">{req.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 lg:col-span-2">
          <h2 className="text-sm font-black text-white tracking-widest uppercase border-b border-white/10 pb-4">{t('fleet_mgmt')}</h2>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[400px]">
            {data.vehicles.length === 0 ? (
              <p className="text-xs text-white/40">{t('no_vehicles_fleet')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {data.vehicles.map((v: any) => (
                  <div key={v.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-sm text-white">{v.make} {v.model}</div>
                        <div className="text-[10px] font-black text-[#E2B808]">€{v.price_per_day}/d</div>
                      </div>
                      <div className="text-[10px] font-mono text-white/40 mt-1">Vehicle ID: {v.id}{v.partner_id ? ` | Partner: ${v.partner_id}` : ' | Admin'}</div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button onClick={() => {
                        setEditingVehicle(v);
                        setVehicleEdits({
                          make: v.make,
                          model: v.model,
                          transmission: v.transmission,
                          fuel_type: v.fuel_type,
                          price_per_day: v.price_per_day,
                          ac: !!v.ac,
                          partner_id: v.partner_id || ''
                        });
                      }} className="flex items-center gap-2 px-3 py-1 bg-white/10 text-white rounded-lg hover:bg-white/20 text-[10px] font-bold uppercase tracking-widest">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteVehicle(v.id)} className="flex items-center gap-2 p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 text-xs font-bold uppercase tracking-widest">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {editingVehicle?.id === v.id && (
                      <form onSubmit={handleUpdateVehicle} className="mt-4 flex flex-col gap-2 bg-black/50 p-4 rounded-lg">
                        <input value={vehicleEdits.make} onChange={e => setVehicleEdits({...vehicleEdits, make: e.target.value})} placeholder="Make" className="bg-white/5 border border-white/10 rounded p-2 text-xs text-white" />
                        <input value={vehicleEdits.model} onChange={e => setVehicleEdits({...vehicleEdits, model: e.target.value})} placeholder="Model" className="bg-white/5 border border-white/10 rounded p-2 text-xs text-white" />
                        <select value={vehicleEdits.transmission} onChange={e => setVehicleEdits({...vehicleEdits, transmission: e.target.value})} className="bg-white/5 border border-white/10 rounded p-2 text-xs text-white">
                          <option>Automatic</option>
                          <option>Manual</option>
                        </select>
                        <select value={vehicleEdits.fuel_type} onChange={e => setVehicleEdits({...vehicleEdits, fuel_type: e.target.value})} className="bg-white/5 border border-white/10 rounded p-2 text-xs text-white">
                          <option>Petrol</option>
                          <option>Diesel</option>
                          <option>Electric</option>
                          <option>Hybrid</option>
                        </select>
                        <input type="number" value={vehicleEdits.price_per_day} onChange={e => setVehicleEdits({...vehicleEdits, price_per_day: e.target.value})} placeholder="Price per day" className="bg-white/5 border border-white/10 rounded p-2 text-xs text-white" />
                        <input value={vehicleEdits.partner_id} onChange={e => setVehicleEdits({...vehicleEdits, partner_id: e.target.value})} placeholder="Partner ID" className="bg-white/5 border border-white/10 rounded p-2 text-xs text-white" />
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={vehicleEdits.ac} onChange={e => setVehicleEdits({...vehicleEdits, ac: e.target.checked})} id={`ac-${v.id}`} />
                          <label htmlFor={`ac-${v.id}`} className="text-xs text-white/80">Has AC</label>
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                          <button type="button" onClick={() => setEditingVehicle(null)} className="px-3 py-1 bg-white/10 text-white rounded text-[10px] font-bold uppercase">Cancel</button>
                          <button type="submit" className="px-3 py-1 bg-[#E2B808] text-black rounded text-[10px] font-bold uppercase tracking-widest">Save</button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 lg:col-span-2">
          <h2 className="text-sm font-black text-white tracking-widest uppercase border-b border-white/10 pb-4">User Management</h2>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[400px]">
             {data.users?.map((u: any) => (
              <div key={u.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex justify-between items-center sm:flex-row flex-col gap-4">
                <div>
                  <div className="font-bold text-sm text-white">{u.email}</div>
                  <div className="text-[10px] font-mono text-white/40 mb-1">ID: {u.id}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#E2B808]">{t('current_role')}{t(u.role + '_role')}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <select 
                    value={u.role} 
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={user?.id === u.id}
                    className="bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white uppercase tracking-widest font-black focus:outline-none focus:border-[#E2B808]"
                  >
                    <option value="user">{t('user_role')}</option>
                    <option value="partner">{t('partner_role')}</option>
                    <option value="admin">{t('admin_role')}</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 lg:col-span-2">
          <h2 className="text-sm font-black text-white tracking-widest uppercase border-b border-white/10 pb-4">{t('recent_bookings_vehicles')}</h2>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[400px]">
             {data.bookings?.length === 0 ? (
               <p className="text-xs text-white/40">{t('no_recent_bookings')}</p>
             ) : (
               data.bookings?.map((b: any) => (
                <div key={b.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm text-white">{t('vehicle_id')}{b.vehicle_id}</div>
                      <div className="text-[10px] font-mono text-white/50 mb-1">{b.contact_name || b.user_email || t('unknown')} • {b.contact_phone || t('no_phone')}</div>
                      <div className="text-[10px] font-mono text-[#E2B808] mb-1">{t('total')}€{b.total_price} | {t('user_id')}{b.user_id}</div>
                      <div className="text-[10px] font-mono text-white/40">{t('dates')}{b.start_date} - {b.end_date}</div>
                    </div>
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
              ))
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
