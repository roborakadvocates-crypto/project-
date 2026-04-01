
import React from 'react';
import { Phone, Mail, MapPin, Facebook, Instagram } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../locales';

interface FooterProps { language: Language; }

const Footer: React.FC<FooterProps> = ({ language }) => {
  const t = translations[language].footer;

  return (
    <footer className="bg-dark-950 border-t border-gold-600/20 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 items-start">
          
          {/* Column 1: About (Centered) */}
          <div className="text-center space-y-4 flex flex-col items-center">
            <h3 className="text-xl font-bold text-gold-500 font-serif-headings">{t.aboutTitle}</h3>
            <p className="text-gray-400 leading-relaxed text-sm max-w-sm mx-auto">
              {t.aboutDesc}
            </p>
          </div>

          {/* Column 2: Contact Us (Centered in the middle) */}
          <div className="text-center space-y-6">
            <h3 className="text-lg font-bold text-white font-serif-headings inline-block border-b-2 border-gold-500 pb-1">
              {t.contactTitle}
            </h3>
            <ul className="space-y-4">
              {/* Phone Link */}
              <li className="flex flex-col items-center group">
                <a href="tel:00971527862750" className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-gold-600/10 flex items-center justify-center mb-1 group-hover:bg-gold-500 transition-colors">
                    <Phone className="w-4 h-4 text-gold-500 group-hover:text-black animate-icon-glow group-hover:animate-none" />
                  </div>
                  <span className="font-mono text-sm text-gray-300 group-hover:text-gold-500 transition-colors">00971527862750</span>
                </a>
              </li>

              {/* Email Link */}
              <li className="flex flex-col items-center group">
                <a href="mailto:info@rakadvocates.com" className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-gold-600/10 flex items-center justify-center mb-1 group-hover:bg-gold-500 transition-colors">
                    <Mail className="w-4 h-4 text-gold-500 group-hover:text-black animate-icon-glow group-hover:animate-none" />
                  </div>
                  <span className="text-sm text-gray-300 group-hover:text-gold-500 transition-colors">info@rakadvocates.com</span>
                </a>
              </li>

              {/* Location Link */}
              <li className="flex flex-col items-center group">
                <a 
                  href="https://maps.app.goo.gl/hq3b3C2EEGDV566d6" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-8 h-8 rounded-full bg-gold-600/10 flex items-center justify-center mb-1 group-hover:bg-gold-500 transition-colors">
                    <MapPin className="w-4 h-4 text-gold-500 group-hover:text-black animate-icon-glow group-hover:animate-none" />
                  </div>
                  <span className="text-sm text-gray-300 max-w-[200px] group-hover:text-gold-500 transition-colors">
                    {language === 'ar' 
                      ? 'رأس الخيمة - كورنيش القواسم برج إن اس تاور - مكتب 2/201' 
                      : 'Ras Al Khaimah - Corniche Al Qawasim, NS Tower - Office 201/2'}
                  </span>
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Follow Us (Centered) */}
          <div className="text-center space-y-6">
            <h3 className="text-lg font-bold text-white font-serif-headings inline-block border-b-2 border-gold-500 pb-1">
              {t.followTitle}
            </h3>
            <div className="flex gap-4 justify-center">
              <a href="https://www.facebook.com/Rak.Advocates/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-center hover:bg-gold-600 hover:text-black transition-all group shadow-lg">
                <Facebook className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </a>
              <a href="https://www.instagram.com/rakadvocates/?hl=ar" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-center hover:bg-gold-600 hover:text-black transition-all group shadow-lg">
                <Instagram className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </a>
              <a href="https://www.tiktok.com/@rakadvocates" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-center hover:bg-gold-600 hover:text-black transition-all group shadow-lg">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-6 h-6 group-hover:scale-110 transition-transform"
                >
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                </svg>
              </a>
            </div>
            
            <div className="pt-8 mt-4 border-t border-white/5 text-center">
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest leading-loose">
                  {t.rights} {new Date().getFullYear()}<br/>
                  RAK ADVOCATES & LEGAL CONSULTANTS
                </p>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
