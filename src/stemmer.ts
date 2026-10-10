// SPDX-License-Identifier: MIT
/**
 * Sango Stemmer
 *
 * Reduces Sango words to approximate base forms by stripping
 * common affixes, and provides diacritic normalization for
 * comparison and search operations.
 *
 * Sango morphology is largely isolating (words don't inflect much),
 * but it does have productive affixation:
 *
 * - **Prefix `wa-`** — Agentive: marks a person associated with
 *   the root noun (e.g., "wandë" = foreigner, from "ndë")
 * - **Prefix `a-`** — Subject pronoun (3rd person), often fused
 *   with verb stems in written text
 * - **Prefix `â-`** — High-tone variant of `a-`, emphatic
 * - **Prefix `î-`** — Variant pronoun prefix
 * - **Suffix `-ngö`** — Nominalizer: turns verbs/adjectives into
 *   abstract nouns (e.g., "längö" = sleep/sleeping, from "lä")
 * - **Suffix `-ngo`** — Variant of `-ngö` (without diacritic)
 * - **Suffix `-ngbi`** — Instrumental/manner suffix
 *
 * @module stemmer
 */

/**
 * Map of Sango diacritical characters to their ASCII equivalents.
 * Used for normalization when exact tone marking is not needed.
 */
const DIACRITIC_MAP: ReadonlyMap<string, string> = new Map([
  // Circumflex (high tone)
  ["â", "a"],
  ["ê", "e"],
  ["î", "i"],
  ["ô", "o"],
  ["û", "u"],
  ["Â", "A"],
  ["Ê", "E"],
  ["Î", "I"],
  ["Ô", "O"],
  ["Û", "U"],
  // Diaeresis (mid tone)
  ["ä", "a"],
  ["ë", "e"],
  ["ï", "i"],
  ["ö", "o"],
  ["ü", "u"],
  ["Ä", "A"],
  ["Ë", "E"],
  ["Ï", "I"],
  ["Ö", "O"],
  ["Ü", "U"],
  // Acute accent
  ["á", "a"],
  ["é", "e"],
  ["í", "i"],
  ["ó", "o"],
  ["ú", "u"],
  ["Á", "A"],
  ["É", "E"],
  ["Í", "I"],
  ["Ó", "O"],
  ["Ú", "U"],
  // Grave accent (rare in Sango but may appear)
  ["à", "a"],
  ["è", "e"],
  ["ì", "i"],
  ["ò", "o"],
  ["ù", "u"],
  ["À", "A"],
  ["È", "E"],
  ["Ì", "I"],
  ["Ò", "O"],
  ["Ù", "U"],
]);

/**
 * Common Sango prefixes, ordered longest-first for greedy matching.
 * Each entry is [prefix, minimum remaining length after stripping].
 */
const PREFIXES: ReadonlyArray<[string, number]> = [
  ["wa", 2], // Agentive prefix
  ["â", 2], // Emphatic/high-tone subject marker
  ["î", 2], // Pronoun prefix variant
  ["a", 2], // 3rd person subject marker
];

/**
 * Common Sango suffixes, ordered longest-first for greedy matching.
 * Each entry is [suffix, minimum remaining length after stripping].
 */
const SUFFIXES: ReadonlyArray<[string, number]> = [
  ["ngbi", 2], // Instrumental suffix
  ["ngö", 2], // Nominalizer (with diacritic)
  ["ngo", 2], // Nominalizer (without diacritic)
  ["ngô", 2], // Nominalizer variant
];

/**
 * Words that should not be stemmed — they are irreducible base forms
 * or particles where stripping affixes would produce nonsense.
 */
const STEM_EXCEPTIONS = new Set([
  // Particles and function words
  "na",
  "ti",
  "ni",
  "so",
  "lo",
  "a",
  "la",
  "tî",
  "sô",
  "nî",
  "lâ",
  "âla",
  // Common short words that start with 'a' but aren't prefixed
  "ala",
  "awe",
  "ave",
  // Words starting with 'wa' that aren't agentive
  "wâlï",
  "wali",
  "wâli",
  // Words ending in 'ngo/ngö' where it's part of the root
  "yingo",
  "mongo",
]);

/**
 * Strips all diacritical marks from a Sango word, reducing it
 * to plain ASCII. Useful for case-insensitive and accent-insensitive
 * comparison, search indexing, and fuzzy matching.
 *
 * This function preserves the consonant structure and only modifies
 * vowels that carry tone marks.
 *
 * @param word - The word to normalize.
 * @returns The word with all diacritics removed.
 *
 * @example
 * ```ts
 * import { normalize } from "@meyng/sango-nlp";
 *
 * normalize("nzônî");  // "nzoni"
 * normalize("Kôkô");   // "Koko"
 * normalize("längö");  // "lango"
 * normalize("mbî");    // "mbi"
 * ```
 */
