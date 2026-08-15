import { extname } from "node:path";

/**
 * The application is bundled by Next, so its internal imports are
 * extensionless ("./land"). Node's ESM resolver requires a real filename, so
 * for tests we retry a failed relative resolution with a .ts extension.
 *
 * This keeps the test seam entirely on the test side: no source file has to
 * carry an extension purely to satisfy the runner.
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (specifier.startsWith(".") && !extname(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw error;
  }
}
