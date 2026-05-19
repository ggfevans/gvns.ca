// Composite-action entrypoint.
//
// GitHub Actions runner restricts env: block keys to POSIX-legal identifiers
// (letters, digits, underscores), so a composite cannot directly set
// `INPUT_OUTPUT-PATH` for the @actions/core.getInput('output-path') lookup.
// (@actions/core only replaces spaces with underscores; hyphens are preserved
// — see https://github.com/actions/toolkit/blob/main/packages/core/src/core.ts.)
//
// We instead receive INPUT_<NAME> with hyphens collapsed to underscores from
// the composite's env: block, copy each value across to the hyphenated key
// @actions/core expects, then load the real entry point. The source script
// stays unchanged so it remains byte-identical to github-json-bourne.
const HYPHENATED_INPUTS = ['output-path', 'max-repos', 'max-activities', 'max-pages'];

for (const name of HYPHENATED_INPUTS) {
  const underscored = `INPUT_${name.replace(/-/g, '_').toUpperCase()}`;
  const hyphenated = `INPUT_${name.toUpperCase()}`;
  if (underscored in process.env && !(hyphenated in process.env)) {
    process.env[hyphenated] = process.env[underscored];
  }
}

await import('./index.js');
