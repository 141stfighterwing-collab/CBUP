# Changelog

All notable changes to the Cyber Brief Unified Platform (CBUP) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2026-04-05

### Fixed
- **CRITICAL: Agent EXE crashes on startup** — `$PSScriptRoot` is empty inside ps2exe-compiled EXEs, causing all 15 module dot-sources to fail with "Cannot bind argument to Path is null". Fixed by detecting EXE context and falling back to `[System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName`.
- **CRITICAL: Agent modules not bundled with EXE** — `build-exe.ps1` compiled the EXE but never copied the `modules/` directory to `dist/`. Added post-build step to copy all 15 modules alongside the EXE.
- **CRITICAL: PowerShell 5.1 compatibility** — Replaced all PS 7+ syntax across agent modules:
  - `??` null coalescing operator → `if/elseif` (CBUP-Registration.ps1)
  - `[Type]::new()` static constructors → `New-Object` (CBUP-API.ps1, CBUP-Signature.ps1)
  - Inline `try/catch` inside hashtable values → moved to helper function (CBUP-EDR-Process.ps1)
  - Removed PS 6+ `Join-String` from C2 command whitelist
- **Agent registration payload mismatch** — The agent sends `{ hostname, discovery: { OSName, OSVersion }, token }` but the server expected `{ agentId, hostname, osName, osVersion, authToken }` at top level. Server now normalizes both formats and auto-generates `agentId` if not provided.
- **Agent heartbeat payload mismatch** — The agent sends flat telemetry `{ AgentId, CPUTotalPercent, Memory: { UsedPercent } }` but the server expected `{ agentId, authToken, telemetry: { cpuPercent, memPercent } }`. Server now handles both formats.
- **C2 command polling auth mismatch** — Agent sends credentials via HTTP headers (`Authorization: Bearer`, `X-Agent-Id`) but server only checked query params. Now accepts both.
- **C2 command payload key mismatch** — Server returned `{ id, type, payload }` but agent reads `$Command.parameters`. Server now returns `{ id, type, parameters }`.
- **C2 command result field mismatch** — Agent sends `{ commandId, agentId, output }` but server expected `{ agentId, authToken, commandId, result }`. Server now accepts `output` field and auth from Bearer header.
- **ps2exe version compatibility** — Added dynamic parameter detection for `ps2exe` module (supports both old and new versions). Fixed GDI+ icon generation for PS 5.1 by explicitly casting pen widths to `[System.Single]`.

### Changed
- Version bumped across all components (agent, build script, server API, package.json)
- Agent module loading now has explicit error if modules/ directory is not found

## [2.4.0] - 2026-04-05

### Fixed
- **CRITICAL: DATABASE_URL path resolution** - Fixed `file:./db/custom.db` which resolved to `prisma/db/custom.db` (empty database) instead of the actual database at `db/custom.db`. Changed to `file:../db/custom.db` which correctly resolves from the Prisma schema directory to the project-root `db/` folder. This was the root cause of all "cannot sign in" issues.
- **Default auth mode** - Changed default from 'signup' to 'login' so users see the sign-in form first instead of the signup form.
- **Login error messages** - Improved error handling: "No account found" (404) vs "Invalid password" (401) vs "Rate limited" (429) instead of generic errors.
- **Rate limit error handling** - Frontend now properly handles 429 rate limit responses with a user-friendly message.
- **Login form** - Added visible default admin credentials hint on the login form so users know how to sign in for the first time.
- Removed stale `prisma/db/` directory that was created by incorrect path resolution.

### Security
- Added IP logging to failed login attempts for audit trail.
- Changed "password required" error from 401 to 400 (it's a validation error, not auth failure).

## [2.3.0] - 2026-04-04

### Added
- Default super admin auto-creation on first login (admin@cbup.io / CBUPadmin2024!)
- `ensureDefaultAdmin()` function in signup route seeds admin if no admin exists
- Security changelog documentation (SECURITY-CHANGELOG.md)

### Fixed
- NULL password users can now set their password on first login attempt
- Admin auto-creation fixes null-password seed users by setting default password

## [2.3.0-sec] - 2026-04-04

### Security
- Added `checkAuth()` to 10+ unprotected admin/agent API endpoints
- Implemented timing-safe token comparison (`crypto.timingSafeEqual`) for agent heartbeat, command-result, EDR scan, and commands endpoints
- Added body size limits (1MB) to agent registration, heartbeat, and EDR scan endpoints
- Stripped auth tokens from agent list API responses to prevent token leakage
- Removed all fake/hardcoded data from admin stats dashboard endpoint
- Replaced fake `?role=admin` query param auth with real token-based `checkAuth()` on tenant endpoints

## [2.2.0] - 2026-04-03

### Security
- Fixed 13 vulnerabilities (7 Critical, 4 High, 2 Medium)
- Removed all mock/hardcoded data from company portal views
- Added scrypt password hashing (replacing plaintext storage)
- Added rate limiting on auth endpoints (5 req/min per IP)
- Added email format validation and password strength requirements

### Changed
- Updated seed script to use scrypt hashing for all passwords
- Password format: `salt:hash` (hex-encoded scrypt)

## [2.1.0] - Earlier

### Added
- EDR agent management (registration, telemetry, commands, scans)
- Multi-tenant support
- Security alerts and briefs
- Dashboard with real-time monitoring
- Agent download endpoint for Windows PowerShell install scripts

### Fixed
- Fixed agents.filter crash
- Changed dev port to 3001 to avoid EADDRINUSE conflict
