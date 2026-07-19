# Blocker Policy

Version: 1.0

---

# Purpose

This document defines what constitutes a legitimate blocker during software development.

Its purpose is to prevent unnecessary interruptions to implementation while ensuring that real risks are handled correctly.

This document applies to:

- Human engineers
- Codex
- Claude Code
- Cursor
- Any AI engineering system

This document overrides subjective interpretations of blockers.

---

# Philosophy

Implementation and Production Validation are two different activities.

Failure to perform Production Validation does NOT automatically block implementation.

Example:

Database migrations cannot be executed because production credentials are unavailable.

Implementation:

Continue.

Production Validation:

Deferred.

---

# General Rule

A task should continue unless continuing would create:

- irreversible damage
- security risk
- legal violation
- destructive data loss

Everything else is handled as deferred validation.

---

# Valid Blockers

Implementation MUST stop only when one of the following occurs.

---

## Repository Corruption

Examples

Repository cannot be cloned.

Repository history corrupted.

Git cannot checkout.

Merge corruption.

Accidental mass deletion.

---

## Irreversible Data Loss

Examples

Production database would lose customer information.

Migration destroys production data.

Destructive update cannot be rolled back.

---

## Explicit Human Approval Required

Examples

Large production billing

Deleting production resources

Destroying infrastructure

Sending customer emails

Charging customer payment methods

Purchasing GPUs

Launching expensive production resources

---

## Security Risk

Examples

Private keys exposed

Credentials leaked

Production secrets committed

Encryption bypassed

Authentication bypassed

Authorization removed

---

## Legal Restriction

Examples

License violation

Copyright violation

Regulatory restriction

Terms of service violation

---

## Impossible Dependency

Examples

Repository permanently unavailable

Required source code missing

Required artifact deleted

Provider API permanently removed

Critical package discontinued without replacement

---

# NOT Valid Blockers

The following MUST NEVER stop implementation.

---

## Missing Supabase MCP

Continue.

Implement migrations.

Implement repositories.

Implement APIs.

Mark:

Live Validation Pending.

---

## Database Credentials Missing

Continue implementation.

Do not stop coding.

Mark:

Migration execution deferred.

---

## Production Database Unreachable

Continue.

Database connectivity affects validation.

Not implementation.

---

## Provider Credentials Missing

Continue.

Implement interfaces.

Implement adapters.

Implement configuration.

Mark:

Provider validation pending.

---

## GPU Unavailable

Continue.

Implement orchestration.

Implement runtime management.

Implement autoscaling.

Implement scheduling.

Defer runtime validation.

---

## Cloud Infrastructure Missing

Continue.

Infrastructure validation occurs later.

---

## Browser Testing Unavailable

Continue.

Write Playwright.

Mark execution pending.

---

## CI/CD Not Configured

Continue.

Create workflows.

Create deployment scripts.

Create manifests.

---

## External API Offline

Continue.

Implement client.

Implement retries.

Implement error handling.

Validate later.

---

## Email Provider Missing

Continue.

Implement interface.

Implement adapter.

Implement mocks ONLY for test environment.

Never block implementation.

---

## Payment Gateway Missing

Continue.

Implement abstraction.

Implement adapters.

Validate later.

---

## Llama 405B Not Running

Continue.

Implement orchestration.

Implement runtime management.

Implement queues.

Validate when available.

---

## Image Model Missing

Continue.

Implement pipeline.

Implement storage.

Implement job execution.

Validate later.

---

## Video Model Missing

Continue.

Implement rendering pipeline.

Implement queue.

Implement scheduling.

Validate later.

---

## Missing Environment Variables

Continue.

Implement configuration.

Fail gracefully.

Never stop implementation.

---

## Missing Secrets

Continue.

Implement secure configuration.

Validation deferred.

---

## Feature Depends On Future Phase

Continue.

Use interfaces.

Use dependency inversion.

Do not stop.

---

# Deferred Validation

The following items move into Production Validation.

- Cloud authentication
- Provider authentication
- Live database migration
- GPU startup
- Model loading
- Production deployment
- Performance benchmark
- Browser execution
- Disaster recovery

Implementation continues.

---

# Implementation Rule

When an external dependency fails:

DO NOT STOP.

Instead:

Complete implementation.

Write tests.

Create documentation.

Update validation ledger.

Continue.

---

# Production Validation Rule

Production validation occurs AFTER implementation.

Never reverse this order.

---

# Reporting

When blocked:

State:

Implementation Status

Production Validation Status

Never combine them.

Example

Implementation

Complete

Production Validation

Pending GPU Availability

---

# Required Behavior

Correct

Cannot access GPU.

Runtime Management implemented.

Autoscaling implemented.

Scheduling implemented.

GPU validation deferred.

Continue.

---

Incorrect

GPU unavailable.

Stopping Phase.

---

# Self Audit

Before stopping ask:

Can implementation continue?

Can interfaces be written?

Can APIs be written?

Can UI be written?

Can tests be written?

Can repositories be written?

Can services be written?

If YES

Continue.

---

# Escalation

Only escalate to a human when:

Data loss possible

Security issue

Legal issue

Human approval required

Repository corruption

Everything else:

Continue.

---

# Final Rule

Implementation is always preferred over waiting.

External dependencies delay validation.

They do not delay engineering.

---

End of Document
