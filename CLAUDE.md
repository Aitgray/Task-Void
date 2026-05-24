# CLAUDE.md

Project context for AI coding assistants. Read this fully before acting. These
are settled decisions, not suggestions — do not relitigate them unless I
explicitly ask.

---

## What this app is

"Into the Void" — a task manager where the user creates tasks, sends them into a
void, and requests one back. A **hidden scheduler** decides which task is
returned, using OS-style process-prioritization logic (priority + anti-starvation
aging). The user does not see or directly choose which task comes next.

Core loop: **create task → it enters the void → request a task → scheduler picks
one → user completes / discards / skips it.**

---

## Who I am

I have **no prior app-development experience** and am building this primarily
with AI tools. Because of that:

- Explain what each new file does the first time you create it.
- Give exact commands to run and tell me what I should expect to see.
- Prefer clear, conventional code over clever code.
- When something can fail in setup (native config, migrations), call it out and
  get it right deliberately rather than guessing.
- Work in small, verifiable steps. A small change I can confirm beats a large
  one I can't debug.

---

## Stack (decided — use as-is)

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Framework | React Native via Expo (managed workflow) |
| Local DB | expo-sqlite |
| DB access | Drizzle ORM (drizzle-orm + drizzle-kit), SQL migration files |
| State | Zustand |
| Async data | TanStack Query (introduce when it earns its place, not before) |
| Icons | lucide-react-native |
| Sync (phase 4 only) | a managed engine (PowerSync or Turso/libSQL) — NOT hand-built |

Testing target: **Expo Go on a physical phone via QR code.** Keep everything
compatible with the Expo managed workflow unless I explicitly approve ejecting.

---

## Hard rules

1. **UUIDs for primary keys, never autoincrement.** Use UUID v7 where possible
   (time-ordered). Autoincrement integer keys break sync and are not allowed.
2. **Every row has `created_at` and `updated_at`** (unix milliseconds). Bump
   `updated_at` on every write. This is required for future conflict resolution.
3. **Soft-delete by default** (`deleted_at` timestamp). The ONE exception is
   zero-retention delete (see below), which is a real hard delete.
4. **Status and retention are two separate fields**, never a single 4-value
   enum. `status` ∈ {active, completed, discarded}; `retained` ∈ {0,1}.
5. **Do not build sync by hand.** The schema is shaped for a managed engine;
   adopting one is a phase-4 task. Don't implement outboxes, ACK loops, or
   conflict resolution yourself.
6. **No LLM API keys in the app.** Any LLM calls (phase 3) go through a backend.
7. **Don't over-deliver.** Build only what the current prompt asks. Do not add
   navigation, extra screens, or extra tables speculatively. Ask if unsure.

---

## The scheduler (core logic — keep as pure functions)

When a task is requested, score every active task and return the highest:

```
score = base_priority
      + (AGING_RATE  × hours_waiting)
      + (SKIP_WEIGHT × skip_count)
      + jitter

hours_waiting = (now − scheduled_at) / 3_600_000
jitter        = small random, e.g. 0..0.5
```

- **Aging** prevents starvation — old low-priority tasks slowly float up. This is
  non-negotiable; a task must never be able to wait forever.
- Tunable constants (`AGING_RATE`, `SKIP_WEIGHT`, jitter range) live in ONE
  constants file so feel can be tuned without touching logic.
- Scheduler functions must be **pure** (input: tasks + now; output: chosen task)
  so they're easily testable.

**Skip-and-requeue:** skipping is the ONLY time editing is allowed, and only
`base_priority` and `description` may be edited. On skip: increment `skip_count`,
set `last_skipped_at = now`, and partially reset the aging clock
(`scheduled_at = now − hours_waiting × 0.5`) so it doesn't immediately return.

---

## The completion flow (2×2 buttons)

Four buttons in a square. Two axes:
- Outcome: **complete (✓)** vs **discard (✕)** → sets `status`.
- Retention: **retain (filing-drawer icon)** vs **delete (trash-can icon)**.

| | Retain | Delete |
|---|---|---|
| Complete (✓) | status=completed, retained=1 | status=completed, zero-retention purge |
| Discard (✕) | status=discarded, retained=1 | status=discarded, zero-retention purge |

Icon = a check or ✕ shown with either a filing drawer (retain) or trash can
(delete).

---

## Search

Archived (retained) tasks are searchable via **SQLite FTS5**, indexing `title`,
`keywords`, and `archive_notes`. Keep the FTS table in sync with `tasks` via
triggers.

---

## Zero-retention delete

- **Local (works now):** `PRAGMA secure_delete = ON;` + a real hard `DELETE` of
  the row (the only place we hard-delete).
- **With sync (phase 4):** crypto-shredding — each task encrypted with a unique
  per-task key; "delete" destroys the key, making every copy (local, server,
  backups, other devices) permanently unrecoverable. The propagated tombstone is
  just a harmless "key destroyed" marker.

---

## Data model reference

`tasks` columns: `id` (TEXT, UUID PK), `title`, `description`, `base_priority`
(INT 1–5), `scheduled_at` (INT ms), `status` (TEXT), `retained` (INT 0/1),
`skip_count` (INT, default 0), `last_skipped_at` (INT, null), `archive_notes`
(TEXT, null), `keywords` (TEXT, null), `device_scope` (TEXT, null — phase 4),
`created_at` (INT), `updated_at` (INT), `deleted_at` (INT, null).

Other tables (added in later phases, not yet): `tasks_fts` (FTS5),
`change_log` (op_id, entity_id, op_type, payload JSON, hlc, device_id, synced).

---

## Roadmap (current status)

- **Phase 1 — MVP:** create → SQLite; request via scheduler; 2×2 completion;
  FTS5 archive + search; local zero-retention delete.  ← **we are here**
- **Phase 2:** skip-and-requeue; tune aging.
- **Phase 3:** voice input + LLM field extraction; LLM task-chunking.
- **Phase 4:** managed sync; crypto-shredding; per-device scoping.

When you finish a unit of work, remind me to update this roadmap status.

---

## Conventions

- TypeScript strict mode on.
- Keep business logic (scheduler, lifecycle) separate from UI components.
- Small files, clear names. Comment the *why*, not the *what*.
- After any change, tell me exactly how to verify it on my phone.