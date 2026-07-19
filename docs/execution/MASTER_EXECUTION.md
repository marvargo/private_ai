# WyndMe Private AI Platform
# Master Engineering Execution Manual

Version: 1.0

---

# Purpose

This document is the permanent engineering constitution for the WyndMe Private AI Platform.

Its purpose is to define how software must be designed, implemented, validated, tested and released.

Every engineering task, whether performed by a human engineer or an AI engineer (Codex, Claude Code, Cursor, etc.), MUST follow this document.

No implementation may override these requirements unless this document is updated.

---

# Mission

Build the world's best private enterprise AI platform.

The platform must:

- be enterprise grade
- be white label
- support personal workspaces
- support project workspaces
- support multi-tenancy
- support collaboration
- support Runtime Management
- support GPU Management
- support autoscaling
- support Coding Workspaces
- support AI Workflows
- support Integrations
- support Image Studio
- support Video Studio
- support secure enterprise deployments

Every implementation must be production quality.

---

# Engineering Philosophy

The project follows these principles.

## 1. Production First

Never build a prototype.

Never build an MVP.

Never build placeholders.

Everything built should be capable of reaching production.

---

## 2. Database First

Every production feature must have durable persistence.

Process memory is never considered production persistence.

Maps, Sets, arrays or singleton objects are acceptable ONLY for tests.

---

## 3. Security First

Security is never optional.

Every feature must consider:

- authorization
- authentication
- encryption
- auditing
- least privilege
- tenant isolation

before implementation is considered complete.

---

## 4. Enterprise First

Every screen must assume:

- multiple organizations
- multiple users
- multiple projects
- millions of records

No implementation should assume a single user.

---

## 5. White Label

The application is white label.

Never expose:

- provider names
- model names
- infrastructure vendors
- GPU vendors

to regular users.

Only administrators may see infrastructure.

---

# Implementation Rules

Every feature must include:

- database schema
- migrations
- repositories
- services
- API
- UI
- authorization
- validation
- logging
- testing
- documentation

Missing one means the feature is incomplete.

---

# No Placeholder Policy

The following NEVER count as implementation.

- TODO
- FIXME
- placeholder
- static page
- mock API
- hardcoded values
- fake loading
- fake streaming
- fake health
- scaffold
- stub
- documentation instead of code

If any of these exist the feature remains incomplete.

---

# Continuous Development

Engineers must not stop after one feature.

The workflow is:

Implement

↓

Test

↓

Audit

↓

Fix

↓

Retest

↓

Repeat

↓

Commit

↓

Continue

No manual confirmation is required between phases.

---

# Completion Rule

A phase is COMPLETE only when:

- every acceptance criterion passes
- every required test passes
- all APIs work
- all UI works
- production persistence exists
- authorization works
- logging works
- security passes
- performance requirements pass

Otherwise the phase remains IN PROGRESS.

---

# Definition of Production Ready

Production Ready means:

- no placeholders
- no TODOs
- no mocked production services
- production persistence
- production authorization
- production logging
- production monitoring
- production error handling
- production testing
- deployment ready

Anything else is NOT production ready.

---

# Testing Philosophy

Every phase requires:

- Unit Tests
- Integration Tests
- Playwright Tests
- Authorization Tests
- RLS Tests (where applicable)
- Regression Tests

No phase is complete without testing.

---

# Evidence Requirement

Every completed phase must produce evidence.

Evidence includes:

- migration files
- APIs
- UI
- screenshots
- test reports
- Playwright results
- performance metrics

Claims without evidence do not count.

---

# Phase Workflow

Every phase follows this order.

1. Read requirements.
2. Read previous phase.
3. Design.
4. Implement.
5. Test.
6. Audit.
7. Fix.
8. Retest.
9. Commit.
10. Update implementation ledger.
11. Continue.

---

# Never Stop Because

The following are NOT valid blockers.

- missing MCP
- unavailable GPU
- unavailable deployment
- unavailable production database
- pending cloud configuration
- incomplete future phases

Continue implementation.

---

# Valid Blockers

Only the following may stop implementation.

- repository corruption
- destructive data loss
- explicit human approval required
- legal restriction
- impossible dependency

Otherwise continue.

---

# Source of Truth

The following documents define the project.

MASTER_EXECUTION.md

IMPLEMENTATION_RULES.md

DEFINITION_OF_DONE.md

BLOCKER_POLICY.md

All Phase documents

Nothing else overrides these documents.

---

End of Document
