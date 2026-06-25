from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
import json
import pickle
import numpy as np
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from the .env file in the same directory as this file
backend_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(backend_dir, ".env")
load_dotenv(dotenv_path)

# Load the pre-trained scikit-learn model
model_path = os.path.join(backend_dir, "model.pkl")
ml_model = None
if os.path.exists(model_path):
    try:
        with open(model_path, 'rb') as f:
            ml_model = pickle.load(f)
        print("Pre-trained ML model loaded successfully from model.pkl")
    except Exception as e:
        print(f"Error loading ML model from model.pkl: {e}")
else:
    print("Warning: model.pkl not found. Run train.py first.")

# --- Habit Predictor Schemas ---
class HabitActivity(BaseModel):
    date: str
    time: str
    completed: bool

class HabitData(BaseModel):
    name: str
    target_days_per_week: int
    current_streak: int
    longest_streak: int
    activities: List[HabitActivity]

class PredictionResult(BaseModel):
    risk_score: str # "Low", "Medium", "High"
    failure_probability: float # 0.0 to 1.0
    insights: List[str]
    interventions: List[str]

# --- Onboarding & Planner Schemas ---
class UserProfile(BaseModel):
    age: int
    gender: str
    height: float
    weight: float
    activity_level: str
    experience_level: str
    available_time_per_day: int
    diet_preference: str
    medical_restrictions: List[str]
    target_timeline: str

class GoalInput(BaseModel):
    goal: str
    profile: UserProfile

class InitialGoalInput(BaseModel):
    goal: str
    timeline: str
    time_available_per_day: str
    difficulty_preference: str
    restrictions: Optional[str] = ""

class FollowUpQuestion(BaseModel):
    question: str
    type: str  # "number", "text", "dropdown"
    options: Optional[List[str]] = None
    key: str

class GoalAnalysisResult(BaseModel):
    goal_category: str
    confidence: float
    questions: List[FollowUpQuestion]

class DynamicGoalPlanInput(BaseModel):
    initial_input: InitialGoalInput
    goal_category: str
    answers: dict

class PersonalizedHabit(BaseModel):
    name: str
    description: str
    target_days_per_week: int
    difficulty: str
    priority_score: float
    tasks: Optional[List[str]] = []

class GoalPlanResult(BaseModel):
    objective: str
    category: str
    success_metrics: List[str]
    recommended_habits: List[PersonalizedHabit]
    nutrition_guidelines: List[str]
    exercise_guidelines: List[str]
    recovery_guidelines: List[str]

# --- API Functions ---

