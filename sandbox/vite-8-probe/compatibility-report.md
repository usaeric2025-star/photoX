# Vite 8 / React 19 Compatibility Probe Report [v2.8 Pre-research]

## 1. TanStack Router & "use server"
- **Scenario**: Using Server Actions directly within Route definitions.
- **Observation**: Current bundlers (Vite 6/Rolldown) handle the directive as a marker for boundary splitting.
- **Risk**: Potential hydration mismatch if Route Loaders and Actions share unsyncronized state.
- **Mitigation**: Use TanStack `loader` for fetch and `action` for mutations, wrapping both in Validator contracts.

## 2. ArkType Metadata Persistence (Tree-shaking)
- **Scenario**: Does `serialize()` survive aggressive production minification?
- **Test**: `ArkTypeValidator.serialize()` returns a static object literal.
- **Verification**: ESBuild/Terser retain these as they are referenced by public methods. No metadata loss observed in sandbox builds.

## 3. @base-ui/react Sanity Check
- **Component**: `<Dialog>`, `<Popover>`
- **Observed**: Export structure is flat and ESM-friendly. No "default import" issues with Vite 6/7.
- **Theme Compatibility**: Works perfectly with Tailwind 4 CSS variables.

[VITE8-PROBE-RESULT]
