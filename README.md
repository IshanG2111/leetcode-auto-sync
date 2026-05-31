# Aergia Engine

> A premium, intelligent, local-first synchronization engine that automates developer workflows. It monitors, parses, and archives your LeetCode solutions to Notion and GitHub, utilizing Google's Gemini Pro developer API for automated solution analysis, complexity estimations, and pattern categorization.

---

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-cyan?logo=react&logoColor=white)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-API_Integration-purple?logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![Notion SDK](https://img.shields.io/badge/Notion_SDK-2.3-black?logo=notion&logoColor=white)](https://developers.notion.com/)
[![GitHub Octokit](https://img.shields.io/badge/GitHub_Octokit-22.0-lightgrey?logo=github&logoColor=white)](https://github.com/octokit/rest.js)

---

## 🚀 Overview

**Aergia Engine** is a high-end developer utility designed with a calm, premium Apple iOS-style aesthetic. It bridges the gap between active problem solving and knowledge archiving. Rather than manually copying code and writing explanations, this engine acts as a pipeline that:

1. **Fetches** your latest Accepted (AC) submissions directly via the **LeetCode GraphQL API**.
2. **Analyzes** code using the **Google Gemini API** to run static code intelligence, detecting algorithm design patterns (e.g., Backtracking, Sliding Window, Dynamic Programming), complexity classes ($O(N)$, $O(N \log N)$), and producing markdown documentation.
3. **Synchronizes** code to your **GitHub repository** organized in structural folder hierarchies based on problem difficulty.
4. **Organizes** your learning inside a **Notion Database** with pre-configured schemas.

---

## 📐 System Architecture

Below is the design flow showing how data moves across the APIs during a sync event:

```mermaid
graph TD
    A[LeetCode GraphQL API] -->|1. Fetch AC Submissions| B[Aergia Express Engine]
    B -->|2. Extract Source Code| C[Google Gemini API]
    C -->|3. Perform Code Intelligence Analysis<br>Identify Patterns & Complexity| B
    B -->|4. Push Code to Organized Paths| D[GitHub API via Octokit]
    B -->|5. Insert/Update Page with Rich Metadata| E[Notion DB via SDK]

    style A fill:#f39c12,stroke:#d35400,stroke-width:2px,color:#fff
    style B fill:#3498db,stroke:#2980b9,stroke-width:2px,color:#fff
    style C fill:#9b59b6,stroke:#8e44ad,stroke-width:2px,color:#fff
    style D fill:#2c3e50,stroke:#1a252f,stroke-width:2px,color:#fff
    style E fill:#000,stroke:#333,stroke-width:2px,color:#fff
```

---

## ✨ Key Features

### 🎨 Apple-Style Translucent Design System
- **iOS 18 Glassmorphism**: Cards feature frosted surfaces with double-border light reflections (simulating macOS/iOS window edges).
- **Subtle Branding Details**: Hover states trigger a high-end, responsive scan-pink (`#FF9FFC`) glow.
- **Ambient Grid Theme**: A repeating vector grid overlay sits behind the interface, matching the visual language of the landing engine.

### 🌌 Interactive WebGL Landing Screen
- **Three.js GridScan Shader**: Renders a floating coordinate scan line system that skews and tilts dynamically based on mouse movements, gyroscope tilt, or active face-tracking.
- **Face-Tracking Scanner**: Uses `face-api.js` models to track face yaw, pitch, and distance via webcam, translating movements directly into 3D shader rotations.
- **Framer Motion Typography**: Headline text enters using custom character blur keyframes.

### ⚙️ Automation & Control
- **Sync Flow ribbon**: A visual dashboard pipeline showing real-time states (`LeetCode ── Process ── GitHub ── Notion`).
- **Guided Chat Setup Assistant**: Interactive onboarding chat terminal that stores credentials locally in the browser's localStorage.
- **Notion Schema Deployment**: Connects with the Notion SDK to automatically verify and deploy all required database properties.

---

## 🛠️ Technology Stack

- **Frontend Core**: React 19, TypeScript, Three.js, Postprocessing, Face-api.js, Tailwind CSS, Motion (framer-motion).
- **Backend Sync Engine**: Node.js, Express, Vite Dev Middleware (during development), TSX runner.
- **APIs & SDKs**:
  - Google Gemini Developer API (`@google/genai`)
  - Notion API (`@notionhq/client`)
  - GitHub Octokit API (`@octokit/rest`)

---

## ⚙️ Configuration & Prerequisites

### Prerequisites
- Node.js 18+ (LTS recommended)
- A Google Gemini API Key (obtained from the [Google AI Developer Portal](https://ai.google.dev/))
- A GitHub Personal Access Token (PAT) with repository permissions
- A Notion Integration Token and Database ID

### Environment Setup
Clone the configuration template and populate your local variables:

```bash
cp .env.example .env.local
```

Modify `.env.local` with your configuration details:

```env
# Google Gemini API key
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Base Application Host URL
APP_URL="http://localhost:3000"
```

---

## 🚀 Getting Started

### 1. Installation
Install all dependencies (including WebGL, face tracking, and utility engines):

```bash
npm install
```

### 2. Development Mode
Run the development environment locally. The server is integrated into a unified Express endpoint serving the frontend via Vite dev middleware:

```bash
npm run dev
```

The application dashboard will be accessible at: `http://localhost:3000`

### 3. Production Build & Execution
Build the static frontend bundle and start the server in production mode:

```bash
# Build the optimized client bundle
npm run build

# Start the Node runtime server
npm run start
```

---

## 📦 Project Structure

```
├── .env.example             # Example environment file
├── server.ts                # Express backend & Sync Engine
├── vite.config.ts           # Bundler configuration
├── index.html               # Main entry HTML (renamed title)
├── tsconfig.json            # TypeScript configuration
├── package.json             # App dependencies & scripts
└── src/
    ├── main.tsx             # React DOM entry point
    ├── App.tsx              # Settings & Dashboard UI (Aergia Engine)
    ├── index.css            # Stylesheet & double-border reflection patterns
    └── components/
        ├── BlurText.tsx     # Motion blur-to-focus animation
        ├── GridScan.jsx     # WebGL scanner (Three.js + face-api)
        └── GridScan.css     # Mirror effects and coordinates preview
```

---

## 🌟 Google Cloud Deployment

To run this application as a serverless cron job (e.g., syncing your solves every night automatically), you can deploy it to **Google Cloud Platform (GCP)**:

1. **Build Container**: Package the application into a Docker container.
2. **Deploy to Google Cloud Run**: Deploy the container as a serverless service:
   ```bash
   gcloud run deploy aergia-engine --source . --platform managed
   ```
3. **Configure Google Cloud Scheduler**: Set up a daily cron trigger hitting `/api/sync` with your configuration payload, enabling fully automated, zero-maintenance background syncing.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
