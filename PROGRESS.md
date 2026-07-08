# Progress Tracker

**Active phase:** `ITSM-P04` — Agent flow improvements (✅ done)
**Last update:** 2026-07-06
**Last commit:** _9679586_
**Plan reference:** `AUDIT_AND_ROADMAP.md` (if exists) OR project README roadmap section.
**Model strategy:** see `AGENTS.md` → "Model & Tool Selection per Task" and `CLAUDE.md` §22. Every phase below MUST carry an explicit `Model:` line.

---

## Resume instructions for new Claude sessions

Read this in order on EVERY session start (after CLAUDE.md auto-loads):

1. Read **CLAUDE.md** (auto on session start) — pay attention to §13 resume protocol.
2. Read **THIS file** (`PROGRESS.md`).
3. Run `git log --oneline -20` — see recent commits including `wip:` markers from any dying session.
4. Run `git status` — see if any file is mid-edit (signal of dying-session death).
5. Find the phase marked `🟡 in-progress` below — that's where work continues.
6. Read its "Plan for this phase" sub-section + cross-reference with wip commits + uncommitted files.
7. Decide:
   - Uncommitted changes match the plan → finish in-flight edit, commit it.
   - Uncommitted changes don't match plan → likely garbage, `git checkout -- <file>` to discard.
   - No uncommitted changes → continue from next bullet in plan.
8. Run phase verification (`typecheck + build + test`) before doing more work.
9. Resume per the plan.

---

## Per-edit discipline (the only way to survive token-limit death)

**Assume the session can die after ANY tool call.** Every edit gets its own commit immediately. Never batch.

```
# Per-edit pattern:
1. Edit/Write ONE focused change.
2. Run: typecheck && build (verify compiles).
3. Run: git add <file> && git commit -m "wip(phase-id): brief desc".
```

At phase end:
1. Run all verification (typecheck + build + test).
2. Edit this file → mark phase `done` + summary + commit hash.
3. Commit: `done(phase-id): summary`.

If session dies mid-phase, NO MARK as done. Next session picks up exactly where stopped.

---

## Three-layer death defense (proactive, not reactive)

When the Claude session hits the token / usage limit, it **dies without warning** — no exit message, no closing commit, no summary. Whatever was about to happen in the next tool call simply does not happen. Defense must be proactive — assume death is possible after ANY tool call.

### Layer 1 — Intent on disk BEFORE action

At the START of every phase (not the end), the FIRST two tool calls are:

1. Edit this file → mark phase `🟡 in-progress` AND write its "Plan for this phase" block (explicit list of edits to make).
2. `git add PROGRESS.md && git commit -m "wip(<phase-id>): starting <brief>"`

If the session dies after step 2, the next session reads this file and sees both "what I was about to do" and a clean git state.

### Layer 2 — Commit + push after EVERY small edit (not at end of phase)

Each tool-call edit is its own checkpoint:

```bash
# Per-edit pattern (every meaningful change):
1. Edit one focused file/region.
2. typecheck && build   # verify still compiles
3. git add <file> && git commit -m "wip(<phase-id>): <brief>"
   # post-commit-push.js hook auto-pushes to remote.
```

Worst case if session dies mid-edit = ONE file half-modified. `git status` shows it. Next session reads the plan → either finishes that one edit or `git checkout -- <file>` and retries. `wip:` prefix makes it clear which commits are intermediate; squashing with `git rebase -i` at phase end is optional.

**Push is non-negotiable.** Local-only commits die with the disk. Remote push survives machine swap. The `post-commit-push.js` hook auto-runs after every successful commit. If push fails (offline / no remote / auth), commit stays local and the next successful push catches up — but be aware: if both disk AND offline window coincide, work IS lost. Configure a remote on day 1.

### Layer 3 — Phase completion is a SEPARATE final action

```bash
# Phase-completion sequence:
1. Run all verification (typecheck && build && test).
2. Edit this file → mark phase ✅ done + summary + last commit hash.
3. git add PROGRESS.md && git commit -m "done(<phase-id>): <summary>"
   # auto-pushed by post-commit-push.js hook
```

