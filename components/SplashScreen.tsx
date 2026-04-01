
import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowText(true), 600);
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 3000);
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3800);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden transition-all duration-1000 ease-in-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Subtle Ambient Light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gold-600/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center justify-center space-y-6 p-6">
        
        {/* Logo Section - Standard Size */}
        <div className={`relative transition-all duration-1000 transform ${showText ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-4 opacity-0'}`}>
            <img 
              src="./logo.png" 
              alt="Ras Al Khaimah Advocates" 
              className="w-32 md:w-40 h-auto object-contain drop-shadow-2xl"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
                target.nextElementSibling?.classList.add('flex');
              }}
            />
            {/* Fallback Icon */}
            <div className="hidden w-32 h-32 rounded-full bg-transparent border border-gold-500/30 items-center justify-center">
                <ShieldCheck className="text-gold-500 w-16 h-16" />
            </div>
        </div>

        {/* Text Section */}
        <div className={`text-center transition-all duration-1000 delay-300 flex flex-col items-center ${showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-lg md:text-xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-gold-200 via-gold-400 to-gold-200 font-serif-headings tracking-wide leading-relaxed pb-2 drop-shadow-sm animate-shine bg-[length:200%_auto]">
            مكتب رأس الخيمة للمحاماة
          </h1>
          <div className="w-10 h-[0.5px] bg-gold-500/40 my-3"></div>
          <p className="text-gold-100/50 text-[9px] md:text-[10px] font-sans tracking-[0.4em] uppercase font-light">
            RAS AL KHAIMAH ADVOCATES
          </p>
        </div>
      </div>

      <div className={`absolute bottom-12 transition-opacity duration-500 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
         <div className="h-[1.5px] w-16 bg-gray-900 rounded-full overflow-hidden">
            <div className="h-full bg-gold-500 w-full animate-[slide-in_1.5s_ease-in-out_infinite] origin-left"></div>
         </div>
      </div>
    </div>
  );
};

export default SplashScreen;
