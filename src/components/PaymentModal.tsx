import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useAuthStore } from '../store/authStore';

interface PaymentModalProps {
  bookingId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({ bookingId, onClose, onSuccess }: PaymentModalProps) {
  const { t } = useTranslation();
  const { token } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const initialOptions = {
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "test",
    currency: "EUR",
    intent: "capture",
  };

  const createOrder = async () => {
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const orderData = await response.json();

      if (orderData.id) {
        return orderData.id;
      } else {
        const errorDetail = orderData?.details?.[0];
        const errorMessage = errorDetail ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})` : JSON.stringify(orderData);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error(error);
      setError("Could not initiate PayPal Checkout...");
    }
  };

  const onApprove = async (data: any, actions: any) => {
    try {
      const response = await fetch(`/api/orders/${data.orderID}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ booking_id: bookingId }),
      });

      const orderData = await response.json();
      
      const errorDetail = orderData?.details?.[0];

      if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
        return actions.restart();
      } else if (errorDetail) {
        throw new Error(`${errorDetail.description} (${orderData.debug_id})`);
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      setError("Sorry, your transaction could not be processed.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-white uppercase tracking-widest">{t('payment')}</h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="w-full">
          <PayPalScriptProvider options={initialOptions}>
            <PayPalButtons
              createOrder={(data, actions) => createOrder()}
              onApprove={(data, actions) => onApprove(data, actions)}
              style={{ layout: "vertical", shape: "rect", color: "gold" }}
            />
          </PayPalScriptProvider>
        </div>
      </div>
    </div>
  );
}
