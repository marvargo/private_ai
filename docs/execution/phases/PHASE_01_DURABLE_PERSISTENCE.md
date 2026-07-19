# Phase 01 — Durable Persistence & Production Data Layer

Version: 1.0

---

# Purpose

This phase establishes the production persistence foundation for the entire platform.

Nothing in the platform may rely on process memory once this phase is complete.

This phase converts the application from a prototype architecture into a true enterprise platform.

Every future phase depends on this one.

Until this phase is COMPLETE, the application is NOT production ready.

---

# Objective

Remove every production dependency on:

Maps

Sets

Arrays

Singletons

Global State

In-Memory Collections

Temporary Runtime Stores

Process State

Static Variables

Mock Persistence

Replace them with durable production persistence.

---

# Scope

This phase affects:

Projects

Conversations

Messages

Members

Invitations

Workflows

Tasks

Runtime Management

GPU Profiles

Runtime Pools

Autoscaling

Coding Projects

Integrations

Assets

Images

Videos

Audit Logs

Cost Tracking

Usage Tracking

Activity Streams

Notifications

Jobs

Queues

Scheduling

Everything requiring persistence.

---

# Database Requirements

Every persistent object MUST exist inside Supabase/Postgres.

Required:

Primary Keys

Foreign Keys

Unique Constraints

Indexes

Created At

Updated At

Soft Delete (where applicable)

Tenant ID

Project ID (nullable where allowed)

Ownership

Versioning where required

No production object may exist without a migration.

---

# Migration Requirements

Every table requires:

Create Migration

Rollback Validation

Naming Convention

Indexes

Constraints

RLS Preparation

Comments

Migration Ordering

Migration Verification

No manual schema creation.

Everything originates from migrations.

---

# Repository Requirements

Every table requires:

Repository

CRUD

Pagination

Filtering

Sorting

Transactions

Duplicate Protection

Error Handling

Repository Tests

Repositories own SQL.

Repositories NEVER contain business logic.

---

# Service Layer

Every repository must have a Service.

Services own:

Business Rules

Authorization

Validation

Transactions

Logging

Audit

Cost Recording

Notifications

Services never execute SQL directly.

---

# API Requirements

Every persistent object requires APIs.

Minimum:

Create

Read

Update

Delete

List

Search

Pagination

Filtering

Sorting

Permissions

Validation

Typed Responses

---

# Authorization

Every repository operation must verify:

Authentication

Tenant

Project

Role

Permission

Ownership

No exceptions.

---

# Tenant Isolation

Every query requires tenant filtering.

Tenant A

↓

Never sees

↓

Tenant B

Verify every query.

---

# Project Isolation

Projects isolate:

Conversations

Assets

Workflows

Coding

Runtime History

Images

Videos

Costs

Logs

Jobs

Integrations

Every query enforces project isolation.

---

# No Process Memory

Forbidden:

new Map()

new Set()

Global Arrays

Singleton Stores

Temporary Object Storage

Global Variables holding production state

Static Runtime Stores

Allowed ONLY inside:

Unit Tests

Integration Tests

Development Fixtures

Everything else requires database persistence.

---

# Runtime State

Runtime state must survive:

Application Restart

Container Restart

Node Restart

Deployment

Scaling

Crash Recovery

Failover

No runtime information may be lost.

---

# Queue Persistence

Jobs survive:

Restart

Crash

Deployment

Scaling

Worker Failure

Queue persistence required.

---

# Transaction Requirements

Every write operation requiring multiple updates must use transactions.

Examples:

Project creation

Invitation acceptance

Workflow execution

Runtime allocation

GPU assignment

Budget updates

Cost recording

---

# Error Handling

Every persistence error returns:

Structured Error

Safe Message

Correlation ID

Timestamp

No SQL Errors

No Provider Errors

No Stack Traces

---

# Logging

Every mutation logs:

Actor

Action

Resource

Tenant

Project

Timestamp

Correlation ID

Never log secrets.

---

# Audit Requirements

Every mutation produces audit events.

Required:

Create

Update

Delete

Restore

Permission Change

Ownership Change

Invitation

Workflow Execution

Runtime Allocation

Budget Change

GPU Allocation

---

# Performance

Database Queries

Indexed

Parameterized

Paginated

No N+1

No Full Table Scans without justification

Target:

<200ms average query

---

# Repository Standards

Every repository includes:

create()

get()

list()

update()

delete()

restore()

search()

exists()

count()

Repositories must be typed.

---

# Unit Tests

Every repository requires tests.

Verify:

Create

Update

Delete

Restore

Duplicate Keys

Pagination

Filtering

Sorting

Transactions

Constraint Violations

---

# Integration Tests

Verify:

Repository + Service

Service + API

API + Database

Authorization

Audit Logging

Transactions

---

# Playwright

Verify UI persistence.

Examples:

Create Project

Refresh

Project Still Exists

Restart

Project Still Exists

Repeat for every major object.

---

# Regression Tests

Every bug fixed adds regression coverage.

---

# Acceptance Checklist

Database

☐ No production Maps

☐ No production Sets

☐ No production Arrays

☐ All repositories implemented

☐ All services implemented

☐ All migrations created

☐ All APIs implemented

☐ Authorization enforced

☐ Tenant isolation verified

☐ Project isolation verified

☐ Transactions implemented

☐ Audit logging implemented

☐ Runtime survives restart

☐ Queue survives restart

☐ Unit Tests pass

☐ Integration Tests pass

☐ API Tests pass

☐ Playwright passes

☐ CI passes

☐ Build passes

☐ Typecheck passes

☐ Lint passes

---

# What Does NOT Count

NOT COMPLETE if:

Map still exists

Singleton still exists

Temporary persistence exists

Repository missing

Migration missing

Service missing

API missing

Authorization missing

Audit missing

Restart loses data

Tests skipped

Playwright skipped

TODO exists

Placeholder exists

Mock persistence exists

---

# Evidence Required

Migration Files

Repository

Service

API

Database Schema

Test Results

Playwright Report

Performance Report

Authorization Report

Restart Verification

Repository Coverage

---

# Exit Criteria

Phase 01 is COMPLETE only when:

Every production object uses durable persistence.

No production feature depends on process memory.

Every acceptance criterion passes.

Every required test passes.

The application survives restart without data loss.

Only then may Phase 02 begin.

---

End of Phase 01
