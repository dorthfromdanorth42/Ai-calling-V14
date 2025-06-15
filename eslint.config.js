import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
    {
        ignores: [
            '**/dist/**', 
            'packages/*/dist/**',
            '**/*test*.js',
            '**/*fix*.js',
            '**/*apply*.js',
            '**/*check*.js',
            '**/*admin*.js',
            '**/*comprehensive*.js',
            '**/*critical*.js',
            '**/*final*.js',
            '**/*ultimate*.js',
            '**/*untested*.js',
            '**/*extended*.js',
            '**/*investigate*.js',
            '**/*inspect*.js',
            '**/*remove*.js',
            '**/*create*.js'
        ]
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
    {
        rules: {
            'quotes': ['error', 'single'],
            'semi': ['error', 'always'],
            '@typescript-eslint/no-unused-vars': 'error',
            'no-unused-vars': 'off',
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                global: 'readonly',
                module: 'readonly',
                require: 'readonly',
                exports: 'readonly'
            }
        }
    }
); 