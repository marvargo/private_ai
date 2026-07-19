# Phase 03 — Optional Projects Architecture

Version: 1.0

---

# Purpose

This phase defines the Project architecture of the platform.

Projects are OPTIONAL.

Every user must be able to work without creating a project.

Projects exist only to organize work.

Nothing in the platform should force project creation.

---

# Objective

Support both:

Personal Workspace

and

Project Workspace

without duplicating functionality.

Every feature must support both modes.

---

# Philosophy

A project is an organizational container.

Projects do NOT create separate applications.

The same platform supports:

Personal work

Team work

Enterprise work

Shared work

---

# Workspace Types

The platform supports two workspace types.

## Personal Workspace

Every user has exactly one.

Characteristics

Private

Cannot be deleted

Cannot have members

Cannot transfer ownership

Contains personal conversations

Personal coding projects

Personal workflows

Personal images

Personal videos

Personal integrations

Personal documents

---

## Project Workspace

User created.

Characteristics

Multiple members

Roles

Permissions

Ownership

Invitations

Budgets

Runtime sharing

Shared conversations

Shared coding

Shared workflows

Shared assets

---

# Data Ownership

Every resource belongs to ONE of two locations.

Personal Workspace

OR

Project Workspace

Never both.

---

# Nullable Project

Every applicable table supports:

project_id

NULL

Meaning

Personal Workspace

NOT

Unknown

NOT

Invalid

NULL explicitly means:

Owned by Personal Workspace.

---

# Features Supporting Personal + Project

The following must support BOTH modes.

Conversations

Messages

Coding Projects

Workflow Definitions

Workflow Runs

Runtime Sessions

Images

Videos

Documents

Assets

Integrations

Notes

Prompts

Templates

Models

Knowledge

Exports

Reports

Search

Everything.

---

# Moving Resources

Every resource must support:

Move to Project

Move to Personal

Move between Projects

Copy to Project

Duplicate

Archive

Restore

---

# Project Creation

Required fields

Name

Description

Icon

Color

Visibility

Owner

Tenant

Timezone

Default Language

Created Date

---

# Project Settings

Editable

Name

Description

Visibility

Icon

Theme

Members

Roles

Permissions

Storage Limits

Runtime Limits

Budgets

Feature Flags

Default AI

Default Runtime

---

# Project Dashboard

Every project contains

Overview

Conversations

Coding

Workflows

Images

Videos

Integrations

Runtime

Members

Activity

Costs

Usage

Settings

---

# Membership

Each project supports

Owner

Administrator

Manager

Developer

Contributor

Viewer

Billing

Auditor

Support

Custom

---

# Invitations

Support

Email

Link

Organization Directory

Pending

Accepted

Rejected

Expired

Revoked

---

# Personal Workspace Rules

Cannot delete.

Cannot archive.

Cannot transfer ownership.

Cannot invite members.

Always exists.

---

# Project Lifecycle

Create

Edit

Archive

Restore

Duplicate

Transfer Ownership

Delete

Soft Delete

Permanent Delete

---

# Search

Search supports

Personal

Single Project

Multiple Projects

Entire Organization

---

# Global Navigation

User can switch between

Personal Workspace

↓

Project A

↓

Project B

↓

Project C

without logging out.

---

# Context

Every AI request automatically knows

Workspace Type

Project

Tenant

Members

Permissions

Knowledge

Runtime

Budgets

Integrations

History

---

# URLs

Examples

/chat

Personal

/projects/project-id/chat

Project

Same UI

Different Context

---

# Runtime Sharing

Project members share

Runtime

Models

Costs

Budgets

Images

Videos

Coding

Workflow executions

unless disabled.

---

# Storage

Every asset belongs to

Personal Workspace

OR

Project

Never orphaned.

---

# Activity

Every project records

Create

Edit

Delete

Share

Move

Copy

Execute

Approve

Reject

Deploy

Runtime

Costs

Members

---

# Notifications

Support

Personal

Project

Organization

Mention

Assignment

Approval

Invitation

Deployment

Workflow

---

# APIs

Required

Create Project

Update Project

Delete Project

Archive

Restore

Transfer Ownership

Invite

Accept

Reject

List Members

Move Resources

Copy Resources

Search

Recent Projects

Favorite Projects

---

# UI Requirements

Project Switcher

Project Dashboard

Project Cards

Recent Projects

Favorite Projects

Create Wizard

Settings

Members

Permissions

Budgets

Runtime

Costs

Activity

---

# Database

Tables

projects

project_members

project_roles

project_permissions

project_invitations

project_activity

project_settings

project_favorites

project_recent

---

# Security

Verify

Tenant

Membership

Role

Permission

Ownership

Project Isolation

---

# Unit Tests

Project CRUD

Move

Copy

Archive

Restore

Transfer

Permissions

Favorites

Recent

---

# Integration Tests

Project + Conversations

Project + Coding

Project + Workflow

Project + Runtime

Project + Images

Project + Videos

---

# Playwright

Create Project

Switch Project

Move Conversation

Move Coding Project

Move Workflow

Invite Member

Accept Invitation

Transfer Ownership

Delete Project

Restore Project

---

# Acceptance Checklist

☐ Personal Workspace exists

☐ Project Workspace exists

☐ Nullable project_id implemented

☐ Move implemented

☐ Copy implemented

☐ Transfer implemented

☐ Dashboard implemented

☐ Membership implemented

☐ Invitations implemented

☐ APIs implemented

☐ UI implemented

☐ Tests pass

☐ Playwright passes

☐ Authorization verified

☐ Documentation updated

---

# What Does NOT Count

Not complete if

Projects mandatory

Personal Workspace missing

Move not implemented

Copy not implemented

Invitation incomplete

Roles hardcoded

Dashboard placeholder

Missing tests

TODOs

Mock data

---

# Evidence Required

Schema

Migration

Repositories

Services

API

UI

Tests

Playwright

Authorization

Screenshots

Performance

---

# Exit Criteria

Phase 03 is COMPLETE only when:

Every supported resource can exist in either:

Personal Workspace

OR

Project Workspace

without changing functionality.

All acceptance criteria pass.

Only then may Phase 04 begin.

---

End of Phase 03
