// @ts-check
//
// ESLint flat config — Calmdemy architecture boundary enforcement (Phase 8).
//
// This config exists for ONE purpose: machine-check the architecture invariants
// that Phases 0–7 established by hand. It deliberately ships no general
// code-quality rules (no no-unused-vars, no formatter) — only the
// `features → shared → core` dependency direction and the public-index isolation
// rule. See docs/architecture-audit.md "Phase 8 — complete" for the full rule
// derivation and the documented allow-list.
//
// Skeleton commit: parser + ignores + directive-resolution shims only. The
// boundary element/rule definitions land in the next commit.

import tseslint from 'typescript-eslint';

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
// typescript-eslint's plugin, DELETE this `directiveShims` block and the
// `linterOptions` below — the real plugins will own those namespaces (keeping
// both would throw a "cannot redefine plugin" error).
const noop = { meta: { schema: [] }, create: () => ({}) };
const directiveShims = {
  name: 'calmdemy/directive-shims',
  plugins: {
    'react-hooks': { rules: { 'exhaustive-deps': noop } },
    '@typescript-eslint': { rules: { 'no-var-requires': noop } },
  },
};

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
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    // The no-op shims report nothing, so the existing directives would otherwise
    // be flagged as "unused". Suppress that — the directives document real intent
    // for rules a future phase may enable.
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    plugins: directiveShims.plugins,
  },
);
