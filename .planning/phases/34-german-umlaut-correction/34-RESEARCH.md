# Phase 34: German Umlaut Correction - Research

**Researched:** 2026-02-06
**Domain:** Text encoding, file encoding verification, database collation
**Confidence:** HIGH

## Summary

German umlaut correction requires three parallel workstreams: (1) verifying and enforcing UTF-8 encoding across all source files, (2) finding and replacing ae/oe/ue substitutions with proper umlauts (ä/ö/ü), and (3) verifying database collation supports German text sorting. The codebase currently contains multiple instances of improper German text (e.g., "Aenderung", "Gebaeude", "verfuegbar") that need correction.

Files with existing umlauts are already UTF-8 encoded, but files without umlauts show as ASCII (which is a subset of UTF-8). The main risk is introducing encoding mismatches when adding umlauts to previously ASCII files. Database collation verification requires SQL queries against Supabase's PostgreSQL instance to confirm UTF-8 support and proper German sorting behavior.

**Primary recommendation:** Use Node.js file encoding detection libraries (chardet, detect-character-encoding) for verification, manual regex find/replace for corrections with careful review, and PostgreSQL catalog queries for database collation validation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chardet (node-chardet) | ^2.0.0 | File encoding detection | Pure TypeScript, multiple detection methods, actively maintained |
| file command (Windows) | System | Quick encoding check | Built into Git Bash/WSL, instant verification |
| PostgreSQL pg_collation | Built-in | Database collation query | Native PostgreSQL catalog for collation inspection |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| detect-character-encoding | ^1.0.0 | Encoding with confidence | Need confidence scores for ambiguous files |
| utf-8-validate | ^6.0.0 | UTF-8 validation only | Validate after conversion, not detection |
| EditorConfig | Config file | Enforce charset=utf-8 | Prevent future encoding drift |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| chardet | is-utf8 | is-utf8 is older, less maintained, boolean only |
| Manual regex | Automated i18n tool | i18n tools are overkill for single-language app |
| File command | Node.js libraries | File command is faster but less programmatic |

**Installation:**
```bash
npm install --save-dev chardet detect-character-encoding utf-8-validate
```

**Git Configuration:**
```bash
git config core.quotepath false  # Show UTF-8 filenames properly
```

## Architecture Patterns

### Recommended Verification Script Structure
```
scripts/
├── verify-encoding.ts       # Main verification script
├── fix-umlauts.ts           # Find/replace script (manual review)
└── check-db-collation.sql   # Database validation queries
```

### Pattern 1: File Encoding Verification
**What:** Scan all source files to verify UTF-8 encoding
**When to use:** Before making any umlaut replacements
**Example:**
```typescript
// Source: chardet npm package + project research
import chardet from 'chardet'
import fs from 'fs'
import path from 'path'

async function verifyFileEncoding(filePath: string): Promise<{ valid: boolean; detected: string | null }> {
  const buffer = await fs.promises.readFile(filePath)
  const detected = chardet.detect(buffer)

  // ASCII is valid (subset of UTF-8)
  const valid = detected === 'UTF-8' || detected === 'ascii' || detected === null

  return { valid, detected }
}

// Scan directories
const patterns = ['src/**/*.{ts,tsx}', 'supabase/**/*.sql']
```

### Pattern 2: Regex-Based Umlaut Replacement
**What:** Find German words with ae/oe/ue and replace with umlauts
**When to use:** After encoding verification, with manual review
**Example:**
```typescript
// Source: Community patterns from regex German umlaut research
const replacements: Record<string, string> = {
  // Lowercase
  'aendern': 'ändern',
  'Aenderung': 'Änderung',
  'aenderungsauftrag': 'änderungsauftrag',
  'Aenderungsauftrag': 'Änderungsauftrag',
  'verfuegbar': 'verfügbar',
  'Verfuegbar': 'Verfügbar',
  'Gebaeude': 'Gebäude',
  'Kueche': 'Küche',
  'Wohnung': 'Wohnung', // Already correct
  'Strasse': 'Straße',
  'groesser': 'größer',
  'pruefung': 'prüfung',
  'Pruefung': 'Prüfung',
  'pruefen': 'prüfen',
  'Schlaeuche': 'Schläuche',
  'Tuerdichtungen': 'Türdichtungen',
  'Maengel': 'Mängel',
  'Raeume': 'Räume',
  'bestaetigen': 'bestätigen',
  'Bestaetigung': 'Bestätigung',
  'bestaetigt': 'bestätigt',
  'Bestaetigt': 'Bestätigt',
  'ausfuehren': 'ausführen',
  'durchfuehren': 'durchführen',
  'uebermittelt': 'übermittelt',
  'Ueberpruefen': 'Überprüfen',
  'gegenueber': 'gegenüber',
  'Qualitaet': 'Qualität',
  'naechst': 'nächst',
  'erhoehen': 'erhöhen',
  'Moeglichkeit': 'Möglichkeit',
  'muessen': 'müssen',
  'ueberwach': 'überwach',
  'ueberschrieben': 'überschrieben',
  'ueberpruefen': 'überprüfen',
  'erklaeren': 'erklären'
}

// Apply with context awareness - avoid false positives like "does", "true", "value"
function shouldReplace(word: string, context: string): boolean {
  // Check if it's actually a German word based on context
  // Avoid English words containing ae/oe/ue
  const englishWords = ['does', 'true', 'false', 'value', 'queue', 'blue', 'route']
  return !englishWords.some(eng => word.toLowerCase().includes(eng))
}
```

### Pattern 3: Database Collation Verification
**What:** Query PostgreSQL to verify UTF-8 encoding and German collation support
**When to use:** After file corrections, before deployment
**Example:**
```sql
-- Source: PostgreSQL documentation + Supabase research
-- Check database encoding and collation
SELECT
  datname,
  pg_encoding_to_char(encoding) as encoding,
  datcollate as lc_collate,
  datctype as lc_ctype
FROM pg_database
WHERE datname = current_database();

-- Expected: encoding = 'UTF8', lc_collate/lc_ctype = 'en_US.UTF-8' or 'C.UTF-8'

-- Check available German collations
SELECT collname, collcollate, collctype
FROM pg_collation
WHERE collname ILIKE '%de_%' OR collname ILIKE '%german%'
ORDER BY collname;

-- Test German sorting behavior
SELECT * FROM (
  VALUES ('Apfel'), ('Ärger'), ('Zucker'), ('Änderung')
) AS test(word)
ORDER BY word COLLATE "de_DE";
-- Expected: Änderung, Apfel, Ärger, Zucker (ä after a, not after z)

-- If de_DE not available, test with default collation
SELECT * FROM (
  VALUES ('Apfel'), ('Ärger'), ('Zucker'), ('Änderung')
) AS test(word)
ORDER BY word;
-- Document the actual behavior for verification
```

### Anti-Patterns to Avoid
- **Global find/replace without context:** Replacing "ue" globally will break English words like "true", "value", "queue"
- **UTF-8 BOM for TypeScript files:** Modern TypeScript doesn't need BOM, can cause issues with tools
- **Assuming database collation:** Supabase instances may not have de_DE locale installed, verify first
- **Converting files without backup:** Always commit before bulk encoding changes

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Encoding detection | Custom byte analysis | chardet or detect-character-encoding | Handle edge cases, confidence scoring, multiple encodings |
| Character replacement | Simple string.replace() | Dictionary-based with context checking | Avoid false positives in English words, handle capitalization |
| File traversal | Manual fs.readdir | glob or fast-glob | Handle gitignore, binary files, symlinks |
| UTF-8 validation | Regex or manual checking | utf-8-validate (C++ backed) | 100x faster, handles malformed sequences |

**Key insight:** Text encoding is deceptively complex - files can be mixed encoding, have invalid sequences, or use different normalizations (NFC vs NFD). Use battle-tested libraries instead of rolling string-based solutions.

## Common Pitfalls

### Pitfall 1: False Positive Replacements
**What goes wrong:** "ue" appears in many English words (true, value, queue, blue, route, continue) - global replacement breaks code
**Why it happens:** German ae/oe/ue patterns overlap with English words
**How to avoid:**
- Use whole-word replacement dictionary, not regex patterns
- Check context (comments vs code, German vs English identifiers)
- Manual review all replacements before commit
**Warning signs:** Test failures, TypeScript errors, broken English UI text

### Pitfall 2: Encoding Corruption on Windows
**What goes wrong:** Files appear to have umlauts in editor but Git shows encoding errors, or vice versa
**Why it happens:** Windows uses different encodings (Windows-1252, CP437) than Unix (UTF-8), Git's core.quotepath escapes non-ASCII
**How to avoid:**
- Set `git config core.quotepath false` immediately
- Use EditorConfig with `charset = utf-8` to enforce editor behavior
- Verify with `file --mime-encoding` after changes
- Test on actual Windows dev environment (not WSL)
**Warning signs:** Git diff shows `\nnn` escape sequences, files work locally but break in CI

### Pitfall 3: Unicode Normalization Differences
**What goes wrong:** Umlauts look identical but use different Unicode representations (NFC vs NFD), causing git conflicts or search failures
**Why it happens:** Mac OS X decomposes (NFD: ü = u + combining diacritic), Windows/Linux use precomposed (NFC: ü as single character)
**How to avoid:**
- Always use NFC normalization for consistency
- Add normalization check to verification script: `word.normalize('NFC')`
- Git may show files as changed when they're not
**Warning signs:** Git shows changes but diff is empty, search for "ü" doesn't find some instances

### Pitfall 4: Missing Database Collation
**What goes wrong:** German text sorts incorrectly (Ärger after Zucker instead of after Apfel)
**Why it happens:** Supabase instances default to en_US.UTF-8, may not have de_DE collation installed
**How to avoid:**
- Verify available collations BEFORE promising German sort order
- If de_DE unavailable, use ICU collations or accept en_US behavior
- Document the actual sort behavior in requirements
- Consider application-level sorting if database doesn't support German
**Warning signs:** User reports "sort order is wrong", names with umlauts at end of list

### Pitfall 5: Incomplete Coverage
**What goes wrong:** Fix visible UI text but miss comments, SQL strings, error messages
**Why it happens:** Search focused on user-facing strings only
**How to avoid:**
- Scan ALL file types: .ts, .tsx, .sql, .json, .md
- Include comments and documentation
- Check database seed data and test fixtures
- Verify API error messages
**Warning signs:** German text still appears in error messages, database has ae/oe/ue in data

## Code Examples

Verified patterns from research:

### File Encoding Verification Script
```typescript
// scripts/verify-encoding.ts
import chardet from 'chardet'
import fs from 'fs'
import { glob } from 'glob'

interface EncodingResult {
  file: string
  encoding: string | null
  valid: boolean
}

async function verifyProjectEncoding(): Promise<EncodingResult[]> {
  const patterns = [
    'src/**/*.{ts,tsx,js,jsx}',
    'supabase/**/*.sql',
    'scripts/**/*.ts'
  ]

  const files = await glob(patterns, { ignore: ['node_modules/**', '.next/**'] })
  const results: EncodingResult[] = []

  for (const file of files) {
    const buffer = await fs.promises.readFile(file)
    const encoding = chardet.detect(buffer)

    // ASCII is valid (subset of UTF-8)
    const valid = encoding === 'UTF-8' || encoding === 'ascii' || encoding === null

    results.push({ file, encoding, valid })

    if (!valid) {
      console.error(`❌ ${file}: ${encoding}`)
    }
  }

  const invalid = results.filter(r => !r.valid)
  console.log(`\n✅ ${results.length - invalid.length} files valid`)
  console.log(`❌ ${invalid.length} files need conversion`)

  return results
}

verifyProjectEncoding()
```

### Database Collation Check
```sql
-- scripts/check-db-collation.sql
-- Run via: psql $DATABASE_URL -f scripts/check-db-collation.sql

\echo '=== Database Encoding and Collation ==='
SELECT
  current_database() as database,
  pg_encoding_to_char(encoding) as encoding,
  datcollate as lc_collate,
  datctype as lc_ctype
FROM pg_database
WHERE datname = current_database();

\echo ''
\echo '=== Available German Collations ==='
SELECT collname, collprovider, collcollate, collctype
FROM pg_collation
WHERE collname ILIKE '%de_%' OR collname ILIKE '%german%'
ORDER BY collname;

\echo ''
\echo '=== Test German Sort Order ==='
\echo 'Expected: Änderung, Apfel, Ärger, Zucker (ä after a)'
SELECT word FROM (
  VALUES ('Apfel'), ('Ärger'), ('Zucker'), ('Änderung')
) AS test(word)
ORDER BY word;

\echo ''
\echo '=== String Columns Using Non-Default Collation ==='
SELECT
  table_name,
  column_name,
  collation_name
FROM information_schema.columns
WHERE collation_name IS NOT NULL
  AND table_schema = 'public'
ORDER BY table_name, column_name;
```

