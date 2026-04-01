
import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, Sparkles, Scale, ShieldCheck } from 'lucide-react';
import { Language } from '../types';

interface OnboardingProps {
  onComplete: () => void;
  language: Language;
}

const SLIDES = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=2000', // Gavel/Legal
    titleAr: 'الريادة في العمل القانوني',
    descAr: 'نقدم خدمات قانونية استثنائية تجمع بين العراقة والخبرة الطويلة وبين أحدث التقنيات الرقمية.',
    titleEn: 'Excellence in Legal Practice',
    descEn: 'We provide exceptional legal services combining heritage and deep experience with modern digital technologies.',
    icon: Scale
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=2000', // Handshake/Meeting
    titleAr: 'شريكك القانوني الموثوق',
    descAr: 'نخبة من المستشارين ذوي الخبرة والكفاءة العالية لحماية مصالحك وتحقيق العدالة.',
    titleEn: 'Your Trusted Legal Partner',
    descEn: 'Elite consultants with high experience and efficiency to protect your interests and achieve justice.',
    icon: ShieldCheck
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=2000', // Digital/Signing
    titleAr: 'متابعة قضاياك رقمياً',
    descAr: 'تطبيق متطور يتيح لك حجز الاستشارات، متابعة الجلسات، والاطلاع على المستندات بضغطة زر.',
    titleEn: 'Track Cases Digitally',
    descEn: 'Advanced app allowing you to book consultations, track hearings, and view documents with a single click.',
    icon: Sparkles
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, language }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentSlide = SLIDES[currentIndex];

  return (
    <div className="fixed inset-0 z-[500] bg-dark-950 flex flex-col overflow-hidden">
      
      {/* Background Image Layer with Zoom Effect */}
      <div className="absolute inset-0 z-0">
        <div 
          key={currentIndex}
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] ease-linear scale-100 animate-slow-spin"
          style={{ 
            backgroundImage: `url(${currentSlide.image})`,
            animation: 'float 20s infinite alternate' // Utilizing existing float animation for subtle movement
          }}
        />
        {/* Heavy Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/80 to-transparent z-10" />
      </div>

      {/* Top Bar */}
      <div className="relative z-20 p-6 flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex gap-1">
           {SLIDES.map((_, idx) => (
             <div 
                key={idx} 
                className={`h-1 rounded-full transition-all duration-500 ${idx === currentIndex ? 'w-8 bg-gold-500' : 'w-2 bg-gray-700'}`}
             />
           ))}
        </div>
        <button 
            onClick={handleSkip}
            className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
        >
            {language === 'ar' ? 'تخطي' : 'SKIP'}
        </button>
      </div>

      {/* Content Area */}
      <div className="relative z-20 mt-auto p-8 pb-12 flex flex-col items-start min-h-[40%]">
         
         {/* Icon Badge */}
         <div 
            key={`icon-${currentIndex}`}
            className={`w-14 h-14 mb-6 rounded-2xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-500 shadow-[0_0_30px_rgba(184,134,46,0.2)] ${!isAnimating ? 'animate-in zoom-in duration-500' : 'opacity-0'}`}
         >
            <currentSlide.icon className="w-7 h-7" />
         </div>

         {/* Text Content with Animation */}
         <div className={`space-y-4 transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            <h2 className="text-4xl md:text-5xl font-bold text-white font-serif-headings leading-tight">
                {language === 'ar' ? currentSlide.titleAr : currentSlide.titleEn}
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                {language === 'ar' ? currentSlide.descAr : currentSlide.descEn}
            </p>
         </div>

         {/* Bottom Action Bar */}
         <div className="w-full flex justify-between items-end mt-10">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em]">
                    {currentIndex + 1} / {SLIDES.length}
                </span>
            </div>

            <button 
                onClick={handleNext}
                className="group relative w-16 h-16 rounded-full bg-gold-600 hover:bg-gold-500 flex items-center justify-center transition-all shadow-lg shadow-gold-600/20 active:scale-90"
            >
                {/* Ring Animation */}
                <span className="absolute inset-0 rounded-full border border-white/20 scale-100 group-hover:scale-110 transition-transform duration-500"></span>
                
                {currentIndex === SLIDES.length - 1 ? (
                    <Check className="w-6 h-6 text-black" />
                ) : (
                    <ArrowRight className={`w-6 h-6 text-black transition-transform ${language === 'ar' ? 'rotate-180' : ''}`} />
                )}
            </button>
         </div>
      </div>
    </div>
  );
};

export default Onboarding;
