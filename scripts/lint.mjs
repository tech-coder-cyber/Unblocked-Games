import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');

function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectFiles(fullPath));
    } else if (entry.isFile() && /\.(js|jsx|mjs)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function run() {
  const jsFiles = collectFiles(srcDir);
  if (fs.existsSync(path.join(rootDir, 'vite.config.js'))) {
    jsFiles.push(path.join(rootDir, 'vite.config.js'));
  }
  if (fs.existsSync(path.join(rootDir, 'server.js'))) {
    jsFiles.push(path.join(rootDir, 'server.js'));
  }

  let hasErrors = false;
  for (const file of jsFiles) {
    const code = fs.readFileSync(file, 'utf8');
    const loader = file.endsWith('.jsx') ? 'jsx' : 'js';
    try {
      await esbuild.transform(code, {
        loader,
        sourcefile: path.relative(rootDir, file),
      });
    } catch (err) {
      hasErrors = true;
      console.error(`Syntax error in ${path.relative(rootDir, file)}:`);
      console.error(err.message);
    }
  }

  // Validate games.json syntax and structure
  const gamesJsonPath = path.join(rootDir, 'public', 'data', 'games.json');
  if (fs.existsSync(gamesJsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(gamesJsonPath, 'utf8'));
      if (!Array.isArray(parsed.games)) {
        throw new Error('games.json must contain a "games" array');
      }
    } catch (err) {
      hasErrors = true;
      console.error(`Invalid public/data/games.json: ${err.message}`);
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
  console.log(`Checked ${jsFiles.length} JavaScript files and games.json with zero errors.`);
}

run();
