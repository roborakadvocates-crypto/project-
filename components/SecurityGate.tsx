
import React, { useState, useEffect } from 'react';
import { ScanFace, Delete, Unlock, Keyboard } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../locales';

interface SecurityGateProps {
  onUnlock: () => void;
  language: Language;
}

const SecurityGate: React.FC<SecurityGateProps> = ({ onUnlock, language }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [showKeypad, setShowKeypad] = useState(true);
  
  const t = translations[language].security;
  const savedPin = localStorage.getItem('rak_security_pin');
  const method = localStorage.getItem('rak_security_method'); // 'face' or 'pin'

  useEffect(() => {
    // If method is Face ID, start scanning immediately and hide keypad initially
    if (method === 'face') {
        setShowKeypad(false);
        handleFaceId();
    } else {
        setShowKeypad(true);
    }
  }, []);

  const handleNumberClick = (num: number) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        validatePin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const validatePin = (inputPin: string) => {
    // Note: In a real app with Face ID only, we'd have a backup PIN.
    // Here we check against the saved PIN (which is set to 0000 for face or user chosen for pin)
    // Or we strictly rely on Face simulation if that's what they chose.
    // For better UX, let's assume the PIN works as a fallback.
    if (inputPin === savedPin || (method === 'face' && inputPin === '0000')) {
      setTimeout(onUnlock, 200);
    } else {
      setError(true);
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 500);
    }
  };

  const handleFaceId = () => {
    setIsFaceScanning(true);
    // Simulate Face ID scan time
    setTimeout(() => {
      setIsFaceScanning(false);
      onUnlock();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-dark-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-gold-900/10 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm animate-in fade-in zoom-in duration-500">
        
        {/* Lock Icon / Status */}
        <div className="mb-8 flex flex-col items-center gap-4 cursor-pointer" onClick={method === 'face' && !isFaceScanning ? handleFaceId : undefined}>
            <div className={`w-20 h-20 rounded-3xl bg-dark-900 border border-gold-600/30 flex items-center justify-center shadow-[0_0_30px_rgba(184,134,46,0.2)] transition-all duration-500 ${isFaceScanning ? 'scale-110 border-gold-500 shadow-[0_0_50px_rgba(184,134,46,0.5)]' : ''}`}>
                {isFaceScanning || method === 'face' ? (
                    <ScanFace className={`w-10 h-10 text-gold-500 ${isFaceScanning ? 'animate-pulse' : ''}`} />
                ) : (
                    <Unlock className="w-10 h-10 text-gold-500" />
                )}
            </div>
            <div className="text-center">
                <h2 className="text-sm font-bold tracking-[0.2em] text-gold-500 uppercase mb-1">{t.gateTitle}</h2>
                <p className="text-2xl font-serif-headings font-bold text-white">
                    {isFaceScanning ? t.scanning : (showKeypad ? t.enterPasscode : t.methodFace)}
                </p>
            </div>
        </div>

        {showKeypad ? (
            <>
                {/* PIN Dots */}
                <div className="flex gap-4 mb-12">
                {[0, 1, 2, 3].map((i) => (
                    <div 
                    key={i} 
                    className={`w-4 h-4 rounded-full border border-gold-500/50 transition-all duration-300 ${
                        i < pin.length 
                            ? error ? 'bg-red-500 border-red-500 scale-110' : 'bg-gold-500 scale-110' 
                            : 'bg-transparent'
                    }`} 
                    />
                ))}
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-6 w-full px-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            className="aspect-square rounded-full bg-white/5 hover:bg-gold-500/20 border border-white/10 hover:border-gold-500/50 text-2xl font-medium transition-all active:scale-90 flex items-center justify-center backdrop-blur-sm"
                        >
                            {num}
                        </button>
                    ))}
                    
                    {/* Face ID Trigger Button (if keypad is shown) */}
                    <button 
                        onClick={handleFaceId}
                        className="aspect-square flex items-center justify-center rounded-full text-gold-500 hover:text-white transition-colors active:scale-90"
                    >
                        <ScanFace className="w-7 h-7" />
                    </button>

                    <button
                        onClick={() => handleNumberClick(0)}
                        className="aspect-square rounded-full bg-white/5 hover:bg-gold-500/20 border border-white/10 hover:border-gold-500/50 text-2xl font-medium transition-all active:scale-90 flex items-center justify-center backdrop-blur-sm"
                    >
                        0
                    </button>

                    <button
                        onClick={handleDelete}
                        className="aspect-square flex items-center justify-center rounded-full text-white/50 hover:text-white transition-colors active:scale-90"
                    >
                        <Delete className="w-7 h-7" />
                    </button>
                </div>
            </>
        ) : (
            <button 
                onClick={() => setShowKeypad(true)}
                className="mt-8 flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm uppercase tracking-widest font-bold px-6 py-3 rounded-xl border border-gray-800 hover:border-gold-500/50 bg-dark-900"
            >
                <Keyboard className="w-4 h-4" /> {t.createPasscode.replace('إنشاء', 'استخدام').replace('Create', 'Use')}
            </button>
        )}

      </div>
    </div>
  );
};

export default SecurityGate;
