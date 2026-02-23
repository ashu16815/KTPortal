# KT Portal Unit Test Case Matrix

## Current enforced scope (implemented)

Coverage gate is enforced in Vitest for `src/lib/**` (excluding `src/lib/ai.ts` and `src/lib/prisma.ts`) with a 95% minimum on statements, branches, functions, and lines.

Implemented test coverage areas:
- `src/lib/auth.ts`: cookie decode, missing/invalid cookie handling, `requireSession`, `requireRole`, cookie encoding, and tower write permissions.
- `src/lib/audit.ts`: happy path Prisma write, omitted `details`, and error swallowing/logging.
- `src/lib/blob.ts`: stub upload path generation, URL encoding, and delete behavior.
- `src/lib/scoring.ts`: score calculation, RAG thresholds, blockers, custom weights/thresholds, variance and flagging.
- `src/lib/utils.ts`: week-ending normalization, CSV escaping, safe JSON parse, formatting helpers, class joining, and current-week derivation.

## Whole-app unit test cases (planned matrix)

This matrix is the recommended next unit-test expansion beyond the current enforced scope.

### Hooks

- `src/hooks/useSession.ts`
- Case: returns loading state before fetch completes.
- Case: returns authenticated session payload on success.
- Case: returns unauthenticated state on 401/empty response.
- Case: returns error state for network/server failures.
- Case: memoized outputs/state transitions do not loop on re-render.

- `src/hooks/queryKeys.ts`
- Case: key factories return stable, deterministic arrays for each resource.
- Case: parameterized keys include IDs/filters in the correct order.

### UI components

- `src/components/ui/Button.tsx`
- Case: renders default/variant classes.
- Case: disabled state blocks click handlers.
- Case: loading state shows spinner and disables interaction (if supported).

- `src/components/ui/Input.tsx`
- Case: forwards value/onChange.
- Case: error/invalid styling renders when props are set.
- Case: ref forwarding and disabled/readOnly props pass through.

- `src/components/ui/Textarea.tsx`
- Case: renders value and change handler.
- Case: disabled and placeholder props pass through.

- `src/components/ui/Badge.tsx`
- Case: each status/variant maps to expected class names.
- Case: custom className merges correctly.

- `src/components/ui/Card.tsx`
- Case: renders children/sections and merges className.

- `src/components/ui/LoadingSpinner.tsx`
- Case: spinner renders with accessible label/role (if provided).
- Case: size variant class mapping.

### Layout components

- `src/components/layout/Providers.tsx`
- Case: renders children with React Query provider.
- Case: provider does not recreate client every render (if intended).

- `src/components/layout/TopBar.tsx`
- Case: shows user/session info when logged in.
- Case: logout action/button triggers expected callback/request.
- Case: hidden/alternative content when unauthenticated.

- `src/components/layout/Sidebar.tsx`
- Case: renders route links for allowed role.
- Case: hides admin-only links for non-admin roles.
- Case: active route styling reflects current pathname.

- `src/components/layout/AppShell.tsx`
- Case: composes sidebar/topbar/content slots.
- Case: handles mobile/sidebar toggle behavior (if present).

### Chart components

- `src/components/charts/PulseTrend.tsx`
- Case: renders chart with valid series data.
- Case: empty dataset shows fallback UI.
- Case: handles null/missing points without crash.

- `src/components/charts/RAGDonut.tsx`
- Case: renders percentages/counts correctly.
- Case: zero-total dataset does not divide by zero.
- Case: color mapping matches RAG categories.

- `src/components/charts/ComponentRadar.tsx`
- Case: renders all axes/components.
- Case: missing component scores fallback to zero/default.

### App pages (render/unit-level)

- `src/app/page.tsx`, `src/app/login/page.tsx`
- Case: initial render and key CTA text.
- Case: unauthenticated/authenticated redirects (if page logic does this server-side, cover helper logic separately).

- `src/app/admin/page.tsx`
- Case: admin page renders management sections.
- Case: non-admin access path shows denial/redirect behavior (as applicable).