If the session dies BEFORE step 2, the phase stays `in-progress`. Next session reads the wip commits + runs verification → decides if work is actually complete and marks done.

### Anti-patterns to avoid

| Don't | Do |
|---|---|
| "I'll commit at the end of the phase" | Commit after every edit |
| "Let me make all the edits, then run tests" | Run typecheck + build after each edit, before commit |
| "I'll update the progress file when done" | Update progress file FIRST, commit it, THEN do work |
| Squash commits as you go (slow + risky) | Leave `wip:` commits, squash at phase end if time permits |
| Trust that "the AI will know to clean up" | Assume session dies after every tool call; plan accordingly |

### Optional safety net — auto-checkpoint cron

Belt+suspenders mode for the paranoid: a 5-minute cron / GitHub Actions workflow during active refactor windows:

```bash
# scripts/auto-checkpoint.sh
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "auto-checkpoint: $(date -Iseconds)" --no-verify
fi
```

Trade-off: commits broken intermediate states. Easy to `git reset` later. Use only if the `wip:` commit discipline isn't enough on its own.

---

## What lives where

| File | Purpose | Updated when |
|---|---|---|
| `CLAUDE.md` | AI agent root instructions. §13 = session-start protocol. | Once, at start of project |
| `PROGRESS.md` | Live state of all phases | After every phase status change |
| `AUDIT_AND_ROADMAP.md` (if exists) | Full plan — referenced by progress tracker | Rarely (only on plan revisions) |
| `audit-history/` (optional) | Frozen records of closed audits (e.g. `audit-history/2026-05-10-security.md`) | Never edit after closing |
| `git log` | Commit hashes per phase | Every commit |

### Audit-history convention

When an audit is fully closed (all findings resolved), move it to `audit-history/YYYY-MM-DD-<scope>.md`. Frozen — never edit after move. New audits start fresh from `AUDIT_AND_ROADMAP.template.md`. Keeps history queryable without polluting active plan.

---

## Stopping criteria (when it's safe to pause)

Acceptable pauses:
- End of any phase (clean break, all tests green).
- End of any week.

Do NOT pause:
- Mid-phase (commit + resume notes first).
- Mid-migration (always finish + verify a migration in one session).

---

## Owner check-in cadence (non-coder friendly)

Every Friday:
1. Read week's `PROGRESS.md` updates.
2. Click through the live app — does anything feel different?
3. Run `npm test` (or preset equivalent) locally — all green?
4. Check latest commits — anything surprising?
5. If anything unclear, ask the AI to explain in plain English (reference `docs/HANDOVER.md` glossary).

---

## Phase Status Legend

- ⬜ pending
- 🟡 in-progress
- ✅ done
- ⛔ blocked
- ⏭️ skipped

---

## Phase Log

> Add phases below as work proceeds. One block per phase.

### ⬜ EXAMPLE-P00 — Example phase title

**Status:** pending
**Started:** _YYYY-MM-DD_
**Completed:** _YYYY-MM-DD_
**Commits:** _hash → hash_
**Model:** _Sonnet | Opus | Haiku | DeepSeek Pro | DeepSeek Flash | Gemini Pro | Gemini Flash — see AGENTS.md "Model & Tool Selection per Task"_

**Plan for this phase:**
- [ ] Edit file A *(Model: ...)*
- [ ] Add file B *(Model: ...)*
- [ ] Test C *(Model: ...)*

**Delivered:**
- _list what shipped_

**Verified:**
- _typecheck / build / test outputs_

**Rollback:**
- _how to undo if needed_


### ✅ INIT-P00 — Project bootstrap

**Status:** done
**Started:** 2026-06-14
**Completed:** 2026-06-14
**Commits:** `6b864ec`

### ✅ ITSM-P01 — GLPI-inspired database & frontend

**Status:** done
**Started:** 2026-06-14
**Completed:** 2026-06-14
**Commits:** `pending`

