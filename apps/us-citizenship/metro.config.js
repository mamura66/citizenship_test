// Learn more https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;

// NOTE: content/ deliberately lives INSIDE this app.
//
// It used to sit at the repo root so future per-country apps could share it, and
// Metro was told to watch it via watchFolders. That works on a dev machine but
// breaks on EAS: with no git repo and no root package.json there is no monorepo to
// detect, so EAS uploads only this directory and '../../content' resolved to
// '/Users/expo/content' - which does not exist. Development builds never caught it
// because they bundle on the developer's machine; only a production build runs
// `expo export:embed` on EAS. Keep content inside the app until a second country
// app exists and a real monorepo (root package.json + workspaces) is set up.
const config = getDefaultConfig(projectRoot);

config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
