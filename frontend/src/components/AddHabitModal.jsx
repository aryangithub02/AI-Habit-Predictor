import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Check } from 'lucide-react';

export default function AddHabitModal({ isOpen, onClose, onAddHabit, onEditHabit, habitToEdit }) {
  const [name, setName] = useState('');
  const [targetDays, setTargetDays] = useState(5);

  useEffect(() => {
    if (isOpen) {
      if (habitToEdit) {
        setName(habitToEdit.name);
        setTargetDays(habitToEdit.target_days_per_week);
      } else {
        setName('');
        setTargetDays(5);
      }
    }
  }, [habitToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (habitToEdit) {
      onEditHabit(habitToEdit.name, {
        ...habitToEdit,
        name: name.trim(),
        target_days_per_week: parseInt(targetDays, 10)
      });
    } else {
      onAddHabit({
        name: name.trim(),
        target_days_per_week: parseInt(targetDays, 10),
        current_streak: 0,
        longest_streak: 0,
        activities: [],
        prediction: null
      });
    }

    setName('');
    setTargetDays(5);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-panel modal-content">
        <div className="flex-row justify-between modal-header">
          <h2 className="flex-row gap-2 modal-title">
            <Calendar size={22} color="var(--accent-primary)" />
            {habitToEdit ? 'Edit Habit' : 'Add New Habit'}
          </h2>
          <button 
            onClick={onClose} 
            className="modal-close-btn"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="flex-col gap-2">
            <label className="input-label">Habit Name</label>
            <input 
              type="text" 
              placeholder="e.g. Drink 2L Water, Meditate, Gym session..." 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="input-field"
              required 
              autoFocus
            />
          </div>

          <div className="flex-col gap-2" style={{ marginTop: '0.5rem' }}>
            <label className="flex-row justify-between input-label">
              <span>Target Frequency</span>
              <span className="target-days-display">{targetDays} {targetDays === 1 ? 'day' : 'days'} / week</span>
            </label>
            <input 
              type="range" 
              min="1" 
              max="7" 
              value={targetDays} 
              onChange={(e) => setTargetDays(parseInt(e.target.value, 10))} 
              className="slider"
            />
            <div className="slider-labels">
              <span>1d</span>
              <span>2d</span>
              <span>3d</span>
              <span>4d</span>
              <span>5d</span>
              <span>6d</span>
              <span>7d</span>
            </div>
          </div>

          <div className="flex-row gap-4 modal-actions">
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {habitToEdit ? <Check size={18} /> : <Plus size={18} />}
              {habitToEdit ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
