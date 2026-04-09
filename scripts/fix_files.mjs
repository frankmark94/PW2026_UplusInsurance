import { readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { replaceInFileSync } from 'replace-in-file';

const industryPathPattern = [
  'auto',
  'commercial_bank',
  'comms',
  'comms_business',
  'gov',
  'health_care',
  'health_payer',
  'health_pharma',
  'health_provider',
  'insurance',
  'manufacturing',
  'retail_bank',
  'wealth',
  'travel',
  'energy',
].join('|');

const optionsFile1 = {
  files: './docs/*/index.html',
  from: new RegExp(`((?:href|src)=['"])/(?:${industryPathPattern})/`, 'g'),
  to: '$1./',
};

const optionsFile2 = {
  files: './docs/**/index.html',
  from: /"\/assets\//g,
  to: '"../assets/',
};

const optionsFile3 = {
  files: './docs/*/index.html',
  from: /url\('\/fonts\//g,
  to: "url('../fonts/",
};

const assetsDirectory = new URL('../docs/assets/', import.meta.url);

function renameVueExportHelperAsset() {
  const assetFiles = readdirSync(assetsDirectory);
  const helperFileName = assetFiles.find((fileName) => /^_plugin-vue_export-helper-.*\.js$/u.test(fileName));

  if (!helperFileName) {
    return;
  }

  const renamedHelperFileName = helperFileName.replace(/^_/, '');
  const helperFilePath = new URL(helperFileName, assetsDirectory);
  const renamedHelperFilePath = new URL(renamedHelperFileName, assetsDirectory);

  renameSync(helperFilePath, renamedHelperFilePath);

  replaceInFileSync({
    files: ['./docs/**/*.html', './docs/assets/**/*.js'],
    from: helperFileName,
    to: renamedHelperFileName,
  });

  const entryFiles = assetFiles
    .filter((fileName) => fileName.endsWith('.js') && fileName !== helperFileName);

  for (const entryFileName of entryFiles) {
    const entryFilePath = new URL(entryFileName, assetsDirectory);
    const entryFileContents = readFileSync(entryFilePath, 'utf8');

    if (!entryFileContents.includes(helperFileName)) {
      continue;
    }

    writeFileSync(entryFilePath, entryFileContents.replaceAll(helperFileName, renamedHelperFileName));
  }
}

try {
  replaceInFileSync(optionsFile1);
  replaceInFileSync(optionsFile2);
  replaceInFileSync(optionsFile3);
  renameVueExportHelperAsset();
} catch (error) {
  console.error('Error occurred:', error);
}
