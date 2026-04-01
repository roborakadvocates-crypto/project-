
import React from 'react';
import { Consultant, Language } from '../types';
import { Calendar, Star, ArrowUpRight } from 'lucide-react';
import { translations } from '../locales';

interface ConsultantCardProps {
  consultant: Consultant;
  onBook: (consultant: Consultant) => void;
  language: Language;
}

const ConsultantCard: React.FC<ConsultantCardProps> = ({ consultant, onBook, language }) => {
  const t = translations[language];

  return (
    <div 
        onClick={() => onBook(consultant)}
        className="group relative bg-dark-900 rounded-xl overflow-hidden border border-gray-800/50 hover:border-gold-600/50 transition-all duration-300 flex flex-col h-full 
        hover:shadow-[0_10px_40px_-10px_rgba(184,134,46,0.15)] hover:-translate-y-1
        active:scale-[0.98] active:bg-dark-800 cursor-pointer touch-manipulation"
    >
      {/* Image Container */}
      <div className="h-64 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent z-10 opacity-60" />
        <img 
          src={consultant.imageUrl} 
          alt={consultant.name} 
          className="w-full h-full object-cover grayscale brightness-[0.85] transition-all duration-1000 ease-in-out group-hover:scale-110 group-hover:grayscale-0 group-hover:brightness-110"
        />
        <div className="absolute top-3 right-3 z-20 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20 text-white text-[10px] font-semibold">
          {consultant.specialty}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20 p-5 flex flex-col flex-grow -mt-10">
        <div className="bg-dark-900/80 backdrop-blur-xl border border-white/5 p-4 rounded-lg shadow-lg mb-3 group-active:border-gold-500/20 transition-colors">
           <div className="flex justify-between items-start mb-1.5">
              <h3 className="text-lg font-bold text-white font-serif-headings group-hover:text-gold-400 transition-colors">{consultant.name}</h3>
              <div className="flex text-gold-500 text-[9px] gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  <Star className="w-2.5 h-2.5 fill-current" />
                  <Star className="w-2.5 h-2.5 fill-current" />
                  <Star className="w-2.5 h-2.5 fill-current" />
                  <Star className="w-2.5 h-2.5 fill-current" />
              </div>
           </div>
           <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider">{consultant.title}</p>
        </div>
        
        <p className="text-gray-400 text-xs mb-5 leading-relaxed line-clamp-3">
          {consultant.bio}
        </p>

        <div className="mt-auto pt-4 border-t border-gray-800/50 flex items-center justify-between gap-3">
          <div>
            <span className="text-gray-500 text-[9px] block mb-0.5">{t.consultants.priceLabel}</span>
            <span className="text-xl font-bold text-white font-serif-headings">
               {consultant.price} <span className="text-xs font-sans text-gold-500">{t.common.currency}</span>
            </span>
          </div>
          
          <button 
            className="px-5 py-2.5 bg-gold-600 text-white font-bold rounded hover:bg-gold-500 transition-all duration-300 flex items-center gap-1.5 group-hover:shadow-lg group-hover:shadow-gold-500/20 active:scale-90 text-[10px]"
          >
            <span>{t.consultants.bookNow}</span>
            <ArrowUpRight className="w-3.5 h-3.5 rtl:rotate-[-90deg]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultantCard;
