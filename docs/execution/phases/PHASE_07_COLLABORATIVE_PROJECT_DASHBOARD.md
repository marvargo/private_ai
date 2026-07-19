# Phase 07 — Collaborative Project Dashboard

Version: 1.0

---

# Purpose

This phase defines the Project Dashboard.

The dashboard is the operational control center for every project.

It must provide real-time visibility into everything occurring inside a project.

This is not a reporting page.

It is a live operational workspace.

---

# Objective

Provide a customizable, realtime dashboard supporting:

Projects

AI

Coding

Runtime

Workflows

Images

Videos

Costs

Budgets

Activity

Approvals

Notifications

Executives

Managers

Developers

Operations

Support

Every role should see the information most relevant to them.

---

# Dashboard Philosophy

Every dashboard answers:

What is happening?

Who is working?

What is blocked?

What needs attention?

What costs are increasing?

Is AI healthy?

Are runtimes healthy?

Are deployments healthy?

Are workflows succeeding?

Everything should be visible immediately.

---

# Dashboard Layout

Every dashboard consists of configurable widgets.

Widgets are modular.

Widgets may be:

Hidden

Pinned

Moved

Resized

Collapsed

Expanded

Duplicated

Saved

Shared

Every user can personalize the layout.

---

# Default Dashboard Widgets

## Overview

Project Name

Health

Owner

Members

Active Users

Recent Activity

Open Issues

Current Runtime

Monthly Cost

Budget Remaining

Status

---

## AI Activity

Active AI Sessions

Queued Jobs

Completed Jobs

Failed Jobs

Average Response Time

Average Cost

Model Routing Summary

Inference Trends

Token Usage

Conversation Activity

---

## Coding

Open Coding Projects

Recent Commits

Build Status

Deployments

Pull Requests

Code Reviews

Test Coverage

Build Failures

Branch Health

---

## Runtime Management

Running Runtimes

Stopped Runtimes

GPU Usage

Memory Usage

CPU Usage

Queue Length

Active Workers

Scaling Events

Health Status

---

## Workflow Activity

Running

Queued

Succeeded

Failed

Average Duration

Retry Count

Execution History

Approvals Pending

---

## Images

Images Generated Today

Failed Jobs

Storage Used

Recent Images

Pending Jobs

Average Generation Time

---

## Videos

Rendering

Queued

Completed

Failed

GPU Usage

Estimated Completion

Storage

---

## Costs

Today's Cost

Monthly Cost

Runtime Cost

Image Cost

Video Cost

Workflow Cost

Storage Cost

Forecast

Budget Remaining

---

## Notifications

Unread

Mentions

Approvals

Warnings

Budget Alerts

Runtime Alerts

Workflow Failures

Deployment Failures

---

## Executive KPIs

Project Health

Delivery Progress

Budget Usage

Resource Allocation

Deployment Frequency

AI Adoption

Workflow Success Rate

Risk Score

Overall Readiness

---

# Widget Requirements

Every widget must support:

Loading

Realtime Updates

Error State

Empty State

Refresh

Resize

Collapse

Expand

Permissions

Accessibility

No widget may display mocked data.

---

# Dashboard Personalization

Users may:

Save Layout

Reset Layout

Share Layout

Create Multiple Dashboards

Default Dashboard

Executive Dashboard

Engineering Dashboard

Operations Dashboard

Finance Dashboard

Support Dashboard

Custom Dashboard

---

# Executive Dashboard

Designed for leadership.

Displays:

Health

Delivery

Budget

Forecast

Top Risks

Blocked Initiatives

Critical Runtime Issues

AI Usage

Deployment Readiness

Business KPIs

No engineering details unless expanded.

---

# Engineering Dashboard

Displays:

Runtime

GPU

Queues

Coding

Tests

Deployments

Workflow Failures

Logs

Performance

Recent Errors

---

# Operations Dashboard

Displays:

Incidents

