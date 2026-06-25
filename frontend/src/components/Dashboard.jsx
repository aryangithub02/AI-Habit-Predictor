import React, { useState, useEffect } from 'react';
import HabitCard from './HabitCard';
import AddHabitModal from './AddHabitModal';
import EditGoalPlanModal from './EditGoalPlanModal';
import { 
  Plus, 
  Target, 
  Utensils, 
  Dumbbell, 
  Heart, 
  Compass, 
  Sparkles, 
  RotateCcw,
  Edit3
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard({ habits, setHabits, goalPlans = [], onCompleteGoal, onUpdateGoalPlan, onResetGoal, onAddNewGoal }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const activeGoals = goalPlans.filter(p => p.status === 'Active' || !p.status);
  const completedGoals = goalPlans.filter(p => p.status === 'Completed');

  const nutritionGuidelines = activeGoals.flatMap(p => p.nutrition_guidelines || []);
  const exerciseGuidelines = activeGoals.flatMap(p => p.exercise_guidelines || []);
  const recoveryGuidelines = activeGoals.flatMap(p => p.recovery_guidelines || []);

  const isDietPlanApplicable = () => {
    return activeGoals.some(plan => {
      const category = (plan.category || '').toLowerCase();
      const objective = (plan.objective || '').toLowerCase();
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
    });
  };

  const [activeTab, setActiveTab] = useState(() => {
    return isDietPlanApplicable() ? 'nutrition' : 'exercise';
  });

  // Fetch predictions for all habits that lack one on mount
  useEffect(() => {
    const fetchPredictions = async () => {
      let needsPrediction = false;
      const updatedHabits = habits.map(h => {
        if (!h.prediction) {
          needsPrediction = true;
        }
        return { ...h };
      });

      if (!needsPrediction) {
        setLoading(false);
        return;
      }

      for (let i = 0; i < updatedHabits.length; i++) {
        if (!updatedHabits[i].prediction) {
          try {
            const response = await fetch('/api/predict_failure', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedHabits[i])
            });
            
            if (response.ok) {
              const data = await response.json();
              updatedHabits[i].prediction = data;
            } else {
              throw new Error("API error status: " + response.status);
            }
          } catch (error) {
            console.error("Failed to fetch prediction for", updatedHabits[i].name, error);
            updatedHabits[i].prediction = {
              risk_score: "Low",
              failure_probability: 0.1,
              insights: ["Local backup inference. Configure OpenRouter key to unlock full AI explanation."],
              interventions: ["Keep up the consistency!"]
            };
          }
        }
      }
      setHabits(updatedHabits);
      setLoading(false);
    };

    if (habits.length > 0) {
      fetchPredictions();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddHabit = async (newHabit) => {
    const habitWithTempPrediction = {
      ...newHabit,
      prediction: {
        risk_score: "Low",
        failure_probability: 0.0,
        insights: ["Analyzing habit data..."],
        interventions: ["Consulting AI behavioral model..."]
      }
    };
    
    setHabits(current => [...current, habitWithTempPrediction]);

    try {
      const response = await fetch('/api/predict_failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHabit)
      });
      
      if (response.ok) {
        const data = await response.json();
        setHabits(current => current.map(h => 
          h.name === newHabit.name ? { ...h, prediction: data } : h
        ));
      } else {
        throw new Error("HTTP error " + response.status);
      }
    } catch (e) {
      console.error(e);
      setHabits(current => current.map(h => 
        h.name === newHabit.name ? {
          ...h,
          prediction: {
            risk_score: "Low",
            failure_probability: 0.1,
            insights: ["Offline prediction fallback active."],
            interventions: ["Keep consistent!"]
          }
        } : h
      ));
    }
  };

  const handleEditHabit = async (oldName, updatedHabit) => {
    const originalHabit = habits.find(h => h.name === oldName);
    const requiresNewPrediction = originalHabit && 
      (originalHabit.target_days_per_week !== updatedHabit.target_days_per_week || 
       originalHabit.name !== updatedHabit.name);

    if (requiresNewPrediction) {
      updatedHabit.prediction = {
        risk_score: "Low",
        failure_probability: 0.0,
        insights: ["Target updated. Re-analyzing habit..."],
        interventions: ["Calculating new failure probability..."]
      };
    }

    setHabits(current => current.map(h => h.name === oldName ? updatedHabit : h));

    if (requiresNewPrediction) {
      try {
        const response = await fetch('/api/predict_failure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedHabit)
        });
        if (response.ok) {
          const prediction = await response.json();
          setHabits(current => current.map(h => 
            h.name === updatedHabit.name ? { ...h, prediction } : h
          ));
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteHabit = (habitName) => {
    setHabits(current => current.filter(h => h.name !== habitName));
  };

  const handleOpenEditModal = (habit) => {
    setEditingHabit(habit);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingHabit(null);
  };

  const handleLogActivity = async (habitName, customHabitsList = null) => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const newActivity = {
      date: todayStr,
      time: format(now, 'HH:mm'),
      completed: true
    };

    const baseHabitsList = customHabitsList || habits;
    const updatedHabits = baseHabitsList.map(h => {
      if (h.name === habitName) {
        const newStreak = h.current_streak + 1;
        return {
          ...h,
          activities: [...h.activities, newActivity],
          current_streak: newStreak,
          longest_streak: Math.max(h.longest_streak, newStreak)
        };
      }
      return h;
    });

    setHabits(updatedHabits);

    const targetHabit = updatedHabits.find(h => h.name === habitName);
    try {
      const response = await fetch('/api/predict_failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetHabit)
      });
      
      if (response.ok) {
        const prediction = await response.json();
        setHabits(current => current.map(h => 
          h.name === habitName ? { ...h, prediction } : h
        ));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleTask = async (habitName, taskId) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let allCompleted = false;
    let targetHabit = null;

    const updatedHabits = habits.map(h => {
      if (h.name === habitName) {
        const updatedTasks = h.tasks.map(t => 
          t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        allCompleted = updatedTasks.every(t => t.completed);
        targetHabit = {
          ...h,
          tasks: updatedTasks,
          last_checked_date: todayStr
        };
        return targetHabit;
      }
      return h;
    });

    if (allCompleted && targetHabit) {
      const isCompletedToday = targetHabit.activities && targetHabit.activities.some(a => a.date === todayStr && a.completed);
      if (!isCompletedToday) {
        await handleLogActivity(habitName, updatedHabits);
      } else {
        setHabits(updatedHabits);
      }
    } else {
      setHabits(updatedHabits);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      
      {/* Sleek Onboarding Goal Headers */}
      {activeGoals.map((plan, idx) => (
        <div key={idx} className="glass-panel" style={{ 
          marginBottom: '1rem', 
          background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.7), rgba(99, 102, 241, 0.08))',
          padding: '1.2rem 1.8rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div className="flex-row gap-3" style={{ alignItems: 'flex-start' }}>
            <div style={{ 
              background: 'rgba(99, 102, 241, 0.15)', 
              borderRadius: '12px', 
              padding: '0.6rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              marginTop: '4px'
            }}>
              <Target size={20} color="var(--accent-primary)" />
            </div>
            <div className="flex-col gap-1">
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-secondary)', fontWeight: '600' }}>
                Active Goal Plan
              </span>
              <h2 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: '600' }}>
                {plan.objective}
              </h2>
              <div className="flex-row gap-3" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                <span><strong>Metrics:</strong> {plan.success_metrics.join(' • ')}</span>
              </div>
            </div>
          </div>
          <div className="flex-row gap-2">
            <button 
              className="btn" 
              onClick={() => {
                setEditingPlan(plan);
                setIsGoalModalOpen(true);
              }}
              style={{ 
                fontSize: '0.85rem', 
                padding: '0.5rem 1rem', 
                gap: '0.4rem'
              }}
            >
              <Edit3 size={14} />
              Edit Plan
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => onCompleteGoal(plan.objective)}
              style={{ 
                fontSize: '0.85rem', 
                padding: '0.5rem 1rem', 
                gap: '0.4rem', 
                borderColor: 'rgba(16, 185, 129, 0.3)',
                background: 'rgba(16, 185, 129, 0.08)',
                color: '#a7f3d0'
              }}
            >
              Complete Goal
            </button>
          </div>
        </div>
      ))}

      {/* Main Title & Action Bar */}
      <div className="flex-row justify-between items-center" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>HabitGuard AI</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Identify high-risk habits and act before compliance lapses.</p>
        </div>
        <div className="flex-row gap-3">
          <button className="btn" onClick={onAddNewGoal}>
            <Plus size={18} />
            Add New Goal
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingHabit(null); setIsModalOpen(true); }}>
            <Plus size={18} />
            New Custom Habit
          </button>
          {onResetGoal && (
            <button 
              className="btn" 
              onClick={onResetGoal}
              style={{ 
                borderColor: 'rgba(239, 68, 68, 0.2)',
                background: 'rgba(239, 68, 68, 0.05)',
                color: '#fca5a5'
              }}
            >
              Reset All
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
          <div className="pulse-glow" style={{ width: '50px', height: '50px', background: 'var(--accent-primary)', borderRadius: '50%', margin: '0 auto 1.5rem auto' }}></div>
          Analyzing daily habit schedules and forecasting behavioral patterns...
        </div>
      ) : habits.length === 0 ? (
        <div className="glass-panel text-center animate-fade-in" style={{ padding: '3.5rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '4rem auto' }}>
          <div className="pulse-glow" style={{ width: '64px', height: '64px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <Plus size={32} color="var(--accent-primary)" />
          </div>
          <h2 style={{ marginBottom: '0.75rem', fontSize: '1.8rem', background: 'linear-gradient(to right, #ffffff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>No habits active</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '440px', margin: '0 auto 2rem auto', lineHeight: '1.6' }}>
            It looks like you don't have any active habits. Press the button below to create a custom habit or configure a new goal.
          </p>
          <div className="flex-row gap-4 justify-center">
            <button className="btn btn-primary" onClick={() => { setEditingHabit(null); setIsModalOpen(true); }}>
              <Plus size={18} />
              Add Custom Habit
            </button>
            {onResetGoal && (
              <button className="btn" onClick={onResetGoal}>
                New Goal Plan
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Left/Right Grid Layout */
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '2rem',
          alignItems: 'start'
        }}>
          
          {/* Sidebar: Guidelines & Configuration (Left Side) */}
          <div className="flex-col gap-4">
            {activeGoals.length > 0 && (
              <div className="glass-panel flex-col gap-4" style={{ height: 'fit-content' }}>
                <div className="flex-row gap-2" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.8rem', marginBottom: '0.5rem' }}>
                  <Sparkles size={18} color="var(--accent-secondary)" style={{ flexShrink: 0 }} />
                  <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Scientific Guidance</h3>
                </div>

                {/* Guidelines Tab Selector */}
                <div className="flex-row gap-2" style={{ background: 'rgba(0,0,0,0.15)', padding: '4px', borderRadius: '10px' }}>
                  {isDietPlanApplicable() && (
                    <button 
                      onClick={() => setActiveTab('nutrition')}
                      className="btn"
                      style={{ 
                        flex: 1, 
                        fontSize: '0.8rem', 
                        padding: '0.5rem', 
                        borderRadius: '8px',
                        background: activeTab === 'nutrition' ? 'var(--bg-secondary)' : 'transparent',
                        borderColor: activeTab === 'nutrition' ? 'var(--border-glass)' : 'transparent'
                      }}
                    >
                      🥗 Nutrition
                    </button>
                  )}
                  <button 
                    onClick={() => setActiveTab('exercise')}
                    className="btn"
                    style={{ 
                      flex: 1, 
                      fontSize: '0.8rem', 
                      padding: '0.5rem', 
                      borderRadius: '8px',
                      background: activeTab === 'exercise' ? 'var(--bg-secondary)' : 'transparent',
                      borderColor: activeTab === 'exercise' ? 'var(--border-glass)' : 'transparent'
                    }}
                  >
                    🏋️ Exercise
                  </button>
                  <button 
                    onClick={() => setActiveTab('recovery')}
                    className="btn"
                    style={{ 
                      flex: 1, 
                      fontSize: '0.8rem', 
                      padding: '0.5rem', 
                      borderRadius: '8px',
                      background: activeTab === 'recovery' ? 'var(--bg-secondary)' : 'transparent',
                      borderColor: activeTab === 'recovery' ? 'var(--border-glass)' : 'transparent'
                    }}
                  >
                    💤 Recovery
                  </button>
                </div>

                {/* Tab Contents */}
                <div style={{ minHeight: '180px', padding: '0.5rem 0' }}>
                  {activeTab === 'nutrition' && isDietPlanApplicable() && (
                    <div className="animate-fade-in flex-col gap-3">
                      <strong style={{ color: '#fda4af', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Utensils size={16} /> Nutrition Directives
                      </strong>
                      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {nutritionGuidelines.length > 0 ? (
                          nutritionGuidelines.map((g, i) => (
                            <li key={i} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                              • {g}
                            </li>
                          ))
                        ) : (
                          <li style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>No active nutrition guidelines.</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {activeTab === 'exercise' && (
                    <div className="animate-fade-in flex-col gap-3">
                      <strong style={{ color: '#a7f3d0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Dumbbell size={16} /> Exercise Protocols
                      </strong>
                      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {exerciseGuidelines.length > 0 ? (
                          exerciseGuidelines.map((g, i) => (
                            <li key={i} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                              • {g}
                            </li>
                          ))
                        ) : (
                          <li style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>No active exercise protocols.</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {activeTab === 'recovery' && (
                    <div className="animate-fade-in flex-col gap-3">
                      <strong style={{ color: '#c7d2fe', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Heart size={16} /> Recovery Guidelines
                      </strong>
                      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {recoveryGuidelines.length > 0 ? (
                          recoveryGuidelines.map((g, i) => (
                            <li key={i} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                              • {g}
                            </li>
                          ))
                        ) : (
                          <li style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>No active recovery guidelines.</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {completedGoals.length > 0 && (
              <div className="glass-panel flex-col gap-3" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                <div className="flex-row gap-2" style={{ borderBottom: '1px solid rgba(16, 185, 129, 0.15)', paddingBottom: '0.6rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🏆 Completed Goals
                  </h3>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {completedGoals.map((g, i) => (
                    <li key={i} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                      {g.objective}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Habits Grid (Right Side) */}
          <div style={{ 
            gridColumn: 'span 2',
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {habits.map((habit, index) => (
              <HabitCard 
                key={index} 
                habit={habit} 
                onLogActivity={handleLogActivity} 
                onEditHabit={handleOpenEditModal}
                onDeleteHabit={handleDeleteHabit}
                onToggleTask={(taskId) => handleToggleTask(habit.name, taskId)}
              />
            ))}
          </div>

        </div>
      )}

      <AddHabitModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onAddHabit={handleAddHabit} 
        onEditHabit={handleEditHabit}
        habitToEdit={editingHabit}
      />

      <EditGoalPlanModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingPlan(null);
        }}
        plan={editingPlan}
        onSave={onUpdateGoalPlan}
      />
    </div>
  );
}
