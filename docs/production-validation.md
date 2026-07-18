# Production validation gates

The platform must not be called production-ready until all gates in `/admin/production/validation` are marked passed with evidence.

Required live gates:

- authenticated browser validation for regular users and administrators
- deployed API health/status validation
- deployed dashboard validation
- persistent worker health and restart validation
- monitoring and alert delivery validation
- controlled Llama 405B validation through Runtime Management only

The Llama 405B validation must use the Runtime Management launch policy and must capture diagnostics, model responses, streaming, backend validation, worker execution, Supabase persistence, cost rows, audit rows, and stop/delete cleanup. If any gate lacks evidence, production-ready remains `false`.
