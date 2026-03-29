# Deployment Security Checklist

This checklist is intended for production release sign-off.

## 1) Secrets and Identity

- [ ] Rotate all production secrets before release (JWT secret, DB credentials, email API keys, Cloudinary keys).
- [ ] Verify no secrets are committed in source, build logs, or CI artifacts.
- [ ] Enforce minimum secret length and randomness in deployment environment variables.
- [ ] Ensure admin bootstrap accounts use unique passwords and MFA where possible.

## 2) Transport and Network

- [ ] Enforce HTTPS end-to-end and redirect all HTTP traffic to HTTPS.
- [ ] Set strict reverse-proxy and host allowlist configuration.
- [ ] Restrict CORS origins to approved domains only.
- [ ] Confirm websocket origin policy matches approved frontend domains.

## 3) Auth, Sessions, and Tokens

- [ ] Use secure cookie policy in production: HttpOnly + Secure + SameSite=strict/lax as required.
- [ ] Ensure JWT expiry is short-lived and refresh flow is controlled.
- [ ] Verify account lockout/rate-limit behavior for login and password reset routes.
- [ ] Confirm password reset flow does not expose credentials over email or logs.

## 4) API and Input Security

- [ ] Verify request size limits are set on JSON, URL-encoded, and file upload handlers.
- [ ] Confirm file upload type/size validation and malware scanning (if available).
- [ ] Ensure HTML rendering paths are sanitized before output.
- [ ] Verify spreadsheet exports sanitize formula-like cell payloads.

## 5) Dependency and Build Hygiene

- [ ] Run `npm audit --omit=dev` for backend and frontend and record exceptions.
- [ ] Pin or override vulnerable transitive dependencies where safe.
- [ ] Generate and store SBOM (if pipeline supports it) for release traceability.
- [ ] Sign and archive build artifacts with release version metadata.

## 6) Runtime Hardening

- [ ] Confirm Helmet and related security headers are enabled in production.
- [ ] Disable debug endpoints and verbose stack traces in production responses.
- [ ] Confirm database indexes are healthy and startup logs contain no fatal warnings.
- [ ] Validate process manager restart policy and zero-downtime rollout settings.

## 7) Logging, Monitoring, and Response

- [ ] Ensure logs redact tokens, passwords, and personal secrets.
- [ ] Configure centralized alerting for auth failures, 5xx spikes, and abnormal traffic.
- [ ] Validate backup/restore workflow for MongoDB and file storage.
- [ ] Keep an incident runbook with owner contacts and rollback steps.

## 8) Post-Deploy Validation

- [ ] Execute smoke checks for auth, user CRUD, attendance verification, notifications, and exports.
- [ ] Verify websocket connectivity and event delivery after deployment.
- [ ] Confirm email delivery and template rendering in production.
- [ ] Record audit results, known residual risks, and approval sign-off.
