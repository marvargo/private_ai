# Phase 12 — Lifecycle and GPU configuration

Make runtime lifecycle and GPU profiles database-authoritative and editable without deployment. Seed idle timeout 300 seconds, maximum lifetime 1800 seconds, auto-start/stop enabled, terminate-after-stop enabled, and minimum runtimes zero.

Seed editable preferences: Qwen pool uses 1x RTX 5090; Llama pool uses 8x H200. Store provider identifier, GPU count, VRAM, system RAM, CPU, pricing basis, normalized rate, tensor parallelism, context, image, disk, compatibility, priority, enablement, approval requirement, and maximum hourly cost.

Every launch stores an immutable configuration snapshot. Add preflight checks for availability, aggregate VRAM, topology, image/model compatibility, software versions, context, storage, and projected cost. Implement CRUD UI/APIs, rollout modes, version history, validation, and tests.