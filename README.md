# 🍅 Pomodoro Intelligence

Welcome to **Pomodoro Intelligence**, a smart Pomodoro timer designed to boost your productivity. This application is built with modern web technologies and integrates with Supabase for backend services and, in the future, with AI to provide insights into your work patterns.

![Main App Screenshot](https://raw.githubusercontent.com/Lofp34/pomodoro_V2/main/public/screenshot-pomodoro.png?raw=true)
*(Note: You will need to add a screenshot named `screenshot-pomodoro.png` to a `public` directory in your project for the image above to display correctly.)*

---

## ✨ Features

- **Classic Pomodoro Timer**: Cycle through work sessions, short breaks, and long breaks.
- **User Authentication**: Secure sign-up and login using Email/Password and OAuth (Google, Apple) powered by Supabase Auth.
- **Persistent Session History**: All your completed Pomodoro sessions are saved to your account.
- **Task Management**: Name your tasks for each session and add a description of the work done.
- **AI-Powered Chat (Future)**: An integrated chat to analyze your productivity and give you feedback.
- **Clean & Modern UI**: A beautiful, responsive interface built with React and Tailwind CSS.

---

## 🚀 Tech Stack

- **Frontend**: [React](https://reactjs.org/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database**: [Supabase](https://supabase.io/)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 🛠️ Getting Started

Follow these instructions to set up the project for local development.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/Lofp34/pomodoro_V2.git
cd pomodoro_V2
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

You need to connect the app to your own Supabase project.

1.  Create a file named `.env` in the root of the project.
2.  Copy the contents below into the file:

    ```
    # Supabase Project Configuration
    # Get these values from your Supabase project's API settings.

    VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
    VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_PUBLIC_ANON_KEY"

    # Get this value from Google AI Studio
    VITE_GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    ```

3.  Replace the placeholder values with your actual Supabase URL, Public Anon Key, and your Gemini API Key.

### 4. Run the Development Server

```bash
npm run dev
```

The application should now be running on `http://localhost:5173`.

---

## 🌐 Deploying to Vercel

This project is optimized for deployment on [Vercel](https://vercel.com/).

1.  **Push your code to GitHub.**

2.  **Import your project into Vercel**:
    - Log in to your Vercel account.
    - Click "Add New... > Project".
    - Select your GitHub repository (`pomodoro_V2`).

3.  **Configure Environment Variables**:
    - In your Vercel project's settings, navigate to the "Environment Variables" section.
    - Add the following variables:
      - `VITE_SUPABASE_URL`: Your Supabase project URL.
      - `VITE_SUPABASE_ANON_KEY`: Your Supabase public anon key.
      - `VITE_GEMINI_API_KEY`: Your Gemini API key.

4.  **Deploy**:
    - Vercel will automatically detect that you are using Vite and configure the build settings.
    - Click "Deploy". Your application will be built and deployed.

---
## 📝 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
