// TypeScript Interfaces for Summer Camp & Activity Planner
export type RegistrationStatus = 'researching' | 'waiting_to_register' | 'waitlisted' | 'booked';
export type CampDurationType = 'full_day' | 'morning_half_day' | 'afternoon_half_day';

export interface CalendarSettings {
  summer_week_start: string; // Date string "YYYY-MM-DD" representing the start of summer camp weeks
  number_of_weeks: number;   // Number of weeks in the planner matrix (e.g. 10)
}

export interface Child {
  id: string; // UUID
  name: string;
  color: string; // Unique hex color code (e.g. for calendar coloring)
  age?: number;
  grade?: string;
  created_at?: string;
}

export interface Camp {
  id: string; // UUID
  name: string;
  provider: string;
  price: number;
  address: string;
  min_age?: number;
  max_age?: number;
  min_grade?: string;
  max_grade?: string;
  duration_type: CampDurationType;
  start_time: string; // e.g., '9:00 AM'
  end_time: string;   // e.g., '3:00 PM'
  extended_care_start_time?: string; // e.g., '8:00 AM'
  extended_care_end_time?: string;   // e.g., '6:00 PM'
  registration_open_date?: string; // "YYYY-MM-DD"
  payment_due_date?: string;       // "YYYY-MM-DD"
  refund_deadline_date?: string;   // "YYYY-MM-DD"
  available_weeks?: number[];      // 1-based week indices (e.g. [1, 3, 5])
  created_at?: string;
}

export interface Booking {
  id: string; // UUID
  child_id: string; // References Child
  camp_id: string; // References Camp
  summer_week_start: string; // Date string "YYYY-MM-DD" representing the Monday of that week
  status: RegistrationStatus;
  notes?: string;
  amount_paid: number; // default 0.00
  created_at?: string;
}

// Repository Interface definition to allow easy swapping to a Supabase adapter later
export interface ICampPlannerRepository {
  // CALENDAR SETTINGS FUNCTIONS
  getCalendarSettings(): Promise<CalendarSettings>;
  updateCalendarSettings(settings: Partial<CalendarSettings>): Promise<CalendarSettings>;

  // CHILDREN FUNCTIONS
  getChildren(): Promise<Child[]>;
  getChild(id: string): Promise<Child | null>;
  createChild(child: Omit<Child, 'id' | 'created_at'>): Promise<Child>;
  updateChild(id: string, child: Partial<Omit<Child, 'id' | 'created_at'>>): Promise<Child>;
  deleteChild(id: string): Promise<void>;

  // CAMPS FUNCTIONS
  getCamps(): Promise<Camp[]>;
  getCamp(id: string): Promise<Camp | null>;
  createCamp(camp: Omit<Camp, 'id' | 'created_at'>): Promise<Camp>;
  updateCamp(id: string, camp: Partial<Omit<Camp, 'id' | 'created_at'>>): Promise<Camp>;
  deleteCamp(id: string): Promise<void>;

  // BOOKINGS FUNCTIONS
  getBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>;
  createBooking(booking: Omit<Booking, 'id' | 'created_at'>): Promise<Booking>;
  updateBooking(id: string, booking: Partial<Omit<Booking, 'id' | 'created_at'>>): Promise<Booking>;
  upsertBooking(booking: Omit<Booking, 'id' | 'created_at'> & { id?: string }): Promise<Booking>;
  deleteBooking(id: string): Promise<void>;
  deleteBookingByChildWeek(childId: string, weekStart: string): Promise<void>;
}

// Helper to generate RFC4122 compliant UUIDs in pure TypeScript (compatible on server & browser)
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// LocalStorage Keys
const CALENDAR_SETTINGS_KEY = 'camp_planner_calendar_settings';
const CHILDREN_KEY = 'camp_planner_children';
const CAMPS_KEY = 'camp_planner_camps';
const BOOKINGS_KEY = 'camp_planner_bookings';

function getCampDurationType(camp: Camp | undefined): CampDurationType {
  return camp?.duration_type || 'full_day';
}

