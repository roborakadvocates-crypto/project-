
export type Language = 'ar' | 'en';

export interface Consultant {
  id: string;
  name: string;
  title: string;
  specialty: string;
  price: number;
  imageUrl: string;
  bio: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedDate: string;
}

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  password?: string;
  registrationDate: string;
}

export interface Booking {
  id: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string; // Added email
  consultantName: string;
  amount: number;
  date: string; // Payment Date
  consultationDate: string; // Requested Date
  consultationTime: string; // Requested Time
  status: 'PAID';
  paymentMethod: string;
}

export interface AppNotification {
  id: string;
  type: 'BOOKING' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface CaseUpdate {
  id: string;
  date: string;
  title: string;
  description: string;
}

export interface CaseDocument {
  id: string;
  name: string;
  uploadDate: string;
  size: string;
}

export interface LegalCase {
  id: string;
  caseNumber: string;
  clientName: string;
  status: 'Open' | 'Closed' | 'Pending' | 'In Court';
  nextHearing?: string;
  updates: CaseUpdate[];
  documents: CaseDocument[];
}

export type ViewState = 'HOME' | 'CONSULTANTS' | 'CLIENT_PORTAL' | 'CLIENT_REGISTER' | 'REGISTERED_LOGIN' | 'ADMIN_DASHBOARD';
