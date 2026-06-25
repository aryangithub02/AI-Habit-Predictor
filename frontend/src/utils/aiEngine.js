/**
 * Client-Side AI Engine (AI Habit Predictor)
 * Ported from backend/model.py to enable 100% serverless client-side execution with OpenRouter API support.
 */

export function heuristicClassifyGoal(goal) {
  const g = goal.toLowerCase();
  if (/\b(fat|weight|loss|lose|diet|calorie)\b/i.test(g) || g.includes("fat") || g.includes("weight")) return "Fat Loss";
  if (/\b(muscle|gain|bulk|gym|bodybuilding|strength)\b/i.test(g) || g.includes("muscle")) return "Muscle Gain";
  if (/\b(learn|dsa|code|programming|algorithms|leet|developer|coding|software|engineering|study|exam|gate|course)\b/i.test(g)) return "Learning / DSA";
  if (/\b(job|career|interview|placement|work|resume|recruit|internship)\b/i.test(g)) return "Career";
  if (/\b(sleep|rest|insomnia|bed|circadian|wake)\b/i.test(g)) return "Sleep & Wellness";
  if (/\b(stress|mental|anxiety|mindful|meditate|depression|peace)\b/i.test(g)) return "Mental Health";
  if (/\b(save|finance|money|invest|budget|rich|stock|expense)\b/i.test(g)) return "Finance";
  if (/\b(productive|time|focus|distract|procrastinate|schedule|routine)\b/i.test(g)) return "Productivity";
  return "General Wellness";
}

