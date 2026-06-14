# NEW CRM

Modern CRM built with Next.js 16, TypeScript, Prisma (SQLite/PostgreSQL), and NextAuth v5.

**Features:**
- Contact management with deduplication
- Sales pipeline (Kanban-style stages)
- Activity tracking with timeline
- Dashboard with key metrics
- Role-based access control

## Quick Start

```bash
npm install
cp .env.example .env.local  # configure your database
npm run db:migrate           # create tables
npm run db:seed              # seed demo data
npm run dev                  # http://localhost:3000
```

**Demo login:** `admin@newcrm.com` / `admin123`

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) + TypeScript strict |
| UI | React 19 + Tailwind CSS v4 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | Prisma 5 |
| Auth | NextAuth v5 (Auth.js) |
| Forms | React Hook Form + Zod |
| State | TanStack React Query + Zustand |
| Testing | Vitest + Playwright |
