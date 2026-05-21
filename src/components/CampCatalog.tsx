'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camp, CampDurationType } from '@/lib/db';
import { Plus, Edit2, Trash2, Search, AlertTriangle, Clock, MapPin, DollarSign, CalendarRange, Link2, X } from 'lucide-react';
import { getWeeks, needsExtendedCare } from '@/lib/timeUtils';

interface CampCatalogProps {
  camps: Camp[];
  onCreateCamp: (camp: Omit<Camp, 'id'>) => Promise<void>;
  onUpdateCamp: (id: string, updates: Partial<Omit<Camp, 'id'>>) => Promise<void>;
  onDeleteCamp: (id: string) => Promise<void>;
  numberOfWeeks: number;
  summerWeekStart: string;
  onDragStartCamp?: (camp: Camp) => void;
  onDragEndCamp?: () => void;
}

interface ImportedCampPreview {
  title?: string;
  provider?: string;
  price?: number | null;
  location?: string | null;
}

export default function CampCatalog({
  camps,
  onCreateCamp,
  onUpdateCamp,
  onDeleteCamp,
  numberOfWeeks,
  summerWeekStart,
  onDragStartCamp,
  onDragEndCamp,
}: CampCatalogProps) {
  const weekOptions = getWeeks(summerWeekStart, numberOfWeeks);
  const allWeekNumbers = weekOptions.map((_, index) => index + 1);
  const formatWeekDate = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCampId, setEditingCampId] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const importDialogRef = useRef<HTMLDialogElement>(null);
  const campFormDialogRef = useRef<HTMLDialogElement>(null);

  // Form states
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [minGrade, setMinGrade] = useState('');
  const [maxGrade, setMaxGrade] = useState('');
  const [durationType, setDurationType] = useState<CampDurationType>('full_day');
  const [startTime, setStartTime] = useState('9:00 AM');
  const [endTime, setEndTime] = useState('3:00 PM');
  const [extendedCareStartTime, setExtendedCareStartTime] = useState('');
  const [extendedCareEndTime, setExtendedCareEndTime] = useState('');
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]);
  const timeOptions = Array.from({ length: 31 }, (_, index) => {
    const totalMinutes = 6 * 60 + index * 30;
    const hours24 = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
  });
  const durationLabels: Record<CampDurationType, string> = {
    full_day: 'Full day',
    morning_half_day: 'Morning half-day',
    afternoon_half_day: 'Afternoon half-day',
  };
  const ageGradeOptions = [
    { age: '4', grade: 'Pre-K', label: 'Age 4 / Grade Pre-K' },
    { age: '5', grade: 'K', label: 'Age 5 / Grade K' },
    ...Array.from({ length: 8 }, (_, index) => {
      const grade = String(index + 1);
      const age = String(index + 6);
      return { age, grade, label: `Age ${age} / Grade ${grade}` };
    }),
  ];
  const setMinAgeGrade = (value: string) => {
    const option = ageGradeOptions.find((candidate) => candidate.age === value);
    setMinAge(option?.age || '');
    setMinGrade(option?.grade || '');
  };
  const setMaxAgeGrade = (value: string) => {
    const option = ageGradeOptions.find((candidate) => candidate.age === value);
    setMaxAge(option?.age || '');
    setMaxGrade(option?.grade || '');
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

  // URL Importer states
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportedCampPreview | null>(null);

  useEffect(() => {
    const dialog = importDialogRef.current;
    if (!dialog) return;

    if (isImportDialogOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isImportDialogOpen && dialog.open) {
      dialog.close();
    }
  }, [isImportDialogOpen]);

  useEffect(() => {
    const dialog = campFormDialogRef.current;
    const shouldShow = isAdding || Boolean(editingCampId);
    if (!dialog) return;

    if (shouldShow && !dialog.open) {
      dialog.showModal();
    } else if (!shouldShow && dialog.open) {
      dialog.close();
    }
  }, [isAdding, editingCampId]);

  const handleOpenAdd = () => {
    setName('');
    setProvider('');
    setPrice('');
    setAddress('');
    setMinAge('');
    setMaxAge('');
    setMinGrade('');
    setMaxGrade('');
    setDurationType('full_day');
    setStartTime('9:00 AM');
    setEndTime('3:00 PM');
    setExtendedCareStartTime('');
    setExtendedCareEndTime('');
    setImportUrl('');
    setImportPreview(null);
    setSelectedWeeks([]);
    setIsAdding(true);
    setEditingCampId(null);
  };

  const handleOpenImportDialog = () => {
    setImportUrl('');
    setImportPreview(null);
    setIsImportDialogOpen(true);
  };

  const handleCloseImportDialog = () => {
    if (!isImporting) {
      setImportPreview(null);
      setIsImportDialogOpen(false);
    }
  };

  const handleImportUrl = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!importUrl.trim()) return;
    setIsImporting(true);
    try {
      const response = await fetch('/api/parse-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      if (!response.ok) {
        throw new Error('Failed to parse URL metadata');
      }
      const data = await response.json();
      setImportPreview({
        title: data.title,
        provider: data.provider,
        price: data.price,
        location: data.location,
      });
    } catch (err: any) {
      console.error(err);
      alert('Error fetching page details. Falling back to manual entry.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImportedCamp = () => {
    if (!importPreview) return;

    setIsAdding(true);
    setEditingCampId(null);
    setDurationType('full_day');
    setStartTime('9:00 AM');
    setEndTime('3:00 PM');
    setExtendedCareStartTime('');
    setExtendedCareEndTime('');
    setSelectedWeeks([]);
    setName(importPreview.title || '');
    setProvider(importPreview.provider || '');
    setPrice(importPreview.price != null ? String(importPreview.price) : '');
    setAddress(importPreview.location || '');
    setMinAge('');
    setMaxAge('');
    setMinGrade('');
    setMaxGrade('');
    setImportPreview(null);
    setIsImportDialogOpen(false);
  };

  const handleOpenEdit = (camp: Camp) => {
    setName(camp.name);
    setProvider(camp.provider);
    setPrice(String(camp.price));
    setAddress(camp.address);
    setMinAge(camp.min_age != null ? String(camp.min_age) : '');
    setMaxAge(camp.max_age != null ? String(camp.max_age) : '');
    setMinGrade(camp.min_grade || '');
    setMaxGrade(camp.max_grade || '');
    setDurationType(camp.duration_type || 'full_day');
    setStartTime(camp.start_time);
    setEndTime(camp.end_time);
    setExtendedCareStartTime(camp.extended_care_start_time || '');
    setExtendedCareEndTime(camp.extended_care_end_time || '');
    if (!camp.available_weeks || camp.available_weeks.length === 0) {
      setSelectedWeeks(allWeekNumbers);
    } else {
      setSelectedWeeks(camp.available_weeks);
    }
    setEditingCampId(camp.id);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingCampId(null);
    setSelectedWeeks([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !provider.trim()) return;

    if (selectedWeeks.length === 0) {
      alert('Please select at least one available week.');
      return;
    }

    const campData = {
      name: name.trim(),
      provider: provider.trim(),
      price: Number(price) || 0,
      address: address.trim(),
      min_age: minAge ? Number(minAge) : undefined,
      max_age: maxAge ? Number(maxAge) : undefined,
      min_grade: minGrade || undefined,
      max_grade: maxGrade || undefined,
      duration_type: durationType,
      start_time: startTime.trim(),
      end_time: endTime.trim(),
      extended_care_start_time: extendedCareStartTime || undefined,
      extended_care_end_time: extendedCareEndTime || undefined,
      available_weeks: selectedWeeks.length === numberOfWeeks ? [] : selectedWeeks,
    };

    try {
      if (editingCampId) {
        await onUpdateCamp(editingCampId, campData);
      } else {
        await onCreateCamp(campData);
      }
      handleCancel();
    } catch (err) {
      console.error(err);
      alert('Failed to save camp.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This will cancel any bookings for this camp!`)) {
      try {
        await onDeleteCamp(id);
      } catch (err) {
        console.error(err);
        alert('Failed to delete camp.');
      }
    }
  };

  const filteredCamps = camps.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.provider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDragStart = (e: React.DragEvent, camp: Camp) => {
    e.dataTransfer.setData('campId', camp.id);
    e.dataTransfer.effectAllowed = 'copyMove';
    onDragStartCamp?.(camp);
  };

  const handleDragEnd = () => {
    onDragEndCamp?.();
  };

  return (
    <div className="glass-card catalog-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="flex justify-between align-center mb-3">
        <h3 style={{ fontSize: '1.15rem' }}>Camp Catalog</h3>
        <div className="flex align-center gap-1">
          <button
            className="btn btn-icon"
            onClick={handleOpenImportDialog}
            aria-label="Import camp from webpage"
            title="Import camp from webpage"
          >
            <Link2 size={18} />
          </button>
          <button
            className="btn btn-icon"
            onClick={handleOpenAdd}
            aria-label="Add camp to catalog"
            title="Add camp"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="form-group" style={{ position: 'relative', marginBottom: '1rem' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search camps..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '2rem' }}
        />
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }}
        />
      </div>

      {/* Catalog List */}
      <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        {filteredCamps.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
            No camps found.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredCamps.map((camp) => {
              const requiresCare = needsExtendedCare(camp.start_time, camp.end_time);
              const hasExtendedCare = Boolean(camp.extended_care_start_time || camp.extended_care_end_time);
              return (
                <div
                  key={camp.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, camp)}
                  onDragEnd={handleDragEnd}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    border: '1px solid rgba(45, 43, 42, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    cursor: 'grab',
                    transition: 'var(--transition-all)',
                    userSelect: 'none'
                  }}
                  className="glass-interactive"
                  title="Drag this camp to schedule"
                >
                  <div className="flex justify-between align-start mb-1">
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{camp.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{camp.provider}</p>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-icon"
                        onClick={() => handleOpenEdit(camp)}
                        aria-label={`Edit ${camp.name}`}
                        style={{ padding: '6px' }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleDelete(camp.id, camp.name)}
                        aria-label={`Delete ${camp.name}`}
                        style={{ padding: '6px', color: 'var(--accent-terracotta)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span className="flex align-center gap-1">
                      <Clock size={12} />
                      {durationLabels[camp.duration_type || 'full_day']}: {camp.start_time} - {camp.end_time}
                    </span>
                    {hasExtendedCare && (
                      <span className="flex align-center gap-1" style={{ width: '100%', color: 'var(--text-muted)' }}>
                        <Clock size={12} />
                        Care: {camp.extended_care_start_time || 'N/A'} - {camp.extended_care_end_time || 'N/A'}
                      </span>
                    )}
                    <span className="flex align-center gap-1">
                      <DollarSign size={12} />
                      ${camp.price}
                    </span>
                    {formatAgeGrade(camp) && (
                      <span className="flex align-center gap-1" style={{ width: '100%' }}>
                        {formatAgeGrade(camp)}
                      </span>
                    )}
                    {camp.address && (
                      <span className="flex align-center gap-1" style={{ width: '100%' }}>
                        <MapPin size={12} />
                        {camp.address}
                      </span>
                    )}
                    <span className="flex align-center gap-1" style={{ width: '100%', color: 'var(--text-muted)' }}>
                      <CalendarRange size={12} />
                      <span>
                        Available: {!camp.available_weeks || camp.available_weeks.length === 0
                          ? 'All Weeks'
                          : `Weeks ${camp.available_weeks.join(', ')}`}
                      </span>
                    </span>
                  </div>

                  {requiresCare && (
                    <div
                      className="flex align-center gap-1 mt-2 p-1"
                      style={{
                        backgroundColor: 'rgba(195, 106, 85, 0.06)',
                        borderRadius: '4px',
                        color: 'var(--accent-terracotta)',
                        fontSize: '0.7rem',
                        fontWeight: 500
                      }}
                      title="Camp hours extend outside standard 9 AM - 5 PM"
                    >
                      <AlertTriangle size={12} />
                      <span>{hasExtendedCare ? 'Extended care available' : 'Extended care warning'}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p style={{
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        marginTop: '0.75rem',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '0.5rem'
      }}>
        💡 Pro-Tip: Drag any camp card into a child's week slot in the grid to schedule!
      </p>

      <dialog
        ref={campFormDialogRef}
        className="glass"
        onClose={handleCancel}
        onClick={(e) => {
          if (e.target === campFormDialogRef.current) {
            handleCancel();
          }
        }}
        style={{
          margin: 'auto',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
          padding: '1.5rem',
          maxWidth: '680px',
          width: '92%',
          maxHeight: '88dvh',
          overflowY: 'auto',
          outline: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.96)'
        }}
        aria-labelledby="camp-form-title"
      >
        <form onSubmit={handleSubmit}>
          <div className="flex justify-between align-center mb-4">
            <div>
              <h3 id="camp-form-title" style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                {editingCampId ? 'Edit Camp' : 'Add Camp'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                Fill in the schedule details and choose which camp weeks are available.
              </p>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={handleCancel}
              aria-label="Close camp form"
            >
              <X size={18} />
            </button>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="campName">Camp Name</label>
            <input
              id="campName"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Galileo Innovation Camp"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="form-group">
              <label className="form-label" htmlFor="provider">Provider</label>
              <input
                id="provider"
                type="text"
                className="form-input"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. Galileo Learning"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="price">Price ($)</label>
              <input
                id="price"
                type="number"
                step="0.01"
                className="form-input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 550"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="address">Address</label>
            <input
              id="address"
              type="text"
              className="form-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Seattle, WA"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="form-group">
              <label className="form-label" htmlFor="minAgeGrade">Minimum Age / Grade</label>
              <select
                id="minAgeGrade"
                className="form-select"
                value={minAge}
                onChange={(e) => setMinAgeGrade(e.target.value)}
              >
                <option value="">Any</option>
                {ageGradeOptions.map((option) => (
                  <option key={option.age} value={option.age}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="maxAgeGrade">Maximum Age / Grade</label>
              <select
                id="maxAgeGrade"
                className="form-select"
                value={maxAge}
                onChange={(e) => setMaxAgeGrade(e.target.value)}
              >
                <option value="">Any</option>
                {ageGradeOptions.map((option) => (
                  <option key={option.age} value={option.age}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="durationType">Camp Duration</label>
            <select
              id="durationType"
              className="form-select"
              value={durationType}
              onChange={(e) => setDurationType(e.target.value as CampDurationType)}
            >
              <option value="full_day">Full day</option>
              <option value="morning_half_day">Morning half-day</option>
              <option value="afternoon_half_day">Afternoon half-day</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="form-group">
              <label className="form-label" htmlFor="startTime">Start Time</label>
              <select
                id="startTime"
                className="form-select"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="endTime">End Time</label>
              <select
                id="endTime"
                className="form-select"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="form-group">
              <label className="form-label" htmlFor="extendedCareStartTime">Extended Care Start Time</label>
              <select
                id="extendedCareStartTime"
                className="form-select"
                value={extendedCareStartTime}
                onChange={(e) => setExtendedCareStartTime(e.target.value)}
              >
                <option value="">None</option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="extendedCareEndTime">Extended Care End Time</label>
              <select
                id="extendedCareEndTime"
                className="form-select"
                value={extendedCareEndTime}
                onChange={(e) => setExtendedCareEndTime(e.target.value)}
              >
                <option value="">None</option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div
            className="form-group mb-3"
            style={{
              borderTop: '1px dashed var(--border-color)',
              paddingTop: '1rem',
              marginTop: '0.5rem'
            }}
          >
            <div className="flex justify-between align-center mb-1">
              <label className="form-label" style={{ margin: 0 }}>Available Weeks</label>
              <div className="flex align-center gap-1">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedWeeks(allWeekNumbers)}
                  style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedWeeks([])}
                  style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                >
                  Select none
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(74px, 1fr))', gap: '8px', marginTop: '0.65rem' }}>
              {weekOptions.map((week, index) => {
                const wk = index + 1;
                const isSelected = selectedWeeks.includes(wk);
                return (
                  <button
                    key={week.dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedWeeks((prev) =>
                        prev.includes(wk) ? prev.filter((w) => w !== wk) : [...prev, wk].sort((a, b) => a - b)
                      );
                    }}
                    style={{
                      minHeight: '48px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1px solid var(--accent-sage)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--accent-sage)' : 'rgba(255, 255, 255, 0.4)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      transition: 'var(--transition-all)'
                    }}
                    title={`Toggle Week ${wk}, starting ${formatWeekDate(week.dateStr)}`}
                    className="glass-interactive"
                  >
                    <span>Week {wk}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 500, opacity: 0.85 }}>
                      {formatWeekDate(week.dateStr)}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedWeeks.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--accent-terracotta)', marginTop: '0.35rem' }}>
                Please select at least one week.
              </p>
            )}
          </div>

          {needsExtendedCare(startTime, endTime) && (
            <div
              className="flex gap-2 p-2 align-center mb-3"
              style={{
                backgroundColor: 'rgba(195, 106, 85, 0.08)',
                border: '1px solid rgba(195, 106, 85, 0.2)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent-terracotta)',
                fontSize: '0.8rem'
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>Camp hours extend outside standard 9 AM - 5 PM. Extended care might be needed.</span>
            </div>
          )}

          <div className="flex justify-between gap-2" style={{ marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Camp
            </button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={importDialogRef}
        className="glass"
        onClose={() => setIsImportDialogOpen(false)}
        onClick={(e) => {
          if (e.target === importDialogRef.current) {
            handleCloseImportDialog();
          }
        }}
        style={{
          margin: 'auto',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
          padding: '1.25rem',
          maxWidth: '460px',
          width: '90%',
          outline: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.95)'
        }}
        aria-labelledby="import-camp-title"
      >
        <form onSubmit={importPreview ? (e) => e.preventDefault() : handleImportUrl}>
          <div className="flex justify-between align-center mb-4">
            <div>
              <h3 id="import-camp-title" style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                Import Camp
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                {importPreview
                  ? 'Review the imported details, then confirm to edit and save.'
                  : 'Paste a camp webpage and review the imported details before saving.'}
              </p>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={handleCloseImportDialog}
              disabled={isImporting}
              aria-label="Close import dialog"
            >
              <X size={18} />
            </button>
          </div>

          {!importPreview ? (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="importCampUrl">Camp Webpage URL</label>
                <input
                  id="importCampUrl"
                  type="url"
                  className="form-input"
                  placeholder="https://example.com/summer-camp"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  autoFocus
                  required
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                  Imports title, provider, price, and address when available.
                </p>
              </div>

              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseImportDialog}
                  disabled={isImporting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sage"
                  disabled={isImporting || !importUrl.trim()}
                >
                  <Link2 size={15} />
                  {isImporting ? 'Importing...' : 'Import'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(255, 255, 255, 0.38)',
                  padding: '0.85rem',
                  marginBottom: '1rem'
                }}
              >
                {[
                  ['Camp Name', importPreview.title || 'Not found'],
                  ['Provider', importPreview.provider || 'Not found'],
                  ['Price', importPreview.price != null ? `$${importPreview.price}` : 'Not found'],
                  ['Address', importPreview.location || 'Not found'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-3"
                    style={{
                      padding: '0.45rem 0',
                      borderBottom: label === 'Address' ? 'none' : '1px solid rgba(45, 43, 42, 0.08)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
                    <span style={{ color: value === 'Not found' ? 'var(--text-muted)' : 'var(--text-primary)', textAlign: 'right' }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setImportPreview(null)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-sage"
                  onClick={handleConfirmImportedCamp}
                >
                  Confirm Details
                </button>
              </div>
            </>
          )}
        </form>
      </dialog>
    </div>
  );
}