function bookingsConflictForSameSlot(newCamp: Camp | undefined, existingCamp: Camp | undefined): boolean {
  const newDuration = getCampDurationType(newCamp);
  const existingDuration = getCampDurationType(existingCamp);

  if (newDuration === 'full_day' || existingDuration === 'full_day') {
    return true;
  }

  return newDuration === existingDuration;
}

function validateBookingSlot(
  bookings: Booking[],
  camps: Camp[],
  booking: Pick<Booking, 'child_id' | 'camp_id' | 'summer_week_start'>,
  excludeBookingId?: string
): void {
  const newCamp = camps.find((camp) => camp.id === booking.camp_id);
  const conflictingBooking = bookings.find((existingBooking) => {
    if (existingBooking.id === excludeBookingId) return false;
    if (existingBooking.child_id !== booking.child_id) return false;
    if (existingBooking.summer_week_start !== booking.summer_week_start) return false;

    const existingCamp = camps.find((camp) => camp.id === existingBooking.camp_id);
    return bookingsConflictForSameSlot(newCamp, existingCamp);
  });

  if (conflictingBooking) {
    throw new Error('This child already has a conflicting camp booking for that week.');
  }
}

/**
 * Seed mock children, camps, calendar settings, and bookings data into LocalStorage on first render
 */