export const FALLBACK_QUESTIONS = {
  "Fat Loss": [
    { question: "What is your current weight (kg)?", type: "number", key: "current_weight", options: null },
    { question: "What is your height (cm)?", type: "number", key: "height", options: null },
    { question: "How active are you currently?", type: "dropdown", key: "activity_level", options: ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"] },
    { question: "Do you have dietary preferences?", type: "dropdown", key: "diet_preference", options: ["Any", "Vegetarian", "Vegan", "Keto", "Halal", "Kosher"] }
  ],
  "Muscle Gain": [
    { question: "What is your current weight (kg)?", type: "number", key: "current_weight", options: null },
    { question: "What is your height (cm)?", type: "number", key: "height", options: null },
    { question: "How many days per week can you lift weights?", type: "dropdown", key: "lift_days", options: ["2 days", "3 days", "4 days", "5 days", "6 days"] },
    { question: "Do you have access to a gym?", type: "dropdown", key: "gym_access", options: ["Yes", "No, home workouts only"] }
  ],
  "Learning / DSA": [
    { question: "What is your current coding experience level?", type: "dropdown", key: "experience_level", options: ["Beginner (No experience)", "Intermediate (Know syntax)", "Advanced"] },
    { question: "Which programming language do you prefer?", type: "dropdown", key: "coding_language", options: ["Python", "Java", "C++", "JavaScript", "C#"] },
    { question: "What is your target career goal?", type: "text", key: "career_goal", options: null }
  ],
  "Career": [
    { question: "What industry or field are you in?", type: "text", key: "industry", options: null },
    { question: "What is your current experience level?", type: "dropdown", key: "job_level", options: ["Entry Level", "Mid Level", "Senior Level"] },
    { question: "What is your target role/job?", type: "text", key: "target_role", options: null }
  ],
  "Productivity": [
    { question: "What is your biggest daily distraction?", type: "text", key: "distraction", options: null },
    { question: "What is your preferred working style?", type: "dropdown", key: "work_style", options: ["Pomodoro (25/5 min blocks)", "Deep work (90 min blocks)", "Flexible / Task-based"] },
    { question: "What tools do you use for task management?", type: "text", key: "tools", options: null }
  ],
  "Sleep & Wellness": [
    { question: "How many hours of sleep do you currently get?", type: "number", key: "sleep_hours", options: null },
    { question: "Do you feel tired when waking up?", type: "dropdown", key: "sleep_quality", options: ["Always", "Sometimes", "Never"] },
    { question: "Do you have a consistent sleeping schedule?", type: "dropdown", key: "schedule_consistency", options: ["Yes, same time daily", "No, varies dynamic", "Shift worker"] }
  ],
  "Mental Health": [
    { question: "What is your primary stress source?", type: "text", key: "stress_source", options: null },
    { question: "How do you currently unwind?", type: "text", key: "relaxation_method", options: null },
    { question: "How much time can you spend daily on meditation?", type: "dropdown", key: "mindfulness_time", options: ["5 minutes", "10 minutes", "20 minutes", "More than 20 mins"] }
  ],
  "Finance": [
    { question: "What is your primary financial objective?", type: "dropdown", key: "financial_goal", options: ["Save money", "Invest more", "Pay off debt", "Budgeting"] },
    { question: "What is your current monthly savings rate?", type: "dropdown", key: "savings_rate", options: ["< 10%", "10% - 25%", "25% - 50%", "> 50%"] },
    { question: "Do you track expenses?", type: "dropdown", key: "track_expenses", options: ["Yes, daily", "Yes, monthly", "No"] }
  ],
  "General Wellness": [
    { question: "What is your primary challenge with this goal?", type: "text", key: "primary_challenge", options: null },
    { question: "What is your current experience level with this goal?", type: "dropdown", key: "goal_experience", options: ["Beginner", "Intermediate", "Advanced"] }
  ]
};

export function generateFallbackPlan(goal, category) {
  let objective = `Accomplish your goal: ${goal}`;
  let metrics = ["Maintain consistency score above 80%", "Log habits at least 5 times per week"];
  let habits = [
    { name: "Drink 2L Water", description: "Stay hydrated to maintain metabolic function and energy levels.", target_days_per_week: 7, difficulty: "Easy", priority_score: 8.0, tasks: ["Morning (500ml)", "Afternoon (500ml)", "Evening (500ml)", "Night (500ml)"] },
    { name: "Daily Active Walk", description: "30 minutes of physical activity to boost baseline NEAT.", target_days_per_week: 7, difficulty: "Easy", priority_score: 7.5, tasks: ["Morning walk (15 mins)", "Evening walk (15 mins)"] }
  ];
  let nutrition = [];
  let exercise = ["Dedicate 30-45 minutes per day to physical activity.", "Perform standard resistance or cardiorespiratory exercises."];
  let recovery = ["Prioritize 7-8 hours of quality sleep.", "Include regular stretching and rest days."];

  if (category === "Fat Loss") {
    objective = `Achieve sustainable weight reduction and fat loss: ${goal}`;
    metrics = ["Lose 0.5kg to 1kg per week safely", "Log daily food intake consistently"];
    habits = [
      { name: "Track Daily Calories", description: "Log all meals to stay within target calorie deficit.", target_days_per_week: 7, difficulty: "Easy", priority_score: 9.0, tasks: ["Log Breakfast", "Log Lunch", "Log Dinner"] },
      { name: "Daily Active Walk", description: "30 minutes of brisk walking to increase daily calorie burn.", target_days_per_week: 7, difficulty: "Easy", priority_score: 8.0, tasks: ["Morning walk (15 mins)", "Evening walk (15 mins)"] },
      { name: "Eat Adequate Protein", description: "Consume high-quality lean protein sources with main meals.", target_days_per_week: 7, difficulty: "Medium", priority_score: 8.5, tasks: ["Adequate protein at Breakfast", "Adequate protein at Lunch", "Adequate protein at Dinner"] }
    ];
    nutrition = ["Maintain a calorie deficit of 300-500 kcal daily.", "Focus on eating high-fiber vegetables and lean proteins."];
    exercise = ["Perform 3-4 strength training sessions weekly.", "Aim for 8,000 to 10,000 daily steps."];
    recovery = ["Prioritize 7-8 hours of quality sleep daily.", "Stay hydrated with 2-3 liters of water."];
  } else if (category === "Muscle Gain") {
    objective = `Build lean muscle mass and increase strength: ${goal}`;
    metrics = ["Gradually increase lifted weights weekly", "Consume target daily protein goals"];
    habits = [
      { name: "Weight Lifting Session", description: "Complete planned progressive resistance training.", target_days_per_week: 4, difficulty: "Hard", priority_score: 9.5, tasks: ["Warm up stretch", "Complete compound lifts", "Record sets & reps"] },
      { name: "High Protein Meal", description: "Consume high protein sources to support muscle protein synthesis.", target_days_per_week: 7, difficulty: "Easy", priority_score: 9.0, tasks: ["Consume high protein sources (lean meats, tofu, or whey)"] },
      { name: "Track Workout Weights", description: "Record sets, reps, and weights to monitor progression.", target_days_per_week: 4, difficulty: "Easy", priority_score: 8.0, tasks: ["Open logger app", "Record weights/reps of today's sets"] }
    ];
    nutrition = ["Maintain a slight calorie surplus of 200-300 kcal daily.", "Ensure adequate protein intake of 1.6g to 2.2g per kg of bodyweight."];
    exercise = ["Perform compound lifting exercises (squats, bench, deadlifts).", "Train each muscle group 1.5-2 times per week."];
    recovery = ["Prioritize 8 hours of sleep for optimal recovery.", "Include at least 2 full rest days per week."];
  } else if (category === "Learning / DSA") {
    objective = `Master course content, algorithms, and concepts: ${goal}`;
    metrics = ["Solve 5 practice problems weekly", "Study core theoretical concepts daily"];
    habits = [
      { name: "Solve 1 Practice Problem", description: "Code and submit one algorithm or practice problem.", target_days_per_week: 5, difficulty: "Hard", priority_score: 9.5, tasks: ["Understand problem statement", "Write dry run and pseudo-code", "Code & submit solution"] },
      { name: "Review Concept Tutorial", description: "Spend 20 minutes studying data structures or theoretical concepts.", target_days_per_week: 5, difficulty: "Medium", priority_score: 9.0, tasks: ["Watch study video or read article", "Take short summary notes"] },
      { name: "Code 30 Minutes", description: "Spend active time writing code on projects or exercises.", target_days_per_week: 6, difficulty: "Medium", priority_score: 8.5, tasks: ["Open IDE", "Code on project/exercises for 30 mins"] }
    ];
    nutrition = [];
    exercise = ["Take regular active breaks (e.g. stretch, stand) after sitting for long periods.", "Incorporate light physical exercises to clear the mind."];
    recovery = ["Prioritize 7-8 hours of sleep for memory consolidation.", "Schedule structured relaxation time to prevent mental burnout."];
  } else if (category === "Career") {
    objective = `Advance career opportunities and professional skills: ${goal}`;
    metrics = ["Submit 3 job applications weekly", "Learn 1 career-relevant skill weekly"];
    habits = [
      { name: "Apply to 1 Job/Role", description: "Research openings and submit one tailored application.", target_days_per_week: 5, difficulty: "Medium", priority_score: 9.0, tasks: ["Tailor resume for role", "Submit application", "Log application in tracker"] },
      { name: "Network on LinkedIn", description: "Connect with professionals or write a professional post.", target_days_per_week: 3, difficulty: "Medium", priority_score: 7.5, tasks: ["Send 1 connection request with note", "Engage with 2 industry posts"] },
      { name: "Skill Development (45m)", description: "Spend time studying industry-relevant tools, languages, or skills.", target_days_per_week: 5, difficulty: "Medium", priority_score: 9.5, tasks: ["Study tutorial or read docs", "Practice new concepts in code"] }
    ];
    nutrition = [];
    exercise = ["Maintain good posture during long study/work sessions.", "Walk outdoors to clear thoughts and build confidence."];
    recovery = ["Maintain clear boundaries between work search and relaxation.", "Sleep well before interviews and networking sessions."];
  } else if (category === "Productivity") {
    objective = `Improve daily focus, task execution, and time management: ${goal}`;
    metrics = ["Complete top 3 daily priorities", "Reduce daily screen time or distractions by 20%"];
    habits = [
      { name: "Daily Task Planning", description: "Write down top 3 priority tasks first thing in the morning.", target_days_per_week: 7, difficulty: "Easy", priority_score: 9.0, tasks: ["Write top 3 priority tasks", "Review today's schedule"] },
      { name: "Deep Work Block (90m)", description: "Work on your highest priority task with all notifications muted.", target_days_per_week: 5, difficulty: "Hard", priority_score: 9.5, tasks: ["Mute all notifications", "Focus on top priority for 90 mins"] },
      { name: "Declutter Workspace", description: "Spend 5 minutes organizing physical desk at end of day.", target_days_per_week: 7, difficulty: "Easy", priority_score: 7.0, tasks: ["Clear desk of cups/paper", "Wipe down keyboard/mouse"] }
    ];
    nutrition = [];
    exercise = ["Take short walks to reset attention span between deep work blocks."];
    recovery = ["Mute all work notifications after standard working hours.", "Practice deep breathing or short meditation between major tasks."];
  } else if (category === "Sleep & Wellness") {
    objective = `Optimize sleep quality, circadian rhythm, and morning energy: ${goal}`;
    metrics = ["Wake up within 30 minutes of target time daily", "Log 7.5+ hours of sleep nightly"];
    habits = [
      { name: "Screens Off 1hr Before Bed", description: "Avoid blue light to allow melatonin production.", target_days_per_week: 7, difficulty: "Medium", priority_score: 9.5, tasks: ["Put phone away/charge in other room", "Wind-down without screens"] },
      { name: "Consistent Wake Time", description: "Wake up at the same time every morning, including weekends.", target_days_per_week: 7, difficulty: "Hard", priority_score: 9.0, tasks: ["Get out of bed at alarm time", "Get morning sunlight exposure"] },
      { name: "Wind-down Routine (15m)", description: "Read, journal, or stretch instead of browsing phone before sleep.", target_days_per_week: 7, difficulty: "Easy", priority_score: 8.5, tasks: ["15-minute screen-free activity (reading/stretching)"] }
    ];
    nutrition = ["Avoid caffeine, heavy meals, and alcohol 4-6 hours before bedtime."];
    exercise = ["Engage in moderate physical exercise during daylight hours to promote deep sleep."];
    recovery = ["Make sure your bedroom is cool, dark, and completely quiet.", "Get natural morning sunlight exposure within 30 minutes of waking."];
  } else if (category === "Mental Health") {
    objective = `Reduce daily anxiety, build resilience, and improve mood: ${goal}`;
    metrics = ["Complete daily mindfulness session", "Track emotional well-being twice daily"];
    habits = [
      { name: "Mindful Meditation (10m)", description: "Practice breathwork or guided meditation to calm nervous system.", target_days_per_week: 7, difficulty: "Easy", priority_score: 9.5, tasks: ["Find quiet space", "Complete 10-minute meditation session"] },
      { name: "Gratitude Journaling", description: "Write down 3 specific things you are thankful for today.", target_days_per_week: 7, difficulty: "Easy", priority_score: 8.0, tasks: ["Write down 3 things you are thankful for today"] },
      { name: "No Social Media First Hour", description: "Avoid doomscrolling first thing in the morning.", target_days_per_week: 7, difficulty: "Medium", priority_score: 8.5, tasks: ["Avoid opening social media apps for the first hour of the day"] }
    ];
    nutrition = [];
    exercise = ["Engage in rhythmic movement (walking, swimming, yoga) to regulate stress hormones."];
    recovery = ["Dedicate phone-free time to connect with family, friends, or hobbies.", "Practice progressive muscle relaxation (PMR) before sleep."];
  } else if (category === "Finance") {
    objective = `Achieve budget compliance, save money, and invest wisely: ${goal}`;
    metrics = ["Maintain savings rate above target percentage", "Zero impulsive/non-budget purchases"];
    habits = [
      { name: "Log Daily Expenses", description: "Record every single expense in budgeting sheet or app.", target_days_per_week: 7, difficulty: "Easy", priority_score: 9.5, tasks: ["Record today's transactions in sheet/app", "Assess budget compliance"] },
      { name: "No Non-Essential Spend", description: "Check budget before buying any non-essential items.", target_days_per_week: 6, difficulty: "Medium", priority_score: 8.5, tasks: ["Verify necessity before purchase", "Check weekly budget limit"] },
      { name: "Review Weekly Budget", description: "Assess total spending against weekly limit and adjust.", target_days_per_week: 1, difficulty: "Easy", priority_score: 9.0, tasks: ["Total up weekly spending", "Adjust budget categories for next week"] }
    ];
    nutrition = ["Consider packing lunch or preparing meals at home to save on dining costs."];
    exercise = ["Use home workouts, active outdoor walks, or free local parks for fitness."];
    recovery = ["Proactively address financial stress to protect sleep quality."];
  }

  return {
    objective,
    category,
    success_metrics: metrics,
    recommended_habits: habits,
    nutrition_guidelines: nutrition,
    exercise_guidelines: exercise,
    recovery_guidelines: recovery
  };
}

export async function analyzeGoalAndGenerateQuestions(goalData) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const hasKey = apiKey && apiKey !== "your-api-key-here" && apiKey.trim() !== "";
  
  const category = heuristicClassifyGoal(goalData.goal);
  const fallbackQuestions = FALLBACK_QUESTIONS[category] || FALLBACK_QUESTIONS["General Wellness"];

  if (!hasKey) {
    return {
      goal_category: category,
      confidence: 0.85,
      questions: fallbackQuestions
    };
  }

  const prompt = `You are a concise behavior analyst. Based on the user's initial goal details:
- Goal: ${goalData.goal}
- Timeline: ${goalData.timeline}
- Daily time: ${goalData.time_available_per_day}
- Difficulty preference: ${goalData.difficulty_preference}
- Restrictions: ${goalData.restrictions || 'None'}

Your task:
1. Classify the goal into one of these categories: Fat Loss, Muscle Gain, Learning / DSA, Career, Productivity, Sleep & Wellness, Mental Health, Finance, General Wellness.
2. Generate **1 to 2** short, clear follow‑up questions to collect any missing essential information. Each question should be a single sentence, with a simple type (number, text, or dropdown) and minimal options if needed.
For **dropdown** questions, provide an "options" array containing at least two relevant choices.
Return a JSON object exactly matching this schema:
{
    "goal_category": "Category",
    "confidence": 0.95,
    "questions": [
        {"question": "...", "type": "text|number|dropdown", "options": ["opt1", "opt2"] || null, "key": "simpleKey"}
    ]
}
Only output the raw JSON, no extra text.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "liquid/lfm-2.5-1.2b-instruct:free",
        messages: [
          { role: "system", content: "You are an AI that outputs pure JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (response.ok) {
      const result = await response.json();
      const text = result.choices[0].message.content;
      const data = JSON.parse(text);
      return {
        goal_category: data.goal_category || category,
        confidence: data.confidence || 0.9,
        questions: data.questions || fallbackQuestions
      };
    }
  } catch (e) {
    console.error("OpenRouter API call failed, falling back to heuristics:", e);
  }

  return {
    goal_category: category,
    confidence: 0.85,
    questions: fallbackQuestions
  };
}

export async function generateGoalPlan(goalData, category, answers) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const hasKey = apiKey && apiKey !== "your-api-key-here" && apiKey.trim() !== "";
  
  const fallbackPlan = generateFallbackPlan(goalData.goal, category);
  
  if (!hasKey) {
    return fallbackPlan;
  }

  const answersFormatted = Object.entries(answers)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const prompt = `You are an expert performance coach and planner.
Generate a completely personalized action plan for the user based on their goal, category, profile answers, and domain principles.

User Goal: ${goalData.goal}
Goal Category: ${category}
Timeline: ${goalData.timeline}
Daily Availability: ${goalData.time_available_per_day}
Plan Intensity Preference: ${goalData.difficulty_preference}
Restrictions/Limitations: ${goalData.restrictions || 'None'}

User Follow-Up Answers:
${answersFormatted}

Provide a JSON response matching exactly this schema:
{
    "objective": "A specific, measurable overall objective (1 string)",
    "success_metrics": ["metric 1", "metric 2"],
    "recommended_habits": [
        {
            "name": "Habit Name (short, 2-4 words)",
            "description": "Specific guideline matching availability",
            "target_days_per_week": 5,
            "difficulty": "Easy" | "Medium" | "Hard",
            "priority_score": 8.5,
            "tasks": ["custom daily sub-task 1", "custom daily sub-task 2"]
        }
    ],
    "nutrition_guidelines": ["nutrition tip 1", "nutrition tip 2"],
    "exercise_guidelines": ["exercise tip 1", "exercise tip 2"],
    "recovery_guidelines": ["recovery tip 1", "recovery tip 2"]
}

For each recommended habit, include a "tasks" array containing 2 to 4 specific, actionable daily sub-tasks (checklist items) that must be checked off to complete that habit.

Return ONLY the raw JSON object, no markdown blocks, no other text.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "liquid/lfm-2.5-1.2b-instruct:free",
        messages: [
          { role: "system", content: "You are an AI that outputs pure JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (response.ok) {
      const result = await response.json();
      const text = result.choices[0].message.content;
      return JSON.parse(text);
    }
  } catch (e) {
    console.error("OpenRouter API call failed for plan generation, falling back:", e);
  }

  return fallbackPlan;
}

