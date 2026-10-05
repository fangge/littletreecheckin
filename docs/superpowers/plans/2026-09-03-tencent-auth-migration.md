# 腾讯云自建认证迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Supabase Auth from the application and run authentication entirely through Express and the existing Lighthouse MySQL 8 database.

**Architecture:** Add local bcrypt-backed users, short-lived JWT access tokens, hashed refresh sessions, and one-time password reset tokens. Keep existing profile and child UUIDs unchanged so imported business data remains attached to the three migrated accounts.

**Tech Stack:** React 19, TypeScript, Express 4, MySQL 8, `bcryptjs`, `jsonwebtoken`, Vite, Node test runner.

---

### Task 1: Add authentication schema and core service

**Files:**
- Modify: `server/db/schema.sql`
- Create: `server/src/services/authService.ts`
- Test: `server/test/authService.test.ts`

- [ ] Write failing tests for bcrypt password verification, access-token claims, hashed refresh sessions, token expiry, and one-time reset-token consumption.
- [ ] Run `pnpm --dir server test test/authService.test.ts` and confirm failure because the service does not exist.
- [ ] Add `auth_users`, `auth_sessions`, and `password_reset_tokens` tables to the MySQL schema.
- [ ] Implement the minimum service functions for password hashing, login verification, JWT signing/verification, refresh-session rotation, and reset-token hashing/consumption.
- [ ] Run the focused test and then all server tests.

### Task 2: Replace backend Supabase authentication

**Files:**
- Modify: `server/src/middleware/auth.ts`
- Modify: `server/src/routes/auth.ts`
- Modify: `server/src/types.ts`
- Delete: `server/src/config/supabase.ts`
- Test: `server/test/authRoutes.test.ts`

- [ ] Write failing route tests for register, login, `/me`, refresh, logout, password change, reset password, and `must_change_password`.
- [ ] Run the focused tests and verify they fail before implementation.
- [ ] Implement local auth endpoints and use the existing query-builder/database adapter for profile and child reads/writes.
- [ ] Preserve the existing `/register-children` contract and the three migrated UUIDs.
- [ ] Change middleware to verify local JWTs and load the local auth user; retain parent-role authorization behavior.
- [ ] Run route tests and all server tests.

### Task 3: Replace frontend Supabase Auth usage

**Files:**
- Modify: `src/services/api.ts`
- Modify: `src/contexts/AuthContext.tsx`
- Modify: `src/views/Login.tsx`
- Modify: `src/views/Register.tsx`
- Modify: `src/views/ForgotPassword.tsx`
- Modify: `src/views/Profile.tsx`
- Delete: `src/lib/supabase.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] Add local-token request helpers and refresh-on-401 behavior.
- [ ] Replace login, registration, logout, password confirmation, password change, reset-request, and reset-submit calls with local API calls.
- [ ] Add the forced-password-change state to the auth context and UI flow.
- [ ] Remove the Supabase package and all frontend Supabase imports.
- [ ] Run `pnpm lint` and `pnpm build`.

### Task 4: Import the three existing accounts and document migration

**Files:**
- Create: `server/scripts/import-auth-users.mjs`
- Modify: `server/scripts/import-backup.mjs`
- Modify: `.env.tencent.example`
- Modify: `docs/tencent-cloud.md`
- Modify: `docs/deployment.md`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`

- [ ] Add an idempotent server-side importer that creates the three supplied accounts with their original UUIDs, a bcrypt hash of the interactive migration password, verified status, and forced-password-change flag.
- [ ] Ensure the importer verifies or creates matching `profiles` rows without altering business data.
- [ ] Add deployment commands that run the schema and auth import without printing passwords or secrets.
- [ ] Remove Supabase Auth environment variables and migration instructions from Tencent deployment documentation.
- [ ] Verify `rg -n "supabase|SUPABASE|@supabase" src server package.json` has no runtime references.

### Task 5: Verify local and deployed behavior

**Files:**
- Modify: `deploy/deploy.sh`
- Modify: `deploy/ecosystem.config.cjs`
- Modify: `deploy/nginx.conf`

- [ ] Run `pnpm --dir server test`, `pnpm --dir server build`, `pnpm lint`, `pnpm build`, `git diff --check`, and `diff -u AGENTS.md CLAUDE.md`.
- [ ] Upload the updated package without local environment files, certificates, or `node_modules`.
- [ ] Execute the schema/auth importer on Lighthouse and verify the three UUIDs and profile counts without exposing password hashes.
- [ ] Start PM2 and Nginx, then verify `/health`, `/`, local login, `/api/v1/auth/me`, logout, and forced password change.
- [ ] Confirm MySQL remains bound to `127.0.0.1:3306` and no Supabase configuration is present on the server.