export function normalize(word: string): string {
  let result = "";
  for (const char of word) {
    const replacement = DIACRITIC_MAP.get(char);
    result += replacement ?? char;
  }
  return result;
}

/**
 * Reduces a Sango word to its approximate stem (base form) by
 * stripping known prefixes and suffixes.
 *
 * The stemmer applies these rules in order:
 * 1. Skip if the word is in the exception list
 * 2. Try stripping one suffix (longest match first)
 * 3. Try stripping one prefix (longest match first)
 * 4. Return the reduced form (lowercased)
 *
 * Stemming is conservative: it only strips one prefix and one suffix
 * per word to avoid over-reduction. The minimum stem length is 2
 * characters.
 *
 * @param word - The Sango word to stem.
 * @returns The stemmed form (lowercased).
 *
 * @example
 * ```ts
 * import { stem } from "@meyng/sango-nlp";
 *
 * stem("längö");     // "la"    (strip nominalizer -ngö)
 * stem("wandë");     // "nde"   (strip agentive wa-)
 * stem("nzoni");     // "nzoni" (no known affixes)
 * stem("na");        // "na"    (exception: particle)
 * ```
 */
export function stem(word: string): string {
  const lower = word.toLowerCase();
  const normalized = normalize(lower);

  // Don't stem exception words
  if (STEM_EXCEPTIONS.has(lower) || STEM_EXCEPTIONS.has(normalized)) {
    return lower;
  }

  let current = lower;

  // Try stripping one suffix
  for (const [suffix, minLen] of SUFFIXES) {
    const normalizedCurrent = normalize(current);
    const normalizedSuffix = normalize(suffix);

    if (
      normalizedCurrent.endsWith(normalizedSuffix) &&
      normalizedCurrent.length - normalizedSuffix.length >= minLen
    ) {
      // Find where the suffix starts in the original (possibly diacriticized) string
      // We work on the normalized version for matching, then trim the same number of chars
      current = current.slice(0, current.length - suffix.length);
      break;
    }
  }

  // Try stripping one prefix
  for (const [prefix, minLen] of PREFIXES) {
    const normalizedCurrent = normalize(current);
    const normalizedPrefix = normalize(prefix);

    if (
      normalizedCurrent.startsWith(normalizedPrefix) &&
      normalizedCurrent.length - normalizedPrefix.length >= minLen
    ) {
      current = current.slice(prefix.length);
      break;
    }
  }

  return current;
}

/**
 * Compares two Sango words for equality, ignoring diacritics and case.
 * Useful for search and matching where users may not type tone marks.
 *
 * @param a - First word.
 * @param b - Second word.
 * @returns True if the words are equivalent after normalization.
 *
 * @example
 * ```ts
 * import { equalsNormalized } from "@meyng/sango-nlp";
 *
 * equalsNormalized("nzônî", "nzoni");   // true
 * equalsNormalized("Kôlï", "koli");     // true
 * equalsNormalized("mbî", "mbi");       // true
 * equalsNormalized("baba", "mama");      // false
 * ```
 */
export function equalsNormalized(a: string, b: string): boolean {
  return normalize(a.toLowerCase()) === normalize(b.toLowerCase());
}

/**
 * Computes a simple edit distance (Levenshtein) between two strings.
 * Used internally for fuzzy matching. Operates on normalized forms.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns The minimum number of single-character edits needed.
 */
export function editDistance(a: string, b: string): number {
  const na = normalize(a.toLowerCase());
  const nb = normalize(b.toLowerCase());

  if (na === nb) return 0;
  if (na.length === 0) return nb.length;
  if (nb.length === 0) return na.length;

  // Optimized single-row DP
  const row = Array.from({ length: nb.length + 1 }, (_, i) => i);

  for (let i = 1; i <= na.length; i++) {
    let prev = i;
    for (let j = 1; j <= nb.length; j++) {
      const cost = na[i - 1] === nb[j - 1] ? 0 : 1;
      const current = Math.min(
        row[j] + 1, // deletion
        prev + 1, // insertion
        row[j - 1] + cost, // substitution
      );
      row[j - 1] = prev;
      prev = current;
    }
    row[nb.length] = prev;
  }

  return row[nb.length];
}
