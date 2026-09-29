import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({ ignores: ['**/dist/**', '**/node_modules/**', '.pnpm-store/**', '.cache/**'] }, js.configs.recommended, ...ts.configs.recommended, { files: ['scripts/*.mjs'], languageOptions: { globals: { process: 'readonly' } } }, { files: ['**/*.ts', '**/*.tsx'], rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } });
