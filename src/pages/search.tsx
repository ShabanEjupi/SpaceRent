import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CarCard, { Vehicle } from '../components/CarCard';
import BookingModal from '../components/BookingModal';
import PaymentModal from '../components/PaymentModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Search() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingStatus, setBookingStatus] = useState<{status: 'idle' | 'success' | 'error', msg: string}>({ status: 'idle', msg: '' });
  const [selectedCar, setSelectedCar] = useState<Vehicle | null>(null);
  const [payBookingId, setPayBookingId] = useState<string | null>(null);
  
  const { user, token } = useAuthStore();

  const pdate = searchParams.get('pdate');
  const ddate = searchParams.get('ddate');

  useEffect(() => {
    let url = '/api/vehicles';
    if (pdate && ddate) {
      url += `?start_date=${encodeURIComponent(pdate)}&end_date=${encodeURIComponent(ddate)}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setVehicles(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleBookClick = (carId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!pdate || !ddate) {
      setBookingStatus({ status: 'error', msg: t('missing_dates') });
      return;
    }

    const car = vehicles.find(v => v.id === carId);
    if (car) setSelectedCar(car);
  };

  const handleConfirmBooking = async (contactData: {name: string, phone: string, email: string}, finalPdate: string, finalDdate: string) => {
    if (!selectedCar) return;
    
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicle_id: selectedCar.id,
          start_date: finalPdate,
          end_date: finalDdate,
          total_price: selectedCar.price_per_day, // Usually calculate based on days
          contact_name: contactData.name,
          contact_phone: contactData.phone,
          contact_email: contactData.email
        })
      });
      const data = await res.json();
      
      setSelectedCar(null);

      if (!res.ok) {
        setBookingStatus({ 
          status: 'error', 
          msg: data.error === 'Vehicle is already booked for these dates.' ? t('error_booked') : (data.error || t('booking_failed')) 
        });
      } else {
        setBookingStatus({ status: 'success', msg: t('booking_success_id') + data.booking_id });
        setPayBookingId(data.booking_id);
      }
    } catch (e) {
      setSelectedCar(null);
      setBookingStatus({ status: 'error', msg: t('unexpected_error') });
    }
  };

  const handlePaymentSuccess = () => {
    setPayBookingId(null);
    setBookingStatus({ status: 'success', msg: t('payment_successful') });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">{t('available_cars')}</h1>
          {pdate && ddate && (
            <p className="text-white/40 mt-2 text-sm font-medium">
              {t('showing_availability')} <span className="font-bold text-[#E2B808]">{pdate}</span> {t('to')} <span className="font-bold text-[#E2B808]">{ddate}</span>
            </p>
          )}
        </div>
      </div>

      {bookingStatus.status !== 'idle' && (
        <div className={`p-4 rounded-xl mb-8 flex items-center gap-3 border ${bookingStatus.status === 'success' ? 'bg-[#0d0d0d] border-[#E2B808]/50 text-[#E2B808]' : 'bg-[#0d0d0d] border-red-500/50 text-red-500'}`}>
          {bookingStatus.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium text-sm tracking-wide">{bookingStatus.msg}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-[#0d0d0d] border border-white/10 rounded-2xl h-[400px]"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {vehicles.map(car => (
            <CarCard key={car.id} car={car} onBook={handleBookClick} />
          ))}
        </div>
      )}
      
      {!loading && vehicles.length === 0 && (
        <div className="text-center py-20 bg-[#0d0d0d] rounded-2xl border border-white/10 shadow-2xl">
          <p className="text-white/40 text-lg font-medium tracking-wide uppercase">{t('no_vehicles')}</p>
        </div>
      )}

      {selectedCar && (
        <BookingModal 
          car={selectedCar} 
          pdate={pdate || ''} 
          ddate={ddate || ''} 
          onClose={() => setSelectedCar(null)}
          onConfirm={handleConfirmBooking}
        />
      )}

      {payBookingId && (
        <PaymentModal
          bookingId={payBookingId}
          onClose={() => setPayBookingId(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
