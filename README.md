# SmartHire — Frontend

A full-stack job hiring platform. Candidates can browse jobs and apply, recruiters can post and manage jobs, and admins can verify companies and manage users.

**Backend repo:** [naukri](https://github.com/Akash2342/naukri) (Spring Boot 4, Java 21, PostgreSQL)

---

## Tech Stack

| Concern | Library |
|---|---|
| UI | React 19 + TypeScript + Tailwind CSS v4 |
| Routing | React Router v7 |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 |
| Forms | react-hook-form + Zod |
| HTTP | Axios |
| Build | Vite 6 |

---

## Features

**Job Seekers**
- Browse and search active jobs with filters (keyword, location, type, work mode, experience level)
- View full job detail and apply with an optional cover letter
- Manage resume (upload PDF/DOCX, download, delete)
- Edit profile: basic info, work experience, education, skills with profile completeness score
- Track application status through the hiring pipeline

**Recruiters**
- Create and manage company profile (pending admin verification)
- Post job listings, edit them, and manage status (Draft → Active → Paused/Closed)
- Review applicants per job, move candidates through the pipeline, add internal notes

**Admins**
- Dashboard with platform-wide stats
- Approve or reject company verification requests
- Manage user accounts (activate / deactivate)

---

## Running Locally

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)
- Java 21 + Maven (for the backend)

### 1. Start PostgreSQL via Docker

```bash
docker run -d \
  --name smarthire-db \
  -e POSTGRES_DB=naukri \
  -e POSTGRES_USER=naukri_user \
  -e POSTGRES_PASSWORD=naukri_pass \
  -p 5432:5432 \
  postgres:16
```

### 2. Start the backend

```bash
git clone https://github.com/Akash2342/naukri.git
cd naukri
mvn spring-boot:run
```

Backend starts at `http://localhost:8087`. Hibernate creates all tables automatically on first run.

### 3. Start the frontend

```bash
git clone https://github.com/Akash2342/SmartHire-Frontend.git
cd SmartHire-Frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

The Vite dev server proxies all `/api/*` requests to `http://localhost:8087` automatically — no CORS configuration needed.

### Other commands

```bash
npm run build    # Production build (output in /dist)
npm run preview  # Preview the production build locally
npm run lint     # Run oxlint
```

---

## Project Structure

```
src/
├── api/          # Axios API modules (one per domain)
├── components/   # Shared UI components (Button, Input, Card, Badge, Select)
├── lib/          # Axios instance + utility functions
├── pages/        # Page components organised by role (auth, jobs, seeker, recruiter, admin)
├── routes/       # ProtectedRoute with role-based access control
├── store/        # Zustand auth store (JWT persistence)
└── types/        # TypeScript interfaces mirroring backend DTOs
```
