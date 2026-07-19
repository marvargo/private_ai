# Test Matrix

Version: 1.0

---

# Purpose

This document defines the mandatory testing requirements for every feature and every engineering phase.

No feature is complete until all required tests pass.

No phase may be marked COMPLETE without satisfying this document.

---

# Testing Philosophy

Every production feature must prove it works.

Testing is never optional.

Testing is part of implementation.

---

# Testing Pyramid

The project follows the following testing hierarchy.

```
Playwright (E2E)

↓

Integration Tests

↓

API Tests

↓

Authorization Tests

↓

Repository Tests

↓

Unit Tests
```

Every layer exists for a reason.

No layer replaces another.

---

# Required Test Categories

Every phase must identify which of the following tests apply.

## Unit Tests

Purpose

Validate isolated business logic.

Examples

Utility functions

Repositories

Validators

Services

Model selection

Cost calculations

Workflow parser

Never mock the logic being tested.

---

## Repository Tests

Purpose

Validate persistence.

Requirements

CRUD

Filtering

Sorting

Pagination

Transactions

Rollback

Duplicate handling

Constraint validation

Repository tests are mandatory.

---

## Service Tests

Purpose

Validate business logic.

Requirements

Authorization

Validation

Transactions

Error handling

Success paths

Failure paths

Retries

---

## API Tests

Purpose

Validate HTTP interfaces.

Verify

Request validation

Authentication

Authorization

Response schema

Error schema

Pagination

Sorting

Filtering

Headers

Status codes

---

## Authorization Tests

Every protected API requires tests.

Verify

Anonymous user

Authenticated user

Wrong tenant

Wrong project

Wrong role

Owner

Admin

Member

Viewer

Unauthorized access

Forbidden access

Expired session

Disabled account

---

## Multi-Tenant Tests

Every feature supporting tenants requires tests.

Verify

Tenant A cannot see Tenant B.

Tenant isolation.

Cross-tenant protection.

---

## Project Isolation Tests

Verify

Project A

Project B

Shared project

Private project

Conversation isolation

Workflow isolation

Runtime isolation

Coding project isolation

---

## RLS Tests

Every protected table requires tests.

Verify

SELECT

INSERT

UPDATE

DELETE

Owner

Collaborator

Viewer

Non-member

Expired invitation

Revoked invitation

Cross-project

Cross-tenant

No RLS policy may be assumed correct.

It must be verified.

---

## Integration Tests

Purpose

Verify services working together.

Examples

Repository + Service

Service + API

Workflow + Runtime

Coding + Repository

Integrations + Authentication

Conversation + Projects

---

## End-to-End Tests

Playwright is mandatory.

Every visible feature requires browser validation.

Verify

Navigation

CRUD

Errors

Loading

Permissions

Realtime

Responsive layouts

Accessibility

Dark mode (if applicable)

No mocked browser data.

---

## Security Tests

Verify

Authentication

Authorization

CSRF

XSS

Injection

Secrets

Permission escalation

Input sanitization

Output sanitization

Rate limiting

Audit logging

---

## Performance Tests

Required when applicable.

Examples

Large projects

Large conversations

Image generation

Video generation

Runtime queues

Workflow execution

Imports

Exports

Performance targets must be measurable.

---

## Load Tests

Required for:

Runtime Management

Workflow Engine

Image Studio

Video Studio

Large imports

Large exports

Realtime collaboration

---

## Regression Tests

Every bug fixed must include a regression test.

No bug may be fixed without preventing recurrence.

---

## Smoke Tests

Before deployment verify

Application starts

Authentication works

Database reachable

Runtime service reachable

API healthy

Build healthy

Frontend healthy

---

# Test Evidence

Every completed phase must produce evidence.

Minimum evidence

Unit

Integration

API

Playwright

Authorization

Performance (when applicable)

Evidence must include

Test Name

Result

Execution Date

Environment

Pass / Fail

---

# Minimum Pass Criteria

A feature passes only if

100% required tests executed

0 failed tests

0 skipped required tests

0 disabled required tests

Build successful

Lint successful

Typecheck successful

---

# Forbidden Practices

Never

Skip tests

Comment out failing tests

Disable Playwright

Mock production APIs

Mark tests TODO

Ignore failures

Assume authorization works

Assume RLS works

---

# CI Requirements

CI must execute

Lint

Typecheck

Unit

Integration

API

Authorization

Playwright

Regression

Build

No merge should occur when required tests fail.

---

# Coverage

Coverage targets

Business Logic

95%

Repositories

95%

Services

95%

Validation

100%

Authorization

100%

Critical Security

100%

Utility Code

90%

Overall

Minimum 90%

Coverage does not replace good tests.

---

# Self Audit

Before marking a feature complete ask

Did Unit Tests pass?

Did Integration Tests pass?

Did API Tests pass?

Did Authorization Tests pass?

Did Playwright pass?

Did Regression Tests pass?

Did Build pass?

Did Lint pass?

Did Typecheck pass?

If any answer is NO

↓

Feature remains incomplete.

---

# Final Rule

Testing is part of implementation.

Untested code is incomplete code.

---

End of Document
