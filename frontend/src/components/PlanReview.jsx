import React, { useState } from 'react';
import { 
  Check, 
  ChevronRight, 
  Target, 
  Flame, 
  Activity, 
  Utensils, 
  Dumbbell, 
  Sparkles, 
  Heart, 
  ArrowLeft 
} from 'lucide-react';

export default function PlanReview({ plan, onActivate, onBack, onCancel }) {
  // Select all recommended habits by default
  const [selectedHabits, setSelectedHabits] = useState(() => {
    return plan.recommended_habits.map((_, idx) => idx);
  });

  const isDietPlanApplicable = (p) => {
    if (!p) return false;
    const category = (p.category || '').toLowerCase();
    const objective = (p.objective || '').toLowerCase();
    return (
      category.includes('fat') || 
      category.includes('weight') || 
      objective.includes('fat loss') || 
      objective.includes('weight loss') || 
      objective.includes('weight gain') || 
      objective.includes('lose weight') || 
      objective.includes('gain weight') || 
      objective.includes('lose fat')
    );
  };

  const toggleSelectHabit = (idx) => {
    setSelectedHabits(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleActivate = () => {
    const habitsToActivate = plan.recommended_habits
      .filter((_, idx) => selectedHabits.includes(idx))
      .map(h => ({
        name: h.name,
        target_days_per_week: h.target_days_per_week,
        current_streak: 0,
        longest_streak: 0,
        activities: [],
        prediction: null
      }));
    onActivate(habitsToActivate);
  };

  const getDifficultyClass = (diff) => {
    switch (diff.toLowerCase()) {
      case 'easy': return 'badge-low';
      case 'medium': return 'badge-medium';
      case 'hard': return 'badge-high';
      default: return 'badge-medium';
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '2rem auto', paddingBottom: '4rem' }}>
      
      {/* Back button */}
      <button 
        onClick={onBack} 
        className="btn" 
        style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none' }}
      >
        <ArrowLeft size={16} />
        Back to Onboarding
      </button>

      {/* Plan Header */}
      <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>
        <div className="pulse-glow" style={{ width: '60px', height: '60px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
          <Sparkles size={28} color="var(--accent-secondary)" />
        </div>
        <h2 style={{ fontSize: '2.2rem', marginBottom: '0.75rem', background: 'linear-gradient(to right, #ffffff, #c7d2fe, #f3e8ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Your AI Growth Plan
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          This personalized behavioral map was dynamically formulated based on your objectives and physical context.
        </p>
      </div>

      {/* Goal & Success Metrics */}
      <div className="grid grid-cols-2 gap-6" style={{ marginBottom: '2rem' }}>
        
        {/* Overall Objective */}
        <div className="glass-panel flex-col gap-4">
          <h3 className="flex-row gap-2" style={{ fontSize: '1.2rem', color: '#fff' }}>
            <Target size={20} color="var(--accent-primary)" />
            Primary Objective
          </h3>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#e0e0e0', fontWeight: '500' }}>
            {plan.objective}
          </p>
        </div>

        {/* Success Metrics */}
        <div className="glass-panel flex-col gap-4">
          <h3 className="flex-row gap-2" style={{ fontSize: '1.2rem', color: '#fff' }}>
            <Activity size={20} color="var(--accent-secondary)" />
            Key Success Metrics
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {plan.success_metrics.map((metric, idx) => (
              <li key={idx} className="flex-row gap-2" style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                <Check size={14} color="var(--status-low)" style={{ flexShrink: 0 }} />
                <span>{metric}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Scientific Guidelines Tabs/Sections */}
      <div className="glass-panel flex-col gap-6" style={{ marginBottom: '2rem', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.3rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
          🔬 Scientific Domain Guidelines
        </h3>

        <div className="grid gap-6" style={{ gridTemplateColumns: isDietPlanApplicable(plan) ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }}>
          {/* Nutrition */}
          {isDietPlanApplicable(plan) && (
            <div className="flex-col gap-3">
              <h4 className="flex-row gap-2" style={{ color: '#fda4af', fontWeight: '600' }}>
                <Utensils size={18} />
                Nutrition
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {plan.nutrition_guidelines.map((g, i) => (
                  <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    • {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Exercise */}
          <div className="flex-col gap-3">
            <h4 className="flex-row gap-2" style={{ color: '#a7f3d0', fontWeight: '600' }}>
              <Dumbbell size={18} />
              Exercise
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {plan.exercise_guidelines.map((g, i) => (
                <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  • {g}
                </li>
              ))}
            </ul>
          </div>

          {/* Recovery */}
          <div className="flex-col gap-3">
            <h4 className="flex-row gap-2" style={{ color: '#c7d2fe', fontWeight: '600' }}>
              <Heart size={18} />
              Recovery & Lifestyle
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {plan.recovery_guidelines.map((g, i) => (
                <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  • {g}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Recommended Habits Selector */}
      <div className="glass-panel flex-col gap-4" style={{ marginBottom: '2.5rem', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.3rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
          🤖 AI Recommended Habits
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          Select the habits you would like to activate. Unselected habits will not be added to your tracking panel.
        </p>

        <div className="flex-col gap-4">
          {plan.recommended_habits.map((habit, idx) => {
            const isSelected = selectedHabits.includes(idx);
            return (
              <div 
                key={idx}
                onClick={() => toggleSelectHabit(idx)}
                className={`flex-row justify-between glass-panel`}
                style={{ 
                  cursor: 'pointer',
                  padding: '1.2rem',
                  borderColor: isSelected ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'rgba(30, 30, 45, 0.3)',
                  transition: 'all 0.2s ease',
                  userSelect: 'none'
                }}
              >
                <div className="flex-row gap-4" style={{ flex: 1, alignItems: 'flex-start' }}>
                  <div 
                    style={{ 
                      width: '22px', 
                      height: '22px', 
                      border: '2px solid', 
                      borderColor: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifycontent: 'center',
                      background: isSelected ? 'var(--accent-primary)' : 'transparent',
                      marginTop: '2px',
                      flexShrink: 0
                    }}
                  >
                    {isSelected && <Check size={16} color="#fff" />}
                  </div>

                  <div className="flex-col gap-1">
                    <div className="flex-row gap-3">
                      <strong style={{ fontSize: '1.1rem', color: isSelected ? '#fff' : 'var(--text-secondary)' }}>
                        {habit.name}
                      </strong>
                      <span className={`badge ${getDifficultyClass(habit.difficulty)}`} style={{ fontSize: '0.65rem' }}>
                        {habit.difficulty}
                      </span>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.1rem 0.5rem', 
                        background: 'rgba(255, 255, 255, 0.06)', 
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: 'var(--text-secondary)'
                      }}>
                        Priority: {habit.priority_score.toFixed(1)}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: isSelected ? 'var(--text-secondary)' : '#606070', lineHeight: '1.5', marginTop: '0.2rem' }}>
                      {habit.description}
                    </p>
                  </div>
                </div>

                <div style={{ flexShrink: 0, textAlign: 'right', marginLeft: '1rem' }}>
                  <div className="target-days-display" style={{ fontSize: '1.1rem' }}>
                    {habit.target_days_per_week}x
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>weekly target</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action buttons */}
      <div className="flex-row justify-between" style={{ marginTop: '2rem' }}>
        <button 
          onClick={onCancel || onBack} 
          className="btn" 
          style={{ padding: '1rem 2rem' }}
        >
          Cancel
        </button>

        <button 
          onClick={handleActivate} 
          className="btn btn-primary"
          style={{ padding: '1rem 2.5rem', fontWeight: '600' }}
          disabled={selectedHabits.length === 0}
        >
          Activate Habit Plan
          <ChevronRight size={18} />
        </button>
      </div>

    </div>
  );
}
