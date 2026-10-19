# known_Bugs.md — Cleared

All known bugs have been addressed and the list has been reset.

This document tracks identified bugs, glitches, and visual or functional defects on CommunityCraft.

Each entry includes:
- **Importance / Severity**: `Critical`, `High`, `Medium`, `Low`
- **Implementation Difficulty**: `Easy`, `Medium`, `Hard`
- **Status**: `Open`, `In Progress`, `Resolved`, `Won't Fix`
- **Description**: Detailed behavior, conditions, and expected fix.

---

| Issue / Bug | Importance | Difficulty | Status | Description |
|---|---|---|---|---|
| Text selection invisible (no highlight color) & context menu / copy-paste blocked | Critical | Easy | Resolved | Fixed in globals.css with bright high-contrast selection highlight (`#0284c7` background, `#ffffff` text). |
| Footer appears fixed / overlays top on short pages | High | Easy | Resolved | On certain viewports or short pages, the footer is rendered over or visible directly on the initial viewport instead of staying strictly at the very bottom of the document flow. Fixed by using `min-h-screen flex flex-col` on root and `flex-1` on main container. |
| Next.js default favicon displayed instead of CommunityCraft icon | Medium | Easy | Resolved | Updated metadata in `src/app/layout.tsx` to reference custom favicon and icon files, fixing the default Next.js favicon appearance. |
| Report button missing smooth hover transition to red | Low | Easy | Resolved | Added Tailwind classes `transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400` to the Report button in `ProjectDetailClient.tsx`. |
| Ineffective / redundant navigation buttons in header (Discover / Search / Tag) | High | Medium | Resolved | Updated header navigation: Discover now links to catalog, Search opens dedicated search bar, Tag leads to full tag catalog page. |
| Visual clutter from "live data connected" status banner in top menu | Low | Easy | Resolved | Banner removed and live status integrated into Open community Directory pill. |
| Missing card click loading animation / visual feedback | Low | Medium | Resolved | Added navigate pulse animation via isNavigating state in ProjectCard component. |
