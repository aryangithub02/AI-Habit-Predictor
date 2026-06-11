import React, { useState, useEffect } from 'react';
import { X, Target, Save } from 'lucide-react';

export default function EditGoalPlanModal({ isOpen, onClose, plan, onSave }) {
  const [objective, setObjective] = useState('');
  const [successMetrics, setSuccessMetrics] = useState('');
  const [nutrition, setNutrition] = useState('');
  const [exercise, setExercise] = useState('');
  const [recovery, setRecovery] = useState('');

  useEffect(() => {
    if (isOpen && plan) {
      setObjective(plan.objective || '');
      setSuccessMetrics((plan.success_metrics || []).join('\n'));
      setNutrition((plan.nutrition_guidelines || []).join('\n'));
      setExercise((plan.exercise_guidelines || []).join('\n'));
      setRecovery((plan.recovery_guidelines || []).join('\n'));
    }
  }, [isOpen, plan]);

  const isDietPlanApplicable = (plan) => {
    if (!plan) return false;
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
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const parseLines = (text) => 
      text.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);

    const updatedPlan = {
      ...plan,
      objective: objective.trim(),
      success_metrics: parseLines(successMetrics),
      nutrition_guidelines: isDietPlanApplicable(plan) ? parseLines(nutrition) : [],
      exercise_guidelines: parseLines(exercise),
      recovery_guidelines: parseLines(recovery)
    };

    onSave(updatedPlan);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-panel modal-content" style={{ maxWidth: '600px' }}>
        <div className="flex-row justify-between modal-header">
          <h2 className="flex-row gap-2 modal-title">
            <Target size={22} color="var(--accent-primary)" />
            Edit Goal Plan Details
          </h2>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-col gap-4" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
          
          {/* Objective */}
          <div className="flex-col gap-2">
            <label className="input-label">Primary Objective</label>
            <input 
              type="text" 
              value={objective} 
              onChange={(e) => setObjective(e.target.value)} 
              className="input-field"
              required 
            />
          </div>

          {/* Success Metrics */}
          <div className="flex-col gap-2">
            <label className="input-label">Success Metrics (one per line)</label>
            <textarea 
              rows={3}
              value={successMetrics} 
              onChange={(e) => setSuccessMetrics(e.target.value)} 
              className="input-field"
              style={{ fontFamily: 'inherit', resize: 'vertical' }}
              placeholder="e.g. Lose 10kg&#10;Track daily macros"
              required
            />
          </div>

          {/* Nutrition */}
          {isDietPlanApplicable(plan) && (
            <div className="flex-col gap-2">
              <label className="input-label">Nutrition Guidelines (one per line)</label>
              <textarea 
                rows={3}
                value={nutrition} 
                onChange={(e) => setNutrition(e.target.value)} 
                className="input-field"
                style={{ fontFamily: 'inherit', resize: 'vertical' }}
                placeholder="e.g. Calorie deficit of 500 kcal&#10;Protein at 1.8g/kg"
              />
            </div>
          )}

          {/* Exercise */}
          <div className="flex-col gap-2">
            <label className="input-label">Exercise Protocols (one per line)</label>
            <textarea 
              rows={3}
              value={exercise} 
              onChange={(e) => setExercise(e.target.value)} 
              className="input-field"
              style={{ fontFamily: 'inherit', resize: 'vertical' }}
              placeholder="e.g. 45 min strength training&#10;8000 steps daily"
            />
          </div>

          {/* Recovery */}
          <div className="flex-col gap-2">
            <label className="input-label">Recovery Guidelines (one per line)</label>
            <textarea 
              rows={3}
              value={recovery} 
              onChange={(e) => setRecovery(e.target.value)} 
              className="input-field"
              style={{ fontFamily: 'inherit', resize: 'vertical' }}
              placeholder="e.g. 7-8 hours sleep&#10;Active stretching days"
            />
          </div>

          <div className="flex-row gap-4 modal-actions" style={{ marginTop: '1rem' }}>
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={18} />
              Save Goal Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
