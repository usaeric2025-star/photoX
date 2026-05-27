# PhotoX v2.8 Library Evolution Decisions

## 1. Motion/React vs @formkit/auto-animate
- **Decision**: UNIFY to `motion/react`.
- **Reason**: `auto-animate` is great for simple lists but hits limits with complex R19 Transitions and Shared Element transitions. `motion/react` provides better control over Layout Animations which is critical for the `VirtualGrid`.
- **Migration Cost**: Low. Replace basic auto-animate wrappers with `<motion.div layout>`.

## 2. TanStack Router Migration
- **Status**: HIGH PRIORITY.
- **Reason**: Full type safety for search params and path variables. Current `react-router` implementation lacks deep type-checking for complex photo filter states.
- **Path**: Incremental routing. Start with Admin Dashboard, then Public Gallery.

## 4. TanStack Form & Validator Protocol Integration
- **Status**: RESEARCHING.
- **Goal**: End-to-end type safety from DB Schema to Form Input.
- **Integration**: Create a `ValidatorAdapter` for ArkType. 
- **Benefit**: AI can manage form logic entirely through the Validator interface.

## 5. Primitives: Moving towards @base-ui/react
- **Status**: RECOMMENDED.
- **Reason**: Base UI provides the cleanest accessibility primitives for R19.
- **AI Parity**: Standardized `data-*` attributes and `aria` labels make UI state highly "readable" for the agent.

## 6. Iconography: Phosphor vs Lucide
- **Status**: OPTIONAL/DESIGN-DRIVEN.
- **Assessment**: Phosphor offers better visual weight for gallery-heavy apps. We will stick to Lucide for now but provide a conversion path if a rebranding is requested.

[LIB-EVOLUTION-DECISION]
