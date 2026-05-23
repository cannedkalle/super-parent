'use client';

import React, { useState } from 'react';
import { Child } from '@/lib/db';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface ChildrenManagerProps {
  childrenList: Child[];
  onCreateChild: (child: Omit<Child, 'id'>) => Promise<void>;
  onUpdateChild: (id: string, updates: Partial<Omit<Child, 'id'>>) => Promise<void>;
  onDeleteChild: (id: string) => Promise<void>;
}

// Warm child-friendly default color palette
const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

export default function ChildrenManager({
  childrenList,
  onCreateChild,
  onUpdateChild,
  onDeleteChild,
}: ChildrenManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [ageGrade, setAgeGrade] = useState('');

  const ageGradeOptions = [
    { age: '4', grade: 'Pre-K', label: 'Age 4 / Grade Pre-K' },
    { age: '5', grade: 'K', label: 'Age 5 / Grade K' },
    ...Array.from({ length: 8 }, (_, index) => {
      const grade = String(index + 1);
      const age = String(index + 6);
      return { age, grade, label: `Age ${age} / Grade ${grade}` };
    }),
  ];

  const getAgeGradeOption = (age?: number, grade?: string) => {
    if (age != null) {
      return ageGradeOptions.find((option) => option.age === String(age));
    }

    if (grade) {
      return ageGradeOptions.find((option) => option.grade === grade);
    }

    return undefined;
  };

  const handleOpenAdd = () => {
    setName('');
    setSelectedColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setAgeGrade('');
    setIsAdding(true);
    setEditingChildId(null);
  };

  const handleOpenEdit = (child: Child) => {
    setName(child.name);
    setSelectedColor(child.color);
    setAgeGrade(getAgeGradeOption(child.age, child.grade)?.age || '');
    setEditingChildId(child.id);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingChildId(null);
    setName('');
    setAgeGrade('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const selectedAgeGrade = ageGradeOptions.find((option) => option.age === ageGrade);
    const childData = {
      name: name.trim(),
      color: selectedColor,
      age: selectedAgeGrade ? Number(selectedAgeGrade.age) : undefined,
      grade: selectedAgeGrade?.grade,
    };

    try {
      if (editingChildId) {
        await onUpdateChild(editingChildId, childData);
      } else {
        await onCreateChild(childData);
      }
      handleCancel();
    } catch (err) {
      console.error(err);
      alert('Failed to save child.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}? This will remove all their camp bookings!`)) {
      try {
        await onDeleteChild(id);
      } catch (err) {
        console.error(err);
        alert('Failed to delete child.');
      }
    }
  };

  return (
    <div className="glass-card mb-6">
      <div className="flex justify-between align-center mb-4">
        <h3 style={{ fontSize: '1.15rem' }}>Children Profiles</h3>
        <button
          className="btn btn-icon"
          onClick={handleOpenAdd}
          aria-label="Add child profile"
          title="Add child"
        >
          <Plus size={18} />
        </button>
      </div>

      {(isAdding || editingChildId) && (
        <form onSubmit={handleSubmit} style={{
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem',
          marginBottom: '1rem'
        }}>
          <h4 className="mb-2" style={{ fontSize: '0.95rem' }}>
            {editingChildId ? 'Edit Child Profile' : 'New Child Profile'}
          </h4>
          
          <div className="form-group">
            <label className="form-label" htmlFor="childName">Child's Name</label>
            <input
              id="childName"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wendy"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="childAgeGrade">Age / Grade</label>
            <select
              id="childAgeGrade"
              className="form-select"
              value={ageGrade}
              onChange={(e) => setAgeGrade(e.target.value)}
            >
              <option value="">Not set</option>
              {ageGradeOptions.map((option) => (
                <option key={option.age} value={option.age}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Profile Theme Color</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  style={{
                    backgroundColor: color,
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: selectedColor === color ? '2px solid var(--text-primary)' : '2px solid transparent',
                    boxShadow: selectedColor === color ? '0 0 0 2px #FFFFFF' : 'none',
                    cursor: 'pointer',
                    transition: 'var(--transition-all)'
                  }}
                  aria-label={`Select color ${color}`}
                />
              ))}
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                style={{
                  width: '28px',
                  height: '28px',
                  padding: 0,
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer'
                }}
                aria-label="Custom color picker"
              />
            </div>
          </div>

          <div className="flex gap-2" style={{ marginTop: '0.75rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.5rem' }}>
              Save
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCancel} style={{ flex: 1, padding: '0.5rem' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {childrenList.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
          No children profiles yet. Click + to add.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {childrenList.map((child) => (
            <div
              key={child.id}
              className="flex justify-between align-center px-3 py-2"
              style={{
                background: 'rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: `4px solid ${child.color}`,
                paddingLeft: '1rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
              }}
            >
              <div className="flex align-center gap-2">
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', display: 'block' }}>{child.name}</span>
                  {getAgeGradeOption(child.age, child.grade) && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {getAgeGradeOption(child.age, child.grade)?.label}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  className="btn-icon"
                  onClick={() => handleOpenEdit(child)}
                  aria-label={`Edit ${child.name}'s profile`}
                  title={`Edit ${child.name}`}
                  style={{ padding: '6px' }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  className="btn-icon"
                  onClick={() => handleDelete(child.id, child.name)}
                  aria-label={`Delete ${child.name}'s profile`}
                  title={`Delete ${child.name}`}
                  style={{ padding: '6px', color: 'var(--accent-terracotta)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
