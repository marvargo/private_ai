# Phase 20 — Video Studio and long-form movies

Implement persistent movie projects, scripts, scenes, shots, clips, characters, style references, audio tracks, timelines, render jobs, attempts, and exports.

Support text-to-video, image-to-video, video-to-video, clip extension, regeneration, captions, timeline editing, audio interfaces, rendering, cancellation, retry, and resume. A long movie is a multi-stage asynchronous pipeline: outline, screenplay, scenes, shots, queued clips, continuity references, assembly, audio/captions, render, export.

A 30-minute production must never be one synchronous model call. Persist every stage and attempt so work resumes after restart. Provide progress, failed-item retry, version history, project permissions, budget checks, storage lifecycle, and Playwright/worker tests.