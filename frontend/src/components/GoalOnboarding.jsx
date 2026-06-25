import React, { useState } from 'react';
import { Target, ArrowRight, ArrowLeft, Clock, Compass, HelpCircle, Activity, X } from 'lucide-react';

export default function GoalOnboarding({ onSubmit, isLoading, onCancel }) {
  // Step 1 states
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState('');
  const [timeline, setTimeline] = useState('3 Months');
  const [availableTime, setAvailableTime] = useState('45 Minutes');
  const [difficulty, setDifficulty] = useState('Balanced');
  const [restrictions, setRestrictions] = useState('');

  // Step 2 states (dynamic questions)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [goalCategory, setGoalCategory] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (!goal.trim()) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.trim(),
          timeline,
          time_available_per_day: availableTime,
          difficulty_preference: difficulty,
          restrictions: restrictions.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGoalCategory(data.goal_category);
        setQuestions((data.questions || []).map((q, i) => ({ ...q, key: q.key || `q${i}` })));
        
        // Initialize default answers
        const initialAnswers = {};
        (data.questions || []).forEach(q => {
          if (q.type === 'dropdown' && q.options && q.options.length > 0) {
            initialAnswers[q.key] = q.options[0];
          } else {
            initialAnswers[q.key] = '';
          }
        });
        setAnswers(initialAnswers);
        setStep(2);
      } else {
        alert("Failed to analyze goal. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting backend. Please ensure the backend is running and accessible.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnswerChange = (key, value) => {
    setAnswers(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    
    // Parse numeric answers if needed
    const parsedAnswers = {};
    questions.forEach(q => {
      const val = answers[q.key];
      if (q.type === 'number') {
        parsedAnswers[q.key] = parseFloat(val) || 0;
      } else {
        parsedAnswers[q.key] = val;
      }
    });

    onSubmit({
      initial_input: {
        goal: goal.trim(),
        timeline,
        time_available_per_day: availableTime,
        difficulty_preference: difficulty,
        restrictions: restrictions.trim()
      },
      goal_category: goalCategory,
      answers: parsedAnswers
    });
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '700px', margin: '2rem auto', padding: '2.5rem', position: 'relative' }}>
      {onCancel && (
        <button 
          onClick={onCancel} 
          className="modal-close-btn" 
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}
          aria-label="Cancel onboarding"
        >
          <X size={24} />
        </button>
      )}
      
      {/* Onboarding Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="pulse-glow" style={{ width: '60px', height: '60px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          {step === 1 ? <Target size={28} color="var(--accent-primary)" /> : <Activity size={28} color="var(--accent-secondary)" />}
        </div>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', background: 'linear-gradient(to right, #ffffff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {step === 1 ? 'Define Your Goal' : 'Profile Completion'}
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          {step === 1 
            ? 'Our AI will analyze your goal and create a personalized behavioral plan tailored to your situation.'
            : `AI Category: ${goalCategory} – Tell us a bit more so we can build a perfect, personalized routine.`
          }
        </p>
      </div>

      {step === 1 ? (
        <form onSubmit={handleStep1Submit} className="flex-col gap-6">
          <div className="flex-col gap-2">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={16} color="var(--accent-primary)" />
              What goal do you want to achieve?
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Lose 10kg, Learn algorithms, Prepare for marathon, Build muscle, Crack GATE"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              required
              disabled={isAnalyzing}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Timeline Selection */}
            <div className="flex-col gap-2">
              <label className="input-label">Target Timeline</label>
              <select
                className="input-field"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                disabled={isAnalyzing}
                style={{ background: '#13131c' }}
              >
                <option value="1 Month">1 Month</option>
                <option value="3 Months">3 Months</option>
                <option value="6 Months">6 Months</option>
                <option value="12 Months">12 Months</option>
                <option value="More Than 1 Year">More Than 1 Year</option>
              </select>
            </div>

            {/* Time Available Selection */}
            <div className="flex-col gap-2">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="var(--accent-primary)" />
                Time Available Per Day
              </label>
              <select
                className="input-field"
                value={availableTime}
                onChange={(e) => setAvailableTime(e.target.value)}
                disabled={isAnalyzing}
                style={{ background: '#13131c' }}
              >
                <option value="15 Minutes">15 Minutes</option>
                <option value="30 Minutes">30 Minutes</option>
                <option value="45 Minutes">45 Minutes</option>
                <option value="1 Hour">1 Hour</option>
                <option value="2 Hours">2 Hours</option>
                <option value="More Than 2 Hours">More Than 2 Hours</option>
              </select>
            </div>

            {/* Plan Intensity Selection */}
            <div className="flex-col gap-2">
              <label className="input-label">Preferred Plan Intensity</label>
              <select
                className="input-field"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={isAnalyzing}
                style={{ background: '#13131c' }}
              >
                <option value="Easy & Sustainable">Easy & Sustainable</option>
                <option value="Balanced">Balanced</option>
                <option value="Aggressive">Aggressive</option>
              </select>
            </div>

            {/* Restrictions Input */}
            <div className="flex-col gap-2">
              <label className="input-label">Restrictions / Limitations (Optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. No gym access, Knee injury, Vegetarian"
                value={restrictions}
                onChange={(e) => setRestrictions(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}
            disabled={isAnalyzing || !goal.trim()}
          >
            {isAnalyzing ? (
              <div className="flex-row gap-2 justify-center">
                <div className="pulse-glow" style={{ width: '15px', height: '15px', background: '#fff', borderRadius: '50%' }}></div>
                AI Goal Analysis...
              </div>
            ) : (
              <div className="flex-row gap-2 justify-center">
                Analyze Goal & Generate Questions
                <ArrowRight size={18} />
              </div>
            )}
          </button>
        </form>
      ) : (
        // STEP 2: DYNAMIC AI QUESTIONS FORM
        <form onSubmit={handleStep2Submit} className="flex-col gap-6">
          <div className="flex-col gap-5">
            {questions.map((q) => (
              <div key={q.key} className="flex-col gap-2">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HelpCircle size={16} color="var(--accent-secondary)" />
                  {q.question}
                </label>
                
                {q.type === 'dropdown' ? (
                  <select
                    className="input-field"
                    value={answers[q.key] || ''}
                    onChange={(e) => handleAnswerChange(q.key, e.target.value)}
                    required
                    style={{ background: '#13131c' }}
                  >
                    {(q.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : q.type === 'number' ? (
                  <input
                    type="number"
                    className="input-field"
                    value={answers[q.key] || ''}
                    onChange={(e) => handleAnswerChange(q.key, e.target.value)}
                    required
                  />
                ) : (
                  <input
                    type="text"
                    className="input-field"
                    value={answers[q.key] || ''}
                    onChange={(e) => handleAnswerChange(q.key, e.target.value)}
                    required
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex-row gap-4" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn"
              onClick={() => setStep(1)}
              style={{ flex: 1, padding: '1rem' }}
              disabled={isLoading}
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2, padding: '1rem' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex-row gap-2 justify-center">
                  <div className="pulse-glow" style={{ width: '15px', height: '15px', background: '#fff', borderRadius: '50%' }}></div>
                  Generating AI Plan...
                </div>
              ) : (
                'Generate Personalized Plan'
              )}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
