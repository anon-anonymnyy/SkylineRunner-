// Собирает архив для Яндекс Игр из папки dist. index.html должен лежать в корне архива.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const DIST = 'dist';
const OUT = 'skyline-runner-yandex.zip';

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('[zip] Нет dist/index.html — сначала выполните "npm run build".');
  process.exit(1);
}

if (fs.existsSync(OUT)) fs.unlinkSync(OUT);

execSync(`cd ${DIST} && zip -q -r ../${OUT} .`, { stdio: 'inherit' });

const size = fs.statSync(OUT).size;
console.log(`[zip] Готово: ${OUT} (${(size / 1024 / 1024).toFixed(2)} МБ)`);
