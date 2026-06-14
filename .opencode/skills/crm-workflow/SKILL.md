---
name: crm-workflow
description: CRM-specific development workflow covering customer management, sales pipeline, analytics dashboard, and reporting features
license: MIT
compatibility: opencode
metadata:
  project: new-crm
  domain: crm
---

## Core CRM Features
- **Contact Management**: CRUD for leads, contacts, accounts with deduplication
- **Sales Pipeline**: Kanban-style stages (Lead → Qualification → Proposal → Negotiation → Closed)
- **Activity Tracking**: Call logs, emails, meetings with timeline view
- **Task Management**: Assignable tasks with due dates, priorities, reminders
- **Reporting**: Dashboards with charts (revenue, conversion rates, pipeline velocity)

## Data Model Considerations
- Users/Teams with hierarchical permissions (admin, manager, sales rep)
- Contacts linked to accounts (companies/organizations)
- Deals with stages, amounts, probabilities, expected close dates
- Activities polymorphic: can belong to contacts, accounts, or deals
- Notes and attachments on any entity

## Key Integrations
- Email (IMAP/SMTP sync or SendGrid/Mailgun)
- Calendar (Google Calendar / Outlook sync)
- Payment gateways (Stripe)
- Export (CSV, PDF reports)

## UI Patterns Specific to CRM
- Split-pane layouts: list on left, detail on right
- Inline editing for quick field updates
- Drag-and-drop Kanban for pipeline stages
- Global search across all entities
- Bulk actions: assign, delete, export selected items
- Activity timeline with infinite scroll