Availability

Queues

Workers

Runtime Pools

Autoscaling

Storage

Bandwidth

Alerts

Recovery Status

---

# Finance Dashboard

Displays:

Costs

Budgets

Forecast

Monthly Spend

AI Spend

GPU Spend

Storage

Chargeback

Department Costs

Project Costs

---

# Dashboard Search

Search everything displayed.

Support:

Widgets

Members

Tasks

Conversations

Images

Videos

Coding Projects

Workflows

Notifications

Activity

---

# Realtime

Every dashboard updates automatically.

Events include:

Conversation Created

Message Added

Workflow Started

Workflow Completed

Runtime Started

Runtime Stopped

Coding Commit

Deployment

Budget Warning

Notification

Member Joined

Approval Requested

Issue Created

Risk Updated

No manual refresh required.

---

# AI Summary

Dashboard includes an AI-generated project summary.

Summarize:

Current Progress

Health

Risks

Budget

Blocked Work

Recent Successes

Upcoming Deadlines

Suggested Actions

Summary refreshes automatically.

---

# Activity Feed

Realtime chronological feed.

Includes:

Conversations

Coding

Workflows

Images

Videos

Runtime

Deployments

Comments

Approvals

Assignments

Notifications

Searchable and filterable.

---

# Dashboard APIs

Required APIs:

Overview

Widgets

Metrics

Realtime Feed

Costs

Budgets

Runtime

Workflow

Coding

Images

Videos

Search

Customization

Preferences

Everything typed.

---

# Database

Required tables:

dashboard_layouts

dashboard_widgets

dashboard_preferences

dashboard_filters

dashboard_saved_views

dashboard_metrics_cache

dashboard_activity

dashboard_ai_summary

dashboard_recent

All protected with RLS.

---

# Security

Dashboard respects:

Tenant

Project

Role

Permission

Ownership

Hidden widgets

Restricted metrics

Executives see executive metrics.

Developers see engineering metrics.

Finance sees finance metrics.

Everything permission aware.

---

# Unit Tests

Widget Rendering

Layout Persistence

Preferences

Filtering

Sorting

Metrics

Realtime

Permissions

---

# Integration Tests

Dashboard + Runtime

Dashboard + AI

Dashboard + Coding

Dashboard + Workflow

Dashboard + Images

Dashboard + Videos

Dashboard + Costs

Dashboard + Notifications

Dashboard + Activity

---

# Playwright

Verify:

Widget Resize

Widget Move

Widget Hide

Widget Show

Realtime Updates

Saved Views

Executive Dashboard

Engineering Dashboard

Finance Dashboard

Search

Filters

Accessibility

Everything interactive.

---

# Acceptance Checklist

☐ Dashboard implemented

☐ Widgets configurable

☐ Realtime updates implemented

☐ AI summary implemented

☐ Executive dashboard implemented

☐ Engineering dashboard implemented

☐ Finance dashboard implemented

☐ Operations dashboard implemented

☐ Activity feed implemented

☐ Search implemented

☐ Personalization implemented

☐ APIs complete

☐ Database complete

☐ Security verified

☐ Unit Tests pass

☐ Integration Tests pass

☐ Playwright passes

☐ Documentation updated

---

# What Does NOT Count

Placeholder widgets

Static metrics

Hardcoded values

Manual refresh only

No personalization

No realtime

No AI summary

No search

Mock APIs

TODO comments

Skipped tests

---

# Evidence Required

Schema

Migration

Repositories

Services

Dashboard

Widgets

Realtime

AI Summary

Search

Tests

Playwright

Performance

Authorization

---

# Exit Criteria

Phase 07 is COMPLETE only when every project has a production-grade realtime dashboard providing live operational visibility into AI, coding, workflows, runtimes, costs, collaboration, activity and business KPIs.

All acceptance criteria must pass.

Only then may Phase 08 begin.

---

End of Phase 07
