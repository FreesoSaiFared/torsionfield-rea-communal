# Adapter contract for original AI agents
The communalization layer must not replace or silently modify the original AI.
An agent that wants to use community tasks reads project.json and the local MCP
tool catalog, then asks for approval before binding native/tools-dependent actions.

## Integrator behavior
1. Discover the original project's legal scope and available agent tool catalog.
2. Classify an incoming agent-request as public-input and capability-specific.
3. Split only independently verifiable work into bounded public tasks.
4. Advertise exact adapter name, version, tool scope, evidence expectations,
   execution time and data visibility; never grant ambient host privileges.
5. Request explicit volunteer consent before using native analysis engines,
   shell commands, model inference, file upload or paid provider APIs.
6. Verify contributor receipts, reproduce or sample outcomes and attach
   resulting findings to an Issue or pull request for maintainers to accept.
7. Keep private device/session data out of public contributions.

Until a reviewed adapter is present, agent-request jobs are *proposals only*.
Browser compute is deliberately restricted to deterministic allowlisted routines.
Adding new agent support is a small explicit adapter, not rewriting the repo.