def analyze_habit_risk(data: HabitData, api_key: Optional[str] = None) -> PredictionResult:
    """
    Predicts the likelihood of a user failing a habit using a local ML model
    and generates behavioral insights using an LLM.
    """
    # 1. Extract baseline features for ML model
    target_days = data.target_days_per_week
    current_streak = data.current_streak
    longest_streak = data.longest_streak
    
    if data.activities:
        completed_count = sum(1 for a in data.activities if a.completed)
        completion_rate = completed_count / len(data.activities)
    else:
        completion_rate = 0.0
        
    # 2. Compute the 3 new advanced behavioral metrics dynamically
    # Consistency Score: regularity of logs
    dates = []
    for a in data.activities:
        try:
            d = datetime.strptime(a.date, "%Y-%m-%d")
            dates.append(d)
        except:
            pass
    dates = sorted(dates)
    
    if len(dates) >= 3:
        intervals = [(dates[i] - dates[i-1]).days for i in range(1, len(dates))]
        std = np.std(intervals)
        consistency_score = float(np.clip(1.0 - (std / 7.0), 0.0, 1.0))
    else:
        consistency_score = 0.5
        
    # Recovery Score: rate of recovery immediately following a missed day
    failures = 0
    recoveries = 0
    for i in range(len(data.activities) - 1):
        if not data.activities[i].completed:
            failures += 1
            if data.activities[i+1].completed:
                recoveries += 1
    if failures > 0:
        recovery_score = recoveries / failures
    else:
        recovery_score = 1.0 # No failures means perfect recovery/no abandonment signs
        
    # Engagement Score: consistency of logging hours
    hours = []
    for a in data.activities:
        if a.completed:
            try:
                h = float(a.time.split(':')[0]) + float(a.time.split(':')[1])/60.0
                hours.append(h)
            except:
                pass
    if len(hours) >= 2:
        std_hours = np.std(hours)
        engagement_score = float(np.clip(1.0 - (std_hours / 4.0), 0.0, 1.0))
    else:
        engagement_score = 0.5

    # 3. Predict failure probability using our 7-feature Random Forest model
    failure_probability = 0.5 # Default fallback
    if ml_model is not None:
        try:
            # Features: [target_days, current_streak, longest_streak, completion_rate, consistency_score, recovery_score, engagement_score]
            features = np.array([[target_days, current_streak, longest_streak, completion_rate, consistency_score, recovery_score, engagement_score]])
            probs = ml_model.predict_proba(features)
            failure_probability = float(probs[0][1]) # Probability of failure (class 1)
        except Exception as e:
            print(f"ML prediction failed: {e}")
            failure_probability = 0.5 if target_days > 4 else 0.3
    else:
        # Heuristic fallback if ML model is missing
        failure_probability = 0.5 if target_days > 4 else 0.3

    # Calculate risk score classification
    if failure_probability < 0.35:
        risk_score = "Low"
    elif failure_probability < 0.65:
        risk_score = "Medium"
    else:
        risk_score = "High"

    # 4. Check for API key to generate LLM insights
    effective_key = api_key or os.getenv("OPENROUTER_API_KEY")
    if not effective_key or effective_key.strip() in ["", "your-key-here", "dummy-key"]:
        if risk_score == "Low":
            insights = ["Looking good! Your consistency is solid and your streak is active."]
            interventions = ["Maintain your current schedule and timing to keep the habit locked in."]
        elif risk_score == "Medium":
            insights = [f"Minor consistency drops detected. (Consistency: {consistency_score:.2f}, Recovery: {recovery_score:.2f})"]
            interventions = ["Try to set a fixed reminder or anchor this habit to another daily routine."]
        else:
            insights = ["High failure risk predicted due to streak lapse or low weekly target compliance."]
            interventions = ["Simplify the habit today. Perform a micro-version of it to keep the momentum going."]
            
        return PredictionResult(
            risk_score=risk_score,
            failure_probability=failure_probability,
            insights=insights,
            interventions=interventions
        )

    # 5. Use LLM to generate explanatory behavioral insights
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=effective_key,
    )

    prompt = f"""
You are an expert behavioral psychologist and AI Habit Predictor. 
Analyze the following habit telemetry and provide personalized behavioral insights and interventions.

Habit Name: {data.name}
Target: {data.target_days_per_week} days per week
Current Streak: {data.current_streak} days
Longest Streak: {data.longest_streak} days
Calculated Telemetry Features:
- Completion Rate: {completion_rate:.2f}
- Consistency Score: {consistency_score:.2f}
- Recovery Score: {recovery_score:.2f}
- Engagement Score: {engagement_score:.2f}

Calculated Failure Probability (from our RandomForest model): {failure_probability:.2f} ({risk_score} Risk)

Based on this data, provide a JSON response containing exactly these fields:
{{
    "insights": ["insight 1", "insight 2"],
    "interventions": ["actionable intervention 1", "actionable intervention 2"]
}}

Return ONLY the raw JSON object, no markdown blocks, no other text.
"""
    try:
        completion = client.chat.completions.create(
            model="liquid/lfm-2.5-1.2b-instruct:free",
            messages=[
                {"role": "system", "content": "You are an AI that outputs pure JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=120,
            temperature=0.3
        )

        response_text = completion.choices[0].message.content
        result_dict = json.loads(response_text)
        
        return PredictionResult(
            risk_score=risk_score,
            failure_probability=failure_probability,
            insights=result_dict.get("insights", ["No insights generated."]),
            interventions=result_dict.get("interventions", ["Keep trying!"])
        )
    except Exception as e:
        print(f"Error calling LLM: {e}")
        # Rule-based fallback if API call fails
        if risk_score == "Low":
            insights = ["Consistency is solid. Your streak is active."]
            interventions = ["Maintain your current schedule to keep the habit locked."]
        elif risk_score == "Medium":
            insights = ["Moderate consistency drops detected."]
            interventions = ["Set a daily alarm or reminder to build momentum."]
        else:
            insights = ["High failure risk predicted by the ML model."]
            interventions = ["Do a smaller version of the habit today to prevent streak loss."]
            
        return PredictionResult(
            risk_score=risk_score,
            failure_probability=failure_probability,
            insights=insights,
            interventions=interventions
        )


def heuristic_classify_goal(goal: str) -> str:
    g = goal.lower()
    if any(k in g for k in ["fat", "weight", "loss", "lose", "diet", "calorie"]):
        return "Fat Loss"
    if any(k in g for k in ["muscle", "gain", "bulk", "gym", "bodybuilding", "strength"]):
        return "Muscle Gain"
    if any(k in g for k in ["learn", "dsa", "code", "programming", "algorithms", "leet", "developer", "coding", "software", "engineering", "study", "exam", "gate", "course"]):
        return "Learning / DSA"
    if any(k in g for k in ["job", "career", "interview", "placement", "work", "resume", "recruit", "internship"]):
        return "Career"
    if any(k in g for k in ["sleep", "rest", "insomnia", "bed", "circadian", "wake"]):
        return "Sleep & Wellness"
    if any(k in g for k in ["stress", "mental", "anxiety", "mindful", "meditate", "depression", "peace"]):
        return "Mental Health"
    if any(k in g for k in ["save", "finance", "money", "invest", "budget", "rich", "stock", "expense"]):
        return "Finance"
    if any(k in g for k in ["productive", "time", "focus", "distract", "procrastinate", "schedule", "routine"]):
        return "Productivity"
    return "General Wellness"

FALLBACK_QUESTIONS = {
    "Fat Loss": [
        {"question": "What is your current weight (kg)?", "type": "number", "key": "current_weight", "options": None},
        {"question": "What is your height (cm)?", "type": "number", "key": "height", "options": None},
        {"question": "How active are you currently?", "type": "dropdown", "key": "activity_level", "options": ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"]},
        {"question": "Do you have dietary preferences?", "type": "dropdown", "key": "diet_preference", "options": ["Any", "Vegetarian", "Vegan", "Keto", "Halal", "Kosher"]}
    ],
    "Muscle Gain": [
        {"question": "What is your current weight (kg)?", "type": "number", "key": "current_weight", "options": None},
        {"question": "What is your height (cm)?", "type": "number", "key": "height", "options": None},
        {"question": "How many days per week can you lift weights?", "type": "dropdown", "key": "lift_days", "options": ["2 days", "3 days", "4 days", "5 days", "6 days"]},
        {"question": "Do you have access to a gym?", "type": "dropdown", "key": "gym_access", "options": ["Yes", "No, home workouts only"]}
    ],
    "Learning / DSA": [
        {"question": "What is your current coding experience level?", "type": "dropdown", "key": "experience_level", "options": ["Beginner (No experience)", "Intermediate (Know syntax)", "Advanced"]},
        {"question": "Which programming language do you prefer?", "type": "dropdown", "key": "coding_language", "options": ["Python", "Java", "C++", "JavaScript", "C#"]},
        {"question": "What is your target career goal?", "type": "text", "key": "career_goal", "options": None}
    ],
    "Career": [
        {"question": "What industry or field are you in?", "type": "text", "key": "industry", "options": None},
        {"question": "What is your current experience level?", "type": "dropdown", "key": "job_level", "options": ["Entry Level", "Mid Level", "Senior Level"]},
        {"question": "What is your target role/job?", "type": "text", "key": "target_role", "options": None}
    ],
    "Productivity": [
        {"question": "What is your biggest daily distraction?", "type": "text", "key": "distraction", "options": None},
        {"question": "What is your preferred working style?", "type": "dropdown", "key": "work_style", "options": ["Pomodoro (25/5 min blocks)", "Deep work (90 min blocks)", "Flexible / Task-based"]},
        {"question": "What tools do you use for task management?", "type": "text", "key": "tools", "options": None}
    ],
    "Sleep & Wellness": [
        {"question": "How many hours of sleep do you currently get?", "type": "number", "key": "sleep_hours", "options": None},
        {"question": "Do you feel tired when waking up?", "type": "dropdown", "key": "sleep_quality", "options": ["Always", "Sometimes", "Never"]},
        {"question": "Do you have a consistent sleeping schedule?", "type": "dropdown", "key": "schedule_consistency", "options": ["Yes, same time daily", "No, varies dynamic", "Shift worker"]}
    ],
    "Mental Health": [
        {"question": "What is your primary stress source?", "type": "text", "key": "stress_source", "options": None},
        {"question": "How do you currently unwind?", "type": "text", "key": "relaxation_method", "options": None},
        {"question": "How much time can you spend daily on meditation?", "type": "dropdown", "key": "mindfulness_time", "options": ["5 minutes", "10 minutes", "20 minutes", "More than 20 mins"]}
    ],
    "Finance": [
        {"question": "What is your primary financial objective?", "type": "dropdown", "key": "financial_goal", "options": ["Save money", "Invest more", "Pay off debt", "Budgeting"]},
        {"question": "What is your current monthly savings rate?", "type": "dropdown", "key": "savings_rate", "options": ["< 10%", "10% - 25%", "25% - 50%", "> 50%"]},
        {"question": "Do you track expenses?", "type": "dropdown", "key": "track_expenses", "options": ["Yes, daily", "Yes, monthly", "No"]}
    ],
    "General Wellness": [
        {"question": "What is your primary challenge with this goal?", "type": "text", "key": "primary_challenge", "options": None},
        {"question": "What is your current experience level with this goal?", "type": "dropdown", "key": "goal_experience", "options": ["Beginner", "Intermediate", "Advanced"]}
    ]
}

def analyze_goal_and_generate_questions(data: InitialGoalInput, api_key: Optional[str] = None) -> GoalAnalysisResult:
    """
    Analyzes the initial goal input, classifies it, and generates dynamic follow-up questions.
    """
    category = heuristic_classify_goal(data.goal)
    
    effective_key = api_key or os.getenv("OPENROUTER_API_KEY")
    client = None
    if effective_key and effective_key.strip() not in ["", "your-key-here", "dummy-key"]:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=effective_key
        )
        
    fallback_questions = [
        FollowUpQuestion(
            question=q["question"],
            type=q["type"],
            options=q.get("options"),
            key=q["key"]
        ) for q in FALLBACK_QUESTIONS.get(category, FALLBACK_QUESTIONS["General Wellness"])
    ]
    
    if not client:
        return GoalAnalysisResult(
            goal_category=category,
            confidence=0.85,
            questions=fallback_questions
        )
        
    prompt = f"""
You are a concise behavior analyst. Based on the user's initial goal details:
- Goal: {data.goal}
- Timeline: {data.timeline}
- Daily time: {data.time_available_per_day}
- Difficulty preference: {data.difficulty_preference}
- Restrictions: {data.restrictions or 'None'}

Your task:
1. Classify the goal into one of these categories: Fat Loss, Muscle Gain, Learning / DSA, Career, Productivity, Sleep & Wellness, Mental Health, Finance, General Wellness.
2. Generate **1 to 2** short, clear follow‑up questions to collect any missing essential information. Each question should be a single sentence, with a simple type (number, text, or dropdown) and minimal options if needed.
For **dropdown** questions, provide an "options" array containing at least two relevant choices.
Return a JSON object exactly matching this schema:
{{
    "goal_category": "Category",
    "confidence": float,
    "questions": [
        {{"question": "...", "type": "text|number|dropdown", "options": ["opt1", "opt2"] or null, "key": "simpleKey"}}
    ]
}}
Only output the raw JSON, no extra text.
"""

    try:
        completion = client.chat.completions.create(
            model="liquid/lfm-2.5-1.2b-instruct:free",
            messages=[
                {"role": "system", "content": "You are an AI that outputs pure JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=400,
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        response_text = completion.choices[0].message.content
        result_dict = json.loads(response_text)
        
        questions = []
        for idx, q in enumerate(result_dict.get("questions", [])):
            options = q.get("options")
            # Ensure a unique key for each question; fallback to generated key if missing or duplicate
            key = q.get("key") or f"q{idx}"
            questions.append(FollowUpQuestion(
                question=q.get("question", "Question?"),
                type=q.get("type", "text"),
                options=options,
                key=key
            ))
            
        return GoalAnalysisResult(
            goal_category=result_dict.get("goal_category", category),
            confidence=float(result_dict.get("confidence", 0.90)),
            questions=questions
        )
    except Exception as e:
        print(f"Error calling LLM for question generation: {e}")
        return GoalAnalysisResult(
            goal_category=category,
            confidence=0.80,
            questions=fallback_questions
        )

def generate_fallback_plan(category: str, goal: str) -> GoalPlanResult:
    """
    Generates a high-quality domain-specific fallback plan when the LLM is unavailable.
    """
    # Default fallback content
    objective = f"Accomplish your goal: {goal}"
    metrics = ["Maintain consistency score above 80%", "Log habits at least 5 times per week"]
    habits = [
        PersonalizedHabit(name="Drink 2L Water", description="Stay hydrated to maintain metabolic function and energy levels.", target_days_per_week=7, difficulty="Easy", priority_score=8.0, tasks=["Morning (500ml)", "Afternoon (500ml)", "Evening (500ml)", "Night (500ml)"]),
        PersonalizedHabit(name="Daily Active Walk", description="30 minutes of physical activity to boost baseline NEAT.", target_days_per_week=7, difficulty="Easy", priority_score=7.5, tasks=["Morning walk (15 mins)", "Evening walk (15 mins)"])
    ]
    nutrition = []
    exercise = ["Dedicate 30-45 minutes per day to physical activity.", "Perform standard resistance or cardiorespiratory exercises."]
    recovery = ["Prioritize 7-8 hours of quality sleep.", "Include regular stretching and rest days."]

    if category == "Fat Loss":
        objective = f"Achieve sustainable weight reduction and fat loss: {goal}"
        metrics = ["Lose 0.5kg to 1kg per week safely", "Log daily food intake consistently"]
        habits = [
            PersonalizedHabit(name="Track Daily Calories", description="Log all meals to stay within target calorie deficit.", target_days_per_week=7, difficulty="Easy", priority_score=9.0, tasks=["Log Breakfast", "Log Lunch", "Log Dinner"]),
            PersonalizedHabit(name="Daily Active Walk", description="30 minutes of brisk walking to increase daily calorie burn.", target_days_per_week=7, difficulty="Easy", priority_score=8.0, tasks=["Morning walk (15 mins)", "Evening walk (15 mins)"]),
            PersonalizedHabit(name="Eat 100g Protein", description="Consume high-quality lean protein sources with main meals.", target_days_per_week=7, difficulty="Medium", priority_score=8.5, tasks=["30g protein at Breakfast", "30g protein at Lunch", "40g protein at Dinner"])
        ]
        nutrition = ["Maintain a calorie deficit of 300-500 kcal daily.", "Focus on eating high-fiber vegetables and lean proteins."]
        exercise = ["Perform 3-4 strength training sessions weekly.", "Aim for 8,000 to 10,000 daily steps."]
        recovery = ["Prioritize 7-8 hours of quality sleep daily.", "Stay hydrated with 2-3 liters of water."]
        
    elif category == "Muscle Gain":
        objective = f"Build lean muscle mass and increase strength: {goal}"
        metrics = ["Gradually increase lifted weights weekly", "Consume target daily protein goals"]
        habits = [
            PersonalizedHabit(name="Weight Lifting Session", description="Complete planned progressive resistance training.", target_days_per_week=4, difficulty="Hard", priority_score=9.5, tasks=["Warm up stretch", "Complete compound lifts", "Record sets & reps"]),
            PersonalizedHabit(name="High Protein Meal", description="Consume high protein sources to support muscle protein synthesis.", target_days_per_week=7, difficulty="Easy", priority_score=9.0, tasks=["Consume high protein sources (lean meats, tofu, or whey)"]),
            PersonalizedHabit(name="Track Workout Weights", description="Record sets, reps, and weights to monitor progression.", target_days_per_week=4, difficulty="Easy", priority_score=8.0, tasks=["Open logger app", "Record weights/reps of today's sets"])
        ]
        nutrition = ["Maintain a slight calorie surplus of 200-300 kcal daily.", "Ensure adequate protein intake of 1.6g to 2.2g per kg of bodyweight."]
        exercise = ["Perform compound lifting exercises (squats, bench, deadlifts).", "Train each muscle group 1.5-2 times per week."]
        recovery = ["Prioritize 8 hours of sleep for optimal recovery.", "Include at least 2 full rest days per week."]

    elif category == "Learning / DSA":
        objective = f"Master course content, algorithms, and concepts: {goal}"
        metrics = ["Solve 5 practice problems weekly", "Study core theoretical concepts daily"]
        habits = [
            PersonalizedHabit(name="Solve 1 Practice Problem", description="Code and submit one algorithm or practice problem.", target_days_per_week=5, difficulty="Hard", priority_score=9.5, tasks=["Understand problem statement", "Write dry run and pseudo-code", "Code & submit solution"]),
            PersonalizedHabit(name="Review Concept Tutorial", description="Spend 20 minutes studying data structures or theoretical concepts.", target_days_per_week=5, difficulty="Medium", priority_score=9.0, tasks=["Watch study video or read article", "Take short summary notes"]),
            PersonalizedHabit(name="Code 30 Minutes", description="Spend active time writing code on projects or exercises.", target_days_per_week=6, difficulty="Medium", priority_score=8.5, tasks=["Open IDE", "Code on project/exercises for 30 mins"])
        ]
        nutrition = []
        exercise = ["Take regular active breaks (e.g. stretch, stand) after sitting for long periods.", "Incorporate light physical exercises to clear the mind."]
        recovery = ["Prioritize 7-8 hours of sleep for memory consolidation.", "Schedule structured relaxation time to prevent mental burnout."]

    elif category == "Career":
        objective = f"Advance career opportunities and professional skills: {goal}"
        metrics = ["Submit 3 job applications weekly", "Learn 1 career-relevant skill weekly"]
        habits = [
            PersonalizedHabit(name="Apply to 1 Job/Role", description="Research openings and submit one tailored application.", target_days_per_week=5, difficulty="Medium", priority_score=9.0, tasks=["Tailor resume for role", "Submit application", "Log application in tracker"]),
            PersonalizedHabit(name="Network on LinkedIn", description="Connect with professionals or write a professional post.", target_days_per_week=3, difficulty="Medium", priority_score=7.5, tasks=["Send 1 connection request with note", "Engage with 2 industry posts"]),
            PersonalizedHabit(name="Skill Development (45m)", description="Spend time studying industry-relevant tools, languages, or skills.", target_days_per_week=5, difficulty="Medium", priority_score=9.5, tasks=["Study tutorial or read docs", "Practice new concepts in code"])
        ]
        nutrition = []
        exercise = ["Maintain good posture during long study/work sessions.", "Walk outdoors to clear thoughts and build confidence."]
        recovery = ["Maintain clear boundaries between work search and relaxation.", "Sleep well before interviews and networking sessions."]

    elif category == "Productivity":
        objective = f"Improve daily focus, task execution, and time management: {goal}"
        metrics = ["Complete top 3 daily priorities", "Reduce daily screen time or distractions by 20%"]
        habits = [
            PersonalizedHabit(name="Daily Task Planning", description="Write down top 3 priority tasks first thing in the morning.", target_days_per_week=7, difficulty="Easy", priority_score=9.0, tasks=["Write top 3 priority tasks", "Review today's schedule"]),
            PersonalizedHabit(name="Deep Work Block (90m)", description="Work on your highest priority task with all notifications muted.", target_days_per_week=5, difficulty="Hard", priority_score=9.5, tasks=["Mute all notifications", "Focus on top priority for 90 mins"]),
            PersonalizedHabit(name="Declutter Workspace", description="Spend 5 minutes organizing physical desk at end of day.", target_days_per_week=7, difficulty="Easy", priority_score=7.0, tasks=["Clear desk of cups/paper", "Wipe down keyboard/mouse"])
        ]
        nutrition = []
        exercise = ["Take short walks to reset attention span between deep work blocks."]
        recovery = ["Mute all work notifications after standard working hours.", "Practice deep breathing or short meditation between major tasks."]

    elif category == "Sleep & Wellness":
        objective = f"Optimize sleep quality, circadian rhythm, and morning energy: {goal}"
        metrics = ["Wake up within 30 minutes of target time daily", "Log 7.5+ hours of sleep nightly"]
        habits = [
            PersonalizedHabit(name="Screens Off 1hr Before Bed", description="Avoid blue light to allow melatonin production.", target_days_per_week=7, difficulty="Medium", priority_score=9.5, tasks=["Put phone away/charge in other room", "Wind-down without screens"]),
            PersonalizedHabit(name="Consistent Wake Time", description="Wake up at the same time every morning, including weekends.", target_days_per_week=7, difficulty="Hard", priority_score=9.0, tasks=["Get out of bed at alarm time", "Get morning sunlight exposure"]),
            PersonalizedHabit(name="Wind-down Routine (15m)", description="Read, journal, or stretch instead of browsing phone before sleep.", target_days_per_week=7, difficulty="Easy", priority_score=8.5, tasks=["15-minute screen-free activity (reading/stretching)"])
        ]
        nutrition = ["Avoid caffeine, heavy meals, and alcohol 4-6 hours before bedtime."]
        exercise = ["Engage in moderate physical exercise during daylight hours to promote deep sleep."]
        recovery = ["Make sure your bedroom is cool, dark, and completely quiet.", "Get natural morning sunlight exposure within 30 minutes of waking."]

    elif category == "Mental Health":
        objective = f"Reduce daily anxiety, build resilience, and improve mood: {goal}"
        metrics = ["Complete daily mindfulness session", "Track emotional well-being twice daily"]
        habits = [
            PersonalizedHabit(name="Mindful Meditation (10m)", description="Practice breathwork or guided meditation to calm nervous system.", target_days_per_week=7, difficulty="Easy", priority_score=9.5, tasks=["Find quiet space", "Complete 10-minute meditation session"]),
            PersonalizedHabit(name="Gratitude Journaling", description="Write down 3 specific things you are thankful for today.", target_days_per_week=7, difficulty="Easy", priority_score=8.0, tasks=["Write down 3 things you are thankful for today"]),
            PersonalizedHabit(name="No Social Media First Hour", description="Avoid doomscrolling first thing in the morning.", target_days_per_week=7, difficulty="Medium", priority_score=8.5, tasks=["Avoid opening social media apps for the first hour of the day"])
        ]
        nutrition = []
        exercise = ["Engage in rhythmic movement (walking, swimming, yoga) to regulate stress hormones."]
        recovery = ["Dedicate phone-free time to connect with family, friends, or hobbies.", "Practice progressive muscle relaxation (PMR) before sleep."]

    elif category == "Finance":
        objective = f"Achieve budget compliance, save money, and invest wisely: {goal}"
        metrics = ["Maintain savings rate above target percentage", "Zero impulsive/non-budget purchases"]
        habits = [
            PersonalizedHabit(name="Log Daily Expenses", description="Record every single expense in budgeting sheet or app.", target_days_per_week=7, difficulty="Easy", priority_score=9.5, tasks=["Record today's transactions in sheet/app", "Assess budget compliance"]),
            PersonalizedHabit(name="No Non-Essential Spend", description="Check budget before buying any non-essential items.", target_days_per_week=6, difficulty="Medium", priority_score=8.5, tasks=["Verify necessity before purchase", "Check weekly budget limit"]),
            PersonalizedHabit(name="Review Weekly Budget", description="Assess total spending against weekly limit and adjust.", target_days_per_week=1, difficulty="Easy", priority_score=9.0, tasks=["Total up weekly spending", "Adjust budget categories for next week"])
        ]
        nutrition = ["Consider packing lunch or preparing meals at home to save on dining costs."]
        exercise = ["Use home workouts, active outdoor walks, or free local parks for fitness."]
        recovery = ["Proactively address financial stress to protect sleep quality."]

    return GoalPlanResult(
        objective=objective,
        category=category,
        success_metrics=metrics,
        recommended_habits=habits,
        nutrition_guidelines=nutrition,
        exercise_guidelines=exercise,
        recovery_guidelines=recovery
    )

def generate_dynamic_goal_plan(input_data: DynamicGoalPlanInput, api_key: Optional[str] = None) -> GoalPlanResult:
    """
    Generates a personalized plan with recommended habits, nutrition, exercise, and recovery guidelines
    based on initial input, category, and answers.
    """
    category = input_data.goal_category
    effective_key = api_key or os.getenv("OPENROUTER_API_KEY")
    client = None
    if effective_key and effective_key.strip() not in ["", "your-key-here", "dummy-key"]:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=effective_key
        )
        
    fallback_plan = generate_fallback_plan(category, input_data.initial_input.goal)

    if not client:
        return fallback_plan

    principles = []
    kb_path = os.path.join(backend_dir, "knowledge_base.json")
    if os.path.exists(kb_path):
        try:
            with open(kb_path, 'r', encoding='utf-8') as f:
                kb = json.load(f)
                principles = kb.get(category, {}).get("principles", [])
        except Exception as e:
            print(f"Failed to read knowledge base: {e}")
            
    if not principles:
        principles = [
            "Maintain a consistent schedule.",
            "Start with small, achievable targets.",
            "Iterate and adjust weekly."
        ]

    init = input_data.initial_input
    answers_formatted = "\n".join([f"- {k}: {v}" for k, v in input_data.answers.items()])
    
    generate_prompt = f"""
You are an expert performance coach and planner.
Generate a completely personalized action plan for the user based on their goal, category, profile answers, and domain principles.

User Goal: {init.goal}
Goal Category: {category}
Timeline: {init.timeline}
Daily Availability: {init.time_available_per_day}
Plan Intensity Preference: {init.difficulty_preference}
Restrictions/Limitations: {init.restrictions or 'None'}

User Follow-Up Answers:
{answers_formatted}

Domain Scientific Principles:
{chr(10).join(['- ' + p for p in principles])}

Provide a JSON response matching exactly this schema:
{{
    "objective": "A specific, measurable overall objective (1 string)",
    "success_metrics": ["metric 1", "metric 2"],
    "recommended_habits": [
        {{
            "name": "Habit Name (short, 2-4 words)",
            "description": "Specific guideline matching availability",
            "target_days_per_week": int (1-7),
            "difficulty": "Easy" | "Medium" | "Hard",
            "priority_score": float (1.0 to 10.0),
            "tasks": ["custom daily sub-task 1", "custom daily sub-task 2"]
        }}
    ],
    "nutrition_guidelines": ["nutrition tip 1", "nutrition tip 2"],
    "exercise_guidelines": ["exercise tip 1", "exercise tip 2"],
    "recovery_guidelines": ["recovery tip 1", "recovery tip 2"]
}}

For each recommended habit, include a "tasks" array containing 2 to 4 specific, actionable daily sub-tasks (checklist items) that must be checked off to complete that habit.

Return ONLY the raw JSON object, no markdown blocks, no other text.
"""
    try:
        completion = client.chat.completions.create(
            model="liquid/lfm-2.5-1.2b-instruct:free",
            messages=[
                {"role": "system", "content": "You are an AI that outputs pure JSON."},
                {"role": "user", "content": generate_prompt}
            ],
            max_tokens=800,
            temperature=0.3
        )
        response_text = completion.choices[0].message.content
        result_dict = json.loads(response_text)
        
        habits = []
        for h in result_dict.get("recommended_habits", []):
            habits.append(PersonalizedHabit(
                name=h.get("name", "Habit"),
                description=h.get("description", ""),
                target_days_per_week=int(h.get("target_days_per_week", 5)),
                difficulty=h.get("difficulty", "Medium"),
                priority_score=float(h.get("priority_score", 5.0)),
                tasks=h.get("tasks", [])
            ))
            
        return GoalPlanResult(
            objective=result_dict.get("objective", f"Achieve: {init.goal}"),
            category=category,
            success_metrics=result_dict.get("success_metrics", ["Track consistency daily"]),
            recommended_habits=habits,
            nutrition_guidelines=result_dict.get("nutrition_guidelines", []),
            exercise_guidelines=result_dict.get("exercise_guidelines", ["Engage in physical activity"]),
            recovery_guidelines=result_dict.get("recovery_guidelines", ["Get enough sleep"])
        )
    except Exception as e:
        print(f"Error generating plan: {e}")
        return fallback_plan

def generate_goal_plan(input_data: GoalInput) -> GoalPlanResult:
    # Legacy wrapper converting GoalInput into DynamicGoalPlanInput
    initial_input = InitialGoalInput(
        goal=input_data.goal,
        timeline=input_data.profile.target_timeline,
        time_available_per_day=f"{input_data.profile.available_time_per_day} Minutes",
        difficulty_preference="Balanced",
        restrictions=",".join(input_data.profile.medical_restrictions)
    )
    category = heuristic_classify_goal(input_data.goal)
    answers = {
        "age": input_data.profile.age,
        "gender": input_data.profile.gender,
        "height": input_data.profile.height,
        "weight": input_data.profile.weight,
        "activity_level": input_data.profile.activity_level,
        "experience_level": input_data.profile.experience_level,
        "diet_preference": input_data.profile.diet_preference
    }
    dynamic_input = DynamicGoalPlanInput(
        initial_input=initial_input,
        goal_category=category,
        answers=answers
    )
    return generate_dynamic_goal_plan(dynamic_input)
