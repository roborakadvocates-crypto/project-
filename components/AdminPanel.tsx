
import React, { useState, useEffect, useRef } from 'react';
import { Consultant, Language, ClientProfile, Booking, AppNotification, ViewState, LegalCase, RegisteredUser, CaseUpdate } from '../types';
import ImageCropModal from './ImageCropModal';
import { hashPassword } from '../utils/crypto';
// Import TOTP libraries
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
// Import Firebase Auth and Firestore
import { auth, db, RecaptchaVerifier, signInWithPhoneNumber, sendSignInLinkToEmail } from '../utils/firebase';
import { collection, doc, setDoc, getDocs, onSnapshot, query, orderBy, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';

import { 
  Plus, Edit2, Trash2, Save, X, Shield, Lock, Eye, EyeOff, ShieldAlert, 
  Upload, Users, Briefcase, CreditCard, DollarSign, Bell, Check, 
  CheckCircle2, ArrowLeft, ArrowRight, Settings, 
  FileText, FilePlus, Calendar, Key, User, UserPlus, Info, 
  LogIn, AlertCircle, LogOut, Image as ImageIcon, ArrowUp, ArrowDown, Star,
  UserCheck, Layers, RotateCcw, ChevronLeft, ChevronRight, UserMinus, Phone, Mail, MessageSquare, Search, Fingerprint, RefreshCw,
  FolderOpen, UserCog, ScanFace, Smartphone, Timer
} from 'lucide-react';
import { translations } from '../locales';

interface AdminPanelProps {
  consultants: Consultant[];
  setConsultants: (consultants: Consultant[]) => void;
  language: Language;
  setCurrentView: (view: ViewState) => void;
}

type Tab = 'CONSULTANTS' | 'CLIENTS' | 'REGISTRATIONS' | 'BOOKINGS' | 'SETTINGS';

const DEFAULT_IMAGE = 'https://via.placeholder.com/400x400/1f1f1f/808080?text=No+Image';
const BIO_MAX_LENGTH = 500;

const AdminPanel: React.FC<AdminPanelProps> = ({ consultants, setConsultants, language, setCurrentView }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);

  // 2FA Login States
  const [is2FAStep, setIs2FAStep] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');

  // 2FA Setup States
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [tempSecret, setTempSecret] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('CONSULTANTS');
  
  const [selectedClientForCase, setSelectedClientForCase] = useState<ClientProfile | null>(null);
  const [clientCase, setClientCase] = useState<LegalCase | null>(null);
  const [clientPass, setClientPass] = useState('');
  const [clientUsername, setClientUsername] = useState('');
  const [editClientInfo, setEditClientInfo] = useState<ClientProfile | null>(null);

  // New Update States
  const [newUpdateTitle, setNewUpdateTitle] = useState('');
  const [newUpdateDesc, setNewUpdateDesc] = useState('');

  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showConsultantModal, setShowConsultantModal] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [isCroppingFounder, setIsCroppingFounder] = useState(false);

  // Client Search State
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // --- Client Registration States ---
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const [newClientBasicData, setNewClientBasicData] = useState({ 
    id5: '',
    name: '', 
    email: '', 
    phone: '',
    username: '',
    password: ''
  });

  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [registrations, setRegistrations] = useState<RegisteredUser[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Consultant>>({});
  const [isAdding, setIsAdding] = useState(false);

  const t = translations[language].admin;
  const common = translations[language].common;
  const portalT = translations[language].portal;

  // Persist Admin Session & Data
  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem('rak_admin_logged_in') === 'true';
    const stored2FASecret = localStorage.getItem('rak_admin_2fa_secret');
    
    if (stored2FASecret) setIs2FAEnabled(true);

    if (isAdminLoggedIn) {
      setIsAuthenticated(true);
    }

    const savedRegistrations = localStorage.getItem('rak_registrations');
    if (savedRegistrations) setRegistrations(JSON.parse(savedRegistrations));

    const savedBookings = localStorage.getItem('rak_bookings');
    if (savedBookings) setBookings(JSON.parse(savedBookings));
    
    // Fallback to localStorage if db is not available
    const savedClients = localStorage.getItem('rak_clients');
    if (savedClients) setClients(JSON.parse(savedClients));
    const savedNotifs = localStorage.getItem('rak_notifications');
    if (savedNotifs) setNotifications(JSON.parse(savedNotifs));

    if (db) {
      const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
        const clientsData: ClientProfile[] = [];
        snapshot.forEach(doc => clientsData.push(doc.data() as ClientProfile));
        setClients(clientsData);
        localStorage.setItem('rak_clients', JSON.stringify(clientsData));
      });
      
      const unsubCases = onSnapshot(collection(db, 'cases'), (snapshot) => {
        const casesData: Record<string, LegalCase> = {};
        snapshot.forEach(doc => casesData[doc.id] = doc.data() as LegalCase);
        localStorage.setItem('rak_cases', JSON.stringify(casesData));
        // Update current client case if open
        setClientCase(prev => {
          if (prev && casesData[prev.id]) return casesData[prev.id];
          return prev;
        });
      });

      const unsubLogins = onSnapshot(collection(db, 'user_logins'), (snapshot) => {
        const loginsData: Record<string, any> = {};
        snapshot.forEach(doc => loginsData[doc.id] = doc.data());
        localStorage.setItem('rak_user_logins', JSON.stringify(loginsData));
      });

      const unsubRegistrations = onSnapshot(collection(db, 'registrations'), (snapshot) => {
        const regsData: RegisteredUser[] = [];
        snapshot.forEach(doc => regsData.push(doc.data() as RegisteredUser));
        setRegistrations(regsData);
        localStorage.setItem('rak_registrations', JSON.stringify(regsData));
      });

      const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snapshot) => {
        const notifsData: AppNotification[] = [];
        snapshot.forEach(doc => notifsData.push(doc.data() as AppNotification));
        notifsData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setNotifications(notifsData);
        localStorage.setItem('rak_notifications', JSON.stringify(notifsData));
      });

      return () => {
        unsubClients();
        unsubCases();
        unsubLogins();
        unsubRegistrations();
        unsubNotifs();
      };
    }
  }, [activeTab]);

  // Cleanup Recaptcha on unmount
  useEffect(() => {
    return () => {
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {}
        (window as any).recaptchaVerifier = null;
      }
    };
  }, []);



  // Reset Add Client Modal State when closed or opened
  useEffect(() => {
    if (!showAddClientModal) {
      setIsCreatingClient(false);
    }
  }, [showAddClientModal]);


  // --- 2FA LOGIC ---

  const generate2FASetup = async () => {
      // 1. Generate a new Secret
      const secret = new OTPAuth.Secret({ size: 20 });
      const secretBase32 = secret.base32;
      setTempSecret(secretBase32);

      // 2. Create TOTP Object
      const totp = new OTPAuth.TOTP({
          issuer: 'RAK Advocates',
          label: 'Admin',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: secret
      });

      // 3. Generate URI and QRCode
      const uri = totp.toString();
      const url = await QRCode.toDataURL(uri);
      setQrCodeUrl(url);
      setShow2FASetupModal(true);
  };

  const confirm2FASetup = () => {
      if (!setupCode || setupCode.length !== 6) return alert('Please enter 6-digit code');

      const totp = new OTPAuth.TOTP({
          issuer: 'RAK Advocates',
          label: 'Admin',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(tempSecret)
      });

      // Verify range of window to allow slight time drift
      const delta = totp.validate({ token: setupCode, window: 1 });

      if (delta !== null) {
          // Success! Save secret
          localStorage.setItem('rak_admin_2fa_secret', tempSecret);
          setIs2FAEnabled(true);
          setShow2FASetupModal(false);
          setSetupCode('');
          setTempSecret('');
          setShowSaveToast(true);
          setTimeout(() => setShowSaveToast(false), 2000);
      } else {
          alert('Invalid Code. Please scan the QR code again.');
      }
  };

  const disable2FA = () => {
      if (window.confirm('Are you sure you want to disable 2FA? This decreases security.')) {
          localStorage.removeItem('rak_admin_2fa_secret');
          setIs2FAEnabled(false);
          setShowSaveToast(true);
          setTimeout(() => setShowSaveToast(false), 2000);
      }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingLogin(true);
    setAuthError('');
    
    // Check Password First
    setTimeout(() => {
      // Username is now 'ADMIN'
      if (adminUsername === 'ADMIN' && adminPassword === 'P@ssw0rdwwF') {
        // Password Correct. Check 2FA.
        const storedSecret = localStorage.getItem('rak_admin_2fa_secret');
        if (storedSecret) {
            // 2FA Enabled -> Show 2FA Screen
            setIs2FAStep(true);
            setLoadingLogin(false);
        } else {
            // 2FA Disabled -> Log straight in
            completeLogin();
        }
      } else {
        setAuthError(portalT.loginError);
        setLoadingLogin(false);
      }
    }, 800);
  };

  const verify2FALogin = (e: React.FormEvent) => {
      e.preventDefault();
      setLoadingLogin(true);
      const storedSecret = localStorage.getItem('rak_admin_2fa_secret');
      
      if (!storedSecret) {
          // Should not happen if is2FAStep is true, but fallback
          completeLogin();
          return;
      }

      const totp = new OTPAuth.TOTP({
          issuer: 'RAK Advocates',
          label: 'Admin',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(storedSecret)
      });

      const delta = totp.validate({ token: twoFACode, window: 1 });

      if (delta !== null) {
          completeLogin();
      } else {
          setAuthError(language === 'ar' ? 'رمز المصادقة غير صحيح' : 'Invalid Authenticator Code');
          setLoadingLogin(false);
      }
  };

  const completeLogin = () => {
      setIsAuthenticated(true);
      localStorage.setItem('rak_admin_logged_in', 'true');
      setLoadingLogin(false);
      setIs2FAStep(false);
      setTwoFACode('');
  };

  // --- END 2FA LOGIC ---

  const handleLogoutAdmin = () => {
    setIsAuthenticated(false);
    setAdminPassword('');
    setIs2FAStep(false); // Reset
    setTwoFACode('');
    localStorage.removeItem('rak_admin_logged_in'); 
  };

  const handleGlobalSave = () => {
    localStorage.setItem('rak_clients', JSON.stringify(clients));
    localStorage.setItem('rak_registrations', JSON.stringify(registrations));
    localStorage.setItem('rak_bookings', JSON.stringify(bookings));
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2000);
  };

  // ... (Existing helper functions: validateUAEPhone, validateEmail, etc. - UNCHANGED)
  const validateUAEPhone = (phone: string) => {
    const re = /^(?:\+971|00971|0)?(?:50|51|52|54|55|56|58)\d{7}$/;
    return re.test(phone.replace(/\s/g, ''));
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // --- CLIENT CREATION LOGIC ---
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newClientBasicData.name || !newClientBasicData.username || !newClientBasicData.password || !newClientBasicData.id5) return;
    if (!/^\d{5}$/.test(newClientBasicData.id5)) return alert(language === 'ar' ? 'رقم الهوية يجب أن يتكون من 5 أرقام' : 'ID must be 5 digits');
    if (clients.some(c => c.id === newClientBasicData.id5)) return alert(t.clients.idExistsError);
    
    // Optional: Validate Phone/Email if provided
    if (newClientBasicData.phone && !validateUAEPhone(newClientBasicData.phone)) {
        return alert(language === 'ar' ? 'رقم الهاتف غير صحيح' : 'Invalid Phone');
    }
    if (newClientBasicData.email && !validateEmail(newClientBasicData.email)) {
        return alert(language === 'ar' ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email');
    }

    setIsCreatingClient(true);

    // Simulate network delay for better UX
    setTimeout(async () => {
        await finalizeClientCreation();
        setIsCreatingClient(false);
    }, 800);
  };

  const finalizeClientCreation = async () => {
    const clientId = newClientBasicData.id5;
    const hashedPassword = await hashPassword(newClientBasicData.password);

    const newClient: ClientProfile = { id: clientId, name: newClientBasicData.name, email: newClientBasicData.email, phone: newClientBasicData.phone, joinedDate: new Date().toISOString().split('T')[0] };
    const updatedClients = [...clients, newClient];
    setClients(updatedClients);
    localStorage.setItem('rak_clients', JSON.stringify(updatedClients));
    
    const newCase: LegalCase = { id: clientId, caseNumber: `RAK-${new Date().getFullYear()}-${clientId}`, clientName: newClientBasicData.name, status: 'Pending', updates: [{ id: '1', date: new Date().toISOString().split('T')[0], title: language === 'ar' ? 'فتح الملف' : 'File Opened', description: language === 'ar' ? 'تم تسجيل الموكل بنجاح.' : 'Client registered successfully.' }], documents: [] };
    const savedCases = JSON.parse(localStorage.getItem('rak_cases') || '{}');
    savedCases[clientId] = newCase;
    localStorage.setItem('rak_cases', JSON.stringify(savedCases));
    
    const savedUsers = JSON.parse(localStorage.getItem('rak_user_logins') || '{}');
    const userLoginData = { caseId: clientId, clientId: clientId };
    savedUsers[newClientBasicData.username.toLowerCase()] = userLoginData;
    localStorage.setItem('rak_user_logins', JSON.stringify(savedUsers));
    
    if (db) {
      try {
        // Create user in Firebase Auth
        const email = `${newClientBasicData.username.toLowerCase()}@rakadvocates.app`;
        await createUserWithEmailAndPassword(auth, email, newClientBasicData.password);
        await signOut(auth); // Sign out the newly created user so admin stays in session
      } catch (err) {
        console.error("Firebase Auth Error:", err);
      }

      try {
        await setDoc(doc(db, 'clients', clientId), newClient);
        await setDoc(doc(db, 'cases', clientId), newCase);
        // Do not store password in Firestore
        await setDoc(doc(db, 'user_logins', newClientBasicData.username.toLowerCase()), userLoginData);
        
        const notifId = Math.random().toString(36).substr(2, 9);
        const newNotif = { id: notifId, title: language === 'ar' ? 'موكل جديد' : 'New Client', message: language === 'ar' ? `تم تسجيل الموكل ${newClient.name}` : `Client ${newClient.name} registered.`, isRead: false, timestamp: Date.now() };
        await setDoc(doc(db, 'notifications', notifId), newNotif);
      } catch (err) {
        console.error("Error saving to Firestore", err);
      }
    }

    setShowAddClientModal(false);
    setNewClientBasicData({ id5: '', name: '', email: '', phone: '', username: '', password: '' });
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2000);
  };

  const handleConvertRegistrationToClient = (reg: RegisteredUser) => {
    setNewClientBasicData({ id5: '', name: reg.name, email: reg.email, phone: reg.phone, username: reg.username, password: '' });
    setShowAddClientModal(true);
  };

  const handleManageCase = (client: ClientProfile) => {
      setSelectedClientForCase(client);
      setEditClientInfo({...client});
      const savedCases = JSON.parse(localStorage.getItem('rak_cases') || '{}');
      setClientCase(savedCases[client.id] || null);
      const savedUsers = JSON.parse(localStorage.getItem('rak_user_logins') || '{}');
      const userEntry = Object.entries(savedUsers).find(([_, val]: any) => val.clientId === client.id);
      if (userEntry) { setClientUsername(userEntry[0]); setClientPass(''); }
      setNewUpdateTitle('');
      setNewUpdateDesc('');
  };

  const handleAddCaseUpdate = async () => {
    if(!newUpdateTitle || !newUpdateDesc || !clientCase) return;
    const newUpdate: CaseUpdate = { id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString().split('T')[0], title: newUpdateTitle, description: newUpdateDesc };
    const updatedCase = { ...clientCase, updates: [newUpdate, ...clientCase.updates] };
    setClientCase(updatedCase);
    const savedCases = JSON.parse(localStorage.getItem('rak_cases') || '{}');
    savedCases[clientCase.id] = updatedCase;
    localStorage.setItem('rak_cases', JSON.stringify(savedCases));
    const syncEvent = { clientId: clientCase.id, type: 'CASE_UPDATE', title: newUpdateTitle, timestamp: Date.now() };
    localStorage.setItem('rak_latest_sync_event', JSON.stringify(syncEvent));
    
    if (db) {
      try {
        await setDoc(doc(db, 'cases', clientCase.id), updatedCase);
        const notifId = Math.random().toString(36).substr(2, 9);
        const newNotif = { id: notifId, title: language === 'ar' ? 'تحديث قضية' : 'Case Update', message: language === 'ar' ? `تم تحديث قضية ${clientCase.clientName}` : `Case updated for ${clientCase.clientName}`, isRead: false, timestamp: Date.now() };
        await setDoc(doc(db, 'notifications', notifId), newNotif);
      } catch (err) {
        console.error("Error updating case in Firestore", err);
      }
    }

    setNewUpdateTitle(''); setNewUpdateDesc('');
    setShowSaveToast(true); setTimeout(() => setShowSaveToast(false), 2000);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let newPass = '';
    for (let i = 0; i < 8; i++) newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    setClientPass(newPass);
  };

  const handleSaveFullClientUpdate = async () => {
      if (!clientCase || !editClientInfo) return;
      const updatedClients = clients.map(c => c.id === editClientInfo.id ? editClientInfo : c);
      setClients(updatedClients);
      localStorage.setItem('rak_clients', JSON.stringify(updatedClients));
      const savedCases = JSON.parse(localStorage.getItem('rak_cases') || '{}');
      const updatedCaseObj = { ...clientCase, clientName: editClientInfo.name };
      savedCases[clientCase.id] = updatedCaseObj;
      localStorage.setItem('rak_cases', JSON.stringify(savedCases));
      const savedUsers = JSON.parse(localStorage.getItem('rak_user_logins') || '{}');
      
      let oldUsername = '';
      Object.keys(savedUsers).forEach(k => { if (savedUsers[k].clientId === clientCase.id) { oldUsername = k; delete savedUsers[k]; } });
      const newUserLogin = { caseId: clientCase.id, clientId: clientCase.id };
      savedUsers[clientUsername.toLowerCase()] = newUserLogin;
      localStorage.setItem('rak_user_logins', JSON.stringify(savedUsers));
      
      if (db) {
        if (clientPass) {
          try {
            // Update password in Firebase Auth by creating a new user or updating existing
            // Since we can't easily update password without signing in, we create a new user
            // This is a simplified approach. In a real app, you'd use Admin SDK.
            const email = `${clientUsername.toLowerCase()}@rakadvocates.app`;
            await createUserWithEmailAndPassword(auth, email, clientPass);
            await signOut(auth);
          } catch (err) {
            console.error("Firebase Auth Error:", err);
          }
        }

        try {
          const batch = writeBatch(db);
          batch.set(doc(db, 'clients', editClientInfo.id), editClientInfo);
          batch.set(doc(db, 'cases', clientCase.id), updatedCaseObj);
          if (oldUsername && oldUsername !== clientUsername.toLowerCase()) {
            batch.delete(doc(db, 'user_logins', oldUsername));
          }
          // Do not store password in Firestore
          batch.set(doc(db, 'user_logins', clientUsername.toLowerCase()), newUserLogin);
          await batch.commit();
        } catch (err) {
          console.error("Error updating client in Firestore", err);
        }
      }

      setShowSaveToast(true); setTimeout(() => { setShowSaveToast(false); setSelectedClientForCase(null); }, 1000);
  };

  const handleEditConsultant = (consultant: Consultant) => { setEditingId(consultant.id); setFormData(consultant); setIsAdding(false); setShowConsultantModal(true); };
  const handleDeleteConsultant = (id: string) => { 
    if (id === '1') return alert(language === 'ar' ? 'لا يمكن حذف ملف المؤسس' : 'Cannot delete founder');
    if (window.confirm(translations[language].admin.confirmDelete)) {
      const updated = consultants.filter(c => c.id !== id); setConsultants(updated); setShowConsultantModal(false); setShowSaveToast(true); setTimeout(() => setShowSaveToast(false), 2000);
    }
  };
  const handleAddNewConsultant = () => { setIsAdding(true); setEditingId('new'); setFormData({ id: Math.random().toString(36).substr(2, 9), name: '', title: '', specialty: '', price: 1000, imageUrl: '', bio: '' }); setShowConsultantModal(true); };
  const handleConsultantImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isFounder = false) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setCropImage(reader.result as string); setIsCroppingFounder(isFounder); }; reader.readAsDataURL(file); } };
  const handleCropComplete = (croppedImage: string) => { if (isCroppingFounder) { const updated = consultants.map(c => c.id === '1' ? { ...c, imageUrl: croppedImage } : c); setConsultants(updated); setShowSaveToast(true); setTimeout(() => setShowSaveToast(false), 2000); } else { setFormData({ ...formData, imageUrl: croppedImage }); } setCropImage(null); setIsCroppingFounder(false); };
  const handleSaveConsultant = (e: React.FormEvent) => { e.preventDefault(); if (!formData.name || !formData.price || !formData.title) return alert(t.fillData); let updatedConsultants = isAdding ? [...consultants, formData as Consultant] : consultants.map(c => c.id === editingId ? { ...c, ...formData } as Consultant : c); setConsultants(updatedConsultants); setShowConsultantModal(false); setEditingId(null); setIsAdding(false); setShowSaveToast(true); setTimeout(() => setShowSaveToast(false), 2000); };
  const reorderConsultant = (index: number, direction: 'up' | 'down') => { const newConsultants = [...consultants]; const targetIndex = direction === 'up' ? index - 1 : index + 1; if (targetIndex > 0 && targetIndex < newConsultants.length) { [newConsultants[index], newConsultants[targetIndex]] = [newConsultants[targetIndex], newConsultants[index]]; setConsultants(newConsultants); } };
  const markAllAsRead = async () => { 
    const updated = notifications.map(n => ({ ...n, isRead: true })); 
    setNotifications(updated); 
    localStorage.setItem('rak_notifications', JSON.stringify(updated)); 
    
    if (db) {
      try {
        const batch = writeBatch(db);
        notifications.forEach(n => {
          if (!n.isRead) {
            batch.update(doc(db, 'notifications', n.id), { isRead: true });
          }
        });
        await batch.commit();
      } catch (err) {
        console.error("Error marking notifications as read in Firestore", err);
      }
    }
  };
  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.id.includes(clientSearchQuery));
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const founder = consultants.find(c => c.id === '1');
  const otherConsultants = consultants.filter(c => c.id !== '1');

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 min-h-screen flex items-center justify-center">
        <div className="max-w-sm w-full bg-dark-900 border border-gold-600/20 rounded-3xl p-8 shadow-[0_0_80px_rgba(184,134,46,0.15)] animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-gold-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gold-600/30 rotate-3">
              {is2FAStep ? <Smartphone className="w-8 h-8 text-gold-500" /> : <ShieldAlert className="w-8 h-8 text-gold-500 -rotate-3" />}
          </div>
          <h2 className="text-xl font-bold text-white text-center mb-1 font-serif-headings tracking-tight">
              {is2FAStep ? (language === 'ar' ? 'المصادقة الثنائية' : 'Two-Factor Auth') : t.title}
          </h2>
          <p className="text-gray-400 text-center mb-8 text-[10px] whitespace-nowrap overflow-hidden text-ellipsis opacity-80 max-w-[200px] mx-auto">
              {is2FAStep ? (language === 'ar' ? 'أدخل الرمز من تطبيق Google Authenticator' : 'Enter code from Google Authenticator') : t.subtitle}
          </p>
          
          {is2FAStep ? (
              // 2FA LOGIN FORM
              <form onSubmit={verify2FALogin} className="space-y-5">
                  <div className="space-y-1">
                      <div className="relative group">
                          <input type="text" value={twoFACode} onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g,'').slice(0,6))} className="w-full bg-dark-950 border border-gray-800 rounded-xl py-3 px-4 text-center text-white text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-gold-500 transition-all placeholder:tracking-normal" placeholder="000000" maxLength={6} autoFocus required />
                      </div>
                  </div>
                  {authError && <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl flex items-center gap-2 text-red-400 text-[10px] font-bold animate-in shake"><AlertCircle className="w-4 h-4" />{authError}</div>}
                  <button type="submit" disabled={loadingLogin} className="w-full mt-2 bg-gold-600 hover:bg-gold-500 text-black font-bold py-3 rounded-xl shadow-xl shadow-gold-600/20 flex justify-center items-center gap-2 uppercase tracking-widest text-xs">
                      {loadingLogin ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" /> : <><Check className="w-4 h-4" /> {language === 'ar' ? 'تحقق' : 'Verify'}</>}
                  </button>
                  <button type="button" onClick={() => { setIs2FAStep(false); setTwoFACode(''); setAdminPassword(''); }} className="w-full text-gray-600 hover:text-white text-[10px] py-1 transition-all flex items-center justify-center gap-2 font-bold uppercase"><ArrowLeft className="w-3 h-3 rtl:rotate-180" /> {common.back}</button>
              </form>
          ) : (
              // STANDARD PASSWORD LOGIN FORM
              <form onSubmit={handleAdminLogin} className="space-y-5">
                <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-1">{t.clients.username}</label>
                <div className="relative group">
                    <input type="password" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} className="w-full bg-dark-950 border border-gray-800 rounded-xl py-3 px-10 text-white text-sm focus:outline-none focus:border-gold-500 transition-all font-mono" placeholder="••••••" required />
                    <User className="absolute top-3.5 left-3 text-gray-600 w-4 h-4 group-focus-within:text-gold-500 transition-colors" />
                </div>
                </div>
                <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-1">{t.clients.password}</label>
                <div className="relative group">
                    <input type={showAdminPass ? "text" : "password"} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full bg-dark-950 border border-gray-800 rounded-xl py-3 px-10 text-white text-sm focus:outline-none focus:border-gold-500 transition-all font-mono" placeholder="••••••••" required />
                    <Key className="absolute top-3.5 left-3 text-gray-600 w-4 h-4 group-focus-within:text-gold-500 transition-colors" />
                    <button type="button" onClick={() => setShowAdminPass(!showAdminPass)} className="absolute top-3.5 right-3 text-gray-600 hover:text-gold-500 transition-colors">
                    {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
                </div>
                {authError && <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl flex items-center gap-2 text-red-400 text-[10px] font-bold animate-in shake"><AlertCircle className="w-4 h-4" />{authError}</div>}
                <button type="submit" disabled={loadingLogin} className="w-full mt-2 bg-gold-600 hover:bg-gold-500 text-black font-bold py-3 rounded-xl shadow-xl shadow-gold-600/20 flex justify-center items-center gap-2 uppercase tracking-widest text-xs">
                {loadingLogin ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" /> : <><LogIn className="w-4 h-4" /> {language === 'ar' ? 'تسجيل دخول' : 'Access System'}</>}
                </button>
                <button type="button" onClick={() => setCurrentView('HOME')} className="w-full text-gray-600 hover:text-white text-[10px] py-1 transition-all flex items-center justify-center gap-2 font-bold uppercase"><ArrowLeft className="w-3 h-3 rtl:rotate-180" /> {common.back}</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 relative" dir={language === 'ar' ? 'rtl' : 'ltr'} onClick={() => setShowNotifications(false)}>
      {cropImage && <ImageCropModal image={cropImage} onCropComplete={handleCropComplete} onClose={() => { setCropImage(null); setIsCroppingFounder(false); }} language={language} />}

      {/* --- 2FA SETUP MODAL --- */}
      {show2FASetupModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
              <div className="bg-dark-900 border border-gold-600/30 rounded-3xl w-full max-w-md p-8 text-center relative overflow-hidden shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">{language === 'ar' ? 'إعداد Google Authenticator' : 'Setup Google Authenticator'}</h3>
                  <div className="bg-white p-4 rounded-xl inline-block mb-6 border-4 border-white">
                      <img src={qrCodeUrl} alt="2FA QR Code" className="w-40 h-40" />
                  </div>
                  <p className="text-gray-400 text-xs mb-6 max-w-xs mx-auto">
                      {language === 'ar' 
                        ? 'امسح رمز QR باستخدام تطبيق Google Authenticator، ثم أدخل الرمز الظاهر في التطبيق أدناه.' 
                        : 'Scan this QR code with Google Authenticator app, then enter the 6-digit code below.'}
                  </p>
                  
                  <input 
                    type="text" 
                    value={setupCode} 
                    onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0,6))}
                    className="w-full bg-dark-950 border border-gray-700 rounded-xl py-3 px-4 text-center text-white text-xl tracking-[0.5em] font-mono focus:border-gold-500 outline-none mb-4"
                    placeholder="000000"
                  />

                  <div className="flex gap-3">
                      <button onClick={() => setShow2FASetupModal(false)} className="flex-1 py-3 rounded-xl text-gray-500 hover:bg-white/5 font-bold text-xs">{common.cancel}</button>
                      <button onClick={confirm2FASetup} className="flex-1 bg-gold-600 hover:bg-gold-500 text-black font-bold py-3 rounded-xl text-xs">{language === 'ar' ? 'تفعيل الحماية' : 'Verify & Enable'}</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- CONSULTANT & CLIENT MODALS (Code Preserved but omitted for brevity in this view logic) --- */}
      {showConsultantModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
           <div className="relative bg-dark-900 border border-gold-600/20 rounded-3xl w-full max-w-xl shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-dark-950">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><ImageIcon className="w-5 h-5 text-gold-500" /> {isAdding ? t.addConsultant : common.edit}</h3>
                  <button onClick={() => setShowConsultantModal(false)} className="p-2 text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
                  <form onSubmit={handleSaveConsultant} className="space-y-5">
                      {/* ... Form Content Preserved ... */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-3">
                              <div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.name}</label><input type="text" required className="w-full bg-dark-950 border border-gray-800 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 outline-none" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                              <div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.jobTitle}</label><input type="text" required className="w-full bg-dark-950 border border-gray-800 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 outline-none" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} /></div>
                              <div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.specialty}</label><input type="text" required className="w-full bg-dark-950 border border-gray-800 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 outline-none" value={formData.specialty || ''} onChange={(e) => setFormData({...formData, specialty: e.target.value})} /></div>
                          </div>
                          <div className="space-y-3">
                              <div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{common.price}</label><div className="relative"><input type="number" required className="w-full bg-dark-950 border border-gray-800 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 font-mono outline-none" value={formData.price || 0} onChange={(e) => setFormData({...formData, price: parseInt(e.target.value)})} /><span className="absolute top-2.5 left-3 text-[8px] text-gray-500 font-bold uppercase">{common.currency}</span></div></div>
                              <div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.image}</label><div className="flex gap-2"><input type="text" className="flex-grow bg-dark-950 border border-gray-800 rounded-lg p-2.5 text-white text-[9px] outline-none" value={formData.imageUrl || ''} onChange={(e) => setFormData({...formData, imageUrl: e.target.value})} /><label className="bg-dark-800 border border-gray-700 px-3 flex items-center justify-center rounded-lg cursor-pointer hover:bg-gold-500 hover:text-black transition-all group/up"><Upload className="w-3 h-3" /><input type="file" className="hidden" accept="image/*" onChange={(e) => handleConsultantImageUpload(e, false)} /></label></div></div>
                              <div className="h-20 w-20 bg-dark-950 border border-gray-800 rounded-xl overflow-hidden flex items-center justify-center relative group">{formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" onError={(e) => e.currentTarget.src = DEFAULT_IMAGE} /> : <ImageIcon className="w-6 h-6 text-gray-800" />}</div>
                          </div>
                      </div>
                      <div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.bio}</label><textarea required className="w-full bg-dark-950 border border-gray-800 rounded-lg p-3 text-white min-h-[100px] text-xs outline-none focus:border-gold-500" value={formData.bio || ''} onChange={(e) => setFormData({...formData, bio: e.target.value.substring(0, BIO_MAX_LENGTH)})} /></div>
                      
                      <div className="flex gap-3 mt-4">
                        {!isAdding && formData.id !== '1' && (
                          <button type="button" onClick={() => handleDeleteConsultant(formData.id!)} className="flex-grow bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white font-bold py-3 rounded-xl border border-red-600/20 transition-all flex items-center justify-center gap-2 group/del text-xs">
                             <Trash2 className="w-4 h-4 group-hover/del:scale-110 transition-transform" /> {language === 'ar' ? 'حذف' : 'Delete'}
                          </button>
                        )}
                        <button type="submit" className="flex-[2] bg-gold-600 hover:bg-gold-500 text-black font-bold py-3 rounded-xl shadow-xl shadow-gold-600/20 transition-all flex items-center justify-center gap-2 text-xs">
                          <Save className="w-4 h-4" /> {isAdding ? (language === 'ar' ? 'إضافة المستشار' : 'Add Advisor') : (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
                        </button>
                      </div>
                  </form>
              </div>
           </div>
        </div>
      )}

      {/* --- ADD CLIENT & MANAGE CASE MODALS (Content Preserved) --- */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
           <div className="relative bg-dark-900 border border-gold-600/20 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-dark-950">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus className="w-5 h-5 text-gold-500" /> {t.clients.addClient}</h3>
                  <button onClick={() => setShowAddClientModal(false)} className="p-2 text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
                  <form onSubmit={handleCreateClient} className="space-y-4">
                      {/* ... Input Fields ... */}
                      <div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.clients.nationalIdLast5}</label><div className="relative"><input type="text" maxLength={5} required className="w-full bg-dark-950 border border-gray-800 rounded-lg p-2.5 pl-10 text-white focus:border-gold-500 outline-none font-mono tracking-widest text-base" value={newClientBasicData.id5} onChange={(e) => setNewClientBasicData({...newClientBasicData, id5: e.target.value.replace(/\D/g, '')})} placeholder="XXXXX" /><Fingerprint className="absolute left-3 top-3 w-4 h-4 text-gold-500" /></div></div>
                      <div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.clients.name}</label><input type="text" required className="w-full bg-dark-950 border border-gray-800 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 outline-none" value={newClientBasicData.name} onChange={(e) => setNewClientBasicData({...newClientBasicData, name: e.target.value})} /></div>
                      <div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.clients.email}</label><input type="email" className="w-full bg-dark-950 border border-gray-800 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 outline-none" value={newClientBasicData.email} onChange={(e) => setNewClientBasicData({...newClientBasicData, email: e.target.value})} /></div>
                      <div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.clients.phone}</label><div className="relative"><input type="tel" className="w-full bg-dark-950 border border-gray-800 rounded-lg p-2.5 pl-10 text-white text-xs focus:border-gold-500 outline-none dir-ltr text-left" value={newClientBasicData.phone} onChange={(e) => setNewClientBasicData({...newClientBasicData, phone: e.target.value})} placeholder="05xxxxxxxx" /><Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" /></div></div>
                      <div className="pt-3 border-t border-gray-800 mt-3"><h4 className="text-gold-500 text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">{t.clients.portalAccess}<span className="text-[8px] bg-green-900/50 text-green-400 px-2 py-0.5 rounded border border-green-700/50 flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> {language === 'ar' ? 'محمي ومشفر' : 'Encrypted'}</span></h4><div className="space-y-3"><div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.clients.username}</label><input type="text" required className="w-full bg-dark-950 border border-gray-800 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 outline-none font-mono" value={newClientBasicData.username} onChange={(e) => setNewClientBasicData({...newClientBasicData, username: e.target.value})} /></div><div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.clients.password}</label><input type="text" required className="w-full bg-dark-950 border border-gray-800 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 outline-none font-mono" value={newClientBasicData.password} onChange={(e) => setNewClientBasicData({...newClientBasicData, password: e.target.value})} placeholder={language === 'ar' ? 'تعيين كلمة مرور جديدة' : 'Set new password'} /></div></div></div>
                      <div className="pt-4"><button type="submit" disabled={isCreatingClient} className="w-full bg-gold-600 hover:bg-gold-500 text-black font-bold py-3 rounded-xl shadow-xl shadow-gold-600/20 transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50">{isCreatingClient ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><UserPlus className="w-4 h-4" /> {language === 'ar' ? 'إنشاء الموكل' : 'Create Client'}</>}</button></div>
                  </form>
              </div>
           </div>
        </div>
      )}

      {selectedClientForCase && editClientInfo && clientCase && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
           <div className="relative bg-dark-900 border border-gold-600/20 rounded-3xl w-full max-w-3xl shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-dark-950">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><Briefcase className="w-5 h-5 text-gold-500" /> {t.clients.manage} - {selectedClientForCase.name}</h3>
                  <button onClick={() => setSelectedClientForCase(null)} className="p-2 text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar flex-grow space-y-6">
                  {/* Client Info, Credentials, Case Details, Updates - Preserved */}
                  <section><h4 className="text-white font-bold mb-3 flex items-center gap-2 text-sm"><User className="w-3.5 h-3.5 text-gold-500" /> {t.clients.editClientInfo}</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.clients.name}</label><input type="text" className="w-full bg-dark-950 border border-gray-800 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 outline-none" value={editClientInfo.name} onChange={(e) => setEditClientInfo({...editClientInfo, name: e.target.value})} /></div><div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.clients.phone}</label><input type="text" className="w-full bg-dark-950 border border-gray-800 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 outline-none" value={editClientInfo.phone} onChange={(e) => setEditClientInfo({...editClientInfo, phone: e.target.value})} /></div><div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.clients.email}</label><input type="text" className="w-full bg-dark-950 border border-gray-800 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 outline-none" value={editClientInfo.email} onChange={(e) => setEditClientInfo({...editClientInfo, email: e.target.value})} /></div></div></section>
                  <section className="bg-dark-950 p-5 rounded-xl border border-gray-800 relative overflow-hidden"><div className="absolute top-0 left-0 bg-gold-600 text-black text-[8px] font-bold px-2 py-1 rounded-br-lg z-10 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> 2026 ENCRYPTION</div><h4 className="text-white font-bold mb-3 flex items-center gap-2 text-sm"><Lock className="w-3.5 h-3.5 text-gold-500" /> {t.clients.portalAccess}</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.clients.username}</label><input type="text" className="w-full bg-dark-900 border border-gray-700 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 outline-none font-mono" value={clientUsername} onChange={(e) => setClientUsername(e.target.value)} /></div><div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.clients.password}</label><div className="relative"><input type="text" className="w-full bg-dark-900 border border-gray-700 rounded-lg p-2.5 pr-10 rtl:pl-10 text-white text-xs focus:border-gold-500 outline-none font-mono" value={clientPass} onChange={(e) => setClientPass(e.target.value)} placeholder="••••••••" /><span className="absolute top-full right-0 text-[8px] text-gray-500 mt-1">{language === 'ar' ? 'اتركه فارغاً للاحتفاظ بكلمة المرور الحالية (لا يمكن رؤيتها)' : 'Leave empty to keep current password (hidden)'}</span><button onClick={handleGeneratePassword} type="button" title={language === 'ar' ? 'توليد كلمة مرور' : 'Generate Password'} className="absolute top-1/2 -translate-y-1/2 right-2 rtl:left-2 rtl:right-auto text-gray-500 hover:text-gold-500 transition-colors"><RefreshCw className="w-4 h-4" /></button></div></div></div></section>
                  <section><h4 className="text-white font-bold mb-3 flex items-center gap-2 text-sm"><FileText className="w-3.5 h-3.5 text-gold-500" /> {t.clients.caseStatus}</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.bookings.status}</label><select className="w-full bg-dark-950 border border-gray-800 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 outline-none appearance-none" value={clientCase.status} onChange={(e) => setClientCase({...clientCase, status: e.target.value as any})}><option value="Open">Open</option><option value="Closed">Closed</option><option value="Pending">Pending</option><option value="In Court">In Court</option></select></div><div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{t.clients.nextHearing}</label><input type="date" className="w-full bg-dark-950 border border-gray-800 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 outline-none" value={clientCase.nextHearing || ''} onChange={(e) => setClientCase({...clientCase, nextHearing: e.target.value})} /></div></div></section>
                  <section className="bg-dark-950 p-5 rounded-xl border border-gray-800"><h4 className="text-white font-bold mb-3 flex items-center gap-2 text-sm"><MessageSquare className="w-3.5 h-3.5 text-gold-500" /> {language === 'ar' ? 'إضافة تحديث جديد للقضية' : 'Add New Case Update'}</h4><div className="space-y-3"><div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{language === 'ar' ? 'عنوان التحديث' : 'Update Title'}</label><input type="text" className="w-full bg-dark-900 border border-gray-700 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 outline-none" value={newUpdateTitle} onChange={(e) => setNewUpdateTitle(e.target.value)} placeholder={language === 'ar' ? 'مثال: تم تأجيل الجلسة' : 'Ex: Hearing Postponed'} /></div><div><label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{language === 'ar' ? 'تفاصيل التحديث' : 'Update Details'}</label><textarea className="w-full bg-dark-900 border border-gray-700 rounded-lg p-2.5 text-white text-xs focus:border-gold-500 outline-none min-h-[60px]" value={newUpdateDesc} onChange={(e) => setNewUpdateDesc(e.target.value)} placeholder={language === 'ar' ? 'اكتب التفاصيل هنا ليراها الموكل...' : 'Write details here for the client...'} /></div><button type="button" onClick={handleAddCaseUpdate} className="bg-blue-600/20 text-blue-500 border border-blue-600/30 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5"><Plus className="w-3 h-3" /> {language === 'ar' ? 'إضافة التحديث' : 'Add Update'}</button></div><div className="mt-5 space-y-2"><label className="text-[9px] text-gray-500 uppercase font-bold mb-1.5 block">{language === 'ar' ? 'سجل التحديثات الحالية' : 'Current Updates Log'}</label><div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1.5">{clientCase.updates.map((u, i) => (<div key={i} className="p-2.5 bg-dark-900 rounded-lg border border-gray-800 flex justify-between items-center"><div><p className="text-white text-xs font-bold">{u.title}</p><p className="text-gray-500 text-[9px]">{u.date}</p></div>{i === 0 && <span className="text-[9px] bg-green-900/30 text-green-500 px-2 py-0.5 rounded border border-green-900/50">{language === 'ar' ? 'جديد' : 'New'}</span>}</div>))}</div></div></section>
                  <div className="pt-4 border-t border-gray-800 flex justify-end gap-3">
                      <button onClick={() => setSelectedClientForCase(null)} className="px-5 py-2.5 rounded-xl text-gray-500 hover:text-white transition-colors font-bold text-xs">{common.cancel}</button>
                      <button onClick={handleSaveFullClientUpdate} className="bg-gold-600 hover:bg-gold-500 text-black font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-gold-600/20 flex items-center gap-2 text-xs">
                          <Save className="w-3.5 h-3.5" /> {t.clients.saveFull}
                      </button>
                  </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentView('HOME')} className="p-2.5 bg-dark-900 border border-gray-800 rounded-xl hover:text-gold-500 transition-all text-gray-500">{language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}</button>
          <div><h2 className="text-2xl font-bold text-white font-serif-headings tracking-tight flex items-center gap-3">{t.title}</h2><p className="text-gray-500 text-xs mt-0.5">{t.subtitle}</p></div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); }} className="p-2.5 rounded-xl bg-dark-900 border border-gray-800 hover:text-gold-500 transition-colors text-gray-400 relative"><Bell className="w-5 h-5" />{unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full border-2 border-dark-900 animate-pulse" />}</button>
                {showNotifications && (
                    <div className="absolute ltr:right-0 rtl:left-0 mt-3 w-72 bg-dark-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-[60]" onClick={e => e.stopPropagation()}>
                        <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-dark-950"><h4 className="font-bold text-white text-sm">{t.notifications.title}</h4>{unreadCount > 0 && <button onClick={markAllAsRead} className="text-[10px] text-gold-500">{t.notifications.markAllRead}</button>}</div>
                        <div className="max-h-64 overflow-y-auto">{notifications.length > 0 ? notifications.map(n => <div key={n.id} className={`p-3 border-b border-gray-800/50 hover:bg-white/5 cursor-pointer ${!n.isRead ? 'bg-gold-500/5' : ''}`}><p className="text-[10px] font-bold text-gold-500 mb-0.5">{n.title}</p><p className="text-[10px] text-gray-400">{n.message}</p></div>) : <div className="p-8 text-center text-gray-600 italic text-xs">{t.notifications.empty}</div>}</div>
                    </div>
                )}
            </div>
            <button onClick={handleGlobalSave} className="bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white border border-green-600/30 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-[10px] uppercase"><Check className="w-3.5 h-3.5" /> {t.saveAll}</button>
            <button onClick={handleLogoutAdmin} className="p-2.5 bg-red-900/10 border border-red-900/30 rounded-xl text-red-500 hover:bg-red-600 hover:text-white transition-all"><LogOut className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex gap-6 mb-8 border-b border-gray-800 overflow-x-auto custom-scrollbar">
        {['CONSULTANTS', 'CLIENTS', 'REGISTRATIONS', 'BOOKINGS', 'SETTINGS'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab as Tab)} className={`pb-3 px-1 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-gold-500' : 'text-gray-500 hover:text-white'}`}>
              {tab === 'CONSULTANTS' && <Briefcase className="w-3.5 h-3.5" />} {tab === 'CLIENTS' && <Users className="w-3.5 h-3.5" />} {tab === 'REGISTRATIONS' && <UserPlus className="w-3.5 h-3.5" />} {tab === 'BOOKINGS' && <CreditCard className="w-3.5 h-3.5" />} {tab === 'SETTINGS' && <Settings className="w-3.5 h-3.5" />}
              {tab === 'SETTINGS' ? (language === 'ar' ? 'الإعدادات' : 'Settings') : t.tabs[tab.toLowerCase() as keyof typeof t.tabs]}
              {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gold-500 rounded-t-full shadow-[0_-5px_15px_rgba(184,134,46,0.5)]" />}
          </button>
        ))}
      </div>

      {activeTab === 'CONSULTANTS' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 pb-20">
             {/* ... (Consultant tab content - Preserved) ... */}
            <section className="bg-dark-900 border border-gold-600/20 rounded-3xl overflow-hidden shadow-2xl relative group">
                <div className="bg-gold-600/5 p-4 border-b border-gold-600/10 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gold-500 flex items-center gap-2"><UserCheck className="w-5 h-5" /> {t.founderSectionTitle}</h3>
                    <div className="flex items-center gap-1.5 text-gold-600/50 text-[9px] font-black uppercase tracking-widest"><Shield className="w-3.5 h-3.5" /> {t.ownership}</div>
                </div>
                <div className="p-6 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="relative group/photo">
                        <div className="w-48 h-60 bg-dark-950 rounded-2xl border-2 border-gold-500/20 overflow-hidden shadow-2xl relative transition-transform hover:scale-[1.02]">
                            <img src={founder?.imageUrl || DEFAULT_IMAGE} className="w-full h-full object-cover transition-all duration-700 grayscale group-hover/photo:grayscale-0" onError={(e) => e.currentTarget.src = DEFAULT_IMAGE} />
                            <label className="absolute inset-0 bg-black/70 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white gap-2 backdrop-blur-[2px]">
                                <Upload className="w-8 h-8 text-gold-500" /><span className="text-[8px] font-black uppercase tracking-widest">{t.updatePhoto}</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleConsultantImageUpload(e, true)} />
                            </label>
                        </div>
                    </div>
                    <div className="flex-grow space-y-4 w-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-[9px] text-gray-500 uppercase font-bold px-1">{t.name}</label><div className="bg-dark-950 border border-gray-800 rounded-xl p-3 text-white font-bold group-hover:border-gold-500/30 transition-all text-sm">{founder?.name}</div></div>
                            <div className="space-y-1"><label className="text-[9px] text-gray-500 uppercase font-bold px-1">{t.jobTitle}</label><div className="bg-dark-950 border border-gray-800 rounded-xl p-3 text-white font-bold group-hover:border-gold-500/30 transition-all text-sm">{founder?.title}</div></div>
                        </div>
                        <div className="space-y-1"><label className="text-[9px] text-gray-500 uppercase font-bold px-1">{t.bio}</label><div className="bg-dark-950 border border-gray-800 rounded-xl p-3 text-gray-400 text-xs leading-relaxed italic group-hover:border-gold-500/30 transition-all min-h-[80px]">{founder?.bio}</div></div>
                        <div className="flex justify-end"><button onClick={() => handleEditConsultant(founder!)} className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 hover:border-gold-500/50 hover:bg-gold-500/10 hover:text-gold-500 text-white rounded-xl font-bold text-[10px] uppercase transition-all"><Edit2 className="w-3.5 h-3.5" /> {language === 'ar' ? 'تعديل بيانات المؤسس' : 'Edit Founder Info'}</button></div>
                    </div>
                </div>
            </section>
             <div className="space-y-4 mt-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setCurrentView('HOME')} className="p-2 bg-dark-900 border border-gray-800 rounded-lg hover:text-gold-500 transition-all">
                            {language === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </button>
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Layers className="w-4 h-4 text-gold-500" /> {language === 'ar' ? 'فريق مستشاري الاستشارة القانونية' : 'Legal Consultation Team'}</h3>
                            <p className="text-[10px] text-gray-500 mt-0.5">{language === 'ar' ? 'إدارة المحامين المتاحين للحجز الإلكتروني' : 'Manage lawyers available for online booking'}</p>
                        </div>
                    </div>
                    <button onClick={handleAddNewConsultant} className="bg-gold-600 hover:bg-gold-500 text-black px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-gold-600/10"><Plus className="w-3.5 h-3.5" /> {t.addConsultant}</button>
                </div>
                 <div className="bg-dark-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right rtl:text-right ltr:text-left">
                            <thead className="bg-dark-950 text-gray-500 border-b border-gray-800 text-[9px] uppercase font-black tracking-widest">
                                <tr><th className="p-4">{t.image}</th><th className="p-4">{t.name}</th><th className="p-4">{t.specialty}</th><th className="p-4">{common.price}</th><th className="p-4 text-center">{common.actions}</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {otherConsultants.map((c, idx) => (
                                    <tr key={c.id} className="hover:bg-white/5 transition-colors group/row">
                                        <td className="p-4"><div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-800 group-hover/row:border-gold-500/30 transition-colors"><img src={c.imageUrl || DEFAULT_IMAGE} className="w-full h-full object-cover grayscale group-hover/row:grayscale-0 transition-all duration-500" /></div></td>
                                        <td className="p-4"><div className="flex flex-col"><span className="font-bold text-white text-sm">{c.name}</span><span className="text-[9px] text-gray-500 italic mt-0.5">{c.title}</span></div></td>
                                        <td className="p-4"><span className="bg-gold-600/10 text-gold-500 text-[9px] font-bold px-2 py-0.5 rounded-full border border-gold-600/10">{c.specialty}</span></td>
                                        <td className="p-4 text-white font-mono font-bold text-sm">{c.price} <span className="text-[9px] text-gold-500">{common.currency}</span></td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-end gap-3">
                                                <div className="flex flex-col gap-1 bg-dark-800 rounded-lg p-1 border border-gray-700">
                                                    <button disabled={idx === 0} onClick={() => reorderConsultant(idx + 1, 'up')} className="p-1 hover:text-gold-500 hover:bg-white/5 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ArrowUp className="w-3 h-3" /></button>
                                                    <div className="h-px w-full bg-gray-700"></div>
                                                    <button disabled={idx === otherConsultants.length - 1} onClick={() => reorderConsultant(idx + 1, 'down')} className="p-1 hover:text-gold-500 hover:bg-white/5 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ArrowDown className="w-3 h-3" /></button>
                                                </div>
                                                <div className="w-px h-6 bg-gray-800 mx-1"></div>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleEditConsultant(c); }} className="p-2.5 bg-blue-600/10 text-blue-500 border border-blue-600/20 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteConsultant(c.id); }} className="p-2.5 bg-red-600/10 text-red-500 border border-red-900/10 rounded-lg hover:bg-red-600 hover:text-white transition-all group/btndel cursor-pointer"><Trash2 className="w-3.5 h-3.5 group-hover/btndel:scale-110 transition-transform" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
             </div>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-8">
                <button onClick={() => setCurrentView('HOME')} className="bg-dark-800 hover:bg-dark-700 text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all border border-gray-700 shadow-xl"><ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {language === 'ar' ? 'رجوع للموقع' : 'Back to Website'}</button>
                <button onClick={handleGlobalSave} className="bg-gold-600 hover:bg-gold-500 text-black px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-2xl shadow-gold-600/20 group"><Save className="w-5 h-5 group-hover:scale-110 transition-transform" /> {language === 'ar' ? 'حفظ كافة التعديلات' : 'Save All Changes'}</button>
            </div>
        </div>
      )}

      {/* ... (Other tabs preserved logic - CLIENTS, REGISTRATIONS, BOOKINGS) ... */}
       {activeTab === 'CLIENTS' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 pb-20">
            {/* ... Client Tab Content Preserved ... */}
            <div className="flex justify-between items-center mb-5"><div className="flex items-center gap-3"><button onClick={() => setCurrentView('HOME')} className="p-2 bg-dark-900 border border-gray-800 rounded-lg hover:text-gold-500 transition-all">{language === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}</button><div><h3 className="text-lg font-bold text-white flex items-center gap-2"><FolderOpen className="w-4 h-4 text-gold-500" /> {language === 'ar' ? 'إدارة الموكلين (ملفات القضايا)' : 'Client Management (Case Files)'}</h3><p className="text-[10px] text-gray-500">{language === 'ar' ? 'قائمة العملاء الذين لديهم ملفات قضايا مفتوحة أو نشطة' : 'List of clients with active or open legal case files'}</p></div></div><button onClick={() => setShowAddClientModal(true)} className="bg-gold-600 hover:bg-gold-500 text-black px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"><UserPlus className="w-3.5 h-3.5" /> {t.clients.addClient}</button></div><div className="bg-dark-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl"><div className="p-4 border-b border-gray-800 bg-dark-950/30 backdrop-blur-sm"><div className="relative group w-full"><input type="text" placeholder={t.clients.searchPlaceholder} className="w-full bg-dark-950 border border-gray-700 rounded-xl py-3 pl-12 pr-4 rtl:pr-12 rtl:pl-4 text-sm text-white focus:border-gold-500 outline-none transition-all shadow-inner" value={clientSearchQuery} onChange={(e) => setClientSearchQuery(e.target.value)} /><Search className="absolute top-3.5 left-4 rtl:left-auto rtl:right-4 w-5 h-5 text-gray-500 group-focus-within:text-gold-500 transition-colors" />{clientSearchQuery && (<button onClick={() => setClientSearchQuery('')} className="absolute top-3.5 right-4 rtl:right-auto rtl:left-4 text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>)}</div></div><div className="overflow-x-auto"><table className="w-full text-right rtl:text-right ltr:text-left"><thead className="bg-dark-950 text-gray-500 border-b border-gray-800 text-[9px] uppercase font-black tracking-widest"><tr><th className="p-4">{t.clients.name}</th><th className="p-4">{t.clients.phone}</th><th className="p-4">{t.clients.email}</th><th className="p-4 text-center">{t.clients.manage}</th></tr></thead><tbody className="divide-y divide-gray-800">{filteredClients.length > 0 ? (filteredClients.map(c => (<tr key={c.id} className="hover:bg-white/5 transition-colors"><td className="p-4"><div className="flex flex-col"><span className="font-bold text-white text-sm">{c.name}</span><span className="text-[9px] text-gold-500 font-mono mt-0.5 flex items-center gap-1 font-bold"><Fingerprint className="w-3 h-3" /> ID: {c.id}</span></div></td><td className="p-4 text-gray-300 font-mono text-[10px]">{c.phone}</td><td className="p-4 text-gray-400 font-mono text-[10px]">{c.email}</td><td className="p-4 text-center"><button onClick={() => handleManageCase(c)} className="px-4 py-1.5 bg-gold-600/10 text-gold-500 border border-gold-600/30 rounded-lg font-bold text-[10px] hover:bg-gold-600 hover:text-black transition-all">{t.clients.manage}</button></td></tr>))) : (<tr><td colSpan={4} className="p-12 text-center"><div className="flex flex-col items-center justify-center gap-3 opacity-50"><Search className="w-8 h-8 text-gray-600" /><p className="text-gray-500 text-xs">{clientSearchQuery ? (language === 'ar' ? `لا توجد نتائج لـ "${clientSearchQuery}"` : `No results for "${clientSearchQuery}"`) : t.clients.noClients}</p></div></td></tr>)}</tbody></table></div></div><div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-8"><button onClick={() => setCurrentView('HOME')} className="bg-dark-800 hover:bg-dark-700 text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all border border-gray-700 shadow-xl"><ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {language === 'ar' ? 'رجوع للموقع' : 'Back to Website'}</button><button onClick={handleGlobalSave} className="bg-gold-600 hover:bg-gold-500 text-black px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-2xl shadow-gold-600/20 group"><Save className="w-5 h-5 group-hover:scale-110 transition-transform" /> {language === 'ar' ? 'حفظ كافة بيانات الموكلين' : 'Save All Client Data'}</button></div>
        </div>
      )}

      {/* ... REGISTRATIONS & BOOKINGS Preserved ... */}
      {activeTab === 'REGISTRATIONS' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 pb-20">
             {/* ... Registrations Content ... */}
             <div className="flex justify-between items-center mb-5"><div className="flex items-center gap-3"><button onClick={() => setCurrentView('HOME')} className="p-2 bg-dark-900 border border-gray-800 rounded-lg hover:text-gold-500 transition-all">{language === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}</button><div><h3 className="text-lg font-bold text-white flex items-center gap-2"><UserCog className="w-4 h-4 text-blue-500" /> {language === 'ar' ? 'مستخدمي التطبيق الجدد' : 'New App Registrations'}</h3><p className="text-[10px] text-gray-500">{language === 'ar' ? 'قائمة المستخدمين المسجلين عبر التطبيق (ليسوا موكلين رسميين بعد)' : 'Users registered via app (Not official clients yet)'}</p></div></div></div><div className="bg-dark-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl"><div className="overflow-x-auto"><table className="w-full text-right rtl:text-right ltr:text-left"><thead className="bg-dark-950 text-gray-500 border-b border-gray-800 text-[9px] uppercase font-black tracking-widest"><tr><th className="p-4">{t.clients.name}</th><th className="p-4">{t.clients.phone}</th><th className="p-4">{t.registrations.username}</th><th className="p-4">{t.registrations.date}</th><th className="p-4 text-center">{t.registrations.convert}</th></tr></thead><tbody className="divide-y divide-gray-800">{registrations.length > 0 ? registrations.map(r => (<tr key={r.id} className="hover:bg-white/5 transition-colors"><td className="p-4 font-bold text-white text-sm">{r.name}</td><td className="p-4 text-gold-500 font-mono text-[10px]">{r.phone}</td><td className="p-4 text-gray-300 font-mono text-[10px]">{r.username}</td><td className="p-4 text-gray-400 font-mono text-[10px]">{r.registrationDate}</td><td className="p-4 text-center"><button onClick={() => handleConvertRegistrationToClient(r)} className="px-4 py-1.5 bg-blue-600/10 text-blue-500 border border-blue-600/30 rounded-lg font-bold text-[10px] hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5 mx-auto" title={language === 'ar' ? 'إنشاء ملف موكل رسمي لهذا المستخدم' : 'Create official client file for this user'}><FilePlus className="w-3 h-3" />{language === 'ar' ? 'إنشاء ملف' : 'Create File'}</button></td></tr>)) : <tr><td colSpan={5} className="p-8 text-center text-gray-600 italic text-xs">{t.registrations.noRegistrations}</td></tr>}</tbody></table></div></div><div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-8"><button onClick={() => setCurrentView('HOME')} className="bg-dark-800 hover:bg-dark-700 text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all border border-gray-700 shadow-xl"><ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {language === 'ar' ? 'رجوع للموقع' : 'Back to Website'}</button><button onClick={handleGlobalSave} className="bg-gold-600 hover:bg-gold-500 text-black px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-2xl shadow-gold-600/20 group"><Save className="w-5 h-5 group-hover:scale-110 transition-transform" /> {language === 'ar' ? 'حفظ كافة البيانات' : 'Save All Data'}</button></div>
        </div>
      )}

      {activeTab === 'BOOKINGS' && (
          <div className="pb-20 animate-in fade-in slide-in-from-bottom-4">
             {/* ... Bookings Content ... */}
             <div className="bg-dark-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl"><div className="bg-dark-950 p-4 border-b border-gray-800 flex justify-between items-center"><div className="flex items-center gap-3"><button onClick={() => setCurrentView('HOME')} className="p-2 bg-dark-900 border border-gray-800 rounded-lg hover:text-gold-500 transition-all">{language === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}</button><h3 className="font-bold text-white flex items-center gap-2 text-sm"><DollarSign className="w-4 h-4 text-green-500" /> {t.bookings.totalIncome}: <span className="text-green-400 font-mono text-lg mx-2">{bookings.reduce((sum, b) => sum + b.amount, 0)}</span> {common.currency}</h3></div></div><div className="overflow-x-auto"><table className="w-full text-right rtl:text-right ltr:text-left"><thead className="bg-dark-950 text-gray-400 border-b border-gray-800"><tr><th className="p-4 text-[9px] uppercase">{t.bookings.client}</th><th className="p-4 text-[9px] uppercase">{t.bookings.consultant}</th><th className="p-4 text-[9px] uppercase">{t.bookings.amount}</th><th className="p-4 text-[9px] uppercase">{t.bookings.consultationDate}</th><th className="p-4 text-[9px] uppercase">{t.bookings.date}</th><th className="p-4 text-[9px] uppercase">{t.bookings.status}</th></tr></thead><tbody className="divide-y divide-gray-800">{bookings.length > 0 ? bookings.map((booking) => (<tr key={booking.id} className="hover:bg-dark-800/50 transition-colors"><td className="p-4"><div className="flex flex-col gap-0.5"><span className="font-bold text-white text-xs">{booking.clientName}</span>{booking.clientPhone && <div className="flex items-center gap-1.5 text-gold-500 text-[9px] mt-0.5"><Phone className="w-3 h-3 opacity-70" /><span className="font-mono opacity-90">{booking.clientPhone}</span></div>}{booking.clientEmail && <div className="flex items-center gap-1.5 text-gray-400 text-[9px]"><Mail className="w-3 h-3 opacity-70" /><span className="font-mono opacity-90 truncate max-w-[120px]">{booking.clientEmail}</span></div>}</div></td><td className="p-4 text-gray-300 text-[10px]">{booking.consultantName}</td><td className="p-4 text-white font-bold text-xs">{booking.amount} {common.currency}</td><td className="p-4 text-gold-500"><div className="flex flex-col"><span className="font-bold text-[10px]">{booking.consultationDate}</span><span className="text-[9px] text-gray-500">{booking.consultationTime}</span></div></td><td className="p-4 text-gray-500 text-[10px]">{booking.date}</td><td className="p-4"><span className="bg-green-900/30 text-green-400 border border-green-900/50 px-2 py-0.5 rounded-full text-[9px] font-bold">{t.bookings.paid}</span></td></tr>)) : <tr><td colSpan={6} className="p-6 text-center text-gray-500 italic text-xs">{t.bookings.noBookings}</td></tr>}</tbody></table></div></div><div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-8"><button onClick={() => setCurrentView('HOME')} className="bg-dark-800 hover:bg-dark-700 text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all border border-gray-700 shadow-xl"><ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {language === 'ar' ? 'رجوع للموقع' : 'Back to Website'}</button><button onClick={handleGlobalSave} className="bg-gold-600 hover:bg-gold-500 text-black px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-2xl shadow-gold-600/20 group"><Save className="w-5 h-5 group-hover:scale-110 transition-transform" /> {language === 'ar' ? 'حفظ سجلات الحجز والإيرادات' : 'Save Booking Records'}</button></div>
          </div>
      )}

      {activeTab === 'SETTINGS' && (
          <div className="pb-20 animate-in fade-in slide-in-from-bottom-4 max-w-2xl mx-auto">
              <div className="bg-dark-900 border border-gold-600/20 rounded-3xl p-8 shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Shield className="w-6 h-6 text-gold-500" />
                      {language === 'ar' ? 'إعدادات الأمان' : 'Security Settings'}
                  </h3>

                  <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-dark-950 rounded-xl border border-gray-800">
                          <div>
                              <h4 className="text-white font-bold text-sm mb-1">
                                  {language === 'ar' ? 'المصادقة الثنائية (2FA)' : 'Two-Factor Authentication (2FA)'}
                              </h4>
                              <p className="text-[10px] text-gray-400 max-w-xs">
                                  {language === 'ar' 
                                    ? 'استخدام Google Authenticator لزيادة حماية حساب المسؤول.' 
                                    : 'Use Google Authenticator to secure the admin account.'}
                              </p>
                          </div>
                          <div className="flex items-center gap-3">
                              {is2FAEnabled ? (
                                  <button onClick={disable2FA} className="bg-red-900/20 text-red-500 border border-red-900/40 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-900/40 transition-all">
                                      {language === 'ar' ? 'تعطيل' : 'Disable'}
                                  </button>
                              ) : (
                                  <button onClick={generate2FASetup} className="bg-gold-600 text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-gold-500 transition-all shadow-lg">
                                      {language === 'ar' ? 'تفعيل' : 'Enable'}
                                  </button>
                              )}
                          </div>
                      </div>
                      
                      {is2FAEnabled && (
                          <div className="p-4 bg-green-900/10 border border-green-900/30 rounded-xl flex items-center gap-3">
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                              <span className="text-green-400 text-xs font-bold">
                                  {language === 'ar' ? 'حسابك محمي بواسطة المصادقة الثنائية.' : 'Your account is secured with 2FA.'}
                              </span>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {showSaveToast && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-6"><CheckCircle2 className="w-5 h-5" /><span className="font-bold text-xs">{t.saveSuccess}</span></div>}
    </div>
  );
};

export default AdminPanel;
