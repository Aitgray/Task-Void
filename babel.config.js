const fs = require('fs');
const path = require('path');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Inline .sql file imports as string literals at build time so
      // drizzle-orm's useMigrations receives actual SQL text, not an asset ID.
      function inlineSqlImports(babelApi) {
        const t = babelApi.types;
        return {
          visitor: {
            ImportDeclaration(nodePath, state) {
              const src = nodePath.node.source.value;
              if (!src.endsWith('.sql')) return;

              const defaultSpec = nodePath.node.specifiers.find(
                (s) => s.type === 'ImportDefaultSpecifier'
              );
              if (!defaultSpec) return;

              const localName = defaultSpec.local.name;
              const absolutePath = path.resolve(path.dirname(state.filename), src);
              const content = fs.readFileSync(absolutePath, 'utf-8');

              nodePath.replaceWith(
                t.variableDeclaration('const', [
                  t.variableDeclarator(t.identifier(localName), t.stringLiteral(content)),
                ])
              );
            },
          },
        };
      },
    ],
  };
};
