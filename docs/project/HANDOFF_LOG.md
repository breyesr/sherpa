# Handoff Log

## [2026-05-23] - Login Redirection & Layout Fix
- **Task**: Resolved bug where login landing page persisted with a visible sidebar after authentication.
- **Action**: Modified `DashboardLayout.tsx` to hide the sidebar when unauthenticated and updated `LoginPage.tsx` to force a full page reload for server-side state sync.
- **Learning**: `router.push` in Next.js does not always guarantee that the next page request will include the newly set cookies if the page was previously prefetched; `window.location.href` is a reliable fallback for authentication state transitions.
