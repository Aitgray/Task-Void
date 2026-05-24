// Tells TypeScript that .sql files export their content as a string.
// The actual inlining is done at build time by the Babel plugin in babel.config.js.
declare module '*.sql' {
  const content: string;
  export default content;
}
