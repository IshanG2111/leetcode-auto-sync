# ✦ Aergia Engine

> A premium, intelligent developer automation pipeline. Aergia automatically monitors your solved LeetCode solutions, processes them through an intelligent pipeline, commits organized solutions to GitHub, and registers rich metadata inside Notion databases.

<p align="left">
  <a href="https://aergia-one.vercel.app/"><img src="https://img.shields.io/badge/Live_App-aergia--one.vercel.app-FF5A00?style=flat-square&logo=vercel&logoColor=white" alt="Live Deployment"></a>
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Three.js-WebGL-000000?style=flat-square&logo=three.js&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/Notion_SDK-2.3-000000?style=flat-square&logo=notion&logoColor=white" alt="Notion">
  <img src="https://img.shields.io/badge/GitHub_API-Octokit-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub">
</p>

---

## 📐 Architecture & Flow

Aergia coordinates transactions between several platforms to ensure your portfolio stays synchronized in real time:

```mermaid
flowchart LR
    subgraph Ingestion [Source]
        A([LeetCode GraphQL])
    end

    subgraph Core [Aergia Core Engine]
        B{Sync Handler}
    end

    subgraph Destination [Workspaces]
        D[(GitHub Repo)]
        E[(Notion DB)]
    end

    A -->|1. Fetch Solved Problems| B
    B -->|2. Solution Code & Metadata| A
    B -->|3. Commit Organized Code| D
    B -->|4. Update Properties & Schema| E

    %% Theme Styling
    classDef default fill:#1e1e24,stroke:#333,stroke-width:1px,color:#eee;
    classDef core fill:#0A84FF22,stroke:#0A84FF,stroke-width:2px,color:#0A84FF;
    classDef dest fill:#30D15822,stroke:#30D158,stroke-width:1.5px,color:#30D158;
    classDef src fill:#FFA11622,stroke:#FFA116,stroke-width:1.5px,color:#FFA116;

    class B core;
    class D,E dest;
    class A src;
```

---

## ✨ Key Capabilities

### 🎨 Premium Translucent Interface (iOS 18 Grid Aesthetic)
*   **Frosted Glassmorphism:** Custom components styled with light-refracting double-borders simulating native macOS/iOS window panels.
*   **Micro-Interactions:** Hover states trigger interactive scanning glows (`#FF9FFC`) and coordinate readouts.
*   **Ambient Mesh Overlay:** A minimal mathematical vector grid is layered dynamically over the background.

### 🌌 Interactive 3D WebGL Scanner
*   **Three.js Shader Grid:** Renders an interactive WebGL coordinate mesh that skews and responds to user focus.
*   **Device-Aware Ingestion:** Translates desktop cursor or mobile gyroscope movement to control 3D viewport orientation.
*   **Cinematic Entrance:** Staggered character blur-to-focus transition hooks built on top of Framer Motion.

### ⚡ Unified Sync Pipeline
*   **Dual Target Synced Actions:** Instantly backs up solved problems onto GitHub while registering details in Notion databases.
*   **Automated Notion Database Provisioning:** Configures missing table schemas (time/space complexity, pattern labels, difficulty) using a single endpoint trigger.
*   **Intuitive Setup Chat:** Interactive chatbot onboarding console that preserves configuration properties locally in the client storage.

---

## 🛠️ Technology Stack

*   **Frontend Core:** React 19, TypeScript, Three.js, postprocessing, Tailwind CSS, Motion (framer-motion)
*   **Backend Sync Engine:** Express, Node.js, tsx runner
*   **Integrations:** Notion Client SDK (`@notionhq/client`), GitHub Octokit (`@octokit/rest`)

---

## ⚙️ Configuration & Prerequisites

### 1. Prerequisites
*   **Node.js** 18+ (LTS recommended)
*   **GitHub PAT** (Personal Access Token) with repository scopes
*   **Notion Integration Secret** and a connected target Database ID
*   **LeetCode Session Cookie** (required to sync all historically solved problems)

### 2. Environment Variables
Create a `.env.local` inside the root folder:

```env
# Base Application Host URL
APP_URL="http://localhost:3000"
```

---

## 🚀 Getting Started

### 1. Installation
Clone the repository and install all development dependencies:
```bash
npm install
```

### 2. Run Local Development Server
Starts the unified Express server and spins up the Vite development server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to initialize setup.

### 3. Build & Production Start
Compile assets and start the application in optimized production mode:
```bash
npm run build
npm run start
```

---

## 📦 Project Layout

```
├── api/
│   └── index.ts        # Express REST API & Ingestion Middleware
├── src/
│   ├── components/
│   │   ├── BlurText.tsx    # Smooth typography reveals
│   │   ├── GridScan.jsx    # Three.js coordinate scanner
│   │   └── Tooltip.tsx     # Context-aware helpers
│   ├── App.tsx         # Core Dashboard Layout & Assistant
│   └── index.css       # Glassmorphism theme definitions
├── server.ts           # Unified Vite + Express Server Entry
├── vercel.json         # Vercel Serverless Routing Schema
└── package.json        # Dependencies & Automation Scripts
```

---

## 🌐 Deploy to Production

### Vercel Serverless
Aergia includes optimized Vercel rewrite configuration for serverless runtime. Simply deploy via the Vercel Dashboard or CLI:
```bash
vercel
```

### Google Cloud Run
Package and execute Aergia as a secure, auto-scaling backend container:
```bash
gcloud run deploy aergia-engine --source . --platform managed
```
Use **Google Cloud Scheduler** to set up a cron job targeting `/api/sync` for automated overnight backups.

---

## 📄 License

This project is licensed under the MIT License.