export async function analyzeHabitRisk(habit) {
  const target_days = habit.target_days_per_week;
  const current_streak = habit.current_streak;
  const longest_streak = habit.longest_streak;

  const activities = habit.activities || [];
  const completed_count = activities.filter(a => a.completed).length;
  const completion_rate = activities.length > 0 ? completed_count / activities.length : 0.0;

  // 1. Consistency Score
  let consistency_score = 0.5;
  const dates = [];
  activities.forEach(a => {
    try {
      const d = new Date(a.date);
      if (!isNaN(d.getTime())) {
        dates.push(d);
      }
    } catch (e) {}
  });
  dates.sort((a, b) => a - b);

  if (dates.length >= 3) {
    const intervals = [];
    for (let i = 1; i < dates.length; i++) {
      const diffTime = Math.abs(dates[i] - dates[i-1]);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      intervals.push(diffDays);
    }
    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const sqDiff = intervals.map(val => Math.pow(val - mean, 2));
    const variance = sqDiff.reduce((sum, val) => sum + val, 0) / intervals.length;
    const std = Math.sqrt(variance);
    consistency_score = Math.max(0.0, Math.min(1.0, 1.0 - (std / 7.0)));
  }

  // 2. Recovery Score
  let failures = 0;
  let recoveries = 0;
  for (let i = 0; i < activities.length - 1; i++) {
    if (!activities[i].completed) {
      failures++;
      if (activities[i+1].completed) {
        recoveries++;
      }
    }
  }
  const recovery_score = failures > 0 ? recoveries / failures : 1.0;

  // 3. Engagement Score
  let engagement_score = 0.5;
  const hours = [];
  activities.forEach(a => {
    if (a.completed && a.time) {
      try {
        const parts = a.time.split(':');
        const h = parseFloat(parts[0]) + parseFloat(parts[1]) / 60.0;
        hours.push(h);
      } catch (e) {}
    }
  });

  if (hours.length >= 2) {
    const mean = hours.reduce((sum, val) => sum + val, 0) / hours.length;
    const sqDiff = hours.map(val => Math.pow(val - mean, 2));
    const variance = sqDiff.reduce((sum, val) => sum + val, 0) / hours.length;
    const std_hours = Math.sqrt(variance);
    engagement_score = Math.max(0.0, Math.min(1.0, 1.0 - (std_hours / 4.0)));
  }

  // 4. Heuristic Failure Probability calculation (simulating RandomForest)
  let failure_probability = 0.3;
  if (target_days > 4) failure_probability += 0.15;
  
  if (activities.length > 0) {
    failure_probability += (1.0 - completion_rate) * 0.4;
  } else {
    failure_probability += 0.1;
  }

  if (current_streak === 0) {
    failure_probability += 0.2;
  } else if (current_streak > 5) {
    failure_probability -= 0.15;
  }

  if (recovery_score < 0.5) {
    failure_probability += 0.15;
  }

  failure_probability = Math.max(0.05, Math.min(0.95, failure_probability));

  let risk_score = "Low";
  if (failure_probability >= 0.65) {
    risk_score = "High";
  } else if (failure_probability >= 0.35) {
    risk_score = "Medium";
  }

  let insights = [];
  let interventions = [];

  if (risk_score === "Low") {
    insights = ["Looking good! Your consistency is solid and your streak is active."];
    interventions = ["Maintain your current schedule and timing to keep the habit locked in."];
  } else if (risk_score === "Medium") {
    insights = [`Minor consistency drops detected. (Consistency: ${consistency_score.toFixed(2)}, Recovery: ${recovery_score.toFixed(2)})`];
    interventions = ["Try to set a fixed reminder or anchor this habit to another daily routine."];
  } else {
    insights = ["High failure risk predicted due to streak lapse or weekly compliance drops."];
    interventions = ["Simplify the habit today. Perform a micro-version of it to keep the momentum going."];
  }

  // 5. OpenRouter Integration
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const hasKey = apiKey && apiKey !== "your-api-key-here" && apiKey.trim() !== "";

  if (hasKey) {
    const prompt = `You are an expert behavioral psychologist and AI Habit Predictor. 
Analyze the following habit telemetry and provide personalized behavioral insights and interventions.

Habit Name: ${habit.name}
Target: ${habit.target_days_per_week} days per week
Current Streak: ${habit.current_streak} days
Longest Streak: ${habit.longest_streak} days
Calculated Telemetry Features:
- Completion Rate: ${completion_rate.toFixed(2)}
- Consistency Score: ${consistency_score.toFixed(2)}
- Recovery Score: ${recovery_score.toFixed(2)}
- Engagement Score: ${engagement_score.toFixed(2)}

Calculated Failure Probability (from model): ${failure_probability.toFixed(2)} (${risk_score} Risk)

Based on this data, provide a JSON response containing exactly these fields:
{
    "insights": ["insight 1", "insight 2"],
    "interventions": ["actionable intervention 1", "actionable intervention 2"]
}

Return ONLY the raw JSON object, no markdown blocks, no other text.`;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "liquid/lfm-2.5-1.2b-instruct:free",
          messages: [
            { role: "system", content: "You are an AI that outputs pure JSON." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.choices[0].message.content;
        const aiData = JSON.parse(text);
        return {
          risk_score,
          failure_probability,
          insights: aiData.insights || insights,
          interventions: aiData.interventions || interventions
        };
      }
    } catch (e) {
      console.error("OpenRouter API call failed for risk analysis, using heuristics:", e);
    }
  }

  return {
    risk_score,
    failure_probability,
    insights,
    interventions
  };
}
