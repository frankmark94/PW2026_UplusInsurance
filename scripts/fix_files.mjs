import { readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { replaceInFileSync } from 'replace-in-file';

const optionsFile1 = {
  files: './docs/*/index.html',
  from: [
    /\/auto\//g,
    /\/commercial_bank\//g,
    /\/comms\//g,
    /\/comms_business\//g,
    /\/gov\//g,
    /\/health_care\//g,
    /\/health_payer\//g,
    /\/health_pharma\//g,
    /\/health_provider\//g,
    /\/insurance\//g,
    /\/manufacturing\//g,
    /\/retail_bank\//g,
    /\/wealth\//g,
    /\/travel\//g,
    /\/energy\//g,
  ],
  to: './',
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
