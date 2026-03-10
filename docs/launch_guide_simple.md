# 🚀 Launching Sherpa: The "Simple Language" Guide

Welcome to your project! This guide is for when you are ready to move Sherpa from your computer to the internet so real businesses can use it.

## 1. Where does the app live?
Imagine your app is a house. We need to put it on a piece of land so people can visit it. We use two different "landlords":

*   **Vercel:** Think of this as the **Front Door**. It hosts the website that users see and click on. It's fast and easy.
*   **Railway:** Think of this as the **Engine Room**. It hosts the "brain" (AI), the database (where names and dates are kept), and the "clock" (the scheduler that sends reminders).

---

## 2. Step-by-Step Setup

### Phase A: The Engine Room (Railway.app)
1.  **Create an Account:** Go to [Railway.app](https://railway.app) and log in with your GitHub.
2.  **Add the Database:** Click "Provision PostgreSQL." This creates your digital filing cabinet.
3.  **Add the Cache:** Click "Provision Redis." This is a "temporary memory" the AI uses to keep track of tasks.
4.  **Connect your Code:**
    *   Click "New Service" > "GitHub Repo" and select your **sherpa** project.
    *   **Crucial:** You need to tell Railway to look inside the `/backend` folder.
5.  **Setting the Instructions:** In the "Variables" tab, you'll need to paste some settings (like a password for your app). I will give you a list of these when you are ready.

### Phase B: The Front Door (Vercel.com)
1.  **Create an Account:** Go to [Vercel.com](https://vercel.com) and connect your GitHub.
2.  **Import Project:** Select your **sherpa** project.
3.  **Point to Frontend:** Tell Vercel the website is in the `/frontend` folder.
4.  **Connect to Engine:** You will paste the address of your Railway Engine here so the website knows who to talk to.

---

## 3. What do I need to prepare? (The "Ingredients")
Before you start, make sure you have these things ready:

1.  **A GitHub Account:** This is where your code lives.
2.  **An OpenAI Account:** To get your "API Key" (the AI's password).
3.  **A Google Cloud Account:** To let users connect their calendars.
4.  **A Credit Card:** Both Vercel and Railway have free versions to start, but for a "real" business app that never sleeps, you'll eventually spend about $15/month total.

---

## 4. Key Terms to Know
*   **Repo (Repository):** Your project folder on GitHub.
*   **Deploy:** Sending your code to the landlords (Vercel/Railway) so it becomes a live website.
*   **Environment Variables:** Special "secret settings" (like your AI password) that we don't put in the code for safety.
*   **Webhook:** A "phone line" that lets WhatsApp or Telegram call your app when a client sends a message.

---

## 5. Don't Panic!
I (the AI) have built the app to be "production ready." This means once you set up these accounts and paste your keys, everything is already wired up to work together.

**When you are ready to try the first one, just say "Let's start with Railway" and I will walk you through it click-by-click.**
