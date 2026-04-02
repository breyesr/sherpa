# Sherpa Bug Log

This document tracks all reported bugs, their investigation status, and resolutions.

## Active Bugs

### [BUG-004] Sign-out doesn't redirect to landing/login
- **Status:** Open
- **Severity:** Medium
- **Reproduction:** Click the "Sign Out" button in the sidebar.
- **Actual Behavior:** The user is signed out (token cleared) but the page stays on the dashboard.
- **Expected Behavior:** Immediate redirection to `/auth/login`.

### [BUG-005] Login loop/buggy state after re-authentication
- **Status:** Open
- **Severity:** Medium
- **Reproduction:** Sign out, then immediately log back in. Attempt to navigate using dashboard links.
- **Actual Behavior:** The site repeatedly redirects to login or loses session state despite successful login.
- **Expected Behavior:** Seamless navigation after re-authentication.

---

## Resolved Bugs

### [BUG-001] Tomorrow's data showing in Today's Dashboard widget
- **Status:** Resolved
- **Severity:** High
- **Reproduction:** Use a business profile with a non-UTC timezone (e.g., America/Mexico_City). View dashboard at night.
- **Root Cause:** Backend was using `datetime.utcnow()` for "Today" boundaries, causing a shift for local timezones.
- **Fix:** Implemented `zoneinfo` logic in `get_business_stats` to respect business-specific timezones.
- **Resolution Date:** 2026-04-01

### [BUG-002] "Business profile not found" error for Admin accounts
- **Status:** Resolved
- **Severity:** Medium
- **Reproduction:** Log in as a superadmin who skipped onboarding. Try to update Business Profile in Settings.
- **Actual Behavior:** 404 error returned because the profile record didn't exist.
- **Root Cause:** PATCH endpoint assumed the profile record always existed.
- **Fix:** Refactored `PATCH /business/me` into an "Upsert" (Update or Create) logic.
- **Resolution Date:** 2026-04-01

### [BUG-003] Business Profile Update 422 Validation Error
- **Status:** Resolved
- **Severity:** Medium
- **Reproduction:** Attempt to save Business Profile from Settings.
- **Actual Behavior:** "Failed to update business profile" toast.
- **Root Cause:** Frontend was sending internal fields (like `is_active`, `trial_expires_at`) that weren't allowed in the Pydantic update schema.
- **Fix:** Added payload sanitization in `GeneralSettings.tsx` to only send allowed fields.
- **Resolution Date:** 2026-04-01
