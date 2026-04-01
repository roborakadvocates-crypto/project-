
import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck, Globe, User, LogOut, ChevronDown, Briefcase } from 'lucide-react';
import { ViewState, Language, RegisteredUser, LegalCase } from '../types';
import { translations } from '../locales';

interface NavbarProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currentUser?: RegisteredUser | null;
  portalUser?: LegalCase | null;
  onLogout?: () => void;
  onPortalLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
    currentView, setCurrentView, language, setLanguage, 
    currentUser, portalUser, onLogout, onPortalLogout 
}) => {
  const [imgError, setImgError] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const t = translations[language].nav;

  // Determine active user (App User has priority if both exist, though unlikely)
  const activeUser = currentUser || portalUser;
  const isPortalUser = !currentUser && !!portalUser;
  const userNameDisplay = currentUser ? currentUser.username : (portalUser ? portalUser.clientName : '');
  const userInitials = userNameDisplay ? userNameDisplay.charAt(0).toUpperCase() : 'U';

  // Handle Direction Change
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Handle Scroll Effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on click outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              setShowProfileMenu(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const handleLogoutClick = () => {
      if (isPortalUser && onPortalLogout) {
          onPortalLogout();
      } else if (onLogout) {
          onLogout();
      }
      setShowProfileMenu(false);
  };

  return (
    <nav 
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${
      scrolled 
        ? 'bg-[#050505]/90 backdrop-blur-2xl shadow-[0_10px_40px_-10px_rgba(184,134,46,0.1)] py-2 border-b border-gold-500/10' 
        : 'bg-transparent py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between w-full">
          
          {/* Logo Section (Right in RTL, Left in LTR) */}
          <div 
            className="flex-shrink-0 flex items-center gap-3 cursor-pointer group" 
            onClick={() => setCurrentView('HOME')}
          >
            {/* Logo Image */}
            {!imgError ? (
               <img 
                 src="./logo.png" 
                 alt="Ras Al Khaimah Advocates Logo" 
                 className={`transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${scrolled ? 'h-8 opacity-100' : 'h-10 opacity-100'} w-auto object-contain drop-shadow-[0_0_15px_rgba(184,134,46,0.3)] ${language === 'ar' ? 'order-2' : 'order-1'}`}
                 onError={() => setImgError(true)}
               />
            ) : (
              <div className={`w-8 h-8 rounded-full bg-gradient-to-tr from-gold-400 to-gold-700 flex items-center justify-center shadow-lg shadow-gold-500/20 ${language === 'ar' ? 'order-2' : 'order-1'}`}>
                <ShieldCheck className="text-black w-4 h-4" />
              </div>
            )}
            
            {/* Logo Text */}
            <div className={`flex flex-col justify-center transition-all duration-700 ${scrolled ? 'gap-0' : 'gap-0.5'} items-center ${language === 'ar' ? 'order-1' : 'order-2'}`}>
              <span className={`font-bold font-serif-headings tracking-wide text-white leading-none transition-all duration-700 ${scrolled ? 'text-xs' : 'text-sm'} text-center group-hover:text-gold-400`}>
                {t.brandTitle}
              </span>
              <span className={`text-[7px] tracking-[0.2em] uppercase font-semibold transition-all duration-700 text-center
                  text-transparent bg-clip-text bg-gradient-to-b from-gold-200 via-gold-400 to-gold-700 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]
                  ${scrolled ? 'opacity-0 h-0 overflow-hidden' : 'h-auto animate-pulse-light'}`}>
                {t.brandSubtitle}
              </span>
            </div>
          </div>

          {/* Right Actions: Profile & Language */}
          <div className="flex items-center gap-2">
              
              {/* User Profile Dropdown */}
              {activeUser && (
                  <div className="relative" ref={menuRef}>
                      <button 
                          onClick={() => setShowProfileMenu(!showProfileMenu)}
                          className="flex items-center gap-2 px-2 py-1 rounded-full border border-gold-500/20 bg-dark-900/50 hover:bg-gold-600/10 hover:border-gold-500 transition-all group"
                      >
                          <div className={`w-6 h-6 rounded-full ${isPortalUser ? 'bg-blue-600' : 'bg-gold-600'} flex items-center justify-center text-black font-bold text-[10px] shadow-md`}>
                              {userInitials}
                          </div>
                          <div className="hidden md:flex flex-col items-start">
                             <span className="text-[8px] text-gray-500 font-bold uppercase leading-none mb-0.5">{isPortalUser ? (language === 'ar' ? 'موكل' : 'Client') : (language === 'ar' ? 'عضو' : 'Member')}</span>
                             <span className="text-[10px] font-bold text-gray-300 max-w-[70px] truncate group-hover:text-white transition-colors">
                                 {userNameDisplay}
                             </span>
                          </div>
                          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                      </button>

                      {showProfileMenu && (
                          <div className="absolute top-full mt-2 ltr:right-0 rtl:left-0 w-48 bg-dark-900 border border-gold-600/20 rounded-xl shadow-[0_10px_40px_-5px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 origin-top z-50">
                              <div className="p-3 border-b border-gray-800/50">
                                  <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">{t.welcome}</p>
                                  <p className="text-xs font-bold text-white truncate">{isPortalUser ? (activeUser as LegalCase).clientName : (activeUser as RegisteredUser).name}</p>
                                  {!isPortalUser && <p className="text-[10px] text-gold-500 font-mono mt-0.5">{(activeUser as RegisteredUser).username}</p>}
                                  {isPortalUser && <p className="text-[10px] text-blue-500 font-mono mt-0.5">{(activeUser as LegalCase).caseNumber}</p>}
                              </div>
                              <div className="p-1">
                                  <button onClick={() => { setCurrentView(isPortalUser ? 'CLIENT_PORTAL' : 'CLIENT_REGISTER'); setShowProfileMenu(false); }} className="w-full text-start flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-all text-[11px] font-bold">
                                      {isPortalUser ? <Briefcase className="w-3 h-3 text-blue-500" /> : <User className="w-3 h-3 text-gold-500" />}
                                      {isPortalUser ? (language === 'ar' ? 'ملف القضية' : 'Case File') : t.profile}
                                  </button>
                                  <button 
                                      onClick={handleLogoutClick}
                                      className="w-full text-start flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-900/20 text-red-500 transition-all text-[11px] font-bold mt-0.5"
                                  >
                                      <LogOut className="w-3 h-3" />
                                      {t.logout}
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              )}

              {/* Language Switcher */}
              <button
                onClick={toggleLanguage}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-gold-500/30 bg-black/40 hover:bg-gold-500 hover:text-black hover:border-gold-500 transition-all duration-500 text-[9px] font-bold tracking-widest text-gold-400 uppercase backdrop-blur-md ${scrolled ? 'scale-90' : 'scale-100'}`}
              >
                <Globe className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">{language === 'ar' ? 'English' : 'عربي'}</span>
                <span className="sm:hidden">{language === 'ar' ? 'En' : 'ع'}</span>
              </button>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
