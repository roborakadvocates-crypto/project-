
import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import ConsultantCard from './components/ConsultantCard';
import ClientPortal from './components/ClientPortal';
import ClientRegister from './components/ClientRegister';
import RegisteredUserLogin from './components/RegisteredUserLogin';
import AdminPanel from './components/AdminPanel';
import PaymentModal from './components/PaymentModal';
import SplashScreen from './components/SplashScreen';
import SecurityGate from './components/SecurityGate';
import SecuritySetup from './components/SecuritySetup';
import { Consultant, ViewState, Language, LegalCase, RegisteredUser, Booking, AppNotification } from './types';
import { translations } from './locales';
import { Shield, Scale, Users, ArrowRight, Gavel, AlertCircle, Briefcase, Bell } from 'lucide-react';
import { auth, isSignInWithEmailLink, signInWithEmailLink } from './utils/firebase';
import { INITIAL_CONSULTANTS } from './consultants';

// Simple Beep Sound Base64
const NOTIFICATION_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA//OEAAABAAAAAgAAAASR'; // Simplified placeholder

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [showSecuritySetup, setShowSecuritySetup] = useState(false);
  const [showRegisterAlert, setShowRegisterAlert] = useState(false);
  
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  
  // -- Global State for Portal Client (Existing Case Clients) --
  const [activePortalCase, setActivePortalCase] = useState<LegalCase | null>(null);

  // -- Notification Toast State --
  const [notificationToast, setNotificationToast] = useState<{title: string, message: string} | null>(null);
  const lastUpdateTimestampRef = useRef<number>(Date.now());

  const [consultants, setConsultants] = useState<Consultant[]>(() => {
    const saved = localStorage.getItem('rak_consultants_v7');
    return saved ? JSON.parse(saved) : INITIAL_CONSULTANTS;
  });
  const [selectedConsultant, setSelectedConsultant] = useState<Consultant | null>(null);
  
  // -- Global State for App User (New Booking Clients) --
  const [currentUser, setCurrentUser] = useState<RegisteredUser | null>(() => {
    const savedSession = localStorage.getItem('rak_active_session');
    return savedSession ? JSON.parse(savedSession) : null;
  });
  
  const [pendingBookingConsultant, setPendingBookingConsultant] = useState<Consultant | null>(null);

  const [language, setLanguage] = useState<Language>('ar');
  const t = translations[language];

  // Logic to handle mobile keyboard visibility (Auto Scroll to Input)
  useEffect(() => {
    const handleFocusIn = (e: Event) => {
      const target = e.target as HTMLElement;
      // Check if the focused element is an input or textarea
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Delay to allow the keyboard to animate up
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }, 400); // 400ms is usually sufficient for both iOS and Android keyboard animations
      }
    };

    window.addEventListener('focusin', handleFocusIn);
    return () => {
      window.removeEventListener('focusin', handleFocusIn);
    };
  }, []);

  // --- HANDLE EMAIL LINK RETURN ---
  useEffect(() => {
      if (auth && isSignInWithEmailLink(auth, window.location.href)) {
          let email = window.localStorage.getItem('emailForSignIn');
          
          // Robustness: If email is missing (e.g. cross-device), ask user for it
          if (!email) {
              const userEmail = window.prompt(
                  language === 'ar' 
                  ? 'يرجى تأكيد بريدك الإلكتروني لإتمام عملية الدخول' 
                  : 'Please confirm your email to complete login'
              );
              if (userEmail) {
                  email = userEmail;
              } else {
                  // User cancelled prompt, stop process
                  return; 
              }
          }

          if (email) {
            signInWithEmailLink(auth, email, window.location.href)
                .then((result) => {
                    // Clear email from storage
                    window.localStorage.removeItem('emailForSignIn');
                    
                    // Determine if this was Registration or Login based on local temporary data or existing DB
                    const tempRegDataStr = window.localStorage.getItem('temp_reg_data');
                    const registrations: RegisteredUser[] = JSON.parse(localStorage.getItem('rak_registrations') || '[]');
                    
                    let user: RegisteredUser | undefined;

                    if (tempRegDataStr) {
                        // It was a registration
                        const tempRegData = JSON.parse(tempRegDataStr);
                        // Double check email matches
                        if (tempRegData.email.toLowerCase() === email!.toLowerCase()) {
                            const newUser: RegisteredUser = {
                                id: Math.random().toString(36).substr(2, 9),
                                name: tempRegData.name,
                                email: tempRegData.email,
                                phone: tempRegData.phone,
                                username: tempRegData.username,
                                registrationDate: new Date().toISOString().split('T')[0]
                            };
                            localStorage.setItem('rak_registrations', JSON.stringify([newUser, ...registrations]));
                            
                            // Save to Firestore and send notification
                            import('./utils/firebase').then(({ db }) => {
                              if (db) {
                                import('firebase/firestore').then(({ doc, setDoc }) => {
                                  setDoc(doc(db, 'registrations', newUser.id), newUser).catch(console.error);
                                  const notifId = Math.random().toString(36).substr(2, 9);
                                  const newNotif = { id: notifId, title: language === 'ar' ? 'تسجيل جديد' : 'New Registration', message: language === 'ar' ? `مستخدم جديد: ${newUser.name}` : `New user: ${newUser.name}`, isRead: false, timestamp: Date.now() };
                                  setDoc(doc(db, 'notifications', notifId), newNotif).catch(console.error);
                                });
                              }
                            });

                            window.localStorage.removeItem('temp_reg_data');
                            user = newUser;
                        }
                    } else {
                        // It was a login
                        user = registrations.find(r => r.email.toLowerCase() === email!.toLowerCase());
                    }

                    if (user) {
                        handleAppLoginSuccess(user);
                        // Clean URL to remove hash/query params
                        window.history.replaceState({}, document.title, window.location.pathname);
                    } else {
                        // Error state: Email valid but no user data found (Login attempt for non-existent user?)
                        alert(language === 'ar' ? 'لم يتم العثور على حساب لهذا البريد.' : 'No account found for this email.');
                    }
                })
                .catch((error) => {
                    console.error("Error signing in with email link", error);
                    alert(language === 'ar' ? 'رابط التحقق غير صالح أو انتهت صلاحيته' : 'Invalid or expired verification link');
                });
          }
      }
  }, []);
  // --------------------------------

  // Logic to handle persistent login + security check on app open
  useEffect(() => {
    const savedSession = localStorage.getItem('rak_active_session');
    const isSecurityEnabled = localStorage.getItem('rak_security_enabled') === 'true';

    // Check for Portal Session Persistence as well
    const savedPortalCaseId = localStorage.getItem('rak_portal_session_caseId');
    if (savedPortalCaseId) {
        const savedCases = JSON.parse(localStorage.getItem('rak_cases') || '{}');
        const userCaseData = savedCases[savedPortalCaseId];
        if (userCaseData) {
            setActivePortalCase(userCaseData);
        }
    }

    if (savedSession) {
      // If user is logged in, check for security
      if (isSecurityEnabled) {
        setIsAppLocked(true); // Lock app to ask for FaceID/Passcode
      } else {
        // User logged in but no security set? Prompt to set it up.
        setShowSecuritySetup(true);
      }
    } else {
      // Guest user - no lock needed
      setIsAppLocked(false);
    }
  }, []);

  // --- Consultation Reminder Logic ---
  useEffect(() => {
    const checkReminders = () => {
      const bookings: Booking[] = JSON.parse(localStorage.getItem('rak_bookings') || '[]');
      const notifiedBookings: string[] = JSON.parse(localStorage.getItem('rak_notified_bookings') || '[]');
      const now = new Date();

      bookings.forEach(booking => {
        if (notifiedBookings.includes(booking.id)) return;

        try {
            // Parse Date (YYYY-MM-DD)
            const [year, month, day] = booking.consultationDate.split('-').map(Number);
            
            // Parse Time (HH:MM AM/PM or HH:MM ص/م)
            let [timePart, period] = booking.consultationTime.split(' ');
            let [hoursStr, minutesStr] = timePart.split(':');
            let hours = parseInt(hoursStr);
            let minutes = parseInt(minutesStr);

            if (period === 'PM' || period === 'م') {
                if (hours !== 12) hours += 12;
            } else if (period === 'AM' || period === 'ص') {
                if (hours === 12) hours = 0;
            }

            const consultationDateTime = new Date(year, month - 1, day, hours, minutes);
            const timeDiff = consultationDateTime.getTime() - now.getTime();
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            // Check if within 2 hours (e.g., between 0 and 2 hours)
            if (hoursDiff > 0 && hoursDiff <= 2) {
                // Trigger Notification
                const newNotification: AppNotification = {
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'SYSTEM',
                    title: language === 'ar' ? 'تذكير بموعد الاستشارة' : 'Consultation Reminder',
                    message: language === 'ar' 
                        ? `تذكير: لديك استشارة مع ${booking.consultantName} بعد حوالي ساعتين (${booking.consultationTime})`
                        : `Reminder: You have a consultation with ${booking.consultantName} in about 2 hours (${booking.consultationTime})`,
                    timestamp: new Date().toISOString(),
                    isRead: false
                };

                // Save Notification
                const existingNotifs = JSON.parse(localStorage.getItem('rak_notifications') || '[]');
                localStorage.setItem('rak_notifications', JSON.stringify([newNotification, ...existingNotifs]));

                // Mark as Notified
                notifiedBookings.push(booking.id);
                localStorage.setItem('rak_notified_bookings', JSON.stringify(notifiedBookings));

                // Show Toast
                setNotificationToast({
                    title: newNotification.title,
                    message: newNotification.message
                });

                // Play Sound
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.volume = 0.5;
                audio.play().catch(e => console.log('Audio play blocked', e));
            }
        } catch (e) {
            console.error("Error parsing booking date", e);
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    checkReminders(); // Run immediately on mount

    return () => clearInterval(interval);
  }, [language]);

  // --- Real-time Sync & Notification Listener ---
  useEffect(() => {
    const checkUpdates = () => {
      if (!activePortalCase) return;

      const latestEventStr = localStorage.getItem('rak_latest_sync_event');
      if (latestEventStr) {
        const latestEvent = JSON.parse(latestEventStr);
        
        // Check if this event is for the current user and is new
        if (latestEvent.clientId === activePortalCase.id && latestEvent.timestamp > lastUpdateTimestampRef.current) {
             lastUpdateTimestampRef.current = latestEvent.timestamp;
             
             // 1. Play Sound
             // Note: Browsers block autoplay without interaction. Since user is logged in, likely interacted.
             const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Notification chime
             audio.volume = 0.5;
             audio.play().catch(e => console.log('Audio play blocked', e));

             // 2. Show Toast
             setNotificationToast({
               title: language === 'ar' ? 'تحديث جديد في القضية' : 'New Case Update',
               message: latestEvent.title
             });

             // 3. Refresh Active Case Data Automatically
             const savedCases = JSON.parse(localStorage.getItem('rak_cases') || '{}');
             const updatedCaseData = savedCases[activePortalCase.id];
             if (updatedCaseData) {
               setActivePortalCase(updatedCaseData);
             }
        }
      }
    };

    // Poll every 2 seconds for changes
    const interval = setInterval(checkUpdates, 2000);
    return () => clearInterval(interval);
  }, [activePortalCase, language]);

  useEffect(() => {
    localStorage.setItem('rak_consultants_v7', JSON.stringify(consultants));
  }, [consultants]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentView]);

  const handleBook = (consultant: Consultant) => {
      // Check if user is registered/logged in
      if (currentUser) {
          setSelectedConsultant(consultant);
      } else {
          // If not, save intention and redirect to register
          setPendingBookingConsultant(consultant);
          setShowRegisterAlert(true);
          setTimeout(() => setShowRegisterAlert(false), 3000);
          setCurrentView('CLIENT_REGISTER');
      }
  };

  const handlePaymentSuccess = () => { 
      setTimeout(() => { 
          setSelectedConsultant(null); 
          setPendingBookingConsultant(null);
      }, 2000); 
  };
  
  const handleRegisterSuccess = (newUser: RegisteredUser) => {
      setCurrentUser(newUser);
      // Persist session
      localStorage.setItem('rak_active_session', JSON.stringify(newUser));

      // If there was a pending booking, trigger it now
      if (pendingBookingConsultant) {
          setSelectedConsultant(pendingBookingConsultant);
      } else {
          // Stay on the profile page to show they are active
          setCurrentView('CLIENT_REGISTER'); 
      }

      // Check for security setup
      const isSecurityEnabled = localStorage.getItem('rak_security_enabled') === 'true';
      if (!isSecurityEnabled) {
        setShowSecuritySetup(true);
      }
  };

  // Handle successful login for App User (Booking)
  const handleAppLoginSuccess = (user: RegisteredUser) => {
      setCurrentUser(user);
      // Persist session
      localStorage.setItem('rak_active_session', JSON.stringify(user));
      
      if (pendingBookingConsultant) {
          setSelectedConsultant(pendingBookingConsultant);
      } else {
          setCurrentView('CLIENT_REGISTER'); // Show profile
      }
      
      const isSecurityEnabled = localStorage.getItem('rak_security_enabled') === 'true';
      if (!isSecurityEnabled) {
        setShowSecuritySetup(true);
      }
  };

  const handleAppLogout = () => {
      setCurrentUser(null);
      // Remove persistent session
      localStorage.removeItem('rak_active_session');
      // Clear security settings on logout so next user/guest isn't locked out or asked for previous PIN
      localStorage.removeItem('rak_security_enabled'); 
      localStorage.removeItem('rak_security_pin'); 
      localStorage.removeItem('rak_security_method'); 
      
      setPendingBookingConsultant(null);
      setCurrentView('HOME');
  };
  
  // Handle Portal Logout (Updates App State)
  const handlePortalLogout = () => {
      setActivePortalCase(null);
      localStorage.removeItem('rak_portal_session_caseId');
      setCurrentView('CLIENT_PORTAL'); // Go back to login screen of portal
  };
  
  // Handle Portal Login Success (Updates App State)
  const handlePortalLoginSuccess = (caseData: LegalCase) => {
      setActivePortalCase(caseData);
      localStorage.setItem('rak_portal_session_caseId', caseData.id);
  };

  const getLocalizedConsultantData = (c: Consultant): Consultant => {
    if (c.id === '1') return { ...c, name: language === 'ar' ? 'المحامي/ سالم الكيت' : 'Adv. Salem Al Kait', title: language === 'ar' ? 'محامٍ ومستشار قانوني' : 'Advocate & Legal Consultant' };
    if (c.id === '2') return { ...c, name: language === 'ar' ? 'المستشارة/ فاطمة الشامسي' : 'Fatima Al Shamsi', title: language === 'ar' ? 'محامية أحوال شخصية' : 'Family Law Consultant' };
    if (c.id === '3') return { ...c, name: language === 'ar' ? 'المحامي/ محمود حنفي' : 'Adv. Mahmoud Hanafi', title: language === 'ar' ? 'محامي' : 'Lawyer' };
    if (c.id === '4') return { ...c, name: language === 'ar' ? 'المحامية/ ليلى العتيبي' : 'Adv. Laila Al Otaibi', title: language === 'ar' ? 'محامية' : 'Lawyer' };
    if (c.id === '5') return { ...c, name: language === 'ar' ? 'المستشار/ عبيده عمر' : 'Consultant Obaida Omar', title: language === 'ar' ? 'مستشار قانوني' : 'Legal Consultant' };
    return c;
  };

  const founder = getLocalizedConsultantData(consultants.find(c => c.id === '1') || INITIAL_CONSULTANTS[0]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (isAppLocked) {
    return <SecurityGate onUnlock={() => setIsAppLocked(false)} language={language} />;
  }

  return (
    <div className={`min-h-screen bg-dark-950 text-white font-sans selection:bg-gold-500 selection:text-black overflow-x-hidden touch-manipulation`}>
      {showSecuritySetup && <SecuritySetup onComplete={() => setShowSecuritySetup(false)} language={language} />}
      
      {/* Real-time Notification Toast */}
      {notificationToast && (
        <div 
            onClick={() => { setNotificationToast(null); setCurrentView('CLIENT_PORTAL'); }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm bg-gold-600 text-black p-4 rounded-2xl shadow-[0_10px_40px_rgba(184,134,46,0.3)] animate-in slide-in-from-top-4 fade-in cursor-pointer flex items-start gap-4"
        >
           <div className="bg-black/20 p-2 rounded-full">
             <Bell className="w-5 h-5 text-black" />
           </div>
           <div>
              <h4 className="font-bold text-sm">{notificationToast.title}</h4>
              <p className="text-xs font-medium opacity-90 mt-1">{notificationToast.message}</p>
           </div>
        </div>
      )}

      {/* Alert Toast for Registration Requirement */}
      {showRegisterAlert && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] bg-gold-600 text-black px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-6 w-[90%] max-w-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-bold text-xs">{t.portal.mustRegister}</span>
          </div>
      )}

      <Navbar 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          language={language} 
          setLanguage={setLanguage} 
          currentUser={currentUser}
          portalUser={activePortalCase}
          onLogout={handleAppLogout}
          onPortalLogout={handlePortalLogout}
      />
      
      <main className="portrait:pb-36 landscape:pb-0 landscape:ltr:pl-20 landscape:rtl:pr-20 min-h-screen">
        <div key={currentView} className="animate-slide-in">
            {currentView === 'HOME' && (
            <>
                <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"><img src="./logo.png" className="w-[80%] max-w-4xl opacity-[0.03] grayscale brightness-200 animate-slow-spin" /></div>
                <div className="absolute inset-0 z-[1]"><img src="https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover opacity-30" /><div className="absolute inset-0 bg-gradient-to-r from-dark-950 via-dark-950/95 to-dark-950/60 z-10" /></div>
                <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[calc(100vh-80px)]">
                    
                    {/* Text Section: Order 2 on Mobile, 1 on Desktop. Added negative margin to pull up */}
                    {/* Increased negative margin from -mt-10 to -mt-20 to lift text block further up */}
                    {/* Increased gap from gap-5 to gap-6 for more breathing room */}
                    <div className="flex flex-col gap-6 order-2 lg:order-1 relative z-30 text-center lg:text-start rtl:lg:text-right ltr:lg:text-left -mt-20 lg:mt-0">
                        {/* Compact Badge */}
                        {/* Added mb-2 to push the title down, centering the badge visually between image and title */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 border border-gold-500/30 rounded-full bg-gold-900/10 mx-auto lg:mx-0 backdrop-blur-md w-fit mb-2">
                        <Scale className="w-2.5 h-2.5 text-gold-400" />
                        <span className="text-gold-300 text-[8px] font-bold tracking-[0.1em] uppercase animate-pulse-light">{t.hero.badge}</span>
                        </div>
                        
                        {/* Single Line Title (Reduced font size for mobile to fit one line, nowrap) */}
                        <h1 className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-bold font-serif-headings leading-tight tracking-tight drop-shadow-2xl whitespace-nowrap">
                        {t.hero.titleLine1} <span className="text-gold-gradient">{t.hero.titleLine2}</span>
                        </h1>
                        
                        {/* Subtitle with reduced margin */}
                        <p className="text-xs sm:text-sm text-gray-300 max-w-md leading-relaxed font-light mx-auto lg:mx-0 opacity-90">
                        {t.hero.subtitle}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center lg:justify-start">
                        <button onClick={() => setCurrentView('CONSULTANTS')} className="px-8 py-3 bg-gold-500 text-black font-bold text-sm hover:bg-gold-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(184,134,46,0.3)] rounded-xl active:scale-95 active:bg-gold-600 duration-100">
                            {t.hero.bookBtn} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                        </button>
                        <button onClick={() => setCurrentView('CLIENT_PORTAL')} className="px-8 py-3 border border-white/20 text-white font-medium text-sm hover:bg-white/5 hover:border-white/40 transition-all rounded-xl backdrop-blur-sm active:scale-95 active:bg-white/10 duration-100">
                            {t.hero.trackBtn}
                        </button>
                        </div>
                    </div>

                    {/* Image Section: Order 1 on Mobile, 2 on Desktop */}
                    <div className="order-1 lg:order-2 relative h-[400px] md:h-[500px] lg:h-[700px] flex items-end justify-center pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[120%] h-[70%] bg-radial-gradient from-gold-500/20 to-transparent blur-3xl opacity-60 z-0" />
                        <div className="relative h-full w-full flex items-end justify-center z-10">
                            <img src={founder.imageUrl} alt={founder.name} className="relative max-h-full max-w-full object-contain object-bottom drop-shadow-[0_20px_50px_rgba(184,134,46,0.4)]" />
                        </div>
                        <div className="absolute bottom-6 lg:bottom-12 right-1/2 translate-x-1/2 lg:translate-x-0 lg:-right-6 z-20 w-max max-w-[200px] animate-in slide-in-from-bottom-8 duration-1000 delay-300">
                             <div className="bg-black/60 backdrop-blur-xl border border-gold-500/40 p-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] text-center lg:text-start rtl:lg:text-right">
                                <h3 className="text-white text-lg font-serif-headings leading-tight drop-shadow-md">{founder.name}</h3>
                             </div>
                        </div>
                    </div>

                    </div>
                </div>
                </section>
            </>
            )}

            {currentView === 'CONSULTANTS' && (
                <section className="min-h-screen pt-24 pb-20 relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-10 animate-in slide-in-from-bottom-8 duration-700">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold-600/10 border border-gold-600/30 mb-4 shadow-[0_0_30px_rgba(184,134,46,0.2)]">
                                <Briefcase className="w-5 h-5 text-gold-500" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white font-serif-headings mb-2">{t.consultants.title}</h2>
                            <p className="text-gray-400 max-w-2xl mx-auto text-[10px] md:text-xs whitespace-nowrap overflow-hidden text-ellipsis opacity-80">{t.consultants.subtitle}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in duration-500 delay-200">
                            {consultants.map(c => (
                                <ConsultantCard key={c.id} consultant={getLocalizedConsultantData(c)} onBook={handleBook} language={language} />
                            ))}
                        </div>
                    </div>
                </section>
            )}
            
            {/* Registered User Views */}
            {currentView === 'CLIENT_REGISTER' && (
                <ClientRegister 
                    language={language} 
                    onLoginClick={() => setCurrentView('REGISTERED_LOGIN')} 
                    onRegisterSuccess={handleRegisterSuccess} 
                    currentUser={currentUser}
                    onLogout={handleAppLogout}
                />
            )}
            {currentView === 'REGISTERED_LOGIN' && (
                <RegisteredUserLogin 
                    language={language}
                    onLoginSuccess={handleAppLoginSuccess}
                    onRegisterClick={() => setCurrentView('CLIENT_REGISTER')}
                />
            )}

            {/* Case Portal (Linked to App State) */}
            {currentView === 'CLIENT_PORTAL' && (
                <ClientPortal 
                    language={language} 
                    onRegisterClick={() => setCurrentView('CLIENT_REGISTER')} 
                    initialActiveCase={activePortalCase}
                    onPortalLoginSuccess={handlePortalLoginSuccess}
                    onPortalLogout={handlePortalLogout}
                />
            )}
            
            {/* Admin */}
            {currentView === 'ADMIN_DASHBOARD' && <AdminPanel consultants={consultants} setConsultants={setConsultants} language={language} setCurrentView={setCurrentView} />}
            
            {currentView === 'HOME' && <Footer language={language} />}
        </div>
      </main>

      <BottomNav currentView={currentView} setCurrentView={setCurrentView} language={language} />

      {selectedConsultant && <PaymentModal consultant={selectedConsultant} currentUser={currentUser} onClose={() => setSelectedConsultant(null)} onSuccess={handlePaymentSuccess} language={language} />}
    </div>
  );
};

export default App;
