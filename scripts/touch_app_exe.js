const { existsSync, copyFileSync, statSync } = require('node:fs');
const { join } = require('node:path');

const exePath = join(__dirname, '../resident_app.exe');
const nodeBin = process.execPath; // то, чем запущен скрипт

// Минимальный «разумный» размер node.exe (≈ 20-30 МБ в v20) – ставим порог в 5 МБ
const MIN_SIZE = 5 * 1024 * 1024;

if (!existsSync(exePath) || statSync(exePath).size < MIN_SIZE) {
	copyFileSync(nodeBin, exePath);
	console.log(`touch: copied stub Node → ${exePath}`);
} else {
	console.log(`touch: ${exePath} already exists and looks valid`);
}

const fs = require('fs');
const path = require('path');

// 2. Куда копировать — в тот же каталог, где лежит скрипт
const target = path.resolve(__dirname, '../resident_app');

// 3. Копируем файл
fs.copyFileSync(nodeBin, target);

// 4. Делаем его исполняемым (chmod +x)
fs.chmodSync(target, 0o755);

console.log(`✔ Скопировано: ${nodeBin} → ${target}`);
