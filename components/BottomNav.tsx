
import React from 'react';
import { Scale, User, UserPlus, LayoutDashboard, Briefcase } from 'lucide-react';
import { ViewState, Language } from '../types';
import { translations } from '../locales';

interface BottomNavProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  language: Language;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView, language }) => {
  const t = translations[language].nav;

  const navItems = [
    { label: t.home, value: 'HOME' as ViewState, icon: Scale },
    { label: t.consultants, value: 'CONSULTANTS' as ViewState, icon: Briefcase },
    { label: t.portal, value: 'CLIENT_PORTAL' as ViewState, icon: User },
    { label: t.register, value: 'CLIENT_REGISTER' as ViewState, icon: UserPlus },
    { label: t.admin, value: 'ADMIN_DASHBOARD' as ViewState, icon: LayoutDashboard },
  ];

  return (
    <div className={`
        fixed z-[50] bg-dark-950/95 backdrop-blur-xl border-gold-600/30 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] transition-all duration-300
        
        /* Portrait Mode (Default: Bottom Bar) */
        portrait:bottom-0 portrait:left-0 portrait:right-0 portrait:border-t portrait:pb-8 portrait:h-28
        portrait:flex portrait:items-center portrait:justify-around portrait:w-full

        /* Landscape Mode (Side Rail) */
        landscape:top-0 landscape:bottom-0 landscape:w-24 landscape:border-t-0 landscape:flex-col landscape:pt-24 landscape:pb-safe landscape:justify-start landscape:gap-6
        landscape:ltr:left-0 landscape:ltr:border-r 
        landscape:rtl:right-0 landscape:rtl:border-l
    `}>
      <div className="w-full h-full flex portrait:flex-row landscape:flex-col portrait:justify-around landscape:justify-start landscape:items-center px-2">
        {navItems.map((item) => {
          const isActive = currentView === item.value;
          return (
            <button
              key={item.value}
              onClick={() => setCurrentView(item.value)}
              className={`group relative flex flex-col items-center justify-center transition-all duration-300 
                portrait:w-full portrait:h-full portrait:space-y-1.5
                landscape:w-16 landscape:h-16 landscape:rounded-2xl landscape:mb-4
                ${isActive ? 'text-gold-500' : 'text-gray-500 hover:text-gray-300'}
                ${isActive ? 'landscape:bg-gold-500/10' : ''}
              `}
            >
              {/* Active Indicator Glow (Portrait) */}
              {isActive && (
                <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-16 h-1 bg-gold-500 rounded-b-full shadow-[0_2px_15px_rgba(184,134,46,0.8)] portrait:block landscape:hidden"></div>
              )}
               {/* Active Indicator Bar (Landscape) */}
              {isActive && (
                 <div className="absolute top-1/2 -translate-y-1/2 w-1 h-8 bg-gold-500 rounded-full shadow-[2px_0_15px_rgba(184,134,46,0.8)] landscape:block portrait:hidden ltr:-left-[1px] rtl:-right-[1px]"></div>
              )}

              <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive && 'portrait:bg-gold-500/10 portrait:-translate-y-1'}`}>
                <item.icon 
                  className={`w-6 h-6 transition-all duration-500 ${
                    isActive 
                      ? 'stroke-[2.5px] fill-gold-500/10 animate-pulse-light drop-shadow-[0_0_8px_rgba(184,134,46,0.8)]' 
                      : 'stroke-2'
                  }`} 
                />
              </div>
              
              <span className={`text-[10px] font-bold tracking-wide transition-all duration-300 
                ${isActive ? 'opacity-100 portrait:-translate-y-0.5 text-gold-400' : 'opacity-60'}
                landscape:hidden lg:landscape:block
              `}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
