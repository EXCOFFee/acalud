// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// ESLint flat config (v9) para la web (Next.js + React + TypeScript).
// Se usan reglas sintácticas (no type-aware), por eso NO se habilita `projectService`:
// así `eslint .` puede lintar también los archivos de config .mjs sin exigir que estén
// en el tsconfig del proyecto.
export default tseslint.config(
  {
    ignores: ['.next', 'out', 'node_modules', 'android', 'next-env.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // CLAUDE.md / 3.1 V8: prohibido dangerouslySetInnerHTML (anti-XSS).
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message: 'Prohibido dangerouslySetInnerHTML (CLAUDE.md / 3.1 V8).',
        },
      ],
    },
  },
);
