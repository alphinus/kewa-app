import chardet from 'chardet'
import fs from 'fs'
import path from 'path'

interface EncodingResult {
  file: string
  encoding: string | null
  valid: boolean
}

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.sql'])
const IGNORE_DIRS = new Set(['node_modules', '.next', 'dist', '.git'])

function walkDir(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        walkDir(path.join(dir, entry.name), files)
      }
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(path.join(dir, entry.name))
    }
  }
  return files
}

async function verifyProjectEncoding(): Promise<void> {
  const dirs = ['src', 'supabase', 'scripts']
  const allFiles: string[] = []

  for (const dir of dirs) {
    const fullPath = path.resolve(dir)
    if (fs.existsSync(fullPath)) {
      walkDir(fullPath, allFiles)
    }
  }

  const results: EncodingResult[] = []
  const invalid: EncodingResult[] = []

  for (const file of allFiles) {
    const buffer = await fs.promises.readFile(file)
    const encoding = chardet.detect(buffer)

    // chardet often misdetects pure-ASCII files as ISO-8859-x.
    // Pure ASCII is a valid UTF-8 subset, so we check for non-ASCII bytes first.
    const hasNonAscii = buffer.some((b) => b > 127)
    const valid =
      !hasNonAscii ||
      encoding === 'UTF-8' ||
      encoding === null

    const result = { file: path.relative(process.cwd(), file), encoding, valid }
    results.push(result)

    if (!valid) {
      invalid.push(result)
      console.error(`FAIL ${result.file}: ${encoding}`)
    }
  }

  console.log(`\nEncoding verification complete`)
  console.log(`  Total files: ${results.length}`)
  console.log(`  Valid (UTF-8/ASCII): ${results.length - invalid.length}`)
  console.log(`  Invalid: ${invalid.length}`)

  if (invalid.length > 0) {
    console.error(`\nFiles with non-UTF-8 encoding:`)
    for (const r of invalid) {
      console.error(`  ${r.file}: ${r.encoding}`)
    }
    process.exit(1)
  }

  console.log(`\nAll files are UTF-8 compatible.`)
  process.exit(0)
}

verifyProjectEncoding()
