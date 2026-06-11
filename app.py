import streamlit as st
import os
import sys
import json
from datetime import datetime

# Add backend directory to path to load models and dependencies
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(backend_dir, "backend"))

from model import (
    HabitData, 
    HabitActivity, 
    analyze_habit_risk, 
    UserProfile, 
    GoalInput, 
    generate_goal_plan,
    InitialGoalInput,
    DynamicGoalPlanInput,
    analyze_goal_and_generate_questions,
    generate_dynamic_goal_plan
)

# --- Persistence ---
HABITS_FILE = os.path.join(backend_dir, "backend", "habits.json")
GOAL_PLANS_FILE = os.path.join(backend_dir, "backend", "goal_plans.json")
GOAL_PLAN_FILE = os.path.join(backend_dir, "backend", "goal_plan.json")

def load_habits():
    if os.path.exists(HABITS_FILE):
        try:
            with open(HABITS_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            st.error(f"Error loading habits: {e}")
    return []

def save_habits(habits):
    try:
        with open(HABITS_FILE, 'w') as f:
            json.dump(habits, f, indent=4)
    except Exception as e:
        st.error(f"Error saving habits: {e}")

def load_goal_plans():
    if os.path.exists(GOAL_PLANS_FILE):
        try:
            with open(GOAL_PLANS_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            pass
    if os.path.exists(GOAL_PLAN_FILE):
        try:
            with open(GOAL_PLAN_FILE, 'r') as f:
                single = json.load(f)
                if single:
                    single['status'] = 'Active'
                    return [single]
        except Exception as e:
            pass
    return []

def save_goal_plans(plans):
    try:
        with open(GOAL_PLANS_FILE, 'w') as f:
            json.dump(plans, f, indent=4)
    except Exception as e:
        st.error(f"Error saving goal plans: {e}")

def is_diet_plan_applicable(plan) -> bool:
    if not plan:
        return False
    category = plan.get('category', '').lower()
    objective = plan.get('objective', '').lower()
    return (
        'fat' in category or 
        'weight' in category or 
        'fat loss' in objective or 
        'weight loss' in objective or 
        'weight gain' in objective or 
        'lose weight' in objective or 
        'gain weight' in objective or 
        'lose fat' in objective
    )

def is_diet_plan_applicable_to_any(plans) -> bool:
    for plan in plans:
        if plan.get('status', 'Active') == 'Active':
            if is_diet_plan_applicable(plan):
                return True
    return False

# --- Initialize Session State ---
if 'habits' not in st.session_state:
    st.session_state.habits = load_habits()

if 'goal_plans' not in st.session_state:
    st.session_state.goal_plans = load_goal_plans()

if 'goal_plan' not in st.session_state:
    st.session_state.goal_plan = None

if 'onboarding_step' not in st.session_state:
    st.session_state.onboarding_step = 1

if 'view' not in st.session_state:
    if st.session_state.goal_plans and st.session_state.habits:
        st.session_state.view = 'DASHBOARD'
    elif st.session_state.goal_plan:
        st.session_state.view = 'PLAN_REVIEW'
    else:
        st.session_state.view = 'ONBOARDING'

# --- Page Setup ---
st.set_page_config(
    page_title="HabitGuard AI – Growth Platform",
    page_icon="🛡️",
    layout="wide"
)

# Custom Styling (Dark Glassmorphic Theme)
st.markdown("""
<style>
    .main {
        background-color: #0a0a0f;
        color: #ffffff;
    }
    .stApp {
        background-image: 
            radial-gradient(circle at 15% 50%, rgba(99, 102, 241, 0.12), transparent 25%),
            radial-gradient(circle at 85% 30%, rgba(168, 85, 247, 0.12), transparent 25%);
        background-attachment: fixed;
    }
    h1 {
        background: linear-gradient(135deg, #ffffff, #c7d2fe);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 700;
        margin-bottom: 0.5rem;
    }
    .glass-card {
        background: rgba(30, 30, 45, 0.45);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 15px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    .badge-low {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.3);
        padding: 3px 10px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.8rem;
    }
    .badge-medium {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
        border: 1px solid rgba(245, 158, 11, 0.3);
        padding: 3px 10px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.8rem;
    }
    .badge-high {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
        padding: 3px 10px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.8rem;
    }
</style>
""", unsafe_allowed_html=True)

# --- App Layout Router ---

if st.session_state.view == 'ONBOARDING':
    if st.session_state.onboarding_step == 1:
        col_hdr, _ = st.columns([3, 1])
        with col_hdr:
            st.title("🛡️ Define Your Goal")
            st.caption("Our AI will analyze your goal and create a personalized behavioral plan tailored to your situation.")
        
        st.write("")
        
        with st.form("onboarding_form_step1", clear_on_submit=False):
            goal = st.text_input("What goal do you want to achieve?", placeholder="e.g. Lose 10kg, Learn algorithms, Prepare for marathon, Build muscle, Crack GATE")
            
            col1, col2 = st.columns(2)
            with col1:
                timeline = st.selectbox("Target Timeline", ["1 Month", "3 Months", "6 Months", "12 Months", "More Than 1 Year"], index=1)
                available_time = st.selectbox("Time Available Per Day", ["15 Minutes", "30 Minutes", "45 Minutes", "1 Hour", "2 Hours", "More Than 2 Hours"], index=2)
            with col2:
                difficulty = st.selectbox("Preferred Plan Intensity", ["Easy & Sustainable", "Balanced", "Aggressive"], index=1)
                restrictions = st.text_input("Restrictions / Limitations (Optional)", placeholder="e.g. No gym access, Knee injury, Vegetarian, Full-time student")
                
            st.write("")
            if st.session_state.goal_plans:
                col_sub, col_cancel = st.columns([3, 1])
                with col_sub:
                    submitted = st.form_submit_button("Analyze Goal & Generate Questions", type="primary", use_container_width=True)
                with col_cancel:
                    cancel_clicked = st.form_submit_button("Cancel & Return", use_container_width=True)
                    if cancel_clicked:
                        st.session_state.view = 'DASHBOARD'
                        st.rerun()
            else:
                submitted = st.form_submit_button("Analyze Goal & Generate Questions", type="primary")
                cancel_clicked = False
            
            if submitted:
                if not goal.strip():
                    st.error("Please enter a valid goal description.")
                else:
                    with st.spinner("Analyzing goal category and generating follow-up questions..."):
                        try:
                            initial_input = InitialGoalInput(
                                goal=goal.strip(),
                                timeline=timeline,
                                time_available_per_day=available_time,
                                difficulty_preference=difficulty,
                                restrictions=restrictions.strip()
                            )
                            result = analyze_goal_and_generate_questions(initial_input)
                            st.session_state.goal_analysis = {
                                "goal_category": result.goal_category,
                                "questions": [
                                    {
                                        "question": q.question,
                                        "type": q.type,
                                        "options": q.options,
                                        "key": q.key
                                    } for q in result.questions
                                ],
                                "initial_input": {
                                    "goal": goal.strip(),
                                    "timeline": timeline,
                                    "time_available_per_day": available_time,
                                    "difficulty_preference": difficulty,
                                    "restrictions": restrictions.strip()
                                }
                            }
                            st.session_state.onboarding_step = 2
                            st.rerun()
                        except Exception as e:
                            st.error(f"Error analyzing goal: {e}. Check if backend or API keys are set.")
                            
    elif st.session_state.onboarding_step == 2:
        analysis = st.session_state.goal_analysis
        st.title("📋 Profile Completion")
        st.caption(f"Goal Category: {analysis['goal_category']} – Tell us a bit more so we can build a perfect, personalized routine.")
        st.write("")
        
        with st.form("onboarding_form_step2", clear_on_submit=False):
            answers = {}
            for q in analysis['questions']:
                q_key = q['key']
                q_label = q['question']
                q_type = q['type']
                
                if q_type == 'dropdown':
                    options = q.get('options') or ["Yes", "No"]
                    answers[q_key] = st.selectbox(q_label, options, key=f"ans_{q_key}")
                elif q_type == 'number':
                    answers[q_key] = st.number_input(q_label, value=0.0, key=f"ans_{q_key}")
                else:
                    answers[q_key] = st.text_input(q_label, value="", key=f"ans_{q_key}")
                    
            st.write("")
            col_back, col_submit = st.columns([1, 3])
            with col_back:
                back_clicked = st.form_submit_button("⬅️ Back")
                if back_clicked:
                    st.session_state.onboarding_step = 1
                    st.rerun()
            with col_submit:
                submit_plan = st.form_submit_button("Generate Personalized Plan ✅", type="primary")
                if submit_plan:
                    with st.spinner("Generating personalized AI habit plan..."):
                        try:
                            # Format for generating plan
                            initial_input = InitialGoalInput(
                                goal=analysis['initial_input']['goal'],
                                timeline=analysis['initial_input']['timeline'],
                                time_available_per_day=analysis['initial_input']['time_available_per_day'],
                                difficulty_preference=analysis['initial_input']['difficulty_preference'],
                                restrictions=analysis['initial_input']['restrictions']
                            )
                            dynamic_input = DynamicGoalPlanInput(
                                initial_input=initial_input,
                                goal_category=analysis['goal_category'],
                                answers=answers
                            )
                            plan = generate_dynamic_goal_plan(dynamic_input)
                            
                            plan_dict = {
                                "objective": plan.objective,
                                "category": plan.category,
                                "success_metrics": plan.success_metrics,
                                "nutrition_guidelines": plan.nutrition_guidelines,
                                "exercise_guidelines": plan.exercise_guidelines,
                                "recovery_guidelines": plan.recovery_guidelines,
                                "recommended_habits": [
                                    {
                                        "name": h.name,
                                        "description": h.description,
                                        "target_days_per_week": h.target_days_per_week,
                                        "difficulty": h.difficulty,
                                        "priority_score": h.priority_score
                                    } for h in plan.recommended_habits
                                ]
                            }
                            st.session_state.goal_plan = plan_dict
                            save_goal_plan(plan_dict)
                            st.session_state.view = 'PLAN_REVIEW'
                            st.rerun()
                        except Exception as e:
                            st.error(f"Error generating plan: {e}")

elif st.session_state.view == 'PLAN_REVIEW':
    st.title("📋 Review Your AI Growth Plan")
    st.caption("Customize and activate the recommended daily routines generated by our AI behavioral architect.")
    st.write("")
    
    plan = st.session_state.goal_plan
    
    # Overview
    col_obj, col_met = st.columns(2)
    with col_obj:
        st.markdown(f"""
        <div class="glass-card" style="min-height: 140px;">
            <h4 style="margin-top:0; color:#818cf8;">🎯 Objective</h4>
            <p style="font-size:1.1rem; font-weight:500;">{plan['objective']}</p>
        </div>
        """, unsafe_allowed_html=True)
    with col_met:
        metrics_li = "".join([f"<li style='margin-bottom:4px; font-size:0.95rem;'>{m}</li>" for m in plan['success_metrics']])
        st.markdown(f"""
        <div class="glass-card" style="min-height: 140px;">
            <h4 style="margin-top:0; color:#a78bfa;">📈 Success Metrics</h4>
            <ul style="padding-left:20px; margin:0;">{metrics_li}</ul>
        </div>
        """, unsafe_allowed_html=True)
        
    # Domain Guidelines
    st.markdown("### 🔬 Scientific Domain Directives")
    if is_diet_plan_applicable(plan):
        col_nut, col_exe, col_rec = st.columns(3)
        with col_nut:
            st.markdown("#### 🥗 Nutrition Guidelines")
            for n in plan.get('nutrition_guidelines', []):
                st.markdown(f"- {n}")
        with col_exe:
            st.markdown("#### 🏋️ Exercise Protocols")
            for e in plan.get('exercise_guidelines', []):
                st.markdown(f"- {e}")
        with col_rec:
            st.markdown("#### 💤 Recovery & Lifestyle")
            for r in plan.get('recovery_guidelines', []):
                st.markdown(f"- {r}")
    else:
        col_exe, col_rec = st.columns(2)
        with col_exe:
            st.markdown("#### 🏋️ Exercise Protocols")
            for e in plan.get('exercise_guidelines', []):
                st.markdown(f"- {e}")
        with col_rec:
            st.markdown("#### 💤 Recovery & Lifestyle")
            for r in plan.get('recovery_guidelines', []):
                st.markdown(f"- {r}")
            
    st.write("")
    st.divider()
    st.write("")
    
    # Habits Selector
    st.markdown("### 🤖 Recommended Daily Habits")
    st.info("Check/uncheck habits to include in your tracking list.")
    
    selected_indices = []
    for idx, h in enumerate(plan['recommended_habits']):
        col_chk, col_det, col_freq = st.columns([1, 8, 2])
        with col_chk:
            is_chk = st.checkbox("", value=True, key=f"sel_habit_{idx}")
            if is_chk:
                selected_indices.append(idx)
        with col_det:
            st.markdown(f"**{h['name']}** — *{h['difficulty']}* (Priority: {h['priority_score']:.1f})")
            st.markdown(f"_{h['description']}_")
        with col_freq:
            st.markdown(f"**Target:** {h['target_days_per_week']} days / week")
        st.write("")
        
    st.write("")
    if st.session_state.goal_plans:
        col_back, col_cancel, col_act = st.columns([1, 1, 2])
        with col_back:
            if st.button("⬅️ Back to Goal Input", key="back_onboarding_rev", use_container_width=True):
                st.session_state.view = 'ONBOARDING'
                st.rerun()
        with col_cancel:
            if st.button("Cancel & Return", key="cancel_review_rev", use_container_width=True):
                st.session_state.goal_plan = None
                st.session_state.view = 'DASHBOARD'
                st.rerun()
        with col_act:
            activate_clicked = st.button("Activate Growth Plan & Habits ✅", type="primary", key="activate_plan_rev", use_container_width=True)
    else:
        col_back, col_act = st.columns([1, 3])
        with col_back:
            if st.button("⬅️ Back to Goal Input", key="back_onboarding_rev", use_container_width=True):
                st.session_state.view = 'ONBOARDING'
                st.rerun()
        col_act_val = col_act
        with col_act_val:
            activate_clicked = st.button("Activate Growth Plan & Habits ✅", type="primary", key="activate_plan_rev", use_container_width=True)

    if activate_clicked:
        activated = list(st.session_state.habits)
        existing_names = {h['name'].lower() for h in activated}
        for i in selected_indices:
            rh = plan['recommended_habits'][i]
            if rh['name'].lower() not in existing_names:
                activated.append({
                    "name": rh['name'],
                    "target_days_per_week": int(rh['target_days_per_week']),
                    "current_streak": 0,
                    "longest_streak": 0,
                    "activities": []
                })
        st.session_state.habits = activated
        save_habits(st.session_state.habits)
        
        # Save plan to list of plans
        if not any(p['objective'].lower() == plan['objective'].lower() for p in st.session_state.goal_plans):
            plan_with_status = {**plan, "status": "Active"}
            st.session_state.goal_plans.append(plan_with_status)
            save_goal_plans(st.session_state.goal_plans)
        
        st.session_state.goal_plan = None
        st.session_state.view = 'DASHBOARD'
        st.rerun()

elif st.session_state.view == 'DASHBOARD':
    active_plans = [p for p in st.session_state.goal_plans if p.get('status', 'Active') == 'Active']
    completed_plans = [p for p in st.session_state.goal_plans if p.get('status') == 'Completed']

    # Display active plans
    for idx, plan in enumerate(active_plans):
        col_plan_det, col_plan_btn = st.columns([4, 1])
        with col_plan_det:
            st.markdown(f"""
            <div style="background: linear-gradient(135deg, rgba(30, 30, 45, 0.8), rgba(99, 102, 241, 0.1)); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 15px; padding: 1.2rem; margin-bottom: 0.5rem;">
                <span style="font-size: 0.75rem; color: #a855f7; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Active Goal Plan</span>
                <h3 style="margin: 0.2rem 0; color: #fff; font-size: 1.25rem;">🎯 {plan['objective']}</h3>
                <p style="margin: 0.4rem 0 0 0; font-size: 0.85rem; color: #a0a0b0;"><strong>Metrics:</strong> {' • '.join(plan['success_metrics'])}</p>
            </div>
            """, unsafe_allowed_html=True)
        with col_plan_btn:
            st.write("")
            st.write("")
            if st.button("Complete Goal 🏆", key=f"complete_goal_{idx}", use_container_width=True):
                plan['status'] = 'Completed'
                save_goal_plans(st.session_state.goal_plans)
                
                # Remove habits associated with this goal
                habits_to_remove = {h['name'].lower() for h in plan.get('recommended_habits', [])}
                st.session_state.habits = [h for h in st.session_state.habits if h['name'].lower() not in habits_to_remove]
                save_habits(st.session_state.habits)
                
                st.success(f"Goal completed and habits removed: {plan['objective']}!")
                st.rerun()

    # Sidebar actions
    with st.sidebar:
        st.header("✨ Manage Habits")
        
        with st.form("sidebar_add_habit", clear_on_submit=True):
            st.subheader("➕ Create Habit")
            side_name = st.text_input("Habit Name", placeholder="e.g. Drink water, Code...")
            side_target = st.slider("Weekly Frequency", min_value=1, max_value=7, value=5)
            side_sub = st.form_submit_button("Add Custom Habit", type="primary")
            
            if side_sub and side_name.strip():
                if any(h['name'].lower() == side_name.strip().lower() for h in st.session_state.habits):
                    st.error("Duplicate habit name.")
                else:
                    st.session_state.habits.append({
                        "name": side_name.strip(),
                        "target_days_per_week": int(side_target),
                        "current_streak": 0,
                        "longest_streak": 0,
                        "activities": []
                    })
                    save_habits(st.session_state.habits)
                    st.success("Custom habit added!")
                    st.rerun()
                    
        st.divider()
        if active_plans:
            st.subheader("✏️ Edit Goal Plan")
            if len(active_plans) > 1:
                edit_idx = st.selectbox(
                    "Select Plan to Edit",
                    options=range(len(active_plans)),
                    format_func=lambda i: active_plans[i]['objective'][:40] + "..." if len(active_plans[i]['objective']) > 40 else active_plans[i]['objective']
                )
            else:
                edit_idx = 0
            
            selected_plan_to_edit = active_plans[edit_idx]
            
            with st.form("sidebar_edit_goal", clear_on_submit=False):
                edit_objective = st.text_input("Objective", value=selected_plan_to_edit.get('objective', ''))
                edit_metrics = st.text_area("Success Metrics (one per line)", value="\n".join(selected_plan_to_edit.get('success_metrics', [])))
                
                # Conditionally show Nutrition Guidelines in edit form
                edit_nutrition = ""
                if is_diet_plan_applicable(selected_plan_to_edit):
                    edit_nutrition = st.text_area("Nutrition Guidelines (one per line)", value="\n".join(selected_plan_to_edit.get('nutrition_guidelines', [])))
                    
                edit_exercise = st.text_area("Exercise Protocols (one per line)", value="\n".join(selected_plan_to_edit.get('exercise_guidelines', [])))
                edit_recovery = st.text_area("Recovery Guidelines (one per line)", value="\n".join(selected_plan_to_edit.get('recovery_guidelines', [])))
                
                save_clicked = st.form_submit_button("Save Goal Plan", type="primary")
                if save_clicked:
                    selected_plan_to_edit['objective'] = edit_objective.strip()
                    selected_plan_to_edit['success_metrics'] = [line.strip() for line in edit_metrics.split("\n") if line.strip()]
                    if is_diet_plan_applicable(selected_plan_to_edit):
                        selected_plan_to_edit['nutrition_guidelines'] = [line.strip() for line in edit_nutrition.split("\n") if line.strip()]
                    else:
                        selected_plan_to_edit['nutrition_guidelines'] = []
                    selected_plan_to_edit['exercise_guidelines'] = [line.strip() for line in edit_exercise.split("\n") if line.strip()]
                    selected_plan_to_edit['recovery_guidelines'] = [line.strip() for line in edit_recovery.split("\n") if line.strip()]
                    
                    # Update in list and save
                    for p in st.session_state.goal_plans:
                        if p['objective'] == selected_plan_to_edit['objective']:
                            p.update(selected_plan_to_edit)
                    save_goal_plans(st.session_state.goal_plans)
                    st.success("Goal plan updated!")
                    st.rerun()
                    
        st.divider()
        
        # Reset all data
        if st.button("🔄 Reset All Data", type="secondary", use_container_width=True):
            if st.checkbox("Confirm clearing ALL goals and tracking habits?"):
                st.session_state.goal_plans = []
                st.session_state.goal_plan = None
                st.session_state.habits = []
                st.session_state.onboarding_step = 1
                save_goal_plans([])
                save_habits([])
                st.session_state.view = 'ONBOARDING'
                st.success("Database reset successful.")
                st.rerun()

    # Main Dashboard Page Content
    col_hdr, col_actions = st.columns([2, 2])
    with col_hdr:
        st.title("🛡️ HabitGuard AI")
        st.caption("AI-Powered Micro-Habit Failure Predictor — Trained on behavioral compliance data")
    with col_actions:
        st.write("")
        col_act1, col_act2 = st.columns(2)
        with col_act1:
            if st.button("➕ Add New Goal", type="primary", use_container_width=True):
                st.session_state.view = 'ONBOARDING'
                st.session_state.onboarding_step = 1
                st.session_state.goal_plan = None
                st.rerun()
        with col_act2:
            if st.button("🔄 Refresh Telemetry", type="secondary", use_container_width=True):
                st.rerun()
            
    st.divider()
    
    if not st.session_state.habits:
        st.info("No active habits. Create a new custom habit or reset your goal plan to formulate habits.")
    else:
        # Split Layout: Left Column = Scientific Guidelines, Right Column = Habits cards grid
        col_guidelines, col_cards = st.columns([1, 2.2])
        
        with col_guidelines:
            st.markdown("### 🔬 Scientific Guidelines")
            st.write("Retrieved from domain research rules:")
            
            if active_plans:
                nutrition_guidelines = []
                exercise_guidelines = []
                recovery_guidelines = []
                for p in active_plans:
                    nutrition_guidelines.extend(p.get('nutrition_guidelines', []))
                    exercise_guidelines.extend(p.get('exercise_guidelines', []))
                    recovery_guidelines.extend(p.get('recovery_guidelines', []))
                
                diet_applicable = is_diet_plan_applicable_to_any(active_plans)
                if diet_applicable:
                    tabs = st.tabs(["🥗 Nutrition", "🏋️ Exercise", "💤 Recovery"])
                    with tabs[0]:
                        if nutrition_guidelines:
                            for g in nutrition_guidelines:
                                st.markdown(f"- {g}")
                        else:
                            st.write("No nutrition guidelines generated.")
                    with tabs[1]:
                        if exercise_guidelines:
                            for g in exercise_guidelines:
                                st.markdown(f"- {g}")
                        else:
                            st.write("No exercise protocols generated.")
                    with tabs[2]:
                        if recovery_guidelines:
                            for g in recovery_guidelines:
                                st.markdown(f"- {g}")
                        else:
                            st.write("No recovery guidelines generated.")
                else:
                    tabs = st.tabs(["🏋️ Exercise", "💤 Recovery"])
                    with tabs[0]:
                        if exercise_guidelines:
                            for g in exercise_guidelines:
                                st.markdown(f"- {g}")
                        else:
                            st.write("No exercise protocols generated.")
                    with tabs[1]:
                        if recovery_guidelines:
                            for g in recovery_guidelines:
                                st.markdown(f"- {g}")
                        else:
                            st.write("No recovery guidelines generated.")
            else:
                st.info("No active goals. Add a new goal to get scientific guidelines.")

            if completed_plans:
                st.write("")
                with st.expander("🏆 Completed Goals History", expanded=False):
                    for cp in completed_plans:
                        st.markdown(f"✔ ~~{cp['objective']}~~")
                
        with col_cards:
            st.markdown("### 🏃 Active Habit Tracking Panel")
            
            # Display habits in 2 columns inside the tracking area
            habit_cols = st.columns(2)
            
            for idx, habit in enumerate(st.session_state.habits):
                col_idx = idx % 2
                with habit_cols[col_idx]:
                    pydantic_activities = [
                        HabitActivity(date=a['date'], time=a['time'], completed=a['completed'])
                        for a in habit.get('activities', [])
                    ]
                    habit_data_obj = HabitData(
                        name=habit['name'],
                        target_days_per_week=habit['target_days_per_week'],
                        current_streak=habit['current_streak'],
                        longest_streak=habit['longest_streak'],
                        activities=pydantic_activities
                    )
                    
                    # Compute prediction
                    prediction = analyze_habit_risk(habit_data_obj)
                    risk = prediction.risk_score
                    badge_class = f"badge-{risk.lower()}"
                    prob_percent = int(prediction.failure_probability * 100)
                    
                    st.markdown(f"""
                    <div class="glass-card" style="margin-bottom:1rem; padding:1.2rem;">
                        <div style="display:flex; justify-content:between; align-items:center; margin-bottom:0.8rem; justify-content: space-between;">
                            <h4 style="margin:0; font-size:1.15rem;">🏃 {habit['name']}</h4>
                            <span class="{badge_class}">{risk} Risk</span>
                        </div>
                    </div>
                    """, unsafe_allowed_html=True)
                    
                    # Streaks and stats
                    col_met1, col_met2 = st.columns(2)
                    with col_met1:
                        st.metric("Streak", f"🔥 {habit['current_streak']}d", help="Current streak")
                    with col_met2:
                        st.metric("Longest", f"🏆 {habit['longest_streak']}d", help="Longest streak")
                        
                    st.caption(f"Target: {habit['target_days_per_week']} days / week")
                    st.progress(prob_percent / 100.0, text=f"Abandonment Probability: {prob_percent}%")
                    
                    # Insights & Interventions
                    if risk == "High":
                        st.markdown("**🛡️ Intervention Recommended:**")
                        st.error(prediction.interventions[0] if prediction.interventions else "Simplify your daily routine.")
                    else:
                        st.markdown("**💡 AI Insight:**")
                        st.info(prediction.insights[0] if prediction.insights else "Everything is running smoothly.")
                        
                    # Check if completed today
                    today_str = datetime.now().strftime("%Y-%m-%d")
                    is_completed_today = any(a.get('date') == today_str and a.get('completed') for a in habit.get('activities', []))

                    # Logging and deletion
                    col_l, col_d = st.columns([4, 1])
                    with col_l:
                        if is_completed_today:
                            st.button("Completed Today ✅", key=f"log_dashboard_{idx}", disabled=True, use_container_width=True)
                        else:
                            if st.button("Log Activity ✅", key=f"log_dashboard_{idx}", use_container_width=True):
                                now = datetime.now()
                                habit['activities'].append({
                                    "date": now.strftime("%Y-%m-%d"),
                                    "time": now.strftime("%H:%M"),
                                    "completed": True
                                })
                                habit['current_streak'] += 1
                                habit['longest_streak'] = max(habit['longest_streak'], habit['current_streak'])
                                save_habits(st.session_state.habits)
                                st.success(f"Logged {habit['name']}!")
                                st.rerun()
                    with col_d:
                        if st.button("🗑️", key=f"del_dashboard_{idx}", help="Delete Habit", use_container_width=True):
                            st.session_state.habits.pop(idx)
                            save_habits(st.session_state.habits)
                            st.rerun()
                            
                    st.divider()
