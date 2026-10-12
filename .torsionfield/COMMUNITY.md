# Torsionfield Community / v1
The upstream agent and software remain unchanged. Community participation is an opt-in overlay.

## Supported task protocol
- POST /api/tasks {kind:"prime-range", title, start, end}: split 2000-integer work units.
- POST /api/tasks {kind:"digest-text", title, text}: one worker computes digest and text statistics.
- POST /api/tasks {kind:"agent-request", title, goal}: creates a *proposal* only. No arbitrary agent code runs.
- POST /api/lease {workerId}: one time-limited work lease, or null.
- POST /api/result {taskId,unitId,workerId,leaseId,result}: server independently verifies.
- GET /api/tasks, /api/project, /api/receipts, /api/health: read-only status.

## Safety and trust
Workers execute only audited algorithms embedded in compute-worker.mjs.
No arbitrary JavaScript, npm install, binaries or privileged MCP tool calls are delegated.
Submitted task inputs are public to other participating workers. No secrets or private source.
Agent requests do not execute until maintainers supply a reviewed adapter.
Hub binds to 127.0.0.1 by default: DO NOT expose it directly to the public Internet.
Remote publication requires authentication, per-user quotas, moderation, HTTPS and an authenticated gateway.
Receipts include SHA256 input/output and server verification, not trusted execution attestation.
Original author attribution, license, notices, README, code and assets are preserved.
Inherited GitHub Actions workflows are moved to upstream-workflows-disabled for review.
Publish gates are preliminary: manual source, legal, secret and license review is still required.

## Integration
- Local hub: node .torsionfield/hub.mjs
- Optional existing ABP fabric bridge: ABP_FABRIC_TOKEN_FILE=/path/to/owner-readable/token
- MCP: node .torsionfield/mcp.mjs (stdio), with ui://torsionfield/community
- ABP/Brave extension: load .torsionfield/extension as unpacked, or build via ABP Extension Foundry.
- Extension only opens the volunteer page; compute starts strictly after a click.

## Torsionfield community conversion promise
Any git-hosted AI/agent project can receive a common project manifest, work queue,
nonprivileged browser workers, contribution receipts and MCP discovery. Actual AI or native
capabilities require an explicit project-specific adapter and user permissions.
