# Phase 02 — Authorization, Authentication & Row Level Security (RLS)

Version: 1.0

---

# Purpose

This phase establishes the complete security model for the WyndMe Private AI Platform.

Security is not implemented at the UI level.

Security is not implemented at the API level.

Security is implemented at EVERY layer.

This phase ensures:

- Authentication
- Authorization
- Tenant Isolation
- Project Isolation
- Role Based Access
- Row Level Security
- Permission Evaluation

Everything must work together.

Nothing is trusted from the client.

---

# Objective

Implement a production-grade authorization system that guarantees:

A user can never access data they do not own or have permission to access.

This applies to:

Database

REST APIs

Realtime

Storage

Images

Videos

Workflows

Coding Projects

Runtime Management

Everything.

---

# Security Model

The platform uses five security layers.

Layer 1

Authentication

↓

Layer 2

Tenant Verification

↓

Layer 3

Project Membership

↓

Layer 4

Role Evaluation

↓

Layer 5

Object Ownership

Every request must pass every applicable layer.

---

# Authentication

Authentication must verify:

Identity

Session

JWT

Expiration

Revocation

Disabled User

Deleted User

Suspended User

No request is processed before authentication.

---

# Authorization

Authorization determines:

Can Read

Can Create

Can Update

Can Delete

Can Execute

Can Invite

Can Share

Can Approve

Can Manage

Every operation requires authorization.

---

# Roles

Minimum roles:

Owner

Administrator

Manager

Developer

Contributor

Viewer

Billing

Auditor

Support

Custom Role

Roles must be configurable.

No hardcoded permission checks.

---

# Permission System

Permissions are database driven.

Examples

projects.read

projects.create

projects.update

projects.delete

projects.invite

projects.transfer

runtime.start

runtime.stop

runtime.delete

workflow.execute

coding.commit

coding.deploy

Every permission stored in database.

---

# Tenant Isolation

Every database query verifies:

tenant_id

No exceptions.

A user from Tenant A must never retrieve:

Projects

Messages

Workflows

Images

Videos

Budgets

Logs

Costs

Assets

from Tenant B.

---

# Project Isolation

Every query verifies:

project_id

Project members cannot access another project.

Private conversations remain private.

Shared conversations require explicit permissions.

---

# Ownership

Some resources require ownership.

Examples

Conversation

Workflow

Coding Project

Image

Video

Approval

Integration

Owner-only operations must verify ownership.

---

# Supabase Row Level Security

Every production table requires RLS.

Required operations:

SELECT

INSERT

UPDATE

DELETE

Every policy must explicitly define:

Allowed

Denied

Anonymous

Authenticated

Service Role

Owner

Collaborator

Viewer

No default access.

---

# Required SQL Helper Functions

Implement and validate:

is_project_owner()

is_project_member()

get_project_role()

has_project_permission()

can_access_conversation()

can_edit_conversation()

can_access_asset()

can_manage_runtime()

All helper functions must be tested.

---

# Required Policies

Every protected table requires policies.

Minimum tables:

projects

project_members

conversations

messages

workflow_definitions

workflow_runs

coding_projects

coding_files

runtime_pools

gpu_profiles

integrations

images

videos

assets

audit_logs

cost_events

usage_events

notifications

budgets

organizations

No production table may exist without policies.

---

# API Authorization

Every endpoint must verify:

Authentication

Tenant

Project

Permission

Ownership

Examples

GET

POST

PUT

PATCH

DELETE

Never rely on frontend checks.

---

# Service Authorization

Services must validate permissions before performing business logic.

Repositories never authorize.

---

# UI Authorization

The frontend hides unavailable actions.

However

Hidden buttons are NOT security.

Backend authorization remains mandatory.

---

# Realtime Authorization

Realtime subscriptions verify:

Tenant

Project

Permission

A user cannot subscribe to unauthorized channels.

---

# Storage Authorization

Every uploaded asset verifies:

Tenant

Project

Permission

Ownership

Images

Videos

Documents

Exports

Attachments

All protected.

---

# Audit Logging

Every authorization failure logs:

Actor

Tenant

Project

Permission

Resource

Timestamp

Reason

No sensitive data.

---

# Security Events

Generate audit events for:

Failed Login

Permission Denied

Ownership Violation

Cross Tenant Attempt

Cross Project Attempt

Privilege Escalation

Role Change

Invitation Acceptance

Invitation Revocation

---

# Unit Tests

Verify

Permission Resolution

Role Resolution

Ownership

Helper Functions

Policy Evaluation

---

# Integration Tests

Verify

Repository

Service

Authorization

API

Database

Together.

---

# API Tests

Every endpoint requires:

Authorized User

Unauthorized User

Wrong Tenant

Wrong Project

Expired Session

Disabled User

Suspended User

Anonymous User

---

# RLS Tests

Every table requires:

Owner

Collaborator

Viewer

Non-member

Wrong Tenant

Wrong Project

Anonymous

Authenticated

Service Role

All CRUD operations.

---

# Playwright

Verify:

Buttons hidden correctly

Unauthorized navigation

Forbidden operations

Session expiration

Permission updates

Realtime permission changes

---

# Security Tests

Verify

JWT validation

Replay protection

Session expiration

Privilege escalation

Permission inheritance

Cross tenant attacks

Cross project attacks

Injection attempts

---

# Performance

Authorization checks should:

Use indexes

Avoid full scans

Cache permission resolution where safe

Target:

<10ms average permission evaluation

---

# Acceptance Checklist

☐ Authentication implemented

☐ Authorization implemented

☐ Roles implemented

☐ Permissions database-driven

☐ Helper SQL functions implemented

☐ All RLS policies implemented

☐ API authorization complete

☐ Service authorization complete

☐ Storage authorization complete

☐ Realtime authorization complete

☐ Audit logging complete

☐ Security events implemented

☐ Unit tests pass

☐ Integration tests pass

☐ API tests pass

☐ RLS tests pass

☐ Playwright passes

☐ Security tests pass

☐ CI passes

---

# What Does NOT Count

Not complete if:

Permission checks only exist in frontend

Policies missing

Helper SQL missing

Service role bypasses everything

Hardcoded permissions

Missing ownership checks

Missing audit events

Skipped RLS tests

Disabled authorization

TODO comments

Placeholder policies

---

# Evidence Required

SQL migrations

RLS policies

Helper functions

Permission tables

API tests

Security tests

Playwright

Authorization reports

Audit reports

---

# Exit Criteria

Phase 02 is COMPLETE only when:

Every protected resource enforces authorization.

Every production table has validated RLS.

Every API verifies authorization.

No cross-tenant or cross-project access is possible.

All required tests pass.

Only then may Phase 03 begin.

---

End of Phase 02
