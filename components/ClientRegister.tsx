
import React, { useState, useEffect } from 'react';
import { Language, RegisteredUser, Booking } from '../types';
import { User, Mail, Phone, AlertCircle, UserPlus, CheckCircle, LogOut, Lock, Check, Briefcase, Calendar, Clock } from 'lucide-react';
import { translations } from '../locales';
import { hashPassword } from '../utils/crypto';

interface ClientRegisterProps {
  language: Language;
  onLoginClick: () => void;
  onRegisterSuccess: (user: RegisteredUser) => void;
  currentUser?: RegisteredUser | null;
  onLogout?: () => void;
}

const ClientRegister: React.FC<ClientRegisterProps> = ({ language, onLoginClick, onRegisterSuccess, currentUser, onLogout }) => {
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  
  const t = translations[language].portal;

  useEffect(() => {
    if (currentUser) {
      const allBookings: Booking[] = JSON.parse(localStorage.getItem('rak_bookings') || '[]');
      // Filter by email or phone
      const myBookings = allBookings.filter(b => 
        (currentUser.email && b.clientEmail === currentUser.email) || 
        (currentUser.phone && b.clientPhone === currentUser.phone)
      );
      // Sort by date (newest first) - assuming consultationDate is YYYY-MM-DD
      myBookings.sort((a, b) => new Date(b.consultationDate).getTime() - new Date(a.consultationDate).getTime());
      setUserBookings(myBookings);
    }
  }, [currentUser]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateUAEPhone = (phone: string) => {
    // Accepts: 05x xxxxxxx (10 digits) or +9715x xxxxxxx
    const re = /^(?:\+971|00971|0)?(?:50|51|52|54|55|56|58)\d{7}$/;
    return re.test(phone.replace(/\s/g, ''));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic Validation
    if (regName.trim().length < 3) { setLoading(false); return setError(language === 'ar' ? 'الاسم قصير جداً' : 'Name too short'); }
    if (!validateEmail(regEmail)) { setLoading(false); return setError(language === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email'); }
    if (!regUsername || regUsername.length < 3) { setLoading(false); return setError(language === 'ar' ? 'اسم المستخدم قصير جداً' : 'Username too short'); }
    if (!validateUAEPhone(regPhone)) { setLoading(false); return setError(language === 'ar' ? 'رقم الهاتف غير صحيح' : 'Invalid phone'); }
    
    // Password Validation
    if (regPassword.length < 6) { setLoading(false); return setError(language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 chars'); }
    if (regPassword !== confirmPassword) { setLoading(false); return setError(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match'); }

    // Check if User already exists
    const existingRegistrations: RegisteredUser[] = JSON.parse(localStorage.getItem('rak_registrations') || '[]');
    
    if (existingRegistrations.some(u => u.username.toLowerCase() === regUsername.toLowerCase())) {
        setLoading(false);
        return setError(language === 'ar' ? 'اسم المستخدم محجوز' : 'Username taken');
    }
    if (existingRegistrations.some(u => u.email.toLowerCase() === regEmail.toLowerCase())) {
        setLoading(false);
        return setError(language === 'ar' ? 'البريد الإلكتروني مسجل مسبقاً' : 'Email already registered');
    }
    if (existingRegistrations.some(u => u.phone === regPhone)) {
        setLoading(false);
        return setError(language === 'ar' ? 'رقم الهاتف مسجل مسبقاً' : 'Phone already registered');
    }

    try {
        // Hash Password
        const hashedPassword = await hashPassword(regPassword);

        const newRegisteredUser: RegisteredUser = {
            id: Math.random().toString(36).substr(2, 9),
            name: regName,
            email: regEmail,
            phone: regPhone,
            username: regUsername,
            password: hashedPassword,
            registrationDate: new Date().toISOString().split('T')[0]
        };

        localStorage.setItem('rak_registrations', JSON.stringify([newRegisteredUser, ...existingRegistrations]));

        // Save to Firestore and send notification
        import('../utils/firebase').then(({ db, auth }) => {
          if (auth) {
            import('firebase/auth').then(({ createUserWithEmailAndPassword, signOut }) => {
              const email = `${regUsername.toLowerCase()}@rakadvocates.app`;
              createUserWithEmailAndPassword(auth, email, regPassword)
                .then(() => signOut(auth))
                .catch(console.error);
            });
          }
          if (db) {
            import('firebase/firestore').then(({ doc, setDoc }) => {
              const userToSave = { ...newRegisteredUser };
              delete userToSave.password; // Do not store password in Firestore
              setDoc(doc(db, 'registrations', newRegisteredUser.id), userToSave).catch(console.error);
              const notifId = Math.random().toString(36).substr(2, 9);
              const newNotif = { id: notifId, title: language === 'ar' ? 'تسجيل جديد' : 'New Registration', message: language === 'ar' ? `مستخدم جديد: ${newRegisteredUser.name}` : `New user: ${newRegisteredUser.name}`, isRead: false, timestamp: Date.now() };
              setDoc(doc(db, 'notifications', notifId), newNotif).catch(console.error);
            });
          }
        });

        // Simulate slight delay for UX
        setTimeout(() => {
            setLoading(false);
            onRegisterSuccess(newRegisteredUser);
        }, 800);

    } catch (err) {
        console.error("Registration Error", err);
        setLoading(false);
        setError(language === 'ar' ? 'حدث خطأ أثناء التسجيل' : 'Registration Error');
    }
  };

  if (currentUser) {
      return (
        <div className="max-w-7xl mx-auto px-4 py-10 min-h-screen flex items-center justify-center">
            <div className="max-w-md w-full bg-dark-900 border border-gold-600/20 rounded-3xl p-10 shadow-[0_0_50px_rgba(184,134,46,0.1)] text-center animate-in fade-in zoom-in duration-300">
                <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 font-serif-headings">{t.welcomeUser} {currentUser.name}</h2>
                <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-4 mb-8">
                     <p className="text-gold-500 font-bold mb-1">{t.activeStatus}</p>
                     <p className="text-xs text-gray-400">{t.canBook}</p>
                </div>

                {/* My Requests Section */}
                <div className="w-full mb-8 text-right rtl:text-right ltr:text-left">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Briefcase className="w-4 h-4 text-gold-500" />
                        {language === 'ar' ? 'طلباتي' : 'My Requests'}
                    </h3>
                    
                    {userBookings.length > 0 ? (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                            {userBookings.map(booking => (
                                <div key={booking.id} className="bg-dark-950 border border-gray-800 rounded-xl p-4 flex justify-between items-center hover:border-gold-500/30 transition-colors group">
                                    <div>
                                        <p className="text-white font-bold text-sm group-hover:text-gold-500 transition-colors">{booking.consultantName}</p>
                                        <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1.5">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>{booking.consultationDate}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{booking.consultationTime}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="bg-green-500/10 text-green-500 text-[9px] px-2 py-0.5 rounded border border-green-500/20 font-bold uppercase tracking-wider">
                                            {language === 'ar' ? 'مدفوع' : 'Paid'}
                                        </span>
                                        <p className="text-gray-300 text-xs font-bold mt-1">{booking.amount} <span className="text-[9px] font-normal text-gray-500">{translations[language].common.currency}</span></p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-dark-950/50 rounded-xl border border-gray-800 border-dashed">
                            <p className="text-gray-500 text-xs">{language === 'ar' ? 'لا توجد طلبات حالياً' : 'No requests found'}</p>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all border border-white/10">
                       {translations[language].nav.home}
                    </button>
                    {onLogout && (
                        <button onClick={onLogout} className="w-full bg-red-900/20 hover:bg-red-900/30 text-red-500 font-bold py-4 rounded-xl transition-all border border-red-900/30 flex items-center justify-center gap-2">
                            <LogOut className="w-5 h-5" /> {t.logout}
                        </button>
                    )}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 min-h-screen">
      <div className="max-w-md mx-auto pt-4">
        
        <div className="bg-dark-900 border border-gold-600/20 rounded-2xl p-8 shadow-[0_0_50px_rgba(184,134,46,0.1)]">
          <div className="w-16 h-16 bg-gold-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-gold-600/30">
              <UserPlus className="w-8 h-8 text-gold-500" />
          </div>
          
          <h2 className="text-2xl font-bold text-white text-center mb-2 font-serif-headings tracking-tight">{t.registerTitle}</h2>
          <p className="text-gray-400 text-center mb-8 text-xs whitespace-nowrap overflow-hidden text-ellipsis opacity-80 max-w-xs mx-auto">{t.registerSubtitle}</p>
          
          <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            
            <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium mr-1">{t.fullName}</label>
                <div className="relative"><input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full bg-dark-950 border border-gray-700 rounded-lg py-3 px-10 text-white focus:outline-none focus:border-gold-500 transition-all" required /><User className="absolute top-3.5 left-3 text-gray-600 w-5 h-5" /></div>
            </div>

            <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium mr-1">{t.email}</label>
                <div className="relative"><input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full bg-dark-950 border border-gray-700 rounded-lg py-3 px-10 text-white focus:outline-none focus:border-gold-500 transition-all text-left dir-ltr" required /><Mail className="absolute top-3.5 left-3 text-gray-600 w-5 h-5" /></div>
            </div>

            <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium mr-1">{t.phone}</label>
                <div className="relative"><input type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} className="w-full bg-dark-950 border border-gray-700 rounded-lg py-3 px-10 text-white focus:outline-none focus:border-gold-500 transition-all text-left dir-ltr" placeholder="05x xxx xxxx" required /><Phone className="absolute top-3.5 left-3 text-gray-600 w-5 h-5" /></div>
            </div>

            <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium mr-1">{t.username}</label>
                <div className="relative"><input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className="w-full bg-dark-950 border border-gray-700 rounded-lg py-3 px-10 text-white focus:outline-none focus:border-gold-500 transition-all font-mono text-left dir-ltr" placeholder="username" required /><User className="absolute top-3.5 left-3 text-gray-600 w-5 h-5" /></div>
            </div>

            <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium mr-1">{language === 'ar' ? 'كلمة المرور' : 'Password'}</label>
                <div className="relative"><input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full bg-dark-950 border border-gray-700 rounded-lg py-3 px-10 text-white focus:outline-none focus:border-gold-500 transition-all font-mono text-left dir-ltr" placeholder="••••••••" required /><Lock className="absolute top-3.5 left-3 text-gray-600 w-5 h-5" /></div>
            </div>

            <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium mr-1">{language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                <div className="relative"><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-dark-950 border border-gray-700 rounded-lg py-3 px-10 text-white focus:outline-none focus:border-gold-500 transition-all font-mono text-left dir-ltr" placeholder="••••••••" required /><Lock className="absolute top-3.5 left-3 text-gray-600 w-5 h-5" /></div>
            </div>
            
            <button type="submit" disabled={loading} className="w-full mt-6 bg-gold-600 hover:bg-gold-500 text-black font-bold py-3 rounded-lg transition-all shadow-lg shadow-gold-600/20 flex justify-center items-center gap-2 text-xs uppercase tracking-widest">
                {loading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> {language === 'ar' ? 'إنشاء الحساب' : 'Create Account'}</>}
            </button>
          </form>

          {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-xs font-bold animate-in slide-in-from-top-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

          <div className="pt-4 text-center border-t border-gray-800 mt-6">
            <p className="text-gray-500 text-sm">{t.hasAccount}</p>
            <button type="button" onClick={onLoginClick} className="text-gold-500 text-sm font-bold hover:underline mt-1">{t.backToLogin}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientRegister;
