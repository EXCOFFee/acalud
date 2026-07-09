// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// ESLint flat config (v9) para TypeScript + NestJS.
// La regla de fronteras hexagonales (domain↛infrastructure) la verifica
// dependency-cruiser (script `deps:boundaries`); ESLint cubre estilo y correctitud.
// Se usan reglas sintácticas (no type-aware), por eso NO se habilita `projectService`:
// así la extensión ESLint del editor puede lintear también los archivos de config
// (vitest.config.ts, eslint.config.mjs) sin exigir que estén en el tsconfig.
export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'test/architecture/__fixtures__'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      // Permite params/vars intencionalmente sin usar con prefijo `_` (p. ej. un método de
      // puerto cuya firma exige un parámetro que un adapter concreto no necesita).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
);
