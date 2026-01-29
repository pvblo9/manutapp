import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Desabilitar erros de tipo 'any' (são apenas warnings de estilo)
      "@typescript-eslint/no-explicit-any": "warn",
      // Desabilitar avisos de variáveis não usadas
      "@typescript-eslint/no-unused-vars": "warn",
      // Desabilitar avisos de interfaces vazias
      "@typescript-eslint/no-empty-object-type": "warn",
      // Permitir setState em effects (comum em React)
      "react-hooks/set-state-in-effect": "warn",
      // Permitir dependências faltantes em useEffect
      "react-hooks/exhaustive-deps": "warn",
      // Permitir uso de <img> (Next.js Image pode não ser necessário em todos os casos)
      "@next/next/no-img-element": "warn",
    },
  },
]);

export default eslintConfig;
