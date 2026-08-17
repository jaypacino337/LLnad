import { extname } from "node:path";

/**
 * The app is bundled by Next, so its internal imports are extensionless
 * ("./market"). Node's ESM resolver requires a real filename, so tests retry a
 * failed relative resolution with a .ts extension. The seam stays entirely on
 * the test side.
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
