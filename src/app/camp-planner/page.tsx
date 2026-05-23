'use client';

import React, { useEffect, useState } from 'react';
import { db, Child, Camp, Booking, CalendarSettings } from '@/lib/db';
import ChildrenManager from '@/components/ChildrenManager';
import CampCatalog from '@/components/CampCatalog';
import SettingsPanel from '@/components/SettingsPanel';
import CampMatrix from '@/components/CampMatrix';
import ShareImport from '@/components/ShareImport';
import FinancialDashboard from '@/components/FinancialDashboard';
import Link from 'next/link';
import { RefreshCw, CalendarRange, ArrowLeft, Trash2, ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Core planner states
  const [settings, setSettings] = useState<CalendarSettings>({
    summer_week_start: '2026-06-08',
    number_of_weeks: 10,
  });
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeDraggedCamp, setActiveDraggedCamp] = useState<Camp | null>(null);

  // Initial load
  const loadAllData = async () => {
    try {
      setLoading(true);
      const s = await db.getCalendarSettings();
      const ch = await db.getChildren();
      const ca = await db.getCamps();
      const bo = await db.getBookings();

      setSettings(s);
      setChildrenList(ch);
      setCamps(ca);
      setBookings(bo);
    } catch (err) {
      console.error('Failed to load database state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadAllData();
  }, []);

  // Update Settings
  const handleUpdateSettings = async (updates: Partial<CalendarSettings>) => {
    const updated = await db.updateCalendarSettings(updates);
    setSettings(updated);
  };

  // Child CRUD
  const handleCreateChild = async (childData: Omit<Child, 'id'>) => {
    const newChild = await db.createChild(childData);
    setChildrenList((prev) => [...prev, newChild]);
  };

  const handleUpdateChild = async (id: string, updates: Partial<Omit<Child, 'id'>>) => {
    const updated = await db.updateChild(id, updates);
    setChildrenList((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const handleDeleteChild = async (id: string) => {
    await db.deleteChild(id);
    setChildrenList((prev) => prev.filter((c) => c.id !== id));
    // Cascade delete bookings of this child
    const bo = await db.getBookings();
    setBookings(bo);
  };

  // Camp CRUD
  const handleCreateCamp = async (campData: Omit<Camp, 'id'>) => {
    const newCamp = await db.createCamp(campData);
    setCamps((prev) => [...prev, newCamp]);
  };

  const handleUpdateCamp = async (id: string, updates: Partial<Omit<Camp, 'id'>>) => {
    const updated = await db.updateCamp(id, updates);
    setCamps((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const handleDeleteCamp = async (id: string) => {
    await db.deleteCamp(id);
    setCamps((prev) => prev.filter((c) => c.id !== id));
    // Cascade delete bookings of this camp
    const bo = await db.getBookings();
    setBookings(bo);
  };

  // Booking CRUD
  const handleAddBooking = async (bookingData: Omit<Booking, 'id'>) => {
    const newBooking = await db.createBooking(bookingData);
    setBookings((prev) => [...prev, newBooking]);
  };

  const handleUpdateBooking = async (id: string, updates: Partial<Omit<Booking, 'id'>>) => {
    const updated = await db.updateBooking(id, updates);
    setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
  };

  const handleDeleteBooking = async (id: string) => {
    await db.deleteBooking(id);
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  const handleMoveBooking = async (bookingId: string, targetChildId: string, targetWeekStart: string) => {
    const updated = await db.updateBooking(bookingId, {
      child_id: targetChildId,
      summer_week_start: targetWeekStart,
    });
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
  };

  // Reset database state to mock seed
  const handleResetData = async () => {
    if (confirm('Reset planner database to mock template children and bookings? Current entries will be lost.')) {
      const { resetDatabase } = await import('@/lib/db');
      await resetDatabase();
      await loadAllData();
    }
  };

  const handleClearPlannerData = async () => {
    if (confirm('Clear the mock children, camps, and bookings so you can start fresh?')) {
      const { clearPlannerData } = await import('@/lib/db');
      await clearPlannerData();
      await loadAllData();
    }
  };

  // Import complete state override
  const handleImportState = async (importedState: {
    settings: CalendarSettings;
    children: Child[];
    camps: Camp[];
    bookings: Booking[];
  }) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('camp_planner_calendar_settings', JSON.stringify(importedState.settings));
      localStorage.setItem('camp_planner_children', JSON.stringify(importedState.children));
      localStorage.setItem('camp_planner_camps', JSON.stringify(importedState.camps));
      localStorage.setItem('camp_planner_bookings', JSON.stringify(importedState.bookings));

      setSettings(importedState.settings);
      setChildrenList(importedState.children);
      setCamps(importedState.camps);
      setBookings(importedState.bookings);
    }
  };

  if (!mounted) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#FAF8F5',
        color: '#2D2B2A',
        fontFamily: 'var(--font-sans)',
        fontSize: '1.1rem',
        fontWeight: 500
      }}>
        Loading Planner...
      </div>
    );
  }

  return (
    <main className="sp-app-shell sp-variant-productivity">
      <div className="container py-6">
      {/* Header Bar */}
      <header className="mb-6 flex justify-between align-center flex-wrap gap-4" style={{
        borderBottom: '3px solid var(--ink)',
        paddingBottom: '1rem'
      }}>
        <div className="flex align-center gap-3">
          <div style={{
            backgroundColor: 'var(--accent-sage)',
            color: '#FFFFFF',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)',
            display: 'inline-flex',
            border: '3px solid var(--ink)',
            boxShadow: '4px 4px 0 var(--ink)'
          }}>
            <CalendarRange size={24} />
          </div>
          <div>
            <Link
              href="/"
              className="flex align-center gap-1"
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginBottom: '0.2rem',
              }}
            >
              <ArrowLeft size={13} />
              Super Parent Toolkit
            </Link>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Summer Camp &amp; Activity Planner</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Drag-and-drop or click-to-move summer activities.
            </p>
            <p className="flex align-center gap-1" style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.25rem', fontWeight: 650 }}>
              <ShieldCheck size={13} />
              Private by default. Saved on this device unless you export a backup.
            </p>
          </div>
        </div>

        <div className="flex align-center gap-2 flex-wrap">
          <button
            className="btn btn-secondary"
            onClick={handleResetData}
            title="Reset to initial mock data"
          >
            <RefreshCw size={15} />
            Reset Mock Data
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleClearPlannerData}
            title="Remove mock children, camps, and bookings"
          >
            <Trash2 size={15} />
            Clear Mock Data
          </button>
          
          <ShareImport
            settings={settings}
            childrenList={childrenList}
            camps={camps}
            bookings={bookings}
            onImportState={handleImportState}
            variant="header"
          />
        </div>
      </header>

      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          color: 'var(--text-secondary)',
          fontSize: '1rem'
        }}>
          Loading planner database...
        </div>
      ) : (
        <>
          {/* Top horizontal config bar */}
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            alignItems: 'stretch'
          }}>
            {/* Kids Profile Manager */}
            <div style={{ flex: '1 1 420px', minWidth: '320px' }}>
              <ChildrenManager
                childrenList={childrenList}
                onCreateChild={handleCreateChild}
                onUpdateChild={handleUpdateChild}
                onDeleteChild={handleDeleteChild}
              />
            </div>

            {/* Calendar Settings */}
            <div style={{ flex: '1 1 260px', minWidth: '260px' }}>
              <SettingsPanel
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
              />
            </div>

            {/* Budget Dashboard */}
            <div style={{ flex: '1 1 340px', minWidth: '300px' }}>
              <FinancialDashboard
                bookings={bookings}
                camps={camps}
                childrenList={childrenList}
              />
            </div>
          </div>

          {/* Workspace layout */}
          <div className="dashboard-layout">
            {/* Camps Catalog */}
            <div className="catalog-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <CampCatalog
                camps={camps}
                onCreateCamp={handleCreateCamp}
                onUpdateCamp={handleUpdateCamp}
                onDeleteCamp={handleDeleteCamp}
                numberOfWeeks={settings.number_of_weeks}
                summerWeekStart={settings.summer_week_start}
                onDragStartCamp={setActiveDraggedCamp}
                onDragEndCamp={() => setActiveDraggedCamp(null)}
              />
            </div>

            {/* Main Matrix Grid Canvas */}
            <div style={{ minWidth: 0 }}>
              <CampMatrix
                childrenList={childrenList}
                bookings={bookings}
                camps={camps}
                settings={settings}
                onAddBooking={handleAddBooking}
                onUpdateBooking={handleUpdateBooking}
                onDeleteBooking={handleDeleteBooking}
                onMoveBooking={handleMoveBooking}
                activeDraggedCamp={activeDraggedCamp}
              />
            </div>

          </div>
        </>
      )}
      </div>
    </main>
  );
}
