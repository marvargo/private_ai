# Phase 22 — Llama 405B live validation

Run only after Runtime Management, lifecycle, budgets, approvals, queues, and cleanup are operational.

Use the configured Llama 405B model with the editable preferred profile of 8x H200, tensor parallel 8, context 32768, idle timeout 300 seconds, maximum lifetime 1800 seconds, explicit billable approval, and automatic cleanup.

Validate image pull, startup diagnostics, model load, health, model listing, non-streaming chat, streaming chat, internal routing, worker task, browser chat, persistence, active-stream tracking, cost attribution, idle shutdown, deletion, and final provider reconciliation. Preserve sanitized logs and workflow evidence. Do not mark passed unless a real 405B completion is received and cleanup/cost verification succeeds.