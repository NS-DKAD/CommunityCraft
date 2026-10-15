# CommunityCraft

Open-source community directory dedicated to creations and projects related to **ArtCraft** (tools, mods, shaders, libraries, assets).

> **Important Notice**: CommunityCraft is an independent project that indexes creations. Project files and source code remain hosted on their creators' repositories (primarily GitHub).

---

## 🚀 Quick Start (Windows)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (LTS version recommended)
- [Git for Windows](https://git-scm.com/)

### 2. Run the Development Server
Open a PowerShell terminal in this directory and run:

```bash
npm run dev
```

Then open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🛠️ Verification Commands

- **TypeScript Type Check**:
  ```bash
  npx tsc --noEmit
  ```
- **Linting Check (ESLint)**:
  ```bash
  npm run lint
  ```
- **Production Build**:
  ```bash
  npm run build
  ```

---

## 📁 Project Architecture

- `src/app/` : Next.js App Router pages, layout, and global styles.
- `src/components/` : UI components (Header, Footer, ProjectCatalog, ProjectCard).
- `src/data/` : Typed initial demo dataset.
- `src/types/` : TypeScript type definitions.
- `PROJECT_CONTEXT.md` : Project context, technical stack, and roadmap tracking.
