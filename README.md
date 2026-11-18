# 🏥 MedAI — Healthcare & Diagnostics Platform

> AI-powered medical diagnostics, clinical automation, and research acceleration.

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green?logo=fastapi)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![PyTorch](https://img.shields.io/badge/PyTorch-2.1-red?logo=pytorch)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)

## 📋 Overview

MedAI is a comprehensive healthcare platform that combines cutting-edge AI with clinical workflows to support:

### 🔬 Module 1: Early Disease Detection
- **Chest X-ray Analysis** — TB, pneumonia, and cardiomegaly detection using DenseNet-121 (CheXNet)
- **Brain MRI Classification** — Tumor detection and segmentation with ResNet-50 + U-Net
- **Pathology Slide Analysis** — Cancer biomarker identification using EfficientNet-B4
- **DICOM Processing** — Full support for medical imaging formats (DICOM, NIfTI, standard images)
- **Automated Reporting** — AI-generated radiology reports with confidence scores

### 📋 Module 2: Administrative Relief
- **Clinical Documentation** — Auto-summarize clinical notes, extract diagnoses, medications, procedures
- **Smart Scheduling** — Appointment optimization with conflict detection and alternative suggestions
- **Drug Interaction Checker** — Cross-reference prescriptions against known interaction databases
- **Patient Record Management** — FHIR-compatible electronic health records
- **Workload Dashboard** — Monitor staff burnout metrics and department workloads

### 🧬 Module 3: Research Acceleration
- **Genetic Data Processing** — Gene expression analysis and variant significance scoring
- **Disease Trajectory Mapping** — Kaplan-Meier survival curves and progression prediction
- **Biomarker Discovery** — Statistical correlation analysis across patient cohorts
- **Clinical Trial Matching** — Rule-based patient-to-trial matching engine
- **Research Visualization** — Interactive charts for survival curves, gene expression, and biomarkers

### 🔐 Module 4: Authentication & Staff Access Control
- **Better Auth Framework** — Modern TypeScript all-in-one auth framework managing sessions, JWT tokens, and SQLite database adapter
- **Google OAuth / GIS** — One-click single sign-on for clinicians and medical staff via Google Identity Services
- **Institutional Email OTP** — Passwordless authentication with 6-digit verification codes and automatic expiration
- **Role-Based Access Control (RBAC)** — Granular permissions for Physician, Radiologist, Genomics Researcher, Nurse, and Administrator
- **HIPAA Title II & HITECH Compliant** — Cryptographic SHA-256 JWT sessions and Bcrypt password salts

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Git

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

pip install -r requirements.txt

# Set up environment variables
copy .env.example .env       # Edit with your database credentials

# Run database migrations
alembic upgrade head

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev

# Optional: verify Better Auth suite or start standalone auth service
npm run test:auth     # Test Better Auth OTP, sessions & tokens
npm run auth:server   # Start standalone Better Auth microservice on port 4000
```

### Access the Application
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **API ReDoc**: http://localhost:8000/redoc

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend                      │
│   Dashboard │ Scan Upload │ Admin │ Research          │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP / WebSocket
┌───────────────────────▼─────────────────────────────┐
│                  FastAPI Backend                      │
│   /api/detection │ /api/admin │ /api/research         │
├─────────────────────────────────────────────────────┤
│              ML/AI Engine (PyTorch)                   │
│   CheXNet │ ResNet-50 │ EfficientNet │ NLP Pipeline   │
├─────────────────────────────────────────────────────┤
│              Data Layer (PostgreSQL)                  │
│   Patients │ Scans │ Drugs │ Research │ FHIR          │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
MEDICAL/
├── backend/           # FastAPI Python backend
│   ├── api/          # Route handlers
│   ├── models/       # SQLAlchemy ORM models
│   ├── schemas/      # Pydantic validation schemas
│   ├── services/     # Business logic layer
│   ├── ml/           # ML model wrappers & training
│   ├── main.py       # Application entry point
│   └── config.py     # Configuration management
├── frontend/          # React TypeScript frontend
│   └── src/
│       ├── pages/    # Page components
│       ├── components/ # Shared UI components
│       ├── api/      # API client
│       └── types/    # TypeScript interfaces
├── data/              # Sample data & drug database
├── tests/             # Test suite
└── docker-compose.yml # Container orchestration
```

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v --cov=.
```

---

## ⚠️ Disclaimer

> **This software is for research and educational purposes only.** It is NOT approved for clinical diagnostic use. All AI predictions should be reviewed by qualified medical professionals. Do not make medical decisions based solely on this software's output.

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.
