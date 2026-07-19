# Continuous execution rules

Codex resumes from the first incomplete implementation item and continues phase-by-phase. It does not wait for a separate confirmation between normal phases.

After each phase or coherent subphase:

1. Run applicable migration/static checks.
2. Run lint, typecheck, tests, and build.
3. Run relevant browser, security, worker, and provider validation.
4. Commit and push to `main`.
5. Verify local and remote SHAs match.
6. Update implementation and validation ledgers.
7. Continue to the next incomplete item.

External validation problems are recorded in `docs/BLOCKERS.md` and do not prevent unrelated implementation. Execution may end when all phases are attempted, the host task ends, a paid operation needs approval, or repository safety would be at risk.