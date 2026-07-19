# Phase 10 — Privacy-safe analytics

Classify requests transiently and persist structured labels only. Store capability, category, subcategory, intent, content category, input/output types, requested/output duration, resolution, format, queue time, latency, tokens, estimated/actual cost, success, failure code, classification version, and confidence.

Never store prompt text, excerpts, decrypted content, filenames containing sensitive text, or raw provider responses. Implement analytics modes: standard, aggregate-only, minimal, and opted-out. Add configurable retention and minimum-cohort suppression before administrator drilldowns.

Build aggregate admin dashboards for usage, categories, Studio media, Coding, Workflows, latency, success, and cost. Add classification-versioning, opt-out, cohort, redaction, aggregation, authorization, and browser tests.