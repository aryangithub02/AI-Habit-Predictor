import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Check } from 'lucide-react';

export default function AddHabitModal({ isOpen, onClose, onAddHabit, onEditHabit, habitToEdit }) {
  const [name, setName] = useState('');
  const [targetDays, setTargetDays] = useState(5);
  const [tasksList, setTasksList] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (isOpen) {
      if (habitToEdit) {
        setName(habitToEdit.name);
        setTargetDays(habitToEdit.target_days_per_week);
        setTasksList(habitToEdit.tasks ? habitToEdit.tasks.map(t => t.text) : []);
      } else {
        setName('');
        setTargetDays(5);
        setTasksList([]);
      }
      setNewTaskText('');
    }
  }, [habitToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddTask = () => {
    if (newTaskText.trim()) {
      setTasksList([...tasksList, newTaskText.trim()]);
      setNewTaskText('');
    }
  };

  const handleRemoveTask = (index) => {
    setTasksList(tasksList.filter((_, i) => i !== index));
  };

  const handleNewTaskKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTask();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalTasks = tasksList.map(text => {
      const existingTask = habitToEdit && habitToEdit.tasks && habitToEdit.tasks.find(t => t.text === text);
      return existingTask || {
        id: Math.random().toString(36).substr(2, 9),
        text,
        completed: false
      };
    });

    const todayStr = getTodayString();

    if (habitToEdit) {
      onEditHabit(habitToEdit.name, {
        ...habitToEdit,
        name: name.trim(),
        target_days_per_week: parseInt(targetDays, 10),
        tasks: finalTasks,
        last_checked_date: finalTasks.length > 0 ? (habitToEdit.last_checked_date || todayStr) : null
      });
    } else {
      onAddHabit({
        name: name.trim(),
        target_days_per_week: parseInt(targetDays, 10),
        current_streak: 0,
        longest_streak: 0,
        activities: [],
        prediction: null,
        tasks: finalTasks,
        last_checked_date: finalTasks.length > 0 ? todayStr : null
      });
    }

    setName('');
    setTargetDays(5);
    setTasksList([]);
    setNewTaskText('');
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

          <div className="flex-col gap-2" style={{ marginTop: '0.5rem' }}>
            <label className="input-label">Daily Checklist / Sub-tasks (Optional)</label>
            <div className="flex-row gap-2">
              <input 
                type="text" 
                placeholder="e.g. Morning 500ml, Read 10 mins..." 
                value={newTaskText} 
                onChange={(e) => setNewTaskText(e.target.value)} 
                onKeyDown={handleNewTaskKeyDown}
                className="input-field"
                style={{ flex: 1 }}
              />
              <button 
                type="button" 
                onClick={handleAddTask} 
                className="btn"
                style={{ padding: '0.8rem', background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)' }}
              >
                Add
              </button>
            </div>
            
            {tasksList.length > 0 && (
              <div className="flex-col gap-2" style={{ 
                marginTop: '0.5rem', 
                maxHeight: '120px', 
                overflowY: 'auto',
                background: 'rgba(0, 0, 0, 0.15)',
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border-glass)'
              }}>
                {tasksList.map((task, index) => (
                  <div key={index} className="flex-row justify-between animate-fade-in" style={{ 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    padding: '0.4rem 0.8rem', 
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: '#fff', wordBreak: 'break-all' }}>{task}</span>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveTask(index)}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'var(--status-high)', 
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        padding: '0 4px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
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
