import csv
import numpy as np
import pickle
import os
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestClassifier

def calculate_metrics(activities, target_days):
    """
    Utility function to calculate the 7 telemetry features from activities list.
    """
    completed_count = sum(1 for a in activities if a['completed'])
    completion_rate = completed_count / len(activities) if activities else 0.0
    
    # Streaks
    current_streak = 0
    for val in reversed(activities):
        if val['completed']:
            current_streak += 1
        else:
            break
            
    longest_streak = 0
    temp_streak = 0
    for val in activities:
        if val['completed']:
            temp_streak += 1
            longest_streak = max(longest_streak, temp_streak)
        else:
            temp_streak = 0
            
    # Consistency Score: std dev of days between logs
    dates = []
    for a in activities:
        try:
            d = datetime.strptime(a['date'], "%Y-%m-%d")
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
        
    # Recovery Score: rate of completions following a failure
    failures = 0
    recoveries = 0
    for i in range(len(activities) - 1):
        if not activities[i]['completed']:
            failures += 1
            if activities[i+1]['completed']:
                recoveries += 1
    if failures > 0:
        recovery_score = recoveries / failures
    else:
        recovery_score = 1.0
        
    # Engagement Score: std dev of logging hours
    hours = []
    for a in activities:
        if a['completed']:
            try:
                h = float(a['time'].split(':')[0]) + float(a['time'].split(':')[1])/60.0
                hours.append(h)
            except:
                pass
    if len(hours) >= 2:
        std_hours = np.std(hours)
        engagement_score = float(np.clip(1.0 - (std_hours / 4.0), 0.0, 1.0))
    else:
        engagement_score = 0.5
        
    return [target_days, current_streak, longest_streak, completion_rate, consistency_score, recovery_score, engagement_score]

def train_model():
    print("Starting 7-feature model training pipeline...")
    
    # Paths
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(backend_dir, "../dataset/Daily_Habit_Tracker.csv")
    model_path = os.path.join(backend_dir, "model.pkl")
    
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return
        
    compliance_scores = []
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                water = float(row['Water_Intake_ml'])
                water_met = 1 if water >= 2000 else 0
                steps = float(row['Steps'])
                steps_met = 1 if steps >= 8000 else 0
                study = float(row['Study_Hours'])
                study_met = 1 if study >= 2.0 else 0
                sleep = float(row['Sleep_Hours'])
                sleep_met = 1 if sleep >= 7.0 else 0
                
                compliance = (water_met + steps_met + study_met + sleep_met) / 4.0
                compliance_scores.append(compliance)
            except:
                continue
                
    print(f"Loaded {len(compliance_scores)} user compliance metrics.")
    
    X = []
    y = []
    
    np.random.seed(42)
    habit_types = [
        ("Water", 7),
        ("Steps", 6),
        ("Study", 5),
        ("Sleep", 7)
    ]
    
    start_date = datetime(2026, 6, 1)
    
    print("Simulating temporal logs and computing metrics...")
    for compliance in compliance_scores:
        for habit_name, target_days in habit_types:
            # Completion probability with noise
            p_complete = np.clip(compliance + np.random.normal(0, 0.08), 0.05, 0.95)
            
            # Base log hour for this simulated user (e.g. 08:00, 14:00, or 20:00)
            base_hour = np.random.choice([8.0, 14.0, 20.0])
            hour_noise_std = np.clip(3.0 * (1.0 - compliance) + 0.2, 0.2, 5.0)
            
            # Simulate 30 days of activities
            activities = []
            for t in range(30):
                completed = np.random.choice([True, False], p=[p_complete, 1 - p_complete])
                date_str = (start_date + timedelta(days=t)).strftime("%Y-%m-%d")
                
                # Hours simulated (with less noise for high-compliance users)
                sim_hour = float(np.clip(base_hour + np.random.normal(0, hour_noise_std), 0.0, 23.9))
                h = int(sim_hour)
                m = int((sim_hour - h) * 60)
                time_str = f"{h:02d}:{m:02d}"
                
                activities.append({
                    "date": date_str,
                    "time": time_str,
                    "completed": completed
                })
                
            # Extract training samples from Day 10 to 29
            for t in range(10, 29):
                sub_history = activities[:t]
                features = calculate_metrics(sub_history, target_days)
                
                # Label is failure on the next day (1 if failed/False, 0 if completed/True)
                label = 1 if not activities[t]['completed'] else 0
                
                X.append(features)
                y.append(label)
                
    X = np.array(X)
    y = np.array(y)
    
    print(f"Generated {len(X)} training samples with 7 features.")
    
    # Train Random Forest Classifier
    clf = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
    clf.fit(X, y)
    
    print("Model training complete.")
    
    # Save the model
    with open(model_path, 'wb') as f:
        pickle.dump(clf, f)
        
    print(f"Saved trained 7-feature model to {model_path}")

if __name__ == "__main__":
    train_model()
