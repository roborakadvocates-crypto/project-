
import React, { useState, useEffect } from 'react';
import { ShieldCheck, ScanFace, KeyRound, Check, X, ArrowLeft } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../locales';

interface SecuritySetupProps {
  onComplete: () => void;
  language: Language;
}

const SecuritySetup: React.FC<SecuritySetupProps> = ({ onComplete, language }) => {
  // PROMPT -> SELECT_METHOD -> (CREATE/CONFIRM or FACE_SETUP)
  const [step, setStep] = useState<'PROMPT' | 'SELECT_METHOD' | 'CREATE' | 'CONFIRM' | 'FACE_SETUP'>('PROMPT');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  
  const t = translations[language].security;

  const handleNumberClick = (num: number, isConfirm: boolean) => {
    if (isConfirm) {
        if (confirmPin.length < 4) {
            const newPin = confirmPin + num;
            setConfirmPin(newPin);
            if (newPin.length === 4) handleFinishPin(newPin);
        }
    } else {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) {
                setTimeout(() => setStep('CONFIRM'), 300);
            }
        }
    }
  };

  const handleFinishPin = (finalConfirm: string) => {
      if (pin === finalConfirm) {
          localStorage.setItem('rak_security_enabled', 'true');
          localStorage.setItem('rak_security_method', 'pin');
          localStorage.setItem('rak_security_pin', pin);
          setStep('PROMPT'); 
          setTimeout(onComplete, 500);
      } else {
          setError(true);
          setTimeout(() => {
              setConfirmPin('');
              setPin('');
              setError(false);
              setStep('CREATE');
          }, 800);
      }
  };

  useEffect(() => {
    if (step === 'FACE_SETUP') {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            setScanProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                localStorage.setItem('rak_security_enabled', 'true');
                localStorage.setItem('rak_security_method', 'face');
                // We still set a dummy PIN or a backup PIN in real app, 
                // but here we just mark method as face
                localStorage.setItem('rak_security_pin', '0000'); // Backup default
                setTimeout(onComplete, 800);
            }
        }, 50);
        return () => clearInterval(interval);
    }
  }, [step, onComplete]);

  const handleSkip = () => {
      localStorage.setItem('rak_security_enabled', 'false');
      onComplete();
  };

  // 1. Initial Prompt
  if (step === 'PROMPT') {
      return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-dark-900 border border-gold-600/30 rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-600 to-gold-400" />
                
                <div className="w-20 h-20 bg-gold-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-gold-500/20">
                    <ShieldCheck className="w-10 h-10 text-gold-500" />
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2 font-serif-headings">{t.setupTitle}</h2>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                    {t.setupDesc}
                </p>

                <div className="space-y-3">
                    <button 
                        onClick={() => setStep('SELECT_METHOD')}
                        className="w-full bg-gold-600 hover:bg-gold-500 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-gold-600/20"
                    >
                        {t.enable}
                    </button>
                    <button 
                        onClick={handleSkip}
                        className="w-full bg-transparent text-gray-500 font-bold py-3 hover:text-white transition-colors text-xs uppercase tracking-widest"
                    >
                        {t.skip}
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // 2. Select Method
  if (step === 'SELECT_METHOD') {
    return (
        <div className="fixed inset-0 z-[200] bg-dark-950 flex flex-col items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-8">
            <div className="w-full max-w-sm">
                <h2 className="text-2xl font-bold text-white mb-8 text-center font-serif-headings">{t.chooseMethod}</h2>
                
                <div className="grid grid-cols-1 gap-4">
                    <button 
                        onClick={() => setStep('FACE_SETUP')}
                        className="group bg-dark-900 border border-gray-800 hover:border-gold-500 p-6 rounded-2xl flex items-center gap-6 transition-all shadow-xl hover:shadow-gold-500/10"
                    >
                        <div className="w-16 h-16 bg-gold-600/10 rounded-full flex items-center justify-center group-hover:bg-gold-500 group-hover:text-black text-gold-500 transition-colors">
                            <ScanFace className="w-8 h-8" />
                        </div>
                        <div className="text-right rtl:text-right ltr:text-left">
                            <h3 className="text-lg font-bold text-white group-hover:text-gold-500 transition-colors">{t.methodFace}</h3>
                            <p className="text-xs text-gray-400">{t.methodFaceDesc}</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => setStep('CREATE')}
                        className="group bg-dark-900 border border-gray-800 hover:border-gold-500 p-6 rounded-2xl flex items-center gap-6 transition-all shadow-xl hover:shadow-gold-500/10"
                    >
                        <div className="w-16 h-16 bg-gold-600/10 rounded-full flex items-center justify-center group-hover:bg-gold-500 group-hover:text-black text-gold-500 transition-colors">
                            <KeyRound className="w-8 h-8" />
                        </div>
                        <div className="text-right rtl:text-right ltr:text-left">
                            <h3 className="text-lg font-bold text-white group-hover:text-gold-500 transition-colors">{t.methodPin}</h3>
                            <p className="text-xs text-gray-400">{t.methodPinDesc}</p>
                        </div>
                    </button>
                </div>

                <button onClick={() => setStep('PROMPT')} className="mt-12 w-full text-gray-500 hover:text-white transition-colors text-sm flex items-center justify-center gap-2">
                    {translations[language].common.cancel}
                </button>
            </div>
        </div>
    );
  }

  // 3. Face ID Setup Simulation
  if (step === 'FACE_SETUP') {
      return (
        <div className="fixed inset-0 z-[200] bg-dark-950 flex flex-col items-center justify-center p-4">
            <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-gray-800"></div>
                <div 
                    className="absolute inset-0 rounded-full border-4 border-gold-500 border-t-transparent animate-spin"
                    style={{ animationDuration: '2s' }}
                ></div>
                <ScanFace className={`w-32 h-32 ${scanProgress === 100 ? 'text-green-500' : 'text-gold-500'} transition-colors`} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{scanProgress === 100 ? t.faceSuccess : t.scanning}</h2>
            <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden mt-4">
                <div className="h-full bg-gold-500 transition-all duration-75" style={{ width: `${scanProgress}%` }}></div>
            </div>
        </div>
      );
  }

  // 4. KEYPAD UI for CREATE/CONFIRM (PASSCODE)
  const currentPin = step === 'CREATE' ? pin : confirmPin;
  const title = step === 'CREATE' ? t.createPasscode : t.confirmPasscode;

  return (
    <div className="fixed inset-0 z-[200] bg-dark-950 flex flex-col items-center justify-center p-4">
       <button onClick={() => setStep('SELECT_METHOD')} className="absolute top-10 left-6 rtl:left-auto rtl:right-6 p-2 text-gray-400 hover:text-white"><ArrowLeft className="w-6 h-6 rtl:rotate-180" /></button>
       
       <h2 className={`text-xl font-bold text-white mb-8 ${error ? 'text-red-500 animate-pulse' : ''}`}>
           {error ? t.mismatch : title}
       </h2>
       
       <div className="flex gap-4 mb-12">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border border-gold-500/50 transition-all ${
                i < currentPin.length ? 'bg-gold-500 scale-110' : 'bg-transparent'
              }`} 
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 w-full max-w-xs px-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                    key={num}
                    onClick={() => handleNumberClick(num, step === 'CONFIRM')}
                    className="aspect-square rounded-full bg-white/5 hover:bg-gold-500/20 border border-white/10 hover:border-gold-500/50 text-2xl font-medium text-white transition-all active:scale-90"
                >
                    {num}
                </button>
            ))}
            <div />
            <button
                onClick={() => handleNumberClick(0, step === 'CONFIRM')}
                className="aspect-square rounded-full bg-white/5 hover:bg-gold-500/20 border border-white/10 hover:border-gold-500/50 text-2xl font-medium text-white transition-all active:scale-90"
            >
                0
            </button>
            <div />
        </div>

        <button onClick={() => { setPin(''); setConfirmPin(''); setStep('SELECT_METHOD'); }} className="mt-10 text-gray-500 hover:text-white transition-colors text-sm">
            {translations[language].common.cancel}
        </button>
    </div>
  );
};

export default SecuritySetup;
