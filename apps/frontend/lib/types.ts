export interface EventDate {
  id: string;
  startDate: string;
  endDate: string;
  capacity: number;
  ticketsSold: number;
  price: string;
  currency: string;
  status: 'ACTIVE' | 'SOLD_OUT' | 'CANCELLED';
}

export interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  bannerUrl?: string | null;
  coverUrl?: string | null;
  city?: string | null;
  country?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  refundPolicy: 'STANDARD' | 'NO_REFUND' | 'FLEXIBLE';
  dates: EventDate[];
}

export interface Product {
  id: string;
  eventId: string;
  name: string;
  description?: string | null;
  price: string;
  currency: string;
  stock: number | null;
  sold: number;
  active: boolean;
}

export interface Ticket {
  id: string;
  eventDateId: string;
  qrCode: string;
  status: 'RESERVED' | 'CONFIRMED' | 'USED' | 'REFUNDED';
  price: string;
  currency: string;
  purchaseId?: string | null;
}

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'ORGANIZER' | 'USER';
}
