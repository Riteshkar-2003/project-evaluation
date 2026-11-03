# WorksBot - AI Interview Preparation Platform

An intelligent, adaptive AI-powered interview preparation platform that conducts resume-based technical interviews and coding assessments, evaluates answers in real-time, and generates detailed performance reports.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Pages and Routes](#pages-and-routes)
- [Code Execution Sandbox](#code-execution-sandbox)
- [RAG Knowledge Base](#rag-knowledge-base)

---

## Overview

**WorksBot** is a full-stack AI interview preparation web application. Candidates upload their resume, and the system:

1. Extracts and parses resume data (skills, projects, experience, education)
2. Generates personalized **technical interview questions** based solely on resume content
3. Dynamically **adapts difficulty** (Easy to Medium to Hard) based on answer quality
4. Conducts **coding interviews** with live code execution against hidden test cases
5. Produces comprehensive **AI-generated performance reports** with scores, feedback, and improvement suggestions

The platform uses **Groq's LLaMA 3 70B** model for all AI reasoning, **LangChain** for orchestration, **ChromaDB** for RAG retrieval, and **Judge0** as a sandboxed code execution engine.

---

## Features

### Technical Interview
- Resume-aware question generation (no hallucinated skills or experience)
- Adaptive difficulty system (Easy / Medium / Hard)
- Real-time answer evaluation with scoring and justification
- Session history tracking across all questions
- Final AI-generated performance report with section-level scores

### Coding Interview
- Resume-based language eligibility check (Python, JavaScript, Java, C, C++)
- AI-generated coding problems with visible sample test cases + hidden test cases
- Built-in code editor with syntax awareness (Tab/Shift-Tab indent, auto-closing brackets, smart Enter)
- Live Run Code against sample cases via Judge0
- Submit runs all hidden test cases + AI code quality evaluation
- Detailed submission modal: test pass rate, reference solution, AI feedback
- Adaptive difficulty after each problem

### Reports and History
- Technical interview report: Overall score, Technical / Skills / Projects / Experience scores, final level badge
- Coding interview report: Correctness, Code Quality, Problem-Solving, Explanation scores, time/space complexity
- Full interview history per user
- Admin dashboard for managing users, reports, queries, and resumes

### Authentication
- Email/password signup and login with bcrypt hashing
- Google OAuth 2.0 login
- Session management via localStorage / sessionStorage

### Admin Panel
- View all users, reports, coding submissions, resumes
- Respond to user support queries
- Filter, search, and paginate across all data

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, Framer Motion, Lucide React |
| Backend | FastAPI (Python), Uvicorn ASGI server |
| AI / LLM | Groq API - LLaMA 3 70B (via LangChain + direct Groq SDK) |
| RAG | LangChain + ChromaDB (vector store), custom documents for technical and coding knowledge |
| Database | MySQL (via mysql-connector-python) |
| Code Execution | Judge0 v1.13.0 (self-hosted, Docker Compose) with local Python fallback |
| PDF Parsing | PyPDF |
| Auth | bcrypt password hashing, Google OAuth 2.0 (google-auth) |
| Containerization | Docker Compose (Judge0 sandbox: PostgreSQL + Redis + Judge0 server + worker) |

---

## System Architecture

```
+-------------------------------------------------------------+
|                    USER BROWSER                             |
|          Next.js 16 Frontend  (localhost:3000)              |
+----------------------+--------------------------------------+
                       | REST API (fetch)
+----------------------v--------------------------------------+
|              FastAPI Backend  (localhost:8000)              |
|                                                             |
|  +--------------+  +--------------+  +------------------+  |
|  | interview.py |  |coding_router |  |  admin_router.py |  |
|  |  (Technical) |  |  (Coding)    |  |  (Admin panel)   |  |
|  +------+-------+  +------+-------+  +------------------+  |
|         |                 |                                 |
|  +------v-----------------v------+                         |
|  |        Groq API (LLaMA 3 70B) |                         |
|  |    via LangChain / Groq SDK   |                         |
|  +-------------------------------+                         |
|                                                             |
|  +---------------------+  +---------------------------+    |
|  |  ChromaDB (RAG)     |  |  MySQL Database           |    |
|  |  rag_technical/     |  |  (users, reports,         |    |
|  |  rag_coding/        |  |   submissions, resumes)   |    |
|  +---------------------+  +---------------------------+    |
|                                                             |
|  +-----------------------------------------------------+   |
|  |  Judge0 Sandbox  (localhost:2358)  - Docker         |   |
|  |  PostgreSQL + Redis + Server + Worker               |   |
|  +-----------------------------------------------------+   |
+-------------------------------------------------------------+
```

---

## Project Structure

```
worksbot_project/
|-- backend/
|   |-- main.py                      # FastAPI app entry point, auth & interview routes
|   |-- config.py                    # LangChain + Groq LLM configuration
|   |-- database.py                  # MySQL connection, schema creation, seed
|   |-- auth.py                      # Signup / login with bcrypt
|   |-- auth_google.py               # Google OAuth 2.0 handler
|   |-- interview.py                 # Resume extraction, question generation, evaluation
|   |-- report.py                    # Report generation and DB persistence
|   |-- coding_router.py             # Coding interview API routes
|   |-- coding_question_generator.py # AI coding problem generator
|   |-- coding_evaluation.py         # Code submission evaluator
|   |-- code_executor.py             # Judge0 + local Python sandbox integration
|   |-- admin_router.py              # Admin panel API routes
|   |-- rag_technical/               # RAG vector store for technical interview
|   |   |-- retriever.py
|   |   |-- create_vector_db.py
|   |   +-- documents/
|   |-- rag_coding/                  # RAG vector store for coding interview
|   |   |-- retriever.py
|   |   |-- create_vector_db.py
|   |   +-- documents/
|   |-- requirements.txt
|   |-- .env                         # Local secrets (not committed)
|   +-- .env.example                 # Template for environment variables
|
|-- frontend/
|   |-- app/
|   |   |-- page.js                  # Landing / home page
|   |   |-- layout.js                # Root layout
|   |   |-- globals.css              # Global styles
|   |   |-- dashboard/page.jsx       # Main dashboard (resume upload + start interview)
|   |   |-- interview/page.jsx       # Technical interview session
|   |   |-- coding-interview/page.jsx  # Coding interview session
|   |   |-- report/page.jsx          # Technical interview report
|   |   |-- report_coding/page.jsx   # Coding interview report
|   |   |-- history/page.jsx         # Interview history
|   |   |-- profile/page.jsx         # User profile
|   |   |-- login/page.jsx           # Login page
|   |   |-- signup/page.jsx          # Signup page
|   |   |-- admin/page.jsx           # Admin dashboard
|   |   +-- components/
|   |       |-- UserQueryModal.jsx   # Support query modal
|   |       +-- GlobalQueryWidget.jsx
|   |-- lib/
|   |   +-- api.js                   # Centralized API client functions
|   +-- package.json
|
|-- docker-compose.yml               # Judge0 sandbox (PostgreSQL + Redis + Judge0)
|-- judge0.conf                      # Judge0 configuration
+-- README.md
```

---

## Database Schema

| Table | Purpose |
|---|---|
| users | User accounts (name, email, password hash) |
| user_resumes | Uploaded resume files, extracted JSON, detected skills |
| interview_answers | Per-question Q&A + AI evaluation for technical interviews |
| interview_reports | Aggregated technical interview scores and final level |
| coding_questions | AI-generated coding problems with test cases |
| coding_submissions | User code submissions (language, code, test results) |
| coding_reports | AI evaluation of coding submissions (scores, complexity, feedback) |
| user_queries | User support tickets with admin responses |

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- MySQL 8.0+ running locally
- Docker Desktop (for Judge0 code sandbox)
- Groq API key (free at https://console.groq.com)

---









### 5. Build RAG Knowledge Bases (First Time Only)

```bash
cd backend

# Technical interview RAG
python rag_technical/create_vector_db.py

# Coding interview RAG
python rag_coding/create_vector_db.py
```

---

## Environment Variables

Create `backend/.env` based on `backend/.env.example`:

```env
# AI Model
GROQ_API_KEY=your_groq_api_key_here
MODEL_NAME=llama3-70b-8192

# MySQL Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=ai_interview

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Judge0 Code Execution Sandbox
JUDGE0_URL=http://localhost:2358
JUDGE0_HTTP_TIMEOUT=10
USE_JUDGE0=true
ENABLE_LOCAL_FALLBACK=true
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | /auth/signup | Register a new user |
| POST | /auth/login | Login with email/password |
| POST | /auth/google | Login with Google OAuth token |

### Resume
| Method | Endpoint | Description |
|---|---|---|
| POST | /resume/upload | Upload and parse PDF resume |
| GET | /resume/{user_id} | Get stored resume for a user |

### Technical Interview
| Method | Endpoint | Description |
|---|---|---|
| POST | /interview/first-question | Generate the first interview question |
| POST | /interview/answer | Submit and evaluate an answer |
| POST | /interview/next-question | Generate the next adaptive question |
| POST | /interview/report | Generate and save final report |
| GET | /interview/reports/{user_id} | Get all reports for a user |

### Coding Interview
| Method | Endpoint | Description |
|---|---|---|
| POST | /coding/start | Start a coding session, get first problem |
| POST | /coding/run | Run code against sample test cases |
| POST | /coding/submit | Submit solution, run hidden tests + AI eval |
| POST | /coding/stop | End session and generate final coding report |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | /admin/users | List all users |
| GET | /admin/reports | List all interview reports |
| GET | /admin/coding-reports | List all coding reports |
| GET | /admin/queries | List all user support queries |
| POST | /admin/queries/{id}/respond | Respond to a user query |

---

## Pages and Routes

| Route | Page |
|---|---|
| / | Landing page |
| /signup | User registration |
| /login | User login |
| /dashboard | Main dashboard - resume upload, interview launcher |
| /interview | Live technical interview session |
| /coding-interview | Live coding interview session |
| /report | Technical interview performance report |
| /report_coding | Coding interview performance report |
| /history | Past interview sessions |
| /profile | User profile settings |
| /admin | Admin management dashboard |

---

## Code Execution Sandbox

The platform uses **Judge0 v1.13.0** (self-hosted via Docker) to safely execute user code:

- Supports: Python 3, JavaScript (Node.js), Java, C, C++
- Runs visible sample test cases on Run Code
- Runs hidden test cases (not visible to user) on Submit
- Falls back to local Python subprocess sandbox when Judge0 is unavailable

---

## RAG Knowledge Base

Two ChromaDB vector stores augment AI reasoning:

| Store | Purpose |
|---|---|
| rag_technical/ | Interview best practices, evaluation rubrics, question patterns |
| rag_coding/ | Algorithm patterns, data structure knowledge, problem-solving strategies |

Documents are embedded and stored locally in chroma_db/ subdirectories. Run create_vector_db.py in each folder to initialize.

---

Built using FastAPI, Next.js, LangChain, Groq, Judge0, and ChromaDB.

