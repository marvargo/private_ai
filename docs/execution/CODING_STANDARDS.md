# Coding Standards

Version: 1.0

---

# Purpose

This document defines the mandatory coding standards for the WyndMe Private AI Platform.

Every engineer must follow these standards.

Every AI engineer must follow these standards.

Consistency is more important than personal preference.

---

# General Principles

Code should be:

Readable

Simple

Maintainable

Predictable

Secure

Extensible

Typed

Production Quality

---

# Language

Backend

TypeScript

Frontend

TypeScript

Never introduce JavaScript.

---

# Strict TypeScript

Always enable strict mode.

Never use:

any

unknown (unless required)

implicit any

non-null assertions unless justified

Always prefer explicit types.

---

# Naming

Variables

camelCase

Functions

camelCase

Types

PascalCase

Interfaces

PascalCase

Enums

PascalCase

Constants

UPPER_SNAKE_CASE

Files

kebab-case

Folders

kebab-case

---

# File Organization

One responsibility per file.

Avoid:

1000-line files

Multiple unrelated classes

Mixed concerns

---

# Folder Structure

Backend

repositories/

services/

controllers/

validators/

middleware/

routes/

jobs/

workers/

config/

errors/

logging/

types/

utils/

Frontend

components/

pages/

hooks/

contexts/

services/

stores/

types/

utils/

styles/

---

# Components

Each React component should have one responsibility.

Avoid:

Massive pages

Large conditional rendering

Business logic inside components

Business logic belongs inside services or hooks.

---

# Hooks

Custom hooks

One responsibility

Reusable

Typed

No UI inside hooks.

---

# Services

Business logic only.

Never contain:

SQL

React

HTTP

DOM

Services orchestrate work.

---

# Repositories

Repositories own persistence.

Repositories never:

Authorize

Validate business rules

Render UI

Repositories perform database operations only.

---

# Validation

All API input validated.

Prefer

Zod

Never trust client input.

---

# Errors

Never throw raw Error.

Always throw structured application errors.

Every error contains

Code

Message

Safe Details

Correlation ID

Timestamp

Never expose

SQL

Secrets

Provider responses

Passwords

Tokens

---

# Logging

Never

console.log production code.

Use centralized logging.

Log

Errors

Warnings

Audit

Security

Performance

Never log

Passwords

Tokens

Secrets

Prompts

PII

---

# Async

Always use async/await.

Avoid nested promises.

Avoid callback chains.

---

# Functions

Small.

Single responsibility.

Prefer under 50 lines.

Extract repeated logic.

---

# Classes

Only when appropriate.

Prefer functions.

Avoid unnecessary inheritance.

Favor composition.

---

# Dependencies

Avoid unnecessary packages.

Prefer standard libraries.

Every dependency requires justification.

---

# Configuration

Never hardcode

timeouts

URLs

limits

GPU types

retry counts

budgets

feature flags

Everything configurable belongs in configuration.

---

# SQL

Every query:

Parameterized

Indexed

Typed

Reviewed

No string concatenation.

---

# API Design

REST

Predictable

Consistent

Versionable

Idempotent where appropriate

Standard HTTP status codes

---

# Pagination

Required on all large collections.

Never return unlimited records.

---

# Sorting

Server-side.

Never rely on frontend sorting.

---

# Filtering

Server-side.

---

# Security

Validate everything.

Authorize everything.

Escape everything.

Sanitize everything.

Least privilege.

Never bypass authorization.

---

# Authentication

Never trust frontend identity.

Always validate server-side.

---

# Authorization

Every mutation requires authorization.

Every read requires authorization.

---

# Secrets

Never commit:

Keys

Passwords

Tokens

Certificates

Private keys

Never expose secrets in logs.

---

# Comments

Good comments explain

WHY

Bad comments explain

WHAT

Code should explain WHAT.

---

# Documentation

Every exported function requires documentation.

Every API documented.

Every database change documented.

---

# Dead Code

Remove it.

Never leave unused code.

---

# TODO

Never use TODO to finish later.

If work is incomplete:

Feature remains incomplete.

---

# Performance

Avoid

N+1 queries

Repeated fetches

Blocking loops

Large payloads

Unnecessary rendering

Optimize before deployment.

---

# Accessibility

Every UI must support

Keyboard navigation

Screen readers

Focus management

ARIA where required

---

# Responsive Design

Desktop

Tablet

Mobile

All required.

---

# Testing

Every new feature

Unit Tests

Integration Tests

API Tests

Playwright

Authorization Tests

Regression Tests

No exceptions.

---

# Git

Commit messages

Clear

Descriptive

Atomic

No "fix"

No "update"

Examples

Add Runtime Pool repository

Implement Project Invitation API

Add RLS policies for Workflows

---

# Pull Requests

Small

Focused

Reviewed

Passing CI

---

# Refactoring

Allowed only when

Behavior preserved

Tests updated

Documentation updated

---

# Technical Debt

Do not create new technical debt.

Reduce existing debt whenever practical.

---

# Final Rule

Write code you would be proud to maintain five years from now.

---

End of Document
