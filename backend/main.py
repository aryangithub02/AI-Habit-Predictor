from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from model import (
    HabitData, 
    PredictionResult, 
    analyze_habit_risk, 
    GoalInput, 
    GoalPlanResult, 
    generate_goal_plan,
    InitialGoalInput,
    GoalAnalysisResult,
    analyze_goal_and_generate_questions,
    DynamicGoalPlanInput,
    generate_dynamic_goal_plan
)

app = FastAPI(title="AI Micro-Habit Failure Predictor API")

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Micro-Habit Failure Predictor API"}

@app.post("/api/predict_failure", response_model=PredictionResult)
def predict_failure(data: HabitData, x_openrouter_key: Optional[str] = Header(None)):
    """
    Endpoint to predict the failure risk of a specific habit based on its data.
    """
    result = analyze_habit_risk(data, api_key=x_openrouter_key)
    return result

@app.post("/api/analyze-goal", response_model=GoalAnalysisResult)
def analyze_goal(data: InitialGoalInput, x_openrouter_key: Optional[str] = Header(None)):
    """
    Endpoint to analyze user's initial goal and return dynamic follow-up questions.
    """
    result = analyze_goal_and_generate_questions(data, api_key=x_openrouter_key)
    return result

@app.post("/api/generate-plan", response_model=GoalPlanResult)
def generate_plan(data: DynamicGoalPlanInput, x_openrouter_key: Optional[str] = Header(None)):
    """
    Endpoint to classify user goal, retrieve domain principles, and generate plan.
    """
    result = generate_dynamic_goal_plan(data, api_key=x_openrouter_key)
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
