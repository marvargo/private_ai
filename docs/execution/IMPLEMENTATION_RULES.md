# Implementation Rules

Version: 1.0

---

# Purpose

This document defines the mandatory implementation rules for every feature developed in the WyndMe Private AI Platform.

Every engineer, AI engineer, contractor, or contributor must follow these rules.

These rules are mandatory.

No feature may bypass them.

---

# Rule 1 — Production Code Only

Every implementation must be production quality.

Do not implement:

- proof of concepts
- prototypes
- MVP shortcuts
- temporary hacks
- demo implementations

Everything must be written as if it will be deployed to production.

---

# Rule 2 — Every Feature is Vertical

Every feature is composed of multiple layers.

No layer may be skipped.

A feature is incomplete if one layer is missing.

Layers:

- Database
- Migration
- Repository
- Business Service
- API
- Validation
- Authorization
- Logging
- Frontend
- UI
- Tests
- Documentation

---

# Rule 3 — Database First

Every production object must exist in the database.

Examples:

Projects

Conversations

Messages

Workflows

Tasks

Jobs

Members

GPU Profiles

Runtime Pools

Autoscaling Rules

Budgets

Integrations

Images

Videos

Assets

Coding Projects

Execution History

Logs

Cost Records

Nothing should exist only in memory.

---

# Rule 4 — Repository Pattern

Every table must have a repository.

Repositories:

- own persistence
- own queries
- own transactions
- never contain business logic

Business logic belongs to Services.

---

# Rule 5 — Services

Every feature requires a Service.

Services contain:

- business rules
- orchestration
- validation
- permissions
- transactions

Services never directly expose SQL.

---

# Rule 6 — APIs

Every feature must expose typed APIs.

Requirements:

Input validation

Output validation

Typed responses

Consistent error handling

Pagination

Filtering

Sorting

Authorization

Audit logging

---

# Rule 7 — Frontend

Every backend feature requires a frontend.

No hidden APIs.

Users must be able to use implemented functionality.

---

# Rule 8 — No Hardcoded Data

Never hardcode:

statistics

dashboard values

costs

health

counts

status

GPU usage

Runtime status

Project counts

Task counts

Conversation counts

Everything must come from production data.

---

# Rule 9 — Realtime

When data changes the UI updates automatically.

Use realtime subscriptions where appropriate.

Never require manual refresh for collaborative features.

---

# Rule 10 — Error Handling

Every API must return structured errors.

No stack traces.

No provider errors.

No raw SQL.

Errors must include:

Code

Message

Safe Details

Correlation ID

Timestamp

---

# Rule 11 — Logging

Every mutation produces logs.

Every failure produces logs.

Every security event produces logs.

Logs never contain:

passwords

tokens

prompts

provider secrets

private keys

---

# Rule 12 — Authorization

Every API must verify:

authentication

tenant

project

role

permission

ownership

Never trust the client.

---

# Rule 13 — Multi Tenant

Every query must respect tenant isolation.

Users must never see another tenant's information.

---

# Rule 14 — Project Isolation

Projects isolate:

conversations

documents

workflows

assets

coding projects

integrations

runtime history

costs

budgets

---

# Rule 15 — White Label

Regular users never see:

OpenAI

Anthropic

Meta

Qwen

RunPod

HuggingFace

GPU models

Infrastructure vendors

---

# Rule 16 — Configuration

Every configurable value belongs in the database.

Examples:

timeouts

retry limits

GPU defaults

budgets

autoscaling

feature flags

No magic numbers.

---

# Rule 17 — Performance

Avoid:

N+1 queries

large payloads

blocking operations

synchronous long-running jobs

expensive repeated queries

Use:

indexes

pagination

batching

background jobs

caching where appropriate

---

# Rule 18 — Idempotency

All write APIs must support safe retries.

Duplicate requests must not create duplicate resources.

---

# Rule 19 — Background Work

Long-running operations must execute as jobs.

Examples:

image generation

video generation

large imports

repository indexing

model loading

workflow execution

---

# Rule 20 — Testing

Every feature requires:

Unit Tests

Integration Tests

API Tests

Authorization Tests

Playwright Tests

Regression Tests

No feature is complete without tests.

---

# Rule 21 — Documentation

Every feature documents:

purpose

architecture

limitations

configuration

API

UI

---

# Rule 22 — Definition of Complete

A feature is complete only when:

✓ Database exists

✓ Migration exists

✓ Repository exists

✓ Service exists

✓ API exists

✓ UI exists

✓ Validation exists

✓ Authorization exists

✓ Logging exists

✓ Tests pass

✓ Documentation exists

Otherwise the feature remains incomplete.

---

# Rule 23 — Forbidden Practices

Never:

use TODO as completion

leave placeholders

return mocked production data

disable authorization

disable RLS

hide failing tests

comment out failing code

skip migrations

skip validation

skip error handling

claim completion without evidence

---

# Rule 24 — Commits

Each completed implementation unit must:

Run tests

Pass build

Commit

Push

Update Implementation Ledger

Continue automatically

---

End of Document