### EditorConfig for UTF-8 Enforcement
```ini
# .editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{ts,tsx,js,jsx,json,sql}]
charset = utf-8
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

### Git Configuration
```bash
# Set once per repository
git config core.quotepath false

# Verify setting
git config --get core.quotepath
# Should output: false
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual visual inspection | Automated encoding detection with chardet | 2020+ | Scalable to large codebases |
| UTF-8 BOM for all files | UTF-8 without BOM | 2015+ (ES6+) | Better tool compatibility |
| Global regex replace | Dictionary-based context-aware replacement | Always | Avoid false positives |
| Server-side collation only | Application-level sorting as fallback | 2022+ (cloud databases) | Handle missing locale support |
| charset compiler option | EditorConfig + git config | 2018+ (TypeScript 3.0) | Editor-agnostic enforcement |

**Deprecated/outdated:**
- `charset` tsconfig.json option: Removed in TypeScript 5.5, use EditorConfig instead
- UTF-8 BOM requirement: No longer needed for TypeScript, causes issues with tools
- LANG environment variable for Node.js: Node.js 22+ defaults to UTF-8 in all environments

## Open Questions

Things that couldn't be fully resolved:

1. **Supabase German Collation Availability**
   - What we know: Supabase uses PostgreSQL with en_US.UTF-8 by default, ICU collations available
   - What's unclear: Whether de_DE collation is installed, or if we need to use ICU provider
   - Recommendation: Run SQL verification queries first, document actual behavior, use application-level sort if needed

2. **Database Existing Data Encoding**
   - What we know: Database should be UTF-8, but existing data may have been inserted with wrong encoding
   - What's unclear: Whether any tenant names, project names, or user-entered text has encoding corruption
   - Recommendation: Add data verification queries to check for ae/oe/ue in user data, provide migration if needed

3. **Cross-Platform File Encoding**
   - What we know: Files with umlauts are UTF-8 on Windows
   - What's unclear: Whether Mac/Linux contributors would introduce NFD normalization
   - Recommendation: Single-user workflow (Mario only), but add NFC normalization to verification script as safeguard

## Sources

### Primary (HIGH confidence)
- [chardet npm package](https://github.com/runk/node-chardet) - Character encoding detection for Node.js
- [PostgreSQL Collation Documentation](https://www.postgresql.org/docs/current/collation.html) - Official PostgreSQL collation support
- [detect-character-encoding npm](https://www.npmjs.com/package/detect-character-encoding) - Alternative encoding detection
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) - UTF-8 without BOM recommendation
- [EditorConfig Official](https://editorconfig.org/) - charset property specification

### Secondary (MEDIUM confidence)
- [Git for Windows Unicode Support](https://github.com/msysgit/msysgit/wiki/Git-for-Windows-Unicode-Support) - core.quotepath and UTF-8 filenames
- [Supabase Database Inspection](https://supabase.com/docs/guides/database/inspect) - Querying database settings
- [Supabase German collation discussion](https://github.com/orgs/supabase/discussions/4667) - Community discussion on locale support
- [ESLint unicode-bom rule](https://eslint.org/docs/latest/rules/unicode-bom) - BOM detection and enforcement
- [Replacing German Umlauts blog post](http://gordon.koefner.at/blog/coding/replacing-german-umlauts/) - Practical replacement patterns

### Tertiary (LOW confidence)
- Various Stack Overflow threads on German umlaut replacement - Patterns vary, need validation
- Community regex patterns for ae/oe/ue detection - Require manual review for false positives

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - chardet and PostgreSQL catalog queries are industry standard
- Architecture: HIGH - File verification, dictionary replacement, database queries are proven patterns
- Pitfalls: HIGH - Based on documented issues (Git quotepath, NFC/NFD, false positives) from official sources

**Research date:** 2026-02-06
**Valid until:** 2026-09-06 (6 months - stable domain, tools mature)
