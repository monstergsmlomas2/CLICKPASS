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
  city?: string | null;
  country?: string | null;
  venueName?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  refundPolicy: 'STANDARD' | 'NO_REFUND' | 'FLEXIBLE';
  dates: EventDate[];
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