export function seedData(): void {
  if (typeof window === 'undefined') return;

  const calendarSettings: CalendarSettings = {
    summer_week_start: '2026-06-08', // Starting Monday of summer 2026
    number_of_weeks: 10
  };

  // Generate unique UUIDs to link entities
  const leoId = generateUUID();
  const mayaId = generateUUID();
  const tobyId = generateUUID();

  const children: Child[] = [
    { id: leoId, name: 'Leo', color: '#3B82F6', age: 7, grade: '2', created_at: new Date().toISOString() }, // Blue
    { id: mayaId, name: 'Maya', color: '#EC4899', age: 5, grade: 'K', created_at: new Date().toISOString() }, // Pink
    { id: tobyId, name: 'Toby', color: '#10B981', age: 10, grade: '5', created_at: new Date().toISOString() }  // Emerald Green
  ];

  const camp1Id = generateUUID();
  const camp2Id = generateUUID();
  const camp3Id = generateUUID();
  const camp4Id = generateUUID();
  const camp5Id = generateUUID();

  const camps: Camp[] = [
    {
      id: camp1Id,
      name: "Steve & Kate's Camp",
      provider: "Steve & Kate's",
      price: 550.00,
      address: "123 Main St, Seattle",
      min_age: 4,
      max_age: 12,
      min_grade: "Pre-K",
      max_grade: "6",
      duration_type: "full_day",
      start_time: "9:00 AM",
      end_time: "3:00 PM",
      extended_care_start_time: "8:00 AM",
      extended_care_end_time: "6:00 PM",
      registration_open_date: "2026-02-15",
      payment_due_date: "2026-06-01",
      refund_deadline_date: "2026-06-05",
      available_weeks: [], // Empty means all weeks
      created_at: new Date().toISOString()
    },
    {
      id: camp2Id,
      name: "Galileo Innovation Camp",
      provider: "Galileo Learning",
      price: 620.00,
      address: "456 Oak Ave, Bellevue",
      min_age: 5,
      max_age: 12,
      min_grade: "K",
      max_grade: "6",
      duration_type: "full_day",
      start_time: "9:00 AM",
      end_time: "3:00 PM",
      extended_care_start_time: "8:30 AM",
      extended_care_end_time: "5:00 PM",
      registration_open_date: "2026-03-01",
      payment_due_date: "2026-05-15",
      refund_deadline_date: "2026-05-30",
      available_weeks: [1, 2, 3, 4, 5],
      created_at: new Date().toISOString()
    },
    {
      id: camp3Id,
      name: "Code Ninjas Robotics Camp",
      provider: "Code Ninjas",
      price: 450.00,
      address: "789 Pine Rd, Kirkland",
      min_age: 7,
      max_age: 14,
      min_grade: "2",
      max_grade: "8",
      duration_type: "morning_half_day",
      start_time: "9:00 AM",
      end_time: "12:00 PM",
      registration_open_date: "2026-03-10",
      payment_due_date: "2026-06-15",
      refund_deadline_date: "2026-06-01",
      available_weeks: [1, 2, 6, 7],
      created_at: new Date().toISOString()
    },
    {
      id: camp4Id,
      name: "YMCA Summer Adventure",
      provider: "YMCA",
      price: 320.00,
      address: "101 Broadway, Seattle",
      min_age: 5,
      max_age: 13,
      min_grade: "K",
      max_grade: "7",
      duration_type: "full_day",
      start_time: "9:00 AM",
      end_time: "4:00 PM",
      extended_care_start_time: "7:30 AM",
      extended_care_end_time: "6:00 PM",
      registration_open_date: "2026-04-01",
      payment_due_date: "2026-05-01",
      refund_deadline_date: "2026-05-20",
      available_weeks: [], // Empty means all weeks
      created_at: new Date().toISOString()
    },
    {
      id: camp5Id,
      name: "Arena Sports Camp",
      provider: "Arena Sports",
      price: 490.00,
      address: "202 Arena Way, Redmond",
      min_age: 6,
      max_age: 12,
      min_grade: "1",
      max_grade: "6",
      duration_type: "full_day",
      start_time: "9:00 AM",
      end_time: "4:00 PM",
      registration_open_date: "2026-03-15",
      payment_due_date: "2026-06-10",
      refund_deadline_date: "2026-06-01",
      available_weeks: [3, 4, 5, 8, 9],
      created_at: new Date().toISOString()
    }
  ];

  const bookings: Booking[] = [
    {
      id: generateUUID(),
      child_id: leoId,
      camp_id: camp1Id,
      summer_week_start: '2026-06-08',
      status: 'booked',
      notes: 'Leo is signed up for Steve & Kate\'s for Week 1. Pack extra sunscreen and a water bottle.',
      amount_paid: 550.00,
      created_at: new Date().toISOString()
    },
    {
      id: generateUUID(),
      child_id: leoId,
      camp_id: camp2Id,
      summer_week_start: '2026-06-15',
      status: 'researching',
      notes: 'Leo is interested in Galileo. Wait to see if friends register too.',
      amount_paid: 0.00,
      created_at: new Date().toISOString()
    },
    {
      id: generateUUID(),
      child_id: mayaId,
      camp_id: camp3Id,
      summer_week_start: '2026-06-08',
      status: 'waiting_to_register',
      notes: 'Robotics camp for Week 1. Need to complete registration before end of week discount expires.',
      amount_paid: 100.00,
      created_at: new Date().toISOString()
    },
    {
      id: generateUUID(),
      child_id: mayaId,
      camp_id: camp4Id,
      summer_week_start: '2026-06-22',
      status: 'waitlisted',
      notes: 'Maya is waitlisted for YMCA Week 3. We are currently #3 in the queue.',
      amount_paid: 0.00,
      created_at: new Date().toISOString()
    }
  ];

  localStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify(calendarSettings));
  localStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
  localStorage.setItem(CAMPS_KEY, JSON.stringify(camps));
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

/**
 * Checks if the localStorage database is initialized, and seeds it if it is empty.
 */
function ensureInitialized(): void {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(CHILDREN_KEY) && !localStorage.getItem(CAMPS_KEY) && !localStorage.getItem(CALENDAR_SETTINGS_KEY)) {
    seedData();
  }
}

