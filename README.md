# sango-nlp

An NLP toolkit for **Sango** (ISO 639-1: `sg`, ISO 639-3: `sag`), the national language of the Central African Republic and, with French, one of its two official languages.

Built by [MEYNG](https://meyng.com) as part of the [SangoAI](https://sangoai.app) platform. MIT-licensed. Source: <https://github.com/meyng-hub/sango-nlp>.

## Features

- **Tokenizer** -- Splits Sango text into typed tokens (words, punctuation, numbers), correctly handling diacritics and hyphenated compounds
- **Language Detection** -- Identifies Sango, French, or English text using character frequency analysis, word lists, and morphological patterns
- **Stemmer** -- Reduces Sango words to base forms by stripping common prefixes (`wa-`, `a-`) and suffixes (`-ngo`, `-ngbi`)
- **Normalization** -- Strips tonal diacritics for accent-insensitive comparison and search
- **Dictionary** -- In-memory lookup with 80+ built-in entries, fuzzy matching, and diacritic-insensitive search

## Installation

```bash
npm install sango-nlp
```

## Quick Start

```typescript
import {
  tokenize,
  detectLanguage,
  stem,
  normalize,
  SangoDictionary,
} from "sango-nlp";

// Tokenize Sango text
const tokens = tokenize("Bara âla, tongana nye?");
// [
//   { text: "Bara",    type: "word",        offset: 0 },
//   { text: "âla",     type: "word",        offset: 5 },
//   { text: ",",       type: "punctuation", offset: 8 },
//   { text: "tongana", type: "word",        offset: 10 },
//   { text: "nye",     type: "word",        offset: 18 },
//   { text: "?",       type: "punctuation", offset: 21 },
// ]

// Detect language
const result = detectLanguage("Mbî yeke nzoni");
// { language: "sg", confidence: 0.85, scores: { sg: 0.85, fr: 0.08, en: 0.07 } }

// Stem words
stem("längö"); // "lä"  (strips nominalizer suffix -ngö)
stem("wandë"); // "ndë" (strips agentive prefix wa-)

// Normalize (strip diacritics)
normalize("nzônî"); // "nzoni"
normalize("Kôlï"); // "Koli"

// Dictionary lookup
const dict = new SangoDictionary();
const entry = dict.lookup("nzoni");
// { sango: "Nzoni", french: "Bon/Bien", english: "Good/Well", category: "adjectives", ... }

// Fuzzy search
const results = dict.search("nzni", { maxDistance: 2 });
// Finds "Nzoni" with distance 1
```

## API Reference

### Tokenizer

#### `tokenize(text, options?)`

Splits Sango text into an array of typed tokens.

```typescript
tokenize(text: string, options?: { includeWhitespace?: boolean }): Token[]
```

Each `Token` has:

- `text` -- The raw token text
- `type` -- `"word"` | `"punctuation"` | `"number"` | `"whitespace"` | `"unknown"`
- `offset` -- Character position in the original text

#### `extractWords(text)`

Convenience function that returns only word tokens.

#### `isParticle(token)`

Checks if a token is a known Sango particle (na, ti, so, ni, ngba, etc.).

### Language Detection

#### `detectLanguage(text)`

```typescript
detectLanguage(text: string): DetectionResult
```

Returns:

- `language` -- `"sg"` | `"fr"` | `"en"` | `"unknown"`
- `confidence` -- `0` to `1`
- `scores` -- Per-language scores

The algorithm combines word matching (50%), character patterns (30%), and morphological analysis (20%).

#### `isSango(text)`

Quick boolean check (confidence threshold: 0.4).

### Stemmer & Normalization

#### `stem(word)`

Reduces a Sango word to its approximate base form.

```typescript
stem("längö"); // "lä"
stem("wandë"); // "ndë"
stem("nzoni"); // "nzoni" (no affixes to strip)
```

#### `normalize(word)`

Strips all diacritical marks (tone markers) from a word.

```typescript
normalize("âêîôû"); // "aeiou"
normalize("äëïöü"); // "aeiou"
```

#### `equalsNormalized(a, b)`

Compares two words ignoring diacritics and case.

```typescript
equalsNormalized("Kôlï", "koli"); // true
```

#### `editDistance(a, b)`

Levenshtein edit distance between two normalized words.

### Dictionary

#### `new SangoDictionary(additionalEntries?)`

Creates a dictionary with 80+ built-in Sango entries.

```typescript
const dict = new SangoDictionary();

dict.lookup("nzoni"); // Exact match (diacritic-insensitive)
dict.lookupAny("bonjour"); // Search across all languages
dict.search("nzni"); // Fuzzy search
dict.getByCategory("verbs"); // Filter by category
dict.getCategories(); // List all categories
dict.has("yeke"); // Check existence
dict.size; // Entry count
```

#### `lookup(word)` (standalone)

Convenience function that creates a dictionary and looks up a word.

```typescript
import { lookup } from "sango-nlp";
lookup("yeke"); // { sango: "Yeke", french: "Etre", english: "To be", ... }
```

## Sango Language Notes

Sango is a creole language based on Ngbandi, serving as the lingua franca and co-official language of the Central African Republic alongside French.

### Orthography

Sango uses Latin script with tonal diacritics:

- **Circumflex** (high tone): a, e, i, o, u
- **Diaeresis** (mid tone): a, e, i, o, u
- **No mark** (neutral/low tone): a, e, i, o, u

### Phonology

Distinctive consonant clusters: mb, nd, ng, ngb, nz, nj, ndr, gb, kp

### Morphology

Sango is largely isolating but has productive affixes:

- **wa-** prefix: agentive (person associated with noun)
- **-ngo/-ngo** suffix: nominalizer (verb/adj to abstract noun)
- **ti** particle: possessive ("of")
- **na** particle: conjunction/preposition ("and", "with")

## Zero Dependencies

This package has no runtime dependencies. It is pure TypeScript compiled to ESM.

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0 (for development)

## License

MIT -- MEYNG (https://meyng.com)

## Contributing

Contributions welcome, especially:

- Additional vocabulary entries
- Improved stemming rules
- Native speaker linguistic review
- Additional language detection training data

Please open an issue or PR at [github.com/meyng-hub/sango-nlp](https://github.com/meyng-hub/sango-nlp).
