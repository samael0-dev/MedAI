"""Pytest configuration and test isolation fixtures."""
import os
import pytest
from pathlib import Path

# Remove existing database file before testing session begins
db_path = Path("medai.db")
if db_path.exists():
    try:
        db_path.unlink()
    except Exception:
        pass
