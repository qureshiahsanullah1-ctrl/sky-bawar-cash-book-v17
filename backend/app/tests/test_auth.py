import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_tenant_session
from app.auth_dependencies import get_auth_db
from app.routes.auth import get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_auth_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_auth_status_setup_required():
    response = client.get("/api/auth/status")
    assert response.status_code == 200
    assert response.json()["setup_required"] is True

def test_setup_owner():
    response = client.post(
        "/api/auth/setup",
        json={
            "full_name": "Test Admin",
            "username": "admin",
            "password": "StrongPassword123!",
            "confirm_password": "StrongPassword123!"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert "token" in data
    assert data["user"]["username"] == "admin"

def test_login_success():
    # Setup first
    client.post(
        "/api/auth/setup",
        json={
            "full_name": "Test Admin",
            "username": "admin",
            "password": "StrongPassword123!",
            "confirm_password": "StrongPassword123!"
        }
    )
    # Login
    response = client.post(
        "/api/auth/login",
        json={
            "username": "admin",
            "password": "StrongPassword123!"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "token" in data

def test_login_failure():
    # Setup first
    client.post(
        "/api/auth/setup",
        json={
            "full_name": "Test Admin",
            "username": "admin",
            "password": "StrongPassword123!",
            "confirm_password": "StrongPassword123!"
        }
    )
    response = client.post(
        "/api/auth/login",
        json={
            "username": "admin",
            "password": "WrongPassword!"
        }
    )
    assert response.status_code == 401
