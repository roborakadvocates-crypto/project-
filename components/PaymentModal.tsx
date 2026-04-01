
import React, { useState, useMemo, useEffect } from 'react';
import { Consultant, Language, Booking, AppNotification, RegisteredUser } from '../types';
import { X, CheckCircle, CreditCard, Lock, Calendar as CalendarIcon, Clock, ChevronRight, ChevronLeft, Sun, Moon, AlertCircle, Phone, ChevronDown } from 'lucide-react';
import { translations } from '../locales';

interface PaymentModalProps {
  consultant: Consultant;
  onClose: () => void;
  onSuccess: () => void;
  language: Language;
  currentUser?: RegisteredUser | null;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ consultant, onClose, onSuccess, language, currentUser }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cvv, setCvv] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [error, setError] = useState('');
  
  // Modern Date & Time States
  const [viewDate, setViewDate] = useState(new Date()); // Tracks the month being viewed
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  
  const t = translations[language].payment;
  const common = translations[language].common;

  // Expiry Date Logic
  const currentYear = new Date().getFullYear();
  const expiryYears = Array.from({length: 12}, (_, i) => currentYear + i);
  const expiryMonths = Array.from({length: 12}, (_, i) => (i + 1).toString().padStart(2, '0'));

  // Calendar Logic
  const months = language === 'ar' 
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const weekDays = language === 'ar'
    ? ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Helper to change month
  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    // Prevent going back before current month (optional, but good UX)
    const today = new Date();
    if (newDate.getMonth() < today.getMonth() && newDate.getFullYear() === today.getFullYear()) return;
    setViewDate(newDate);
  };

  // Generate Calendar Grid
  const calendarGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Padding for empty days at start
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }
    return days;
  }, [viewDate]);

  // Check if a date is disabled (Past or Weekend)
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Disable Past Dates
    if (date < today) return true;

    // 2. Disable Weekends (Friday=5, Saturday=6)
    const day = date.getDay();
    if (day === 5 || day === 6) return true;

    return false;
  };

  const isSameDay = (d1: Date | null, d2: Date) => {
    if (!d1) return false;
    return d1.getDate() === d2.getDate() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getFullYear() === d2.getFullYear();
  };

  // Generate Time Slots (Morning & Evening)
  const timeSlots = useMemo(() => {
    if (!selectedDate) return { morning: [], evening: [] };

    const slots = { morning: [] as string[], evening: [] as string[] };
    const isAr = language === 'ar';

    const formatTime = (h: number, m: number) => {
        const period = h >= 12 ? (isAr ? 'م' : 'PM') : (isAr ? 'ص' : 'AM');
        const hour12 = h > 12 ? h - 12 : (h === 0 || h === 12 ? 12 : h);
        return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
    };

    // Morning: 08:00 - 14:00
    for (let h = 8; h <= 14; h++) {
        slots.morning.push(formatTime(h, 0));
        if (h !== 14) slots.morning.push(formatTime(h, 30));
    }

    // Evening: 17:00 - 21:00
    for (let h = 17; h <= 21; h++) {
        slots.evening.push(formatTime(h, 0));
        if (h !== 21) slots.evening.push(formatTime(h, 30));
    }
    return slots;
  }, [selectedDate, language]);


  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!selectedDate || !selectedTime) return;

    // Validation Logic
    // 1. Card Number (16 digits)
    const cleanCardNum = cardNumber.replace(/\s/g, '');
    if (!/^\d{16}$/.test(cleanCardNum)) {
        setError(language === 'ar' ? 'رقم البطاقة غير صحيح (يجب أن يكون 16 رقم)' : 'Invalid Card Number (must be 16 digits)');
        return;
    }

    // 2. CVV (3 digits)
    if (!/^\d{3}$/.test(cvv)) {
        setError(language === 'ar' ? 'رمز CVV غير صحيح (يجب أن يكون 3 أرقام)' : 'Invalid CVV (must be 3 digits)');
        return;
    }

    // 3. Card Name
    if (cardName.trim().length < 3) {
        setError(language === 'ar' ? 'الاسم على البطاقة قصير جداً' : 'Cardholder name is too short');
        return;
    }

    setIsProcessing(true);
    
    // Construct Date String YYYY-MM-DD
    const formattedDate = selectedDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format

    // Simulate API call
    setTimeout(() => {
      const newBooking: Booking = {
        id: Math.random().toString(36).substr(2, 9),
        clientName: cardName,
        clientPhone: currentUser?.phone || '',
        clientEmail: currentUser?.email || '',
        consultantName: consultant.name,
        amount: consultant.price,
        date: new Date().toLocaleDateString(language === 'ar' ? 'ar-AE' : 'en-US'),
        consultationDate: formattedDate,
        consultationTime: selectedTime,
        status: 'PAID',
        paymentMethod: 'Credit Card'
      };

      const newNotification: AppNotification = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'BOOKING',
          title: language === 'ar' ? 'حجز استشارة جديد' : 'New Consultation Booking',
          message: language === 'ar' 
            ? `قام ${cardName} بدفع ${consultant.price} درهم لحجز موعد مع ${consultant.name} في ${formattedDate} الساعة ${selectedTime}` 
            : `${cardName} paid ${consultant.price} AED to book ${consultant.name} on ${formattedDate} at ${selectedTime}`,
          timestamp: new Date().toISOString(),
          isRead: false
      };

      const existingBookings = JSON.parse(localStorage.getItem('rak_bookings') || '[]');
      localStorage.setItem('rak_bookings', JSON.stringify([newBooking, ...existingBookings]));

      const existingNotifs = JSON.parse(localStorage.getItem('rak_notifications') || '[]');
      localStorage.setItem('rak_notifications', JSON.stringify([newNotification, ...existingNotifs]));

      setIsProcessing(false);
      setStep(2);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-dark-900 border border-gold-600/30 rounded-3xl w-full max-w-4xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-dark-950 border-b border-gray-800 flex justify-between items-center z-10">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-gold-500" />
                    {step === 1 ? t.title : t.success}
                </h2>
                <p className="text-xs text-gray-400 mt-1">{t.bookingWith} <span className="text-gold-500">{consultant.name}</span></p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-all">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="overflow-y-auto custom-scrollbar p-6">
          {step === 1 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Column: Calendar */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t.consultationDate}</h3>
                    
                    <div className="bg-dark-950 rounded-2xl border border-gray-800 p-6">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-6">
                            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/5 rounded-full hover:text-gold-500 text-gray-400 transition-colors"><ChevronRight className="w-5 h-5 rtl:rotate-180" /></button>
                            <span className="font-bold text-white text-lg">{months[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/5 rounded-full hover:text-gold-500 text-gray-400 transition-colors"><ChevronLeft className="w-5 h-5 rtl:rotate-180" /></button>
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-2">
                            {calendarGrid.map((date, idx) => {
                                if (!date) return <div key={`empty-${idx}`} />;
                                const disabled = isDateDisabled(date);
                                const selected = selectedDate && isSameDay(selectedDate, date);
                                const isToday = isSameDay(new Date(), date);
                                const dayName = date.toLocaleDateString(language === 'ar' ? 'ar-AE' : 'en-US', { weekday: 'short' });
                                
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => { if (!disabled) { setSelectedDate(date); setSelectedTime(''); } }}
                                        disabled={disabled}
                                        className={`
                                            h-16 w-full rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all duration-200 mx-auto border
                                            ${selected 
                                                ? 'bg-gold-500 text-black font-bold shadow-lg shadow-gold-500/30 scale-105 border-gold-500' 
                                                : disabled 
                                                    ? 'text-gray-700 cursor-not-allowed opacity-30 border-transparent' 
                                                    : isToday
                                                        ? 'bg-gold-500/10 text-gold-500 border-gold-500/50 font-bold'
                                                        : 'text-gray-300 border-transparent hover:bg-white/10 hover:text-white hover:border-white/10'
                                            }
                                        `}
                                    >
                                        <span className={`text-[9px] uppercase mb-0.5 ${selected ? 'text-black/70' : 'text-gray-500'}`}>{dayName}</span>
                                        <span className="text-lg leading-none">{date.getDate()}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-6 flex items-center justify-center gap-6 text-[10px] text-gray-500 border-t border-gray-800 pt-4">
                             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gold-500" /> {language === 'ar' ? 'محدد' : 'Selected'}</div>
                             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gold-500/10 border border-gold-500/30" /> {language === 'ar' ? 'اليوم' : 'Today'}</div>
                             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-700" /> {language === 'ar' ? 'غير متاح' : 'Unavailable'}</div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Time & Payment */}
                <div className="space-y-8">
                    
                    {/* Time Selection */}
                    <div className={`transition-all duration-500 ${selectedDate ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-4 pointer-events-none grayscale'}`}>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                            <span>{t.consultationTime}</span>
                            {selectedDate && <span className="text-gold-500 text-xs normal-case bg-gold-500/10 px-2 py-1 rounded border border-gold-500/20">{selectedDate.toLocaleDateString(language === 'ar' ? 'ar-AE' : 'en-US', {weekday: 'long', day: 'numeric', month: 'short'})}</span>}
                        </h3>
                        
                        <div className="space-y-4 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                            {/* Morning */}
                            {timeSlots.morning.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3 text-xs text-gold-400 font-bold uppercase tracking-wider">
                                        <Sun className="w-3 h-3" /> {language === 'ar' ? 'الفترة الصباحية' : 'Morning'}
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {timeSlots.morning.map(time => (
                                            <button
                                                key={time}
                                                onClick={() => setSelectedTime(time)}
                                                className={`py-2 px-1 rounded-lg text-xs font-bold transition-all border ${
                                                    selectedTime === time
                                                        ? 'bg-gold-500 text-black border-gold-500 shadow-md scale-105'
                                                        : 'bg-dark-950 border-gray-800 text-gray-400 hover:border-gold-500/50 hover:text-white'
                                                }`}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Evening */}
                            {timeSlots.evening.length > 0 && (
                                <div className="mt-4">
                                    <div className="flex items-center gap-2 mb-3 text-xs text-blue-400 font-bold uppercase tracking-wider">
                                        <Moon className="w-3 h-3" /> {language === 'ar' ? 'الفترة المسائية' : 'Evening'}
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {timeSlots.evening.map(time => (
                                            <button
                                                key={time}
                                                onClick={() => setSelectedTime(time)}
                                                className={`py-2 px-1 rounded-lg text-xs font-bold transition-all border ${
                                                    selectedTime === time
                                                        ? 'bg-gold-500 text-black border-gold-500 shadow-md scale-105'
                                                        : 'bg-dark-950 border-gray-800 text-gray-400 hover:border-gold-500/50 hover:text-white'
                                                }`}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {timeSlots.morning.length === 0 && timeSlots.evening.length === 0 && selectedDate && (
                                <div className="p-4 bg-red-900/10 border border-red-900/20 rounded-xl text-center text-red-400 text-xs">
                                    {language === 'ar' ? 'لا توجد مواعيد متاحة في هذا اليوم' : 'No slots available on this day'}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-gray-800/50" />

                    {/* Payment Form (Condensed) */}
                    <div className={`transition-all duration-500 ${selectedTime ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-4 pointer-events-none blur-[1px]'}`}>
                         <form onSubmit={handlePay} className="space-y-4">
                            
                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 uppercase font-bold">{t.cardName}</label>
                                <input 
                                    type="text" 
                                    required
                                    value={cardName}
                                    onChange={(e) => setCardName(e.target.value)}
                                    className="w-full bg-dark-950 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors text-sm"
                                    placeholder={t.cardName}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative col-span-2 md:col-span-1">
                                    <input 
                                        type="text" 
                                        required
                                        maxLength={16}
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-dark-950 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors text-sm text-left dir-ltr"
                                        placeholder="0000000000000000"
                                    />
                                    <CreditCard className="absolute right-3 ltr:right-3 rtl:left-3 rtl:right-auto top-3 w-4 h-4 text-gray-500" />
                                </div>
                                <div className="grid grid-cols-3 gap-2 col-span-2 md:col-span-1">
                                    <div className="relative group">
                                        <select 
                                            required 
                                            value={expiryMonth}
                                            onChange={(e) => setExpiryMonth(e.target.value)}
                                            className="w-full bg-dark-950 border border-gray-700 rounded-xl px-2 py-2.5 text-white text-xs appearance-none focus:border-gold-500 focus:outline-none cursor-pointer"
                                        >
                                            <option value="" disabled>{language === 'ar' ? 'الشهر' : 'MM'}</option>
                                            {expiryMonths.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-2 top-3 w-3 h-3 text-gray-500 pointer-events-none group-hover:text-gold-500" />
                                    </div>
                                    <div className="relative group">
                                        <select 
                                            required 
                                            value={expiryYear}
                                            onChange={(e) => setExpiryYear(e.target.value)}
                                            className="w-full bg-dark-950 border border-gray-700 rounded-xl px-2 py-2.5 text-white text-xs appearance-none focus:border-gold-500 focus:outline-none cursor-pointer"
                                        >
                                            <option value="" disabled>{language === 'ar' ? 'السنة' : 'YY'}</option>
                                            {expiryYears.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-2 top-3 w-3 h-3 text-gray-500 pointer-events-none group-hover:text-gold-500" />
                                    </div>
                                    <input 
                                      type="text" 
                                      required 
                                      maxLength={3}
                                      value={cvv}
                                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                                      className="w-full bg-dark-950 border border-gray-700 rounded-xl px-2 py-2.5 text-white text-center text-sm focus:border-gold-500 outline-none" 
                                      placeholder="CVV" 
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-400 text-xs flex items-center gap-2 bg-red-900/10 p-2 rounded-lg border border-red-900/20">
                                    <AlertCircle className="w-4 h-4" /> {error}
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={isProcessing}
                                className="w-full bg-gold-600 hover:bg-gold-500 text-black font-bold py-3.5 rounded-xl transition-all shadow-xl shadow-gold-600/20 flex items-center justify-center gap-3 mt-4 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {isProcessing ? (
                                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Lock className="w-4 h-4" />
                                        <span>{t.payBtn} <span className="bg-black/10 px-2 py-0.5 rounded ml-1">{consultant.price} {common.currency}</span></span>
                                    </>
                                )}
                            </button>
                         </form>
                    </div>

                </div>
            </div>
          ) : (
            <div className="text-center py-20 animate-in zoom-in duration-300">
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-3">{t.success}</h3>
                <p className="text-gray-400 max-w-xs mx-auto">{t.successDesc}</p>
                <div className="mt-8 p-4 bg-dark-950 rounded-xl border border-gray-800 inline-block text-left">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{t.consultationDate}</p>
                    <p className="text-gold-500 font-bold text-lg flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" /> 
                        {selectedDate?.toLocaleDateString(language === 'ar' ? 'ar-AE' : 'en-US')}
                        <span className="text-gray-600">|</span>
                        <Clock className="w-4 h-4" />
                        {selectedTime}
                    </p>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
