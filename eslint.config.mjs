import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Flat config using the native configs shipped by eslint-config-next 16.
 * Next 16 no longer runs ESLint during `next build`, so linting is its own
 * step: `npm run lint`.
 */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "prisma/migrations/**",
      "coverage/**",
      /*
       * A separate application that was uploaded into this repository through
       * the GitHub web interface. It is a Vite/React project with its own
       * package.json, its own dependencies and a Deno edge function — none of
       * which this configuration describes, so linting it produces 42 problems
       * that say more about the mismatch than about the code.
       *
       * It is excluded here, from tsconfig and from the Docker build context
       * rather than deleted, because deleting eight thousand lines of somebody
       * else's work is not a decision to make on their behalf. If it belongs in
       * its own repository, move it there and drop these three exclusions.
       */
      "foxpopz-sales/**",
    ],
  },
  ...(Array.isArray(nextCoreWebVitals) ? nextCoreWebVitals : [nextCoreWebVitals]),
  ...(Array.isArray(nextTypescript) ? nextTypescript : [nextTypescript]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]

export default config;
