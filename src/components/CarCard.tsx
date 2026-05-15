import React, { useState, useRef } from 'react';
import { ShieldCheck, Wind, Settings2, Fuel, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  transmission: string;
  fuel_type: string;
  price_per_day: number;
  ac: number | boolean;
  image_url: string;
}

export default function CarCard({ car, onBook }: { car: Vehicle, onBook: (carId: string) => void | Promise<void>, key?: any }) {
  const { t } = useTranslation();
  
  let images: string[] = [];
  try {
    const parsed = JSON.parse(car.image_url);
    if (Array.isArray(parsed) && parsed.length > 0) {
      images = parsed;
    } else {
      images = car.image_url ? [car.image_url] : [];
    }
  } catch (e) {
    images = car.image_url ? [car.image_url] : [];
  }

  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newIdx = currentImageIdx === 0 ? images.length - 1 : currentImageIdx - 1;
    setCurrentImageIdx(newIdx);
    scrollToIndex(newIdx);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newIdx = currentImageIdx === images.length - 1 ? 0 : currentImageIdx + 1;
    setCurrentImageIdx(newIdx);
    scrollToIndex(newIdx);
  };

  const scrollToIndex = (idx: number) => {
    if (scrollRef.current) {
      const width = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({ left: width * idx, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const width = scrollRef.current.clientWidth;
      const idx = Math.round(scrollRef.current.scrollLeft / width);
      if (idx !== currentImageIdx) {
        setCurrentImageIdx(idx);
      }
    }
  };

  return (
    <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-5 flex flex-col group hover:border-[#E2B808]/50 transition-all shadow-xl">
      <div className="aspect-[16/10] bg-gradient-to-b from-white/5 to-transparent rounded-xl mb-6 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')] opacity-50 z-0"></div>
        
        {images.length > 0 ? (
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-none z-10 mix-blend-screen opacity-90"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {images.map((img, idx) => (
              <img 
                key={idx}
                src={img} 
                alt={`${car.make} ${car.model} - Image ${idx + 1}`}
                className="w-full h-full flex-shrink-0 object-cover transition-transform duration-500 group-hover:scale-105 snap-center"
              />
            ))}
          </div>
        ) : (
          <div className="z-10 text-white/20">No Image</div>
        )}

        {images.length > 1 && (
          <>
            <button 
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black p-1 rounded-full text-white/70 hover:text-white transition-colors opacity-0 group-hover:opacity-100 hidden sm:block"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black p-1 rounded-full text-white/70 hover:text-white transition-colors opacity-0 group-hover:opacity-100 hidden sm:block"
            >
              <ChevronRight size={16} />
            </button>
            
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex gap-1 bg-black/20 p-1 rounded-full backdrop-blur-sm">
              {images.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`transition-all duration-300 rounded-full ${idx === currentImageIdx ? 'w-3 h-1.5 bg-[#E2B808]' : 'w-1.5 h-1.5 bg-white/50'}`} 
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute top-3 left-3 bg-[#E2B808] text-black text-[9px] font-black px-2 py-0.5 rounded z-20 flex items-center gap-1 shadow-[0_2px_10px_rgba(226,184,8,0.2)]">
          <ShieldCheck className="w-3 h-3" />
          {t('verified')}
        </div>
      </div>
      
      <div className="flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <h3 className="font-black text-xl tracking-tight text-white">{car.make} {car.model}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/60">{t('euro6')}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-[#E2B808]">{car.price_per_day}€</div>
            <div className="text-[9px] uppercase tracking-widest opacity-40 text-white">/{t('price_per_day')}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6 flex-grow">
          <div className="bg-white/5 border border-white/5 p-2 rounded-lg flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-black flex items-center justify-center text-[#E2B808]">
              <Settings2 className="w-3 h-3" />
            </div>
            <span className="text-[11px] font-bold opacity-70 text-white truncate">{car.transmission === 'Automatic' ? t('automatic') : t('manual')}</span>
          </div>
          <div className="bg-white/5 border border-white/5 p-2 rounded-lg flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-black flex items-center justify-center text-[#E2B808]">
              <Fuel className="w-3 h-3" />
            </div>
            <span className="text-[11px] font-bold opacity-70 text-white truncate">{car.fuel_type === 'Diesel' ? t('diesel') : car.fuel_type === 'Petrol' ? t('petrol') : t('hybrid')}</span>
          </div>
          <div className="bg-white/5 border border-white/5 p-2 rounded-lg flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-black flex items-center justify-center text-[#E2B808]">
              <Wind className="w-3 h-3" />
            </div>
            <span className="text-[11px] font-bold opacity-70 text-white truncate">{car.ac ? t('ac') : t('no_ac')}</span>
          </div>
        </div>

        <button 
          onClick={() => onBook(car.id)}
          className="w-full py-3 rounded-xl border border-white/10 font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all text-white"
        >
          {t('book_now')}
        </button>
      </div>
    </div>
  );
}