**Plan for this phase:**
- [x] Thiết kế database schema GLPI-inspired (Organiztion, Location, Category, Asset, Ticket, Problem, Change, KnowledgeBase, Document, Contract, Supplier, Activity)
- [x] Chạy migration + seed data (3 users, 3 assets, 1 ticket, 2 KB articles, 1 contract, 1 supplier)
- [x] Xây dựng layout sidebar navigation
- [x] Dashboard với thống kê + ticket gần đây
- [x] Assets page (danh sách tài sản)
- [x] Tickets page (danh sách ticket với filter trạng thái)
- [x] Knowledge base page
- [x] Contracts page
- [x] Suppliers page
- [x] typecheck + build + test passed

**Delivered:**
- Database schema 15 models (GLPI-inspired)
- 6 pages: Dashboard, Assets, Tickets, Knowledge, Contracts, Suppliers
- Sidebar navigation
- Seed data demo

**Verified:**
- `tsc --noEmit` — 0 errors
- `npm run build` — compiled successfully (10 routes)
- `npm test` — 1 test passed

**Plan for this phase:**
- [x] Fill all sections in CLAUDE.md
- [x] Install dependencies
- [x] Set up Prisma + SQLite + seed
- [x] Set up NextAuth v5 auth
- [x] Create dashboard page with metrics
- [x] Create login page
- [x] TypeScript typecheck passes
- [x] Next.js build succeeds
- [x] Vitest test passes
- [x] Git init + first commit

**Delivered:**
- Next.js 16 + TypeScript project scaffolded
- Prisma schema (User, Account, Session, Contact, Deal, Activity)
- Auth (NextAuth v5 with credentials)
- Login page with form validation
- Dashboard with contact/deal/pipeline metrics
- Seed script (demo: admin@newcrm.com / admin123)
- E2E Playwright scaffold
- Full agent workflow (7 agents, 16 commands, 8 hooks)

**Verified:**
- `tsc --noEmit` — 0 errors
- `npm run build` — compiled successfully
- `npm test` — 1 test passed

### ✅ ITSM-P02 — Agent inventory E2E + bugfixes

**Status:** done
**Started:** 2026-07-05
**Completed:** 2026-07-05
**Commits:** `61a3b73`

