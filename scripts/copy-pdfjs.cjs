// scripts/copy-pdfjs.cjs
const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
    if (!fs.existsSync(src)) throw new Error('Not found: ' + src);
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
        const s = path.join(src, name);
        const d = path.join(dest, name);
        fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
    }
    console.log('[pdfjs] copied', src, '→', dest);
}

const ROOT = process.cwd();
const NM = path.join(ROOT, 'node_modules', 'pdfjs-dist');
copyDir(path.join(NM, 'web'), path.join(ROOT, 'public', 'pdfjs', 'web'));   // viewer.html 在這
copyDir(path.join(NM, 'build'), path.join(ROOT, 'public', 'pdfjs', 'build')); // pdf.worker.min.mjs 在這
