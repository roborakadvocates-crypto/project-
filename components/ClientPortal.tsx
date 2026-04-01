
import React, { useState, useEffect } from 'react';
import { LegalCase, Language, CaseDocument } from '../types';
import { verifyPassword } from '../utils/crypto';
import { 
  FileText, Calendar, Clock, AlertCircle, Lock, User, Key, LogOut, 
  Download, Briefcase, ShieldCheck, CheckCircle, Bell, X, Smartphone, Check 
} from 'lucide-react';
import { translations } from '../locales';
import { auth, db } from '../utils/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface ClientPortalProps {
    language: Language;
    onRegisterClick: () => void;
    initialActiveCase?: LegalCase | null;
    onPortalLoginSuccess?: (caseData: LegalCase) => void;
    onPortalLogout?: () => void;
}

const ClientPortal: React.FC<ClientPortalProps> = ({ 
    language, onRegisterClick, initialActiveCase, 
    onPortalLoginSuccess, onPortalLogout 
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeCase, setActiveCase] = useState<LegalCase | null>(initialActiveCase || null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Login Steps
  const [loginStep, setLoginStep] = useState<'CREDENTIALS' | 'OTP'>('CREDENTIALS');
  const [otpCode, setOtpCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [pendingCaseId, setPendingCaseId] = useState<string | null>(null);
  
  const t = translations[language].portal;

  // Sync with prop changes (if updated from App level)
  useEffect(() => {
      setActiveCase(initialActiveCase || null);
  }, [initialActiveCase]);

  // --- REAL-TIME NOTIFICATION LOGIC ---
  const [notification, setNotification] = useState<{title: string, message: string} | null>(null);
  const lastSyncTimeRef = React.useRef<number>(Date.now());

  const playNotificationSound = () => {
      try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContext) return;
          
          const audioCtx = new AudioContext();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          
          oscillator.start();
          gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
          oscillator.stop(audioCtx.currentTime + 0.5);
      } catch (e) {
          console.error("Audio play failed", e);
      }
  };

  useEffect(() => {
      if (!activeCase) return;

      const checkUpdates = () => {
          const syncEventStr = localStorage.getItem('rak_latest_sync_event');
          if (syncEventStr) {
              try {
                  const syncEvent = JSON.parse(syncEventStr);
                  // Check if this event is new (timestamp > last checked) AND relevant to current case
                  if (syncEvent.timestamp > lastSyncTimeRef.current && syncEvent.clientId === activeCase.id) {
                      lastSyncTimeRef.current = syncEvent.timestamp;
                      
                      // 1. Refresh Case Data
                      const savedCases = JSON.parse(localStorage.getItem('rak_cases') || '{}');
                      const updatedCase = savedCases[activeCase.id];
                      if (updatedCase) {
                          setActiveCase(updatedCase);
                      }

                      // 2. Show Notification
                      setNotification({
                          title: language === 'ar' ? 'تحديث جديد في القضية' : 'New Case Update',
                          message: syncEvent.title || (language === 'ar' ? 'تم إضافة تحديث جديد' : 'A new update has been added')
                      });

                      // 3. Play Sound
                      playNotificationSound();

                      // Auto hide after 5 seconds
                      setTimeout(() => setNotification(null), 5000);
                  }
              } catch (e) {
                  console.error("Sync error", e);
              }
          }
      };

      // Poll every 2 seconds for updates
      const interval = setInterval(checkUpdates, 2000);
      return () => clearInterval(interval);
  }, [activeCase, language]);

  // Check for persisted session on mount
  useEffect(() => {
      // Logic handled in App.tsx now for global state, but local check adds redundancy/safety
      const savedCaseId = localStorage.getItem('rak_portal_session_caseId');
      if (savedCaseId && !activeCase) {
          const savedCases = JSON.parse(localStorage.getItem('rak_cases') || '{}');
          const userCaseData = savedCases[savedCaseId];
          if (userCaseData) {
              setActiveCase(userCaseData);
          }
      }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        const normalizedUsername = username.trim().toLowerCase();
        
        let userCredentials: any = null;
        let clientProfile: any = null;

        // Try to fetch from Firestore first
        if (db) {
            try {
                const userDoc = await getDoc(doc(db, 'user_logins', normalizedUsername));
                if (userDoc.exists()) {
                    userCredentials = userDoc.data();
                    const clientId = userCredentials.clientId || userCredentials.caseId;
                    const clientDoc = await getDoc(doc(db, 'clients', clientId));
                    if (clientDoc.exists()) {
                        clientProfile = clientDoc.data();
                    }
                }
            } catch (err) {
                console.error("Firestore fetch error", err);
            }
        }

        // Fallback to localStorage if Firestore fails or is unavailable
        if (!userCredentials) {
            const savedUsers = JSON.parse(localStorage.getItem('rak_user_logins') || '{}');
            userCredentials = savedUsers[normalizedUsername];
        }

        if (!clientProfile && userCredentials) {
            const clientId = userCredentials.clientId || userCredentials.caseId;
            const clients = JSON.parse(localStorage.getItem('rak_clients') || '[]');
            clientProfile = clients.find((c: any) => c.id === clientId);
        }
        
        let isValid = false;

        // Try Firebase Auth first
        try {
            const email = `${normalizedUsername}@rakadvocates.app`;
            await signInWithEmailAndPassword(auth, email, password);
            isValid = true;
        } catch (firebaseError) {
            // Fallback to legacy local storage password if Firebase Auth fails
            if (userCredentials && userCredentials.password) {
                isValid = await verifyPassword(password, userCredentials.password);
            }
        }
        
        if (isValid && userCredentials) {
            // Credentials Valid. Now Check Phone.
            if (clientProfile && clientProfile.phone) {
                // Phone found. Trigger OTP Flow.
                const phone = clientProfile.phone;
                const masked = phone.replace(/.(?=.{4})/g, '*'); // Mask all but last 4
                setMaskedPhone(masked);
                setPendingCaseId(userCredentials.caseId);
                
                // Simulate Sending OTP
                setTimeout(() => {
                    setLoading(false);
                    setLoginStep('OTP');
                }, 800);
                return; // Stop here, wait for OTP
            } else {
                // No phone registered? Fallback or Error?
                setError(language === 'ar' ? 'رقم الهاتف غير مسجل لهذا الحساب. يرجى مراجعة الإدارة.' : 'Phone number not registered. Please contact admin.');
            }
        } else {
            setError(t.loginError);
        }
    } catch (e) {
        setError('Security Error occurred');
    }
    
    setLoading(false);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      // Simulate OTP Verification
      // In real app, verify against sent code
      if (otpCode === '123456') {
          setTimeout(() => {
              if (pendingCaseId) {
                  const savedCases = JSON.parse(localStorage.getItem('rak_cases') || '{}');
                  const userCaseData = savedCases[pendingCaseId];
                  if (userCaseData) {
                      setActiveCase(userCaseData);
                      if(onPortalLoginSuccess) onPortalLoginSuccess(userCaseData);
                  } else {
                      setError(language === 'ar' ? 'ملف القضية غير متاح.' : 'Case file unavailable.');
                  }
              }
              setLoading(false);
          }, 800);
      } else {
          setLoading(false);
          setError(language === 'ar' ? 'رمز التحقق غير صحيح' : 'Invalid OTP');
      }
  };

  const handleLogout = () => {
      setActiveCase(null);
      setUsername('');
      setPassword('');
      setLoginStep('CREDENTIALS');
      setOtpCode('');
      setPendingCaseId(null);
      if (onPortalLogout) onPortalLogout();
  };

  const handleDownload = (doc: CaseDocument) => {
    // High-performance simulated download
    const content = `RAK Law Office Document: ${doc.name}\nDate: ${doc.uploadDate}\nSize: ${doc.size}\n\nCONFIDENTIAL DOCUMENT FOR: ${activeCase?.clientName}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen relative">
      {/* --- NOTIFICATION TOAST --- */}
      {notification && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300 w-full max-w-md px-4">
              <div className="bg-dark-900 border border-gold-500 rounded-xl shadow-[0_0_30px_rgba(184,134,46,0.3)] p-4 flex items-start gap-4 backdrop-blur-md">
                  <div className="bg-gold-600/20 p-2 rounded-full border border-gold-500/30 animate-pulse">
                      <Bell className="w-6 h-6 text-gold-500" />
                  </div>
                  <div className="flex-1">
                      <h4 className="text-gold-500 font-bold text-sm mb-1">{notification.title}</h4>
                      <p className="text-white text-xs leading-relaxed">{notification.message}</p>
                  </div>
                  <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                  </button>
              </div>
          </div>
      )}

      {!activeCase ? (
        <div className="max-w-sm mx-auto pt-16">
          <div className="bg-dark-900 border border-gold-600/20 rounded-2xl p-8 shadow-[0_0_60px_rgba(184,134,46,0.1)]">
            <div className="w-16 h-16 bg-gold-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gold-600/30">
                <Lock className="w-8 h-8 text-gold-500" />
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-1 font-serif-headings tracking-tight">{t.title}</h2>
            <p className="text-gray-400 text-center mb-8 text-[10px] whitespace-nowrap overflow-hidden text-ellipsis opacity-80 max-w-[200px] mx-auto">{t.subtitle}</p>
            
            {loginStep === 'CREDENTIALS' ? (
                <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-1">{t.username}</label>
                        <div className="relative group">
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-dark-950 border border-gray-800 rounded-xl py-3 px-10 text-white text-sm focus:outline-none focus:border-gold-500 transition-all font-mono" placeholder="username" required />
                            <User className="absolute top-3.5 left-3 text-gray-600 w-4 h-4 group-focus-within:text-gold-500 transition-colors" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-1">{t.password}</label>
                        <div className="relative group">
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-dark-950 border border-gray-800 rounded-xl py-3 px-10 text-white text-sm focus:outline-none focus:border-gold-500 transition-all font-mono" placeholder="••••••••" required />
                            <Key className="absolute top-3.5 left-3 text-gray-600 w-4 h-4 group-focus-within:text-gold-500 transition-colors" />
                        </div>
                    </div>
                    {error && <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl flex items-center gap-2 text-red-400 text-[10px] font-bold animate-in shake"><AlertCircle className="w-4 h-4" />{error}</div>}
                    <button type="submit" disabled={loading} className="w-full bg-gold-600 hover:bg-gold-500 text-black font-black py-3 rounded-xl transition-all shadow-xl shadow-gold-600/20 uppercase tracking-widest text-xs">
                        {loading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" /> : t.loginBtn}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="text-center">
                        <p className="text-sm text-gray-300 mb-1">{language === 'ar' ? 'تم إرسال رمز التحقق إلى' : 'OTP sent to'} <span className="font-mono text-gold-500 font-bold" dir="ltr">{maskedPhone}</span></p>
                        <button type="button" onClick={() => setLoginStep('CREDENTIALS')} className="text-[10px] text-gray-500 underline hover:text-white">{language === 'ar' ? 'الرجوع' : 'Back'}</button>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 font-medium block text-center uppercase tracking-widest">
                            {language === 'ar' ? 'أدخل الرمز (6 أرقام)' : 'Enter 6-digit Code'}
                        </label>
                        <input 
                            type="text" 
                            maxLength={6} 
                            value={otpCode} 
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                            className="w-full bg-dark-950 border border-gray-700 rounded-xl py-4 text-center text-white text-2xl tracking-[0.5em] font-mono focus:border-gold-500 outline-none transition-all placeholder:tracking-normal" 
                            placeholder="000000" 
                            autoFocus 
                        />
                    </div>

                    {error && <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl flex items-center gap-2 text-red-400 text-[10px] font-bold animate-in shake"><AlertCircle className="w-4 h-4" />{error}</div>}

                    <button type="submit" disabled={loading || otpCode.length !== 6} className="w-full bg-gold-600 hover:bg-gold-500 text-black font-bold py-3 rounded-lg transition-all shadow-lg shadow-gold-600/20 flex justify-center items-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> {language === 'ar' ? 'تحقق ودخول' : 'Verify & Login'}</>}
                    </button>
                </form>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-dark-900 rounded-2xl p-6 border border-gray-800 shadow-xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 opacity-5"><Briefcase className="w-48 h-48" /></div>
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1 font-serif-headings tracking-tight">{t.caseDetails}</h2>
                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-gold-600/10 border border-gold-600/20 rounded-md text-gold-500 font-mono text-xs tracking-widest uppercase">
                            {activeCase.caseNumber}
                        </div>
                    </div>
                    <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-gold-500/20 bg-gold-600/5 text-gold-500">
                        {activeCase.status}
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    <div className="bg-dark-950/50 p-4 rounded-xl border border-gray-800/50">
                        <span className="block text-[9px] text-gray-600 uppercase font-black mb-1 tracking-widest">{t.client}</span>
                        <span className="text-white font-bold text-lg">{activeCase.clientName}</span>
                    </div>
                    <div className="bg-dark-950/50 p-4 rounded-xl border border-gray-800/50">
                        <span className="block text-[9px] text-gray-600 uppercase font-black mb-1 tracking-widest">{t.nextHearing}</span>
                        <span className="text-white font-bold text-lg flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gold-500" />
                            {activeCase.nextHearing || '---'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="bg-dark-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3 font-serif-headings">
                    <Clock className="w-5 h-5 text-gold-500" /> {t.timeline}
                </h3>
                <div className="space-y-6 relative before:absolute rtl:before:right-3 ltr:before:left-3 before:top-2 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-gold-600 before:via-gray-800 before:to-transparent">
                    {activeCase.updates && activeCase.updates.length > 0 ? (
                        activeCase.updates.map(u => (
                            <div key={u.id} className="relative rtl:pr-10 ltr:pl-10">
                                <div className="absolute rtl:right-0 ltr:left-0 top-1 w-6 h-6 rounded-full bg-dark-950 border-2 border-gold-500 z-10 shadow-[0_0_15px_rgba(184,134,46,0.4)] flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-gold-500 rounded-full" />
                                </div>
                                <div className="bg-dark-950 p-5 rounded-xl border border-gray-800/50 hover:border-gold-500/30 transition-all">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-bold text-white">{u.title}</h4>
                                        <span className="text-[10px] text-gold-500 font-mono px-2 py-0.5 bg-gold-500/5 rounded border border-gold-500/10">{u.date}</span>
                                    </div>
                                    <p className="text-gray-400 leading-relaxed text-xs">{u.description}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 italic px-10 text-xs">{language === 'ar' ? 'لا توجد تحديثات متاحة حالياً' : 'No updates available yet.'}</p>
                    )}
                </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-dark-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3 font-serif-headings">
                    <FileText className="w-5 h-5 text-gold-500" /> {t.documents}
                </h3>
                <div className="space-y-3">
                    {activeCase.documents && activeCase.documents.length > 0 ? (
                        activeCase.documents.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-4 bg-dark-950 rounded-xl border border-gray-800 group hover:border-gold-500/40 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-gold-500/10">
                                        <FileText className="w-5 h-5 text-gray-500 group-hover:text-gold-500 transition-colors" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-200 font-bold">{doc.name}</p>
                                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{doc.size}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleDownload(doc)} className="p-3 bg-white/5 hover:bg-gold-500 hover:text-black rounded-lg text-gray-400 transition-all shadow-lg">
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 italic text-xs text-center py-2">{language === 'ar' ? 'لا توجد مستندات مرفوعة' : 'No documents uploaded'}</p>
                    )}
                </div>
                <div className="mt-8 p-4 bg-blue-900/10 border border-blue-900/30 rounded-xl flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <p className="text-[10px] text-blue-200 leading-relaxed">
                        {language === 'ar' ? 'تم تأمين كافة المستندات بأعلى معايير التشفير الرقمي.' : 'All documents are secured with enterprise-grade encryption.'}
                    </p>
                </div>
            </div>
            <button onClick={handleLogout} className="w-full py-4 rounded-xl text-red-500 hover:text-white hover:bg-red-600 transition-all border border-red-900/30 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3">
                <LogOut className="w-5 h-5" /> {t.logout}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPortal;
