'use client';

import React, { useState, useEffect } from 'react';
import { CalendarSettings } from '@/lib/db';

interface SettingsPanelProps {
  settings: CalendarSettings;
  onUpdateSettings: (settings: Partial<CalendarSettings>) => Promise<void>;
}

export default function SettingsPanel({ settings, onUpdateSettings }: SettingsPanelProps) {
  const [startDate, setStartDate] = useState(settings.summer_week_start);
  const [numWeeks, setNumWeeks] = useState(settings.number_of_weeks);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setStartDate(settings.summer_week_start);
    setNumWeeks(settings.number_of_weeks);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      await onUpdateSettings({
        summer_week_start: startDate,
        number_of_weeks: Number(numWeeks),
      });
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-card mb-6">
      <h3 className="mb-4" style={{ fontSize: '1.15rem' }}>Calendar Config</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="startDate">Summer Start Date</label>
          <input
            id="startDate"
            type="date"
            className="form-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="numWeeks">Number of Weeks</label>
          <input
            id="numWeeks"
            type="number"
            min="1"
            max="20"
            className="form-input"
            value={numWeeks}
            onChange={(e) => setNumWeeks(Number(e.target.value))}
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.5rem' }}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
        {message && (
          <p
            style={{
              fontSize: '0.85rem',
              marginTop: '0.5rem',
              textAlign: 'center',
              color: message.includes('Error') ? 'var(--accent-terracotta)' : 'var(--accent-sage)',
              fontWeight: 500
            }}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
