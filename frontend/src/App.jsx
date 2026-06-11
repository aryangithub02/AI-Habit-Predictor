import React, { useState, useEffect } from 'react';
import GoalOnboarding from './components/GoalOnboarding';
import PlanReview from './components/PlanReview';
import Dashboard from './components/Dashboard';

function App() {
  const [view, setView] = useState(() => {
    const savedPlans = localStorage.getItem('goal_plans');
    const savedHabits = localStorage.getItem('micro_habits');
    const hasPlans = savedPlans ? JSON.parse(savedPlans).length > 0 : false;
    const hasHabits = savedHabits ? JSON.parse(savedHabits).length > 0 : false;
    if (hasPlans && hasHabits) {
      return 'DASHBOARD';
    }
    return 'ONBOARDING';
  });

  const [goalPlans, setGoalPlans] = useState(() => {
    const saved = localStorage.getItem('goal_plans');
    if (saved) return JSON.parse(saved);
    const single = localStorage.getItem('goal_plan');
    return single ? [{ ...JSON.parse(single), status: 'Active' }] : [];
  });

  const [goalPlan, setGoalPlan] = useState(null); // temp plan for review

  const [habits, setHabits] = useState(() => {
    const saved = localStorage.getItem('micro_habits');
    return saved ? JSON.parse(saved) : [];
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync habits to localStorage
  useEffect(() => {
    localStorage.setItem('micro_habits', JSON.stringify(habits));
  }, [habits]);

  // Sync goal plans to localStorage
  useEffect(() => {
    localStorage.setItem('goal_plans', JSON.stringify(goalPlans));
  }, [goalPlans]);

  const handleOnboardingSubmit = async (onboardingData) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingData)
      });
      if (response.ok) {
        const data = await response.json();
        setGoalPlan(data);
        setView('PLAN_REVIEW');
      } else {
        alert("Failed to generate plan. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Error contacting API backend. Please ensure the backend is running on http://localhost:8000");
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivatePlan = (activatedHabits) => {
    setHabits(current => {
      const existingNames = new Set(current.map(h => h.name.toLowerCase()));
      const filteredNew = activatedHabits.filter(h => !existingNames.has(h.name.toLowerCase()));
      return [...current, ...filteredNew];
    });
    setGoalPlans(current => {
      if (current.some(p => p.objective.toLowerCase() === goalPlan.objective.toLowerCase())) {
        return current;
      }
      return [...current, { ...goalPlan, status: 'Active' }];
    });
    setGoalPlan(null);
    setView('DASHBOARD');
  };

  const handleCompleteGoal = (objective) => {
    setGoalPlans(current => 
      current.map(p => p.objective === objective ? { ...p, status: 'Completed' } : p)
    );
    const targetPlan = goalPlans.find(p => p.objective === objective);
    if (targetPlan && targetPlan.recommended_habits) {
      const habitsToRemove = new Set(targetPlan.recommended_habits.map(h => h.name.toLowerCase()));
      setHabits(current => current.filter(h => !habitsToRemove.has(h.name.toLowerCase())));
    }
  };

  const handleUpdateGoalPlans = (updatedPlan) => {
    setGoalPlans(current => 
      current.map(p => p.objective === updatedPlan.objective ? updatedPlan : p)
    );
  };

  const handleResetGoal = () => {
    if (confirm("Resetting your goals will clear all current habits and goal plans. Are you sure you want to start over?")) {
      localStorage.removeItem('goal_plans');
      localStorage.removeItem('goal_plan');
      localStorage.removeItem('micro_habits');
      setGoalPlans([]);
      setGoalPlan(null);
      setHabits([]);
      setView('ONBOARDING');
    }
  };

  return (
    <>
      {view === 'ONBOARDING' && (
        <GoalOnboarding 
          onSubmit={handleOnboardingSubmit} 
          isLoading={isLoading} 
          onCancel={goalPlans.length > 0 ? () => setView('DASHBOARD') : null}
        />
      )}
      {view === 'PLAN_REVIEW' && goalPlan && (
        <PlanReview 
          plan={goalPlan} 
          onActivate={handleActivatePlan} 
          onBack={() => setView('ONBOARDING')} 
          onCancel={goalPlans.length > 0 ? () => setView('DASHBOARD') : null}
        />
      )}
      {view === 'DASHBOARD' && (
        <Dashboard 
          habits={habits} 
          setHabits={setHabits} 
          goalPlans={goalPlans}
          onCompleteGoal={handleCompleteGoal}
          onUpdateGoalPlan={handleUpdateGoalPlans}
          onResetGoal={handleResetGoal}
          onAddNewGoal={() => setView('ONBOARDING')}
        />
      )}
    </>
  );
}

export default App;

