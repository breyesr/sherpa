# User Flows: Sherpa MVP

## Flow 1: Registration & Onboarding
The goal is to move the user from "Unknown" to "Live Dashboard" with minimum friction.

### Step 1: Sign Up
- **User Action:** Enters Email/Password.
- **UX Best Practice:** **"Success Feedback"** – Immediately show a success toast or message.
- **Decision:** Instead of forcing a second login, we will **Auto-Login** the user. This reduces 1 full step of friction.
- **Outcome:** Redirect straight to Step 1 of the Onboarding Wizard.

### Step 2: Onboarding Wizard (5 Steps)
- **Visuals:** Progress bar at the top (Step 1 of 5).
- **Navigation:** "Continue" and "Back" buttons.
- **Optionality:** A "Skip for now" link for users who just want to explore the dashboard.

## Flow 2: Authentication (Login)
- **User Action:** Enters credentials.
- **Success:** Redirect to Dashboard.
- **Failure:** Inline error message ("Invalid email or password").

## Flow 3: Post-Trial Activation
- **User Action:** Completes Step 5 of Onboarding.
- **Outcome:** Celebrate! Full-screen "Hooray" or subtle "Welcome to Sherpa" notification.
- **Destination:** Live Dashboard.
