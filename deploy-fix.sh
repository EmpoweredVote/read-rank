#!/bin/bash
cd /Users/chrisandrews/Documents/GitHub/EV-ReadRank/EV-readrank
git add .
git commit -m "Fix TypeScript errors for Netlify deployment

- Remove unused PointerSensor import from RankingPhase.tsx
- Remove unused event parameter from handleDragEnd
- Add missing 'results' phase handling in PhaseNavigation.tsx"
git push
