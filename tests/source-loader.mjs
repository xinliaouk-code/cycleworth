// Test-only resolution for legacy extensionless TypeScript imports. Production
// still uses Next's normal bundler; no application import changes are required.
export async function resolve(specifier, context, nextResolve) {
  try { return await nextResolve(specifier, context) }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context)
    throw error
  }
}
