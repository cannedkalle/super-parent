'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Child, Camp, Booking, CalendarSettings, CampDurationType } from '@/lib/db';
import { getWeeks, needsExtendedCare } from '@/lib/timeUtils';
import { Plus, Clock, MapPin, AlertTriangle, FileText, X } from 'lucide-react';

interface CampMatrixProps {
  childrenList: Child[];
  bookings: Booking[];
  camps: Camp[];
  settings: CalendarSettings;
  onAddBooking: (booking: Omit<Booking, 'id'>) => Promise<void>;
  onUpdateBooking: (id: string, updates: Partial<Omit<Booking, 'id'>>) => Promise<void>;
  onDeleteBooking: (id: string) => Promise<void>;
  onMoveBooking: (bookingId: string, targetChildId: string, targetWeekStart: string) => Promise<void>;
  activeDraggedCamp?: Camp | null;
}

interface SelectedSlot {
  childId: string;
  weekStart: string;
  booking?: Booking;
}

export default function CampMatrix({
  childrenList,
  bookings,
  camps,
  settings,
  onAddBooking,
  onUpdateBooking,
  onDeleteBooking,
  onMoveBooking,
  activeDraggedCamp,
}: CampMatrixProps) {
  const weeks = getWeeks(settings.summer_week_start, settings.number_of_weeks);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Dialog Form states
  const [dialogCampId, setDialogCampId] = useState('');
  const [dialogStatus, setDialogStatus] = useState<'researching' | 'waiting_to_register' | 'waitlisted' | 'booked'>('researching');
  const [dialogNotes, setDialogNotes] = useState('');
  const [dialogChildId, setDialogChildId] = useState('');
  const [dialogWeekStart, setDialogWeekStart] = useState('');
  const [dialogAmountPaid, setDialogAmountPaid] = useState<number | string>(0);
  const [activeDraggedBookingCamp, setActiveDraggedBookingCamp] = useState<Camp | null>(null);

  const getWeekNumber = (weekStart: string) => {
    const weekIndex = weeks.findIndex((week) => week.dateStr === weekStart);
    return weekIndex === -1 ? null : weekIndex + 1;
  };

  const isCampAvailableForWeek = (camp: Camp | undefined | null, weekStart: string) => {
    if (!camp || !camp.available_weeks || camp.available_weeks.length === 0) {
      return true;
    }

    const weekNumber = getWeekNumber(weekStart);
    return weekNumber !== null && camp.available_weeks.includes(weekNumber);
  };

  const bookingsConflictForSameSlot = (newCamp: Camp | undefined | null, existingCamp: Camp | undefined | null) => {
    const newDuration = newCamp?.duration_type || 'full_day';
    const existingDuration = existingCamp?.duration_type || 'full_day';

    if (newDuration === 'full_day' || existingDuration === 'full_day') {
      return true;
    }

    return newDuration === existingDuration;
  };

  const canScheduleCampInSlot = (
    camp: Camp | undefined | null,
    childId: string,
    weekStart: string,
    excludeBookingId?: string
  ) => {
    if (!camp || !isCampAvailableForWeek(camp, weekStart)) {
      return false;
    }

    return !bookings.some((booking) => {
      if (booking.id === excludeBookingId) return false;
      if (booking.child_id !== childId) return false;
      if (booking.summer_week_start !== weekStart) return false;

      const existingCamp = camps.find((candidate) => candidate.id === booking.camp_id);
      return bookingsConflictForSameSlot(camp, existingCamp);
    });
  };

  const activeDropCamp = activeDraggedCamp || activeDraggedBookingCamp;
  const selectedDialogCamp = camps.find((camp) => camp.id === dialogCampId);
  const durationLabels: Record<CampDurationType, string> = {
    full_day: 'Full day',
    morning_half_day: 'Morning',
    afternoon_half_day: 'Afternoon',
  };
  const formatAgeGrade = (camp: Camp) => {
    const lowerBound = camp.min_age || camp.min_grade
      ? `${camp.min_age ?? '?'} yrs / ${camp.min_grade || '?'}`
      : '';
    const upperBound = camp.max_age || camp.max_grade
      ? `${camp.max_age ?? '?'} yrs / ${camp.max_grade || '?'}`
      : '';

    if (lowerBound && upperBound) {
      return `${lowerBound} - ${upperBound}`;
    }

    return lowerBound || upperBound;
  };
  const gradeRank = (grade?: string) => {
    if (!grade) return null;
    if (grade === 'Pre-K') return -1;
    if (grade === 'K') return 0;
    const parsed = Number(grade);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const getAgeGradeWarning = (child: Child | undefined, camp: Camp | undefined | null) => {
    if (!child || !camp) return '';

    if (child.age == null && !child.grade) {
      return 'Child age/grade is not set.';
    }

    if (child.age != null) {
      if (camp.min_age != null && child.age < camp.min_age) {
        return `${child.name} is younger than this camp range.`;
      }
      if (camp.max_age != null && child.age > camp.max_age) {
        return `${child.name} is older than this camp range.`;
      }
    }

    const childGrade = gradeRank(child.grade);
    const minGrade = gradeRank(camp.min_grade);
    const maxGrade = gradeRank(camp.max_grade);
    if (childGrade != null) {
      if (minGrade != null && childGrade < minGrade) {
        return `${child.name}'s grade is below this camp range.`;
      }
      if (maxGrade != null && childGrade > maxGrade) {
        return `${child.name}'s grade is above this camp range.`;
      }
    }

    return '';
  };

  // Close dialog on clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dialogRef.current && e.target === dialogRef.current) {
        handleCloseDialog();
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleOpenDialog = (childId: string, weekStart: string, booking?: Booking) => {
    setSelectedSlot({ childId, weekStart, booking });
    setDialogChildId(childId);
    setDialogWeekStart(weekStart);

    if (booking) {
      setDialogCampId(booking.camp_id);
      setDialogStatus(booking.status);
      setDialogNotes(booking.notes || '');
      setDialogAmountPaid(booking.amount_paid || 0);
    } else {
      const firstAvailableCamp = camps.find((camp) => canScheduleCampInSlot(camp, childId, weekStart));
      setDialogCampId(firstAvailableCamp?.id || '');
      setDialogStatus('researching');
      setDialogNotes('');
      setDialogAmountPaid(0);
    }

    dialogRef.current?.showModal();
  };

  const handleCloseDialog = () => {
    dialogRef.current?.close();
    setSelectedSlot(null);
  };

  const handleSaveDialog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !dialogCampId) return;

    const camp = camps.find((c) => c.id === dialogCampId);
    if (!canScheduleCampInSlot(camp, dialogChildId, dialogWeekStart, selectedSlot.booking?.id)) {
      alert('This camp conflicts with another booking for the selected child and week.');
      return;
    }

    try {
      if (selectedSlot.booking) {
        // We are editing an existing booking
        const bookingId = selectedSlot.booking.id;
        
        // Update booking details directly. It handles moving to a different slot if child_id/summer_week_start changed.

        // Update the rest of the booking details
        await onUpdateBooking(bookingId, {
          camp_id: dialogCampId,
          status: dialogStatus,
          notes: dialogNotes,
          child_id: dialogChildId,
          summer_week_start: dialogWeekStart,
          amount_paid: Number(dialogAmountPaid) || 0
        });
      } else {
        // We are scheduling a new booking
        await onAddBooking({
          child_id: dialogChildId,
          camp_id: dialogCampId,
          summer_week_start: dialogWeekStart,
          status: dialogStatus,
          notes: dialogNotes,
          amount_paid: Number(dialogAmountPaid) || 0
        });
      }
      handleCloseDialog();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save booking.');
    }
  };

  const selectedDialogChild = childrenList.find((child) => child.id === dialogChildId);
  const selectedDialogAgeGradeWarning = getAgeGradeWarning(selectedDialogChild, selectedDialogCamp);

  const handleDeleteBooking = async () => {
    if (!selectedSlot?.booking) return;
    if (confirm('Are you sure you want to unschedule this camp?')) {
      try {
        await onDeleteBooking(selectedSlot.booking.id);
        handleCloseDialog();
      } catch (err) {
        console.error(err);
        alert('Failed to delete booking.');
      }
    }
  };

  // Drag and Drop Logic
  const handleDragOver = (e: React.DragEvent, canDrop: boolean) => {
    if (!canDrop) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent, childId: string, weekStart: string) => {
    e.preventDefault();
    const campId = e.dataTransfer.getData('campId');
    const bookingId = e.dataTransfer.getData('bookingId');

    if (campId) {
      // Dragged new camp from catalog
      const camp = camps.find((c) => c.id === campId);
      if (!canScheduleCampInSlot(camp, childId, weekStart)) {
        return;
      }

      try {
        await onAddBooking({
          child_id: childId,
          camp_id: campId,
          summer_week_start: weekStart,
          status: 'booked', // Drag and drop defaults to booked
          notes: '',
          amount_paid: 0,
        });
      } catch (err: any) {
        alert(err.message || 'Failed to add booking. Ensure there is no conflict.');
      }
    } else if (bookingId) {
      // Dragged existing booking from one slot to another
      if (!canScheduleCampInSlot(activeDraggedBookingCamp, childId, weekStart, bookingId)) {
        return;
      }

      try {
        await onMoveBooking(bookingId, childId, weekStart);
      } catch (err: any) {
        alert(err.message || 'Failed to move booking.');
      }
    }
  };

  const handleDragStartBooking = (
    e: React.DragEvent,
    booking: Booking
  ) => {
    e.dataTransfer.setData('bookingId', booking.id);
    e.dataTransfer.effectAllowed = 'move';
    setActiveDraggedBookingCamp(camps.find((camp) => camp.id === booking.camp_id) || null);
  };

  const handleDragEndBooking = () => {
    setActiveDraggedBookingCamp(null);
  };

  // Get active booking for child and week
  const getCellBookings = (childId: string, weekStart: string) => {
    return bookings.filter(
      (b) => b.child_id === childId && b.summer_week_start === weekStart
    ).sort((a, b) => {
      const campA = camps.find((camp) => camp.id === a.camp_id);
      const campB = camps.find((camp) => camp.id === b.camp_id);
      const order: Record<CampDurationType, number> = {
        morning_half_day: 0,
        afternoon_half_day: 1,
        full_day: 2,
      };
      return order[campA?.duration_type || 'full_day'] - order[campB?.duration_type || 'full_day'];
    });
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
      <h2 className="mb-4" style={{ fontSize: '1.5rem', fontWeight: 800 }}>Summer Matrix Grid</h2>
      
      {childrenList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          <p className="mb-4">No children profiles created yet.</p>
          <p style={{ fontSize: '0.9rem' }}>Create children profiles in the sidebar to populate columns.</p>
        </div>
      ) : (
        <table style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: '12px',
          minWidth: `${200 + childrenList.length * 250}px`
        }}>
          <thead>
            <tr>
              <th scope="col" style={{
                textAlign: 'left',
                width: '160px',
                padding: '0.5rem',
                fontSize: '0.95rem',
                color: 'var(--text-secondary)'
              }}>
                Weeks
              </th>
              {childrenList.map((child) => (
                <th
                  key={child.id}
                  scope="col"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.45)',
                    borderBottom: `4px solid ${child.color}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    textAlign: 'center',
                    fontSize: '1rem',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                  }}
                >
                  {child.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.dateStr}>
                <th scope="row" style={{
                  verticalAlign: 'middle',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  paddingLeft: '0.5rem',
                  textAlign: 'left'
                }}>
                  {week.label}
                </th>
                {childrenList.map((child) => {
                  const cellBookings = getCellBookings(child.id, week.dateStr);
                  const draggedCampCanDrop = activeDropCamp
                    ? canScheduleCampInSlot(
                        activeDropCamp,
                        child.id,
                        week.dateStr,
                        activeDraggedBookingCamp ? cellBookings.find((booking) => booking.camp_id === activeDraggedBookingCamp.id)?.id : undefined
                      )
                    : true;
                  const isUnavailableDuringDrag = Boolean(activeDropCamp) && !draggedCampCanDrop;
                  const canAddAnotherCamp = camps.some((camp) => canScheduleCampInSlot(camp, child.id, week.dateStr));
                  
                  return (
                    <td
                      key={`${child.id}-${week.dateStr}`}
                      onDragOver={(e) => handleDragOver(e, draggedCampCanDrop)}
                      onDrop={(e) => handleDrop(e, child.id, week.dateStr)}
                      style={{
                        height: '140px',
                        verticalAlign: 'top',
                        position: 'relative',
                        opacity: isUnavailableDuringDrag ? 0.35 : 1,
                        pointerEvents: isUnavailableDuringDrag ? 'none' : 'auto',
                        transition: 'opacity 160ms ease'
                      }}
                      role="gridcell"
                      aria-disabled={isUnavailableDuringDrag}
                    >
                      {cellBookings.length > 0 ? (
                        <div className="flex flex-col gap-2" style={{ height: '100%' }}>
                          {cellBookings.map((booking) => {
                            const camp = camps.find((c) => c.id === booking.camp_id);
                            if (!camp) return null;
                            const hasExtendedCare = Boolean(camp.extended_care_start_time || camp.extended_care_end_time);
                            const ageGradeWarning = getAgeGradeWarning(child, camp);

                            return (
                              <div
                                key={booking.id}
                                draggable
                                onDragStart={(e) => handleDragStartBooking(e, booking)}
                                onDragEnd={handleDragEndBooking}
                                onClick={() => handleOpenDialog(child.id, week.dateStr, booking)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleOpenDialog(child.id, week.dateStr, booking);
                                  }
                                }}
                                tabIndex={0}
                                role="button"
                                aria-label={`Camp: ${camp.name} scheduled for ${child.name} during week of ${week.label}. Status: ${booking.status}.`}
                                className="glass-card glass-interactive"
                                style={{
                                  flex: 1,
                                  minHeight: '0',
                                  padding: '0.65rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  borderLeft: `5px solid ${child.color}`,
                                  borderTop: '1px solid rgba(255, 255, 255, 0.5)',
                                  borderRight: '1px solid rgba(255, 255, 255, 0.3)',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                                  position: 'relative',
                                  boxShadow: '0 4px 12px rgba(45, 43, 42, 0.04)'
                                }}
                              >
                                <div>
                                  <div className="flex justify-between align-start gap-1 mb-1">
                                    <h4 style={{
                                      fontSize: '0.8rem',
                                      fontWeight: 800,
                                      margin: 0,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: '130px'
                                    }}>
                                      {camp.name}
                                    </h4>
                                    <span className={`badge badge-${booking.status === 'researching' || booking.status === 'waiting_to_register' ? 'idea' : booking.status}`} style={{ fontSize: '0.6rem', padding: '1px 5px', whiteSpace: 'nowrap' }}>
                                      {booking.status === 'waiting_to_register' ? 'Waiting' : booking.status}
                                    </span>
                                  </div>
                                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{camp.provider}</p>
                                </div>

                                <div className="flex flex-col gap-1 mt-1">
                                  <span className="flex align-center gap-1" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                    <Clock size={10} />
                                    {durationLabels[camp.duration_type || 'full_day']}: {camp.start_time} - {camp.end_time}
                                  </span>
                                  {hasExtendedCare && (
                                    <span className="flex align-center gap-1" style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                                      <Clock size={10} />
                                      Care {camp.extended_care_start_time || 'N/A'} - {camp.extended_care_end_time || 'N/A'}
                                    </span>
                                  )}
                                  {formatAgeGrade(camp) && (
                                    <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                                      {formatAgeGrade(camp)}
                                    </span>
                                  )}
                                  
                                  <div className="flex justify-between align-center" style={{ marginTop: '0.15rem' }}>
                                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                      ${camp.price}
                                    </span>
                                    <div className="flex gap-1">
                                      {booking.notes && (
                                        <span title="Has notes">
                                          <FileText size={12} style={{ color: 'var(--text-muted)' }} />
                                        </span>
                                      )}
                                      {needsExtendedCare(camp.start_time, camp.end_time) && (
                                        <span title="Extended care warning">
                                          <AlertTriangle size={12} style={{ color: 'var(--accent-terracotta)' }} />
                                        </span>
                                      )}
                                      {ageGradeWarning && (
                                        <span title={ageGradeWarning}>
                                          <AlertTriangle size={12} style={{ color: 'var(--accent-mustard)' }} />
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {ageGradeWarning && (
                                    <span style={{ fontSize: '0.66rem', color: 'var(--accent-mustard)', fontWeight: 600 }}>
                                      Age/grade warning
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {canAddAnotherCamp && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleOpenDialog(child.id, week.dateStr)}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', flexShrink: 0 }}
                            >
                              <Plus size={12} />
                              Add half-day
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Empty Dotted Slot */
                        <div
                          onClick={() => handleOpenDialog(child.id, week.dateStr)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleOpenDialog(child.id, week.dateStr);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`Empty slot for ${child.name} during week of ${week.label}. Click to schedule.`}
                          className="flex align-center justify-center"
                          style={{
                            height: '100%',
                            border: '2px dashed var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            transition: 'var(--transition-all)',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = child.color;
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                          }}
                        >
                          <div className="flex flex-col align-center gap-1">
                            <Plus size={16} style={{ color: child.color }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Schedule</span>
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modern native <dialog> for Scheduling / Editing */}
      <dialog
        ref={dialogRef}
        className="glass"
        style={{
          margin: 'auto',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
          padding: '1.5rem',
          maxWidth: '480px',
          width: '90%',
          outline: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.9)'
        }}
        aria-labelledby="dialog-title"
        onClose={handleCloseDialog}
      >
        {selectedSlot && (
        <form onSubmit={handleSaveDialog}>
            <div className="flex justify-between align-center mb-4">
              <h3 id="dialog-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {selectedSlot.booking ? 'Edit Planned Camp' : 'Schedule a Camp'}
              </h3>
              <button
                type="button"
                className="btn-icon"
                onClick={handleCloseDialog}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dialogCamp">Select Camp</label>
              {camps.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--accent-terracotta)', fontWeight: 500 }}>
                  No camps available in catalog. Please create a camp in the sidebar first.
                </p>
              ) : (
                <select
                  id="dialogCamp"
                  className="form-select"
                  value={dialogCampId}
                  onChange={(e) => setDialogCampId(e.target.value)}
                  required
                >
                  <option value="" disabled>-- Select a Camp --</option>
                  {camps.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      disabled={!canScheduleCampInSlot(c, dialogChildId, dialogWeekStart, selectedSlot.booking?.id)}
                    >
                      {c.name} ({c.provider}) - ${c.price}
                      {!isCampAvailableForWeek(c, dialogWeekStart) ? ' - unavailable this week' : ''}
                      {isCampAvailableForWeek(c, dialogWeekStart) && !canScheduleCampInSlot(c, dialogChildId, dialogWeekStart, selectedSlot.booking?.id) ? ' - conflicts this slot' : ''}
                      {getAgeGradeWarning(selectedDialogChild, c) ? ' - age/grade warning' : ''}
                    </option>
                  ))}
                </select>
              )}
              {dialogCampId && !canScheduleCampInSlot(selectedDialogCamp, dialogChildId, dialogWeekStart, selectedSlot.booking?.id) && (
                <p style={{ color: 'var(--accent-terracotta)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                  This camp is unavailable or conflicts with another booking in this slot.
                </p>
              )}
              {selectedDialogAgeGradeWarning && (
                <p style={{ color: 'var(--accent-mustard)', fontSize: '0.75rem', marginTop: '0.35rem', fontWeight: 600 }}>
                  {selectedDialogAgeGradeWarning}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dialogStatus">Registration Status</label>
              <select
                id="dialogStatus"
                className="form-select"
                value={dialogStatus}
                onChange={(e) => setDialogStatus(e.target.value as any)}
              >
                <option value="researching">Idea / Researching</option>
                <option value="waiting_to_register">Waiting to Register</option>
                <option value="waitlisted">Waitlisted</option>
                <option value="booked">Booked</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dialogAmountPaid">Amount Paid ($)</label>
              <input
                id="dialogAmountPaid"
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                value={dialogAmountPaid}
                onChange={(e) => setDialogAmountPaid(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Click-to-Move Configuration */}
            <fieldset style={{
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
              marginBottom: '1.25rem',
              backgroundColor: 'rgba(255, 255, 255, 0.3)'
            }}>
              <legend style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0 0.5rem', color: 'var(--text-secondary)' }}>
                Move Assignment
              </legend>
              <div className="grid grid-cols-2 gap-2" style={{ marginTop: '0.25rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="dialogChild" style={{ fontSize: '0.75rem' }}>Child</label>
                  <select
                    id="dialogChild"
                    className="form-select"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                    value={dialogChildId}
                    onChange={(e) => setDialogChildId(e.target.value)}
                  >
                    {childrenList.map((ch) => (
                      <option key={ch.id} value={ch.id}>{ch.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="dialogWeek" style={{ fontSize: '0.75rem' }}>Week</label>
                  <select
                    id="dialogWeek"
                    className="form-select"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                    value={dialogWeekStart}
                    onChange={(e) => {
                      const nextWeekStart = e.target.value;
                      setDialogWeekStart(nextWeekStart);

                      if (dialogCampId) {
                        const currentCamp = camps.find((camp) => camp.id === dialogCampId);
                        if (!canScheduleCampInSlot(currentCamp, dialogChildId, nextWeekStart, selectedSlot.booking?.id)) {
                          const nextAvailableCamp = camps.find((camp) => canScheduleCampInSlot(camp, dialogChildId, nextWeekStart, selectedSlot.booking?.id));
                          setDialogCampId(nextAvailableCamp?.id || '');
                        }
                      }
                    }}
                  >
                    {weeks.map((w) => (
                      <option key={w.dateStr} value={w.dateStr}>{w.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>

            <div className="form-group">
              <label className="form-label" htmlFor="dialogNotes">Notes / Todo List</label>
              <textarea
                id="dialogNotes"
                className="form-textarea"
                value={dialogNotes}
                onChange={(e) => setDialogNotes(e.target.value)}
                placeholder="Pack extra lunch, check for coupon code, coordinate carpool, etc..."
              />
            </div>

            <div className="flex gap-2 justify-between" style={{ marginTop: '1.5rem' }}>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={!dialogCampId || !canScheduleCampInSlot(selectedDialogCamp, dialogChildId, dialogWeekStart, selectedSlot.booking?.id)}>
                  Save
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleCloseDialog}>
                  Cancel
                </button>
              </div>
              {selectedSlot.booking && (
                <button
                  type="button"
                  className="btn btn-terracotta"
                  onClick={handleDeleteBooking}
                >
                  Unschedule
                </button>
              )}
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
