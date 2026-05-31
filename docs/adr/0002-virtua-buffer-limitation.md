# ADR 0002: Virtua Buffer Limitation

## Status
Accepted

## Context
Virtua's `VList` component currently lacks explicit support for `overscan`, `buffer`, or `margin` properties in its TypeScript type definitions, which are required to prevent blank areas during rapid scrolling or at the bottom of the list.

## Decision
We accept the blank area at the bottom of the virtualized list (Skeleton lag) as a known architectural constraint of the current Virtua implementation version (v3). 

## Rationale
- Attempting to force unsupported properties causes runtime errors.
- Prioritizing stability over hacks to improve scroll performance.

## Mitigation / UX Strategy
- Add a static footer to the list to provide a graceful "Loading..." state instead of rendering empty space.
- A future refactor or upgrade to Virtua v2, @tanstack/virtual, or a custom adapter layer will be evaluated in the next phase.