- `src/app/actions/page.tsx`, `src/app/milestones/page.tsx`, `src/app/raidd/page.tsx`
- Case: loading state.
- Case: empty state.
- Case: populated list rendering.
- Case: API error banner/message.

- `src/app/submissions/new/page.tsx`, `src/app/submissions/compare/page.tsx`
- Case: form defaults and validation messages.
- Case: submit disabled until required fields are present.
- Case: compare page handles missing comparison data.

- `src/app/dashboard/executive/page.tsx`, `src/app/dashboard/programme/page.tsx`, `src/app/dashboard/tower/[towerId]/page.tsx`
- Case: loading/empty/error states.
- Case: visual summary cards render expected values.
- Case: route param handling (`towerId`) and invalid param fallback.

### API route handlers (unit tests with mocked auth/prisma)

- Auth routes
- `src/app/api/auth/login/route.ts`
- Case: valid credentials create session cookie and return success payload.
- Case: invalid credentials return 401/400.
- Case: malformed payload returns validation error.

- `src/app/api/auth/logout/route.ts`
- Case: clears session cookie and returns success.

- Admin routes
- `src/app/api/admin/towers/route.ts`
- `src/app/api/admin/towers/[id]/route.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/weights/route.ts`
- Case: rejects non-admin users.
- Case: validates request body fields.
- Case: create/update success shape.
- Case: missing record returns 404.
- Case: Prisma error maps to 500/expected response.

- Tower and track routes
- `src/app/api/towers/route.ts`
- `src/app/api/towers/[id]/route.ts`
- `src/app/api/towers/[id]/tracks/route.ts`
- Case: list/get success.
- Case: invalid or missing ID returns 404/400.
- Case: authorization filters tower data for role (if implemented).

- Submission routes
- `src/app/api/submissions/route.ts`
- `src/app/api/submissions/compare/route.ts`
- Case: create/list submissions success.
- Case: duplicate/invalid submission validation.
- Case: compare endpoint handles missing tower/week inputs.
- Case: compare endpoint handles one-sided data and variance computation.

- Action routes
- `src/app/api/actions/route.ts`
- `src/app/api/actions/[id]/route.ts`
- Case: create/list/update/delete flows.
- Case: invalid status/priority validation.
- Case: missing action ID returns 404.

- RAID/D routes
- `src/app/api/raidd/route.ts`
- `src/app/api/raidd/[id]/route.ts`
- Case: create/list/update success.
- Case: invalid type/status validation.
- Case: missing item returns 404.

- Milestone routes
- `src/app/api/milestones/route.ts`
- `src/app/api/milestones/[id]/route.ts`
- Case: create/list/update success.
- Case: invalid date/status validation.
- Case: missing item returns 404.

- Dashboard/reporting routes
- `src/app/api/dashboard/executive/route.ts`
- `src/app/api/dashboard/tower/[id]/route.ts`
- `src/app/api/pulse/route.ts`
- Case: returns aggregated metrics with expected shape.
- Case: empty dataset returns zeros/defaults.
- Case: unauthorized access handling.

- Reference/list routes
- `src/app/api/groups/route.ts`
- `src/app/api/users/route.ts`
- `src/app/api/audit/route.ts`
- Case: list success and filtering.
- Case: authorization by role.
- Case: pagination/default query params (if present).

- AI routes
- `src/app/api/ai/report/route.ts`
- `src/app/api/ai/summarise/route.ts`
- `src/app/api/ai/summarise/[id]/approve/route.ts`
- Case: validation for required prompt/input payload.
- Case: provider success response shape.
- Case: provider timeout/error handling.
- Case: approval route handles missing summary ID and authz.

## Recommended tooling for next expansion

- Add React component tests with `@testing-library/react` + `jsdom` Vitest environment (separate config or per-file environment).
- Add API route unit tests using mocked `next/server`, mocked auth helpers, and mocked Prisma client calls.
- Keep the current `src/lib` coverage gate in place while expanding coverage gates per layer to avoid blocking on a large one-shot migration.
