import sys
import os

# Add the backend directory to the Python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_dir)

# Import the FastAPI application from backend.main
from main import app

# Vercel's Python runtime will look for `app` to handle requests.
