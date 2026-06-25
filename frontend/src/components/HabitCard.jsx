import React, { useState } from 'react';
import { Activity, CheckCircle2, Flame, Brain, AlertTriangle, Edit2, Trash2 } from 'lucide-react';

export default function HabitCard({ habit, onLogActivity, onEditHabit, onDeleteHabit, onToggleTask }) {
  const [isLogging, setIsLogging] = useState(false);

  const handleLog = async () => {
    setIsLogging(true);
    await onLogActivity(habit.name);
    setTimeout(() => setIsLogging(false), 500);
  };

  const isHighRisk = habit.prediction && habit.prediction.risk_score === "High";

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayString();
  const isCompletedToday = habit.activities && habit.activities.some(a => a.date === todayStr && a.completed);

  const hasTasks = habit.tasks && habit.tasks.length > 0;
  const completedTasksCount = hasTasks ? habit.tasks.filter(t => t.completed).length : 0;
  const totalTasksCount = hasTasks ? habit.tasks.length : 0;
  const progressPercent = hasTasks ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const isTaskChecked = (task) => {
    return isCompletedToday || task.completed;
  };

  return (
    <div className={`glass-panel animate-fade-in ${isHighRisk ? 'pulse-glow' : ''}`} style={{ borderColor: isHighRisk ? 'rgba(239, 68, 68, 0.5)' : '' }}>
      <div className="flex-row justify-between" style={{ alignItems: 'flex-start' }}>
        <h3 className="flex-row gap-2" style={{ wordBreak: 'break-word', maxWidth: '60%' }}>
          <Activity size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
          {habit.name}
        </h3>
        <div className="flex-row gap-2" style={{ flexShrink: 0 }}>
          <button 
            onClick={() => onEditHabit(habit)}
            className="card-action-btn"
            title="Edit Habit"
            aria-label="Edit Habit"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={() => {
              if (confirm(`Are you sure you want to delete "${habit.name}"?`)) {
                onDeleteHabit(habit.name);
              }
            }}
            className="card-action-btn delete-btn"
            title="Delete Habit"
            aria-label="Delete Habit"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex-row justify-between" style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
        {habit.prediction && (
          <span className={`badge badge-${habit.prediction.risk_score.toLowerCase()}`} style={{ fontSize: '0.75rem' }}>
            {habit.prediction.risk_score} Risk ({Math.round(habit.prediction.failure_probability * 100)}%)
          </span>
        )}
      </div>

      <div className="flex-row gap-4" style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
        <div className="flex-row gap-2 items-center">
          <Flame size={18} color="#f59e0b" />
          <span>{habit.current_streak} Day Streak</span>
        </div>
        <div className="flex-row gap-2 items-center">
          <CheckCircle2 size={18} color="#10b981" />
          <span>{habit.target_days_per_week}x / week</span>
        </div>
      </div>

      {habit.prediction && isHighRisk && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div className="flex-row gap-2 items-center" style={{ color: 'var(--status-high)', marginBottom: '0.5rem', fontWeight: '600' }}>
            <AlertTriangle size={18} />
            Intervention Needed
          </div>
          <p style={{ fontSize: '0.9rem', color: '#fca5a5' }}>{habit.prediction.interventions[0]}</p>
        </div>
      )}

      {habit.prediction && !isHighRisk && habit.prediction.insights.length > 0 && (
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <div className="flex-row gap-2 items-center" style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontWeight: '600' }}>
            <Brain size={18} />
            AI Insight
          </div>
          <p style={{ fontSize: '0.9rem', color: '#a5b4fc' }}>{habit.prediction.insights[0]}</p>
        </div>
      )}

      {hasTasks && (
        <div className="flex-col gap-2" style={{ marginBottom: '1.5rem' }}>
          <div className="flex-row justify-between" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>Daily Checklist</span>
            <span>{isCompletedToday ? totalTasksCount : completedTasksCount} of {totalTasksCount} completed ({isCompletedToday ? 100 : progressPercent}%)</span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '6px', 
            background: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '3px',
            overflow: 'hidden',
            marginBottom: '0.5rem',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{ 
              width: `${isCompletedToday ? 100 : progressPercent}%`, 
              height: '100%', 
              background: 'linear-gradient(95deg, var(--accent-primary), var(--accent-secondary))',
              borderRadius: '3px',
              transition: 'width 0.3s ease-out'
            }} />
          </div>

          <div className="flex-col gap-2" style={{ marginTop: '0.25rem' }}>
            {habit.tasks.map((task) => {
              const checked = isTaskChecked(task);
              return (
                <label 
                  key={task.id} 
                  className="flex-row gap-3" 
                  style={{ 
                    padding: '0.6rem 0.8rem', 
                    background: checked ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.02)', 
                    borderRadius: '8px', 
                    border: '1px solid',
                    borderColor: checked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    cursor: isCompletedToday ? 'default' : 'pointer',
                    userSelect: 'none',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={checked} 
                    disabled={isCompletedToday}
                    onChange={() => onToggleTask(task.id)}
                    style={{ 
                      accentColor: 'var(--status-low)',
                      cursor: isCompletedToday ? 'default' : 'pointer',
                      width: '16px',
                      height: '16px'
                    }}
                  />
                  <span style={{ 
                    fontSize: '0.9rem', 
                    color: checked ? 'var(--text-secondary)' : 'var(--text-primary)',
                    textDecoration: checked ? 'line-through' : 'none',
                    transition: 'all 0.2s ease',
                    wordBreak: 'break-word'
                  }}>
                    {task.text}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {hasTasks && isCompletedToday && (
        <div className="flex-row gap-2 items-center justify-center" style={{ 
          width: '100%',
          padding: '0.75rem',
          background: 'rgba(16, 185, 129, 0.12)',
          color: '#10b981',
          borderRadius: '12px',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          fontSize: '0.95rem',
          fontWeight: '500'
        }}>
          <CheckCircle2 size={18} /> Completed Today
        </div>
      )}

      {!hasTasks && (
        <button 
          className={isCompletedToday ? "btn" : "btn btn-primary"} 
          style={{ 
            width: '100%',
            background: isCompletedToday ? 'rgba(16, 185, 129, 0.15)' : '',
            color: isCompletedToday ? '#10b981' : '',
            borderColor: isCompletedToday ? 'rgba(16, 185, 129, 0.3)' : '',
            cursor: isCompletedToday ? 'default' : 'pointer'
          }}
          onClick={isCompletedToday ? null : handleLog}
          disabled={isLogging}
        >
          {isCompletedToday ? (
            <span className="flex-row gap-2 items-center justify-center">
              <CheckCircle2 size={18} /> Completed Today
            </span>
          ) : (
            isLogging ? 'Logging...' : 'Mark Completed Today'
          )}
        </button>
      )}
    </div>
  );
}
