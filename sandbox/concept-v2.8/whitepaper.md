# PhotoX v2.8 Technical Whitepaper [DRAFT]

## 1. React 19 Server/Client Boundary Principles
- **Directive-Driven**: Boundaries are defined by `"use server"` and `"use client"` directives at the top of files or functions.
- **Data Flow**: Server-to-Client must be serializable (JSON-like). Client-to-Server via Actions.
- **Shared Logic**: Validators and Types are marked as `shared` (implicitly or explicitly via `shared.ts`) and must not contain environment-specific side effects.

## 2. Validator Protocol Full-Stack Contract
- **Centralized Schema**: A single Validator defined in `src/lib/validators` serves both Server-side entry validation and Client-side optimistic state calculation.
- **Server Action Validation**: Every Server Action MUST call `validator.validate(formData)` as the first operation.
- **Metadata Exposure**: Client-side UI uses `validator.serialize()` to dynamically generate validation messages and ARIA attributes, ensuring zero-drift between server rules and client feedback.

## 3. Result Type as Universal Communication Protocol
- **Explicit Success/Failure**: All async boundaries (Server Actions, API routes, Data Fetchers) must return a `Result<T, StandardError>` or `ResultAsync<T, StandardError>`.
- **Discriminant Recovery**: Components consuming these results use `.match()` to handle all UI states (Success, Warning, Error, Loading) exhaustively.
- **Log Integrity**: `StandardError` includes an `aiDebugHint` for automated log analysis and diagnostic recovery.

[CONCEPT-WHITEPAPER-DRAFT]
