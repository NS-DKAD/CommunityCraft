# bug_Tracking.md — Known Bugs (English)

This document tracks identified bugs, glitches, and visual or functional defects on CommunityCraft.

Each entry includes:
- **Importance / Severity**: `Critical`, `High`, `Medium`, `Low`
- **Implementation Difficulty**: `Easy`, `Medium`, `Hard`
- **Status**: `Open`, `In Progress`, `Resolved`, `Won't Fix`
- **Description**: Detailed behavior, conditions, and expected fix.

---

| Issue / Bug | Importance | Difficulty | Status | Description |
|---|---|---|---|---|
| Footer appears fixed / overlays top on short pages | High | Easy | Resolved | Fixed by using `min-h-screen flex flex-col` on root and `flex-1` on main container to ensure footer stays at the bottom.
| Next.js default favicon displayed instead of CommunityCraft icon | Medium | Easy | Resolved | Updated metadata in `src/app/layout.tsx` to reference custom icon files.
| Report button missing smooth hover transition to red | Low | Easy | Resolved | Added Tailwind classes `transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400` to the button.
| Visual clutter from "live data connected" banner | Low | Easy | Resolved | Removed the banner and integrated live status indicator into the "Open Community Directory" pill.
| Missing card click loading animation / visual feedback | Low | Medium | Resolved | Added pulse animation to project cards on navigation using `animate-pulse` and ring styling.