// LocalStorage Repository implementation
export const db: ICampPlannerRepository = {
  // CALENDAR SETTINGS FUNCTIONS
  async getCalendarSettings(): Promise<CalendarSettings> {
    if (typeof window === 'undefined') {
      return { summer_week_start: '2026-06-08', number_of_weeks: 10 };
    }
    ensureInitialized();
    const data = localStorage.getItem(CALENDAR_SETTINGS_KEY);
    return data ? JSON.parse(data) : { summer_week_start: '2026-06-08', number_of_weeks: 10 };
  },

  async updateCalendarSettings(settings: Partial<CalendarSettings>): Promise<CalendarSettings> {
    if (typeof window === 'undefined') throw new Error('Cannot update settings during SSR');
    ensureInitialized();
    const currentSettings = await this.getCalendarSettings();
    const updatedSettings: CalendarSettings = {
      ...currentSettings,
      ...settings
    };
    localStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify(updatedSettings));
    return updatedSettings;
  },

  // CHILDREN FUNCTIONS
  async getChildren(): Promise<Child[]> {
    if (typeof window === 'undefined') return [];
    ensureInitialized();
    const data = localStorage.getItem(CHILDREN_KEY);
    return data ? JSON.parse(data) : [];
  },

  async getChild(id: string): Promise<Child | null> {
    if (typeof window === 'undefined') return null;
    ensureInitialized();
    const children = await this.getChildren();
    return children.find((c) => c.id === id) || null;
  },

  async createChild(child: Omit<Child, 'id' | 'created_at'>): Promise<Child> {
    if (typeof window === 'undefined') throw new Error('Cannot write data during SSR');
    ensureInitialized();
    const children = await this.getChildren();
    const newChild: Child = {
      ...child,
      id: generateUUID(),
      created_at: new Date().toISOString()
    };
    children.push(newChild);
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
    return newChild;
  },

  async updateChild(id: string, updates: Partial<Omit<Child, 'id' | 'created_at'>>): Promise<Child> {
    if (typeof window === 'undefined') throw new Error('Cannot update data during SSR');
    ensureInitialized();
    const children = await this.getChildren();
    const index = children.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Child with ID ${id} not found`);

    const updatedChild: Child = {
      ...children[index],
      ...updates
    };
    children[index] = updatedChild;
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
    return updatedChild;
  },

  async deleteChild(id: string): Promise<void> {
    if (typeof window === 'undefined') throw new Error('Cannot delete data during SSR');
    ensureInitialized();
    
    // Delete the child record
    const children = await this.getChildren();
    const filteredChildren = children.filter((c) => c.id !== id);
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(filteredChildren));

    // Cascade delete: Delete all bookings associated with this child
    const bookings = await this.getBookings();
    const filteredBookings = bookings.filter((b) => b.child_id !== id);
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(filteredBookings));
  },

  // CAMPS FUNCTIONS
  async getCamps(): Promise<Camp[]> {
    if (typeof window === 'undefined') return [];
    ensureInitialized();
    const data = localStorage.getItem(CAMPS_KEY);
    return data ? JSON.parse(data) : [];
  },

  async getCamp(id: string): Promise<Camp | null> {
    if (typeof window === 'undefined') return null;
    ensureInitialized();
    const camps = await this.getCamps();
    return camps.find((c) => c.id === id) || null;
  },

  async createCamp(camp: Omit<Camp, 'id' | 'created_at'>): Promise<Camp> {
    if (typeof window === 'undefined') throw new Error('Cannot write data during SSR');
    ensureInitialized();
    const camps = await this.getCamps();
    const newCamp: Camp = {
      ...camp,
      id: generateUUID(),
      created_at: new Date().toISOString()
    };
    camps.push(newCamp);
    localStorage.setItem(CAMPS_KEY, JSON.stringify(camps));
    return newCamp;
  },

  async updateCamp(id: string, updates: Partial<Omit<Camp, 'id' | 'created_at'>>): Promise<Camp> {
    if (typeof window === 'undefined') throw new Error('Cannot update data during SSR');
    ensureInitialized();
    const camps = await this.getCamps();
    const index = camps.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Camp with ID ${id} not found`);

    const updatedCamp: Camp = {
      ...camps[index],
      ...updates
    };
    camps[index] = updatedCamp;
    localStorage.setItem(CAMPS_KEY, JSON.stringify(camps));
    return updatedCamp;
  },

  async deleteCamp(id: string): Promise<void> {
    if (typeof window === 'undefined') throw new Error('Cannot delete data during SSR');
    ensureInitialized();

    // Delete the camp record
    const camps = await this.getCamps();
    const filteredCamps = camps.filter((c) => c.id !== id);
    localStorage.setItem(CAMPS_KEY, JSON.stringify(filteredCamps));

    // Cascade delete: Delete all bookings associated with this camp
    const bookings = await this.getBookings();
    const filteredBookings = bookings.filter((b) => b.camp_id !== id);
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(filteredBookings));
  },

  // BOOKINGS FUNCTIONS
  async getBookings(): Promise<Booking[]> {
    if (typeof window === 'undefined') return [];
    ensureInitialized();
    const data = localStorage.getItem(BOOKINGS_KEY);
    return data ? JSON.parse(data) : [];
  },

  async getBooking(id: string): Promise<Booking | null> {
    if (typeof window === 'undefined') return null;
    ensureInitialized();
    const bookings = await this.getBookings();
    return bookings.find((b) => b.id === id) || null;
  },

  async createBooking(booking: Omit<Booking, 'id' | 'created_at'>): Promise<Booking> {
    if (typeof window === 'undefined') throw new Error('Cannot write data during SSR');
    ensureInitialized();
    const bookings = await this.getBookings();
    const camps = await this.getCamps();
    validateBookingSlot(bookings, camps, booking);

    const newBooking: Booking = {
      ...booking,
      id: generateUUID(),
      created_at: new Date().toISOString()
    };
    bookings.push(newBooking);
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    return newBooking;
  },

  async updateBooking(id: string, updates: Partial<Omit<Booking, 'id' | 'created_at'>>): Promise<Booking> {
    if (typeof window === 'undefined') throw new Error('Cannot update data during SSR');
    ensureInitialized();
    const bookings = await this.getBookings();
    const index = bookings.findIndex((b) => b.id === id);
    if (index === -1) throw new Error(`Booking with ID ${id} not found`);

    const updatedBooking: Booking = {
      ...bookings[index],
      ...updates
    };

    const camps = await this.getCamps();
    validateBookingSlot(bookings, camps, updatedBooking, id);

    bookings[index] = updatedBooking;
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    return updatedBooking;
  },

  async upsertBooking(booking: Omit<Booking, 'id' | 'created_at'> & { id?: string }): Promise<Booking> {
    if (typeof window === 'undefined') throw new Error('Cannot write data during SSR');
    ensureInitialized();
    const bookings = await this.getBookings();

    // Look for existing booking matching ID. A child/week can contain complementary half-day bookings.
    const index = bookings.findIndex(
      (b) => Boolean(booking.id) && b.id === booking.id
    );
    const camps = await this.getCamps();

    if (index !== -1) {
      // Update existing booking
      const updatedBooking: Booking = {
        ...bookings[index],
        ...booking,
        id: bookings[index].id, // preserve existing id
        created_at: bookings[index].created_at || new Date().toISOString()
      };
      validateBookingSlot(bookings, camps, updatedBooking, bookings[index].id);
      bookings[index] = updatedBooking;
      localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
      return updatedBooking;
    } else {
      validateBookingSlot(bookings, camps, booking);
      // Create new booking
      const newBooking: Booking = {
        ...booking,
        id: booking.id || generateUUID(),
        created_at: new Date().toISOString()
      };
      bookings.push(newBooking);
      localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
      return newBooking;
    }
  },

  async deleteBooking(id: string): Promise<void> {
    if (typeof window === 'undefined') throw new Error('Cannot delete data during SSR');
    ensureInitialized();
    const bookings = await this.getBookings();
    const filteredBookings = bookings.filter((b) => b.id !== id);
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(filteredBookings));
  },

  async deleteBookingByChildWeek(childId: string, weekStart: string): Promise<void> {
    if (typeof window === 'undefined') throw new Error('Cannot delete data during SSR');
    ensureInitialized();
    const bookings = await this.getBookings();
    const filteredBookings = bookings.filter(
      (b) => !(b.child_id === childId && b.summer_week_start === weekStart)
    );
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(filteredBookings));
  }
};

/**
 * Force-resets the local storage database and seeds it with the initial mock dataset.
 */
export async function resetDatabase(): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CALENDAR_SETTINGS_KEY);
  localStorage.removeItem(CHILDREN_KEY);
  localStorage.removeItem(CAMPS_KEY);
  localStorage.removeItem(BOOKINGS_KEY);
  ensureInitialized();
}
