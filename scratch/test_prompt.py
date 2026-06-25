import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import json
# Ensure project root is in sys.path
sys.path.append(os.path.abspath('.'))
from backend.model import InitialGoalInput, analyze_goal_and_generate_questions

data = InitialGoalInput(
    goal="Run a marathon",
    timeline="3 months",
    time_available_per_day="30",
    difficulty_preference="Medium",
    restrictions=None
)

result = analyze_goal_and_generate_questions(data)
print(result)
