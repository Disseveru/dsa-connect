const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const outputDir = path.join(rootDir, 'vercel-static')
const outputDistDir = path.join(outputDir, 'dist')

const filesToCopy = [
  ['index.html', 'index.html'],
  ['dist/index.es.js', 'dist/index.es.js'],
  ['dist/index.bundle.js', 'dist/index.bundle.js'],
]

fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDistDir, { recursive: true })

for (const [source, destination] of filesToCopy) {
  fs.copyFileSync(path.join(rootDir, source), path.join(outputDir, destination))
}
