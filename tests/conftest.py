"""Pytest configuration and test database isolation fixture."""
import os
import pytest
from pathlib import Path

test_db_path = Path("test_medai_isolated.db")
if test_db_path.exists():
    try:
        test_db_path.unlink()
    except Exception:
        pass

os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{test_db_path.resolve()}"


@pytest.fixture(scope="session", autouse=True)
def clean_test_environment():
    """Ensure clean isolated database for test run."""
    yield
    if test_db_path.exists():
        try:
            test_db_path.unlink()
        except Exception:
            pass
