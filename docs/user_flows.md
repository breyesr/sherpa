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

## Flow 4: Trade Field Operations (TRADE Vertical)
The goal is to provide reps with the context they need for physical store visits.

### Step 1: Prep & Briefing
- **User Action:** Rep opens a Client (Retailer) profile in the **Trade Hub**.
- **Action:** Clicks "Visit Brief" in the **Trade Context** tab.
- **Outcome:** AI generates a summary of the retailer's status, order history, and store locations.

### Step 2: Account Prioritization
- **User Action:** Manager reviews the Retailers list.
- **Action:** Clicks "Qualify Lead" for specific retailers.
- **Outcome:** AI provides a 1-10 score and category (High Value, Growth, at Risk), enabling targeted sales effort.

### Step 3: Physical Visit & Updates
- **User Action:** Rep visits the physical **Store**.
- **Action:** Records observations (Product levels, competitor activity) via **Store Notes**.
- **Outcome:** Context is immediately available for the next AI briefing.