**Plan for this phase:**
- [x] Fix React hook order violation in customer detail page (early return before all hooks)
- [x] Fix `biosUuid` field on `CustomerCollectedDevice` select (field doesn't exist)
- [x] Write E2E tests for full agent flow (submit → approve, submit → reject)
- [x] Write E2E test for customer Agent tab, agent-updates list page
- [x] `page.request`-based auth (login per test, shared browser cookies)

**Delivered:**
- 3 E2E tests passing (approve, reject, UI pages)
- Fixed customer detail page crash (React Rules of Hooks)
- Fixed submission detail API (removed invalid `biosUuid` select)
- Clean test structure with per-test login via `page.request`

**Verified:**
- `tsc --noEmit` — 0 errors
- `npm run build` — compiled (60+ routes)
- `npm test` — 1 vitest pass
- `npx playwright test` — 4/4 pass (submit→approve, submit→reject, Agent tab UI, setup)
- `node scripts/check-file-sizes.mjs` — no breaches

### ✅ ITSM-P03 — Clean up old collection-session flow

**Status:** done
**Started:** 2026-07-05
**Completed:** 2026-07-05
**Commits:** `cded8da`

**Plan for this phase:**
- [x] Remove "Thu thập" tab from both customer detail and customer list pages
- [x] Delete old token-based API routes (`api/agent-inventory/[token]/*`)
- [x] Delete old list route (`api/agent-inventory/list`)
- [x] Delete old hardcoded-key agent route (`api/agent/inventory/*`)
- [x] Delete old collection-sessions API (`api/customers/[id]/collection-sessions`)
- [x] Delete old review API (`api/customer-devices/review/[sessionId]`)
- [x] Remove `confirmDevice` + `createDevice` dead functions from `inventory-matching.ts`
- [x] Remove `collection-sessions-tab.tsx` component file
- [x] Remove `SessionsTab` import and `SessionsContent` from page files

**Delivered:**
- 9 old route files deleted
- 2 page files cleaned up (removed Thu thập tab)
- `inventory-matching.ts` shortened from 327 → 210 lines
- ~2100 LOC of dead code removed
- Build still clean, all E2E still pass

### ✅ ITSM-P04 — Agent flow improvements (dedup, history, pagination, layout)

**Status:** done
**Started:** 2026-07-06
**Completed:** 2026-07-06
**Commits:** `cc80b83` → `9679586`
**Model:** Sonnet

**Plan for this phase:**
- [x] Dedup: submit route filter known devices → auto-update, only truly new devices need review
- [x] Customer detail: hiển thị lịch sử thu thập agent (submission date, devices, status)
- [x] Pagination: agent-updates list page + API
- [x] Asset code: auto-generate KH-&lt;code&gt;-&lt;type&gt;-&lt;num&gt; khi tạo device
- [x] Redesign review page: layout rộng hơn, đầy đặn hơn trên màn hình lớn

**Delivered:**
- Dedup: submit route auto-updates existing devices, only new devices create pending submissions
- Submission history: Agent tab hiển thị lịch sử thu thập (thời gian, status, device count)
- Pagination: submissions API hỗ trợ page/pageSize, list page có nút phân trang + stats
- Asset code: tự động tạo `KH-&lt;code&gt;-&lt;type&gt;-&lt;NNN&gt;` khi duyệt tạo thiết bị mới
- Review page: layout `max-w-7xl`, responsive 2-column grid, section labels, select-all, bottom bar

**Verified:**
- `tsc --noEmit` — 0 errors (trừ pre-existing DeviceComponentsPanel TS2339)
- `npx playwright test` — 5/5 passed

### 🔴 ITSM-P05 — Network inventory: GLPI Agent Perl module fix

**Status:** done
**Started:** 2026-07-08
**Completed:** 2026-07-08
**Commits:** `6d24ba7` → `15002ea`
**Model:** Sonnet

**Problem:**
Windows GLPI Agent MSI/ZIP package does NOT ship `glpi-netdiscovery`,
`glpi-netinventory`, or the `GLPI::Agent::SNMP::*` Perl modules (~100 files).
These are Linux-only components. The wrapper script assumed they existed as
separate .exe/.bat commands and would fail at runtime.

**Investigation findings:**
- `glpi-netdiscovery`/`glpi-netinventory` are Perl scripts (no extension) stored in
  `perl\bin\` — absent from Windows package
- `GLPI::Agent::Task::NetDiscovery`, `NetInventory`, `SNMP::*` modules are all
  absent from the Windows `perl\agent\` directory
- `setup.pm` in `perl\lib\` handles `@INC` setup automatically via
  `use lib abs_path(rel2abs('../../agent', __FILE__))`
- `Net::SNMP`, `Net::IP`, `Crypt::DES`, `Parallel::ForkManager` ARE present in
  `perl\vendor\lib\` — all needed dependencies are already shipped

**Fix:**
- Added `Install-MissingNetworkModules` function to `network-inventory.ps1` that
  downloads the GLPI Agent GitHub source ZIP (develop branch) and extracts only
  the missing Perl scripts/modules to the right locations in the GLPI Agent
  installation directory
- Runs `glpi-netdiscovery` via `perl\bin\glpi-agent.exe` (the bundled Perl
  interpreter) — `setup.pm` automatically sets up the module include path
- Updated `network-inventory.sh` to use `--save` instead of `--output` flag
  (matches actual GLPI Agent CLI)
- Updated `.bat` wrapper to use ASCII English text (batch-safe)

**Verified:**
- Download + install: 102 files extracted to correct locations
- Module load test: all modules (Target::Local, NetDiscovery, SNMP::Live, etc.)
  load successfully via the bundled Perl interpreter
- Typecheck: `tsc --noEmit` — 0 errors
- Test: `npm test` — 1/1 passed
- Build: pre-existing `useSearchParams` Suspense error on `/agent-updates` (not related)
