
import React, { useState } from 'react';
import { Language, RegisteredUser } from '../types';
import { User, Lock, AlertCircle, LogIn } from 'lucide-react';
import { translations } from '../locales';
import { verifyPassword } from '../utils/crypto';
import { auth, db } from '../utils/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface RegisteredUserLoginProps {
  language: Language;
  onLoginSuccess: (user: RegisteredUser) => void;
  onRegisterClick: () => void;
}

const RegisteredUserLogin: React.FC<RegisteredUserLoginProps> = ({ language, onLoginSuccess, onRegisterClick }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const t = translations[language].portal;
  const common = translations[language].common;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        let user: RegisteredUser | undefined;

        // Try to fetch from Firestore first
        if (db) {
            try {
                const regsRef = collection(db, 'registrations');
                // We can't easily query by multiple OR conditions in Firestore without multiple queries,
                // so we fetch all and filter client-side, or do 3 queries.
                // For simplicity and since registrations might not be huge, we can fetch all or use localStorage fallback.
                // Better: query by username, email, phone individually
                const qUsername = query(regsRef, where('username', '==', identifier));
                const qEmail = query(regsRef, where('email', '==', identifier));
                const qPhone = query(regsRef, where('phone', '==', identifier));
                
                const [snapU, snapE, snapP] = await Promise.all([
                    getDocs(qUsername), getDocs(qEmail), getDocs(qPhone)
                ]);

                if (!snapU.empty) user = snapU.docs[0].data() as RegisteredUser;
                else if (!snapE.empty) user = snapE.docs[0].data() as RegisteredUser;
                else if (!snapP.empty) user = snapP.docs[0].data() as RegisteredUser;
            } catch (err) {
                console.error("Firestore fetch error", err);
            }
        }

        // Fallback to local storage
        if (!user) {
            const registrations: RegisteredUser[] = JSON.parse(localStorage.getItem('rak_registrations') || '[]');
            user = registrations.find(r => 
                r.username.toLowerCase() === identifier.toLowerCase() ||
                r.email.toLowerCase() === identifier.toLowerCase() ||
                r.phone.replace(/\s/g, '') === identifier.replace(/\s/g, '') ||
                r.phone.includes(identifier.replace(/^0/, ''))
            );
        }

        if (!user) {
            setLoading(false);
            return setError(language === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials');
        }

        let isValid = false;

        // Try Firebase Auth first
        try {
            const email = `${user.username.toLowerCase()}@rakadvocates.app`;
            await signInWithEmailAndPassword(auth, email, password);
            isValid = true;
        } catch (firebaseError) {
            // Fallback to legacy local storage password if Firebase Auth fails
            if (user.password) {
                isValid = await verifyPassword(password, user.password);
            }
        }

        if (!isValid) {
            setLoading(false);
            return setError(language === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials');
        }

        // Success
        // Simulate network delay
        setTimeout(() => {
            setLoading(false);
            onLoginSuccess(user!);
        }, 800);

    } catch (err) {
        console.error("Login Error", err);
        setLoading(false);
        setError(language === 'ar' ? 'حدث خطأ أثناء الدخول' : 'Login Error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
      <div className="max-w-sm mx-auto pt-16">
        
        <div className="bg-dark-900 border border-gold-600/20 rounded-2xl p-8 shadow-[0_0_60px_rgba(184,134,46,0.1)]">
          <div className="w-16 h-16 bg-gold-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gold-600/30">
              <Lock className="w-8 h-8 text-gold-500" />
          </div>
          <h2 className="text-xl font-bold text-white text-center mb-1 font-serif-headings tracking-tight">{t.appLoginTitle}</h2>
          <p className="text-gray-400 text-center mb-8 text-[10px] whitespace-nowrap overflow-hidden text-ellipsis opacity-80 max-w-[200px] mx-auto">{t.appLoginSubtitle}</p>
          
          <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-right-4">
              
              <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-1">
                      {language === 'ar' ? 'اسم المستخدم / البريد / الهاتف' : 'Username / Email / Phone'}
                  </label>
                  <div className="relative group">
                      <input 
                        type="text" 
                        value={identifier} 
                        onChange={e => setIdentifier(e.target.value)} 
                        className="w-full bg-dark-950 border border-gray-800 rounded-xl py-3 px-10 text-white text-sm focus:outline-none focus:border-gold-500 transition-all text-left dir-ltr" 
                        required 
                      />
                      <User className="absolute top-3.5 left-3 text-gray-600 w-4 h-4 group-focus-within:text-gold-500 transition-colors" />
                  </div>
              </div>

              <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-1">
                      {language === 'ar' ? 'كلمة المرور' : 'Password'}
                  </label>
                  <div className="relative group">
                      <input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="w-full bg-dark-950 border border-gray-800 rounded-xl py-3 px-10 text-white text-sm focus:outline-none focus:border-gold-500 transition-all text-left dir-ltr" 
                        required 
                      />
                      <Lock className="absolute top-3.5 left-3 text-gray-600 w-4 h-4 group-focus-within:text-gold-500 transition-colors" />
                  </div>
              </div>
              
              {error && <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl flex items-center gap-2 text-red-400 text-[10px] font-bold animate-in shake"><AlertCircle className="w-4 h-4" />{error}</div>}
              
              <button type="submit" disabled={loading} className="w-full bg-gold-600 hover:bg-gold-500 text-black font-black py-3 rounded-xl transition-all shadow-xl shadow-gold-600/20 uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : (
                      <>
                        <LogIn className="w-4 h-4" />
                        {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
                      </>
                  )}
              </button>
          </form>

          <div className="pt-4 text-center border-t border-gray-800 mt-5">
             <button type="button" onClick={onRegisterClick} className="text-gray-500 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 mx-auto">
               {common.back}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default RegisteredUserLogin;
