// @ts-check
//
// ESLint flat config — Calmdemy architecture boundary enforcement (Phase 8).
//
// PURPOSE: machine-check the architecture invariants that Phases 0–7 established
// by hand, before Phase 9 product work begins. This config ships NO general
// code-quality rules (no no-unused-vars, no react-hooks, no formatter) — only
// the dependency-boundary rule. See docs/architecture-audit.md "Phase 8 —
// complete" for the full derivation and the documented allow-list.
//
// THE INVARIANTS (all violations are errors — refuse to compile):
//   1. Dependency direction is one-way:  features → shared → core. No back-edges
//      (core must not import shared/features; shared must not import features,
//      except the documented allow-list below).
//   2. Feature isolation: a feature may import another feature ONLY through its
//      public index.ts — never a deep path (screens/, hooks/, api/, …).
//   3. Routes (app/**) are the composition layer ABOVE features: they may import
//      any feature's public index + core + shared + registry, but may NOT reach
//      into feature internals. The features → shared → core direction does not
//      constrain routes.
//
// THE ALLOW-LIST (the only sanctioned shared → feature edges; see audit doc):
//   shared/media-player → features/{music, library, progress}   (via public index)
//   shared/lists        → features/subscription                 (via public index)
//   The media player plays content owned by every content feature, and the
//   shared list template renders the subscription PaywallModal (which depends on
//   core/auth + core/subscription, so it cannot live in shared/). Every edge is
//   through the target feature's public index.ts only.

import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

// ── Directive-resolution shims ──────────────────────────────────────────────
// The source carries a handful of intentional inline `eslint-disable` comments
// for `react-hooks/exhaustive-deps` (deliberate dependency omissions in library
// hooks) and `@typescript-eslint/no-var-requires` (a typed `require()` shim in
// core/firebase). Those rules are OUT OF SCOPE for this boundary-only config and
// are intentionally NOT enforced — but ESLint errors on a disable directive that
// references a rule it can't resolve. Registering the rule names as inert no-ops
// (and turning off unused-directive reporting) lets the existing directives
// resolve cleanly without us enforcing or deleting them.
//
// FORWARD-COMPAT: if a later phase adds the real `eslint-plugin-react-hooks` or
// typescript-eslint's plugin, DELETE these two shim entries and the
// `reportUnusedDisableDirectives` override — the real plugins will own those
// namespaces (keeping both would throw a "cannot redefine plugin" error).
const noop = { meta: { schema: [] }, create: () => ({}) };

export default tseslint.config(
  {
    // Nothing outside the TypeScript source trees is subject to lint.
    ignores: [
      'node_modules/**',
      '.expo/**',
      'scripts/**',
      'ios/**',
      'android/**',
      'assets/**',
      'dist/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    linterOptions: {
      // See the directive-resolution shim note above.
      reportUnusedDisableDirectives: 'off',
    },
    plugins: {
      boundaries,
      'react-hooks': { rules: { 'exhaustive-deps': noop } },
      '@typescript-eslint': { rules: { 'no-var-requires': noop } },
    },
    settings: {
      // The default resolver only knows `.js`; teach it the TS extensions and
      // `index.*` resolution so relative imports map to their element files.
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'] },
      },
      // ── Element definitions (order = specificity; first match wins) ─────────
      'boundaries/elements': [
        // The registry is special: it imports every feature's public index.
        { type: 'registry', mode: 'file', pattern: 'src/registry.ts' },
        // The three architecture layers. `capture` names the instance so the
        // allow-list can target a specific subsystem/module/feature.
        { type: 'core', mode: 'folder', pattern: 'src/core/*', capture: ['subsystem'] },
        { type: 'shared', mode: 'folder', pattern: 'src/shared/*', capture: ['module'] },
        { type: 'feature', mode: 'folder', pattern: 'src/features/*', capture: ['feature'] },
        // Leaf utilities left at the src/ root (slated to fold into shared/ later).
        // Pure leaves — they import nothing — so every layer may depend on them.
        { type: 'root', mode: 'folder', pattern: 'src/(types|utils|constants)', capture: ['dir'] },
        { type: 'root', mode: 'file', pattern: 'src/test-setup.ts' },
        // The route/composition layer.
        { type: 'route', mode: 'full', pattern: 'app/**' },
      ],
    },
    rules: {
      // The v6 unified rule. It enforces BOTH the layer direction (from.type →
      // to.type) and the public-index entry point (to.internalPath: 'index.ts').
      // Rules accumulate allows; `default: 'disallow'` denies everything else.
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            "Architecture boundary violated: '${file.type}' may not import '${dependency.type}'. " +
            'Allowed direction is features → shared → core; cross-feature imports must go through the public index.ts. ' +
            'See docs/architecture-audit.md (Phase 8).',
          rules: [
            // root leaves depend on nothing but themselves.
            { from: { type: 'root' }, allow: { to: { type: 'root' } } },

            // core → core + root only (NO shared, NO features).
            { from: { type: 'core' }, allow: { to: { type: ['core', 'root'] } } },

            // shared → core + shared + root … plus the two allow-list edges.
            { from: { type: 'shared' }, allow: { to: { type: ['core', 'shared', 'root'] } } },
            {
              from: { type: 'shared', captured: { module: 'media-player' } },
              allow: {
                to: { type: 'feature', captured: { feature: ['music', 'library', 'progress'] }, internalPath: 'index.ts' },
              },
            },
            {
              from: { type: 'shared', captured: { module: 'lists' } },
              allow: { to: { type: 'feature', captured: { feature: 'subscription' }, internalPath: 'index.ts' } },
            },

            // features → core + shared + root + the registry type contract …
            { from: { type: 'feature' }, allow: { to: { type: ['core', 'shared', 'root', 'registry'] } } },
            // … and other features, but ONLY through their public index.ts.
            { from: { type: 'feature' }, allow: { to: { type: 'feature', internalPath: 'index.ts' } } },

            // the registry → every feature's public index (its whole job) + lower layers.
            { from: { type: 'registry' }, allow: { to: { type: ['core', 'shared', 'root'] } } },
            { from: { type: 'registry' }, allow: { to: { type: 'feature', internalPath: 'index.ts' } } },

            // routes compose: core + shared + root + registry + sibling routes …
            { from: { type: 'route' }, allow: { to: { type: ['core', 'shared', 'root', 'registry', 'route'] } } },
            // … and any feature, but ONLY through its public index.ts.
            { from: { type: 'route' }, allow: { to: { type: 'feature', internalPath: 'index.ts' } } },
          ],
        },
      ],
    },
  },
  {
    // Tests live as __tests__/ siblings of the code they exercise and
    // legitimately reach into internals — exempt them from the boundary rule.
    files: ['**/__tests__/**/*.{ts,tsx}'],
    rules: {
      'boundaries/dependencies': 'off',
    },
  },
);
