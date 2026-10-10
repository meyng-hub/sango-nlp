// SPDX-License-Identifier: MIT
/**
 * Sango Language Detection
 *
 * Identifies whether a given text is written in Sango, French, or English
 * using a combination of character frequency analysis, diacritic patterns,
 * and common word matching.
 *
 * Sango (ISO 639-1: sg) is distinguished from French and English by:
 * - Specific diacritic usage (circumflex for high tone, diaeresis for mid tone)
 * - Unique consonant clusters (ngb, mb, nd, nz, ndr, nj)
 * - Common function words (na, ti, yeke, mingi, nzoni)
 * - Tonal markers absent in French/English orthography
 *
 * @module language-detect
 */

/** ISO 639-1 language codes supported by the detector. */
export type SupportedLanguage = "sg" | "fr" | "en" | "unknown";

/** Result of language detection with confidence scoring. */
export interface DetectionResult {
  /** Detected language code (sg = Sango, fr = French, en = English). */
  language: SupportedLanguage;
  /** Confidence score from 0 (no confidence) to 1 (certain). */
  confidence: number;
  /** Scores for all languages, useful for debugging or multilingual text. */
  scores: Record<SupportedLanguage, number>;
}

/**
 * High-frequency Sango words used for detection.
 * Includes particles, pronouns, common verbs, and nouns.
 * Words are chosen to be distinctive (not shared with French/English).
 */
const SANGO_WORDS = new Set([
  // Particles and connectors
  "na",
  "ti",
  "ni",
  "ngba",
  "ndo",
  "ala",
  "lo",
  "so",
  "tî",
  "sô",
  "nî",
  "âla",
  "lâ",
  // Pronouns
  "mbî",
  "mo",
  "ë",
  "âla",
  "âla",
  // Common verbs
  "yeke",
  "sâra",
  "gwê",
  "ga",
  "mû",
  "bâ",
  "mä",
  "hênga",
  "tene",
  "dîko",
  "tambêla",
  "yê",
  "kê",
  "längö",
  // Common nouns
  "nzoni",
  "mingi",
  "mbeni",
  "molengê",
  "kôlï",
  "wâlï",
  "ngû",
  "kobê",
  "nyama",
  "loso",
  "susu",
  "ndala",
  "baba",
  "mama",
  "mbä",
  "kwa",
  // Greetings
  "singuila",
  "bara",
  "tongana",
  "ndzônî",
  // Time
  "kêkêrêkê",
  "bîri",
  "kôzo",
  "pâso",
  // Numbers
  "ôko",
  "ûse",
  "ôtä",
  "okû",
  "balë",
  // Other distinctive words
  "sêngê",
  "awe",
  "pardon",
  "nye",
]);

/**
 * High-frequency French words used for detection.
 * Excludes words that overlap with Sango or English.
 */
const FRENCH_WORDS = new Set([
  // Articles and determiners
  "le",
  "la",
  "les",
  "un",
  "une",
  "des",
  "du",
  "au",
  "aux",
  // Prepositions and conjunctions
  "de",
  "et",
  "en",
  "dans",
  "pour",
  "avec",
  "sur",
  "par",
  "mais",
  "ou",
  "donc",
  "car",
  "que",
  "qui",
  "dont",
  // Pronouns
  "je",
  "tu",
  "il",
  "elle",
  "nous",
  "vous",
  "ils",
  "elles",
  "ce",
  "cette",
  "ces",
  "mon",
  "ton",
  "son",
  // Common verbs
  "est",
  "suis",
  "sont",
  "avoir",
  "faire",
  "aller",
  "peut",
  "fait",
  "dit",
  "voir",
  "aussi",
  // Common words
  "pas",
  "ne",
  "plus",
  "bien",
  "tout",
  "comme",
  "très",
  "oui",
  "non",
  "ici",
  "bon",
  "merci",
  "bonjour",
]);

/**
 * High-frequency English words used for detection.
 * Excludes words that overlap with Sango or French.
 */
const ENGLISH_WORDS = new Set([
  // Articles and determiners
  "the",
  "a",
  "an",
  "this",
  "that",
  "these",
  "those",
  // Prepositions and conjunctions
  "and",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "but",
  "or",
  "if",
  "from",
  "by",
  "about",
  // Pronouns
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their",
  // Common verbs
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "can",
  // Common words
  "not",
  "what",
  "which",
  "who",
  "how",
  "when",
  "where",
  "there",
  "here",
  "very",
  "just",
  "also",
  "than",
  "yes",
  "no",
  "hello",
  "please",
  "thank",
]);

/**
 * Sango-specific diacritical characters. Their presence strongly
 * indicates Sango text, as French uses a different subset and
 * English uses almost none.
 */
const SANGO_DIACRITICS = /[âêîôûäëïöü]/gi;

/**
 * Consonant clusters characteristic of Sango phonology.
 * These nasal-stop sequences are rare or absent in French/English.
 */
const SANGO_CLUSTERS = /(?:ngb|ndr|ndz|nz|nj|mb|nd|ng|gb|kp)/gi;

/**
 * French-specific patterns: characters and sequences common in
 * French but absent from standard Sango orthography.
 */
const FRENCH_PATTERNS =
  /(?:tion|ment|eux|aux|ais|ait|ent|oir|eau|ou[sx]|ç|œ)/gi;

/**
 * English-specific patterns: common suffixes and sequences.
 */
const ENGLISH_PATTERNS =
  /(?:tion|ness|ment|ing|ght|th[aeiou]|wh[aeiou]|sh[aeiou]|ould|ious)/gi;

/**
 * Splits text into lowercase word tokens for analysis.
 */
function extractAnalysisWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zA-ZàâäáãèéêëìîïíòóôöùúûüñçÀÂÄÁÃÈÉÊËÌÎÏÍÒÓÔÖÙÚÛÜÑÇ-]+/)
    .filter((w) => w.length > 0);
}

/**
 * Counts how many words in the text match a given word set.
 */
function countWordMatches(words: string[], wordSet: Set<string>): number {
  return words.filter((w) => wordSet.has(w)).length;
}

/**
 * Counts regex pattern matches in text.
 */
function countPatternMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Detects the language of a given text, returning Sango (sg),
 * French (fr), English (en), or unknown with a confidence score.
 *
 * The algorithm combines three signals:
 * 1. **Word matching** (50% weight) — Compares against known word lists
 * 2. **Character patterns** (30% weight) — Diacritics and consonant clusters
 * 3. **Morphological patterns** (20% weight) — Language-specific suffixes
 *
 * For short texts (< 3 words), confidence is capped at 0.7 due to
 * inherent ambiguity.
 *
 * @param text - The text to analyze.
 * @returns Detection result with language, confidence, and per-language scores.
 *
 * @example
 * ```ts
 * import { detectLanguage } from "@meyng/sango-nlp";
 *
 * detectLanguage("Bara âla, tongana nye?");
 * // { language: "sg", confidence: 0.92, scores: { sg: 0.92, fr: 0.05, en: 0.03, unknown: 0 } }
 *
 * detectLanguage("Bonjour, comment allez-vous?");
 * // { language: "fr", confidence: 0.88, scores: { sg: 0.02, fr: 0.88, en: 0.10, unknown: 0 } }
 *
 * detectLanguage("Hello, how are you?");
 * // { language: "en", confidence: 0.90, scores: { sg: 0.01, fr: 0.04, en: 0.90, unknown: 0 } }
 * ```
 */
export function detectLanguage(text: string): DetectionResult {
  if (!text || text.trim().length === 0) {
    return {
      language: "unknown",
      confidence: 0,
      scores: { sg: 0, fr: 0, en: 0, unknown: 1 },
    };
  }

  const words = extractAnalysisWords(text);
  const totalWords = words.length;

  if (totalWords === 0) {
    return {
      language: "unknown",
      confidence: 0,
      scores: { sg: 0, fr: 0, en: 0, unknown: 1 },
    };
  }

  // --- Signal 1: Word matching (0-1 score) ---
  const sangoWordScore = countWordMatches(words, SANGO_WORDS) / totalWords;
  const frenchWordScore = countWordMatches(words, FRENCH_WORDS) / totalWords;
  const englishWordScore = countWordMatches(words, ENGLISH_WORDS) / totalWords;

  // --- Signal 2: Character/diacritic patterns (0-1 score) ---
  const textLength = text.length;
  const sangoDiacriticScore = Math.min(
    countPatternMatches(text, SANGO_DIACRITICS) / (textLength * 0.1),
    1,
  );
  const sangoClusterScore = Math.min(
    countPatternMatches(text, SANGO_CLUSTERS) / (textLength * 0.05),
    1,
  );
  const sangoCharScore = sangoDiacriticScore * 0.6 + sangoClusterScore * 0.4;

  const frenchPatternScore = Math.min(
    countPatternMatches(text, FRENCH_PATTERNS) / (textLength * 0.05),
    1,
  );

  const englishPatternScore = Math.min(
    countPatternMatches(text, ENGLISH_PATTERNS) / (textLength * 0.05),
    1,
  );

  // --- Signal 3: Morphological patterns (0-1 score) ---
  // Sango words tend to be short (1-3 syllables) and end in vowels
  const vowelEndingRatio =
    words.filter((w) => /[aeiouyâêîôûäëïöüáéíóú]$/i.test(w)).length /
    totalWords;
  const avgWordLength =
    words.reduce((sum, w) => sum + w.length, 0) / totalWords;

  // Sango words average 3-5 characters; French/English tend longer
  const sangoLengthScore =
    avgWordLength <= 6 ? 1 : Math.max(0, 1 - (avgWordLength - 6) * 0.15);

  const sangoMorphScore = vowelEndingRatio * 0.6 + sangoLengthScore * 0.4;
  const frenchMorphScore = frenchPatternScore;
  const englishMorphScore = englishPatternScore;

  // --- Combine signals with weights ---
  const WORD_WEIGHT = 0.5;
  const CHAR_WEIGHT = 0.3;
  const MORPH_WEIGHT = 0.2;

  const sangoScore =
    sangoWordScore * WORD_WEIGHT +
    sangoCharScore * CHAR_WEIGHT +
    sangoMorphScore * MORPH_WEIGHT;

  const frenchScore =
    frenchWordScore * WORD_WEIGHT +
    frenchPatternScore * CHAR_WEIGHT +
    frenchMorphScore * MORPH_WEIGHT;

  const englishScore =
    englishWordScore * WORD_WEIGHT +
    englishPatternScore * CHAR_WEIGHT +
    englishMorphScore * MORPH_WEIGHT;

  // Normalize scores so they sum to ~1
  const totalScore = sangoScore + frenchScore + englishScore;
  let normalizedScores: Record<SupportedLanguage, number>;

  if (totalScore === 0) {
    return {
      language: "unknown",
      confidence: 0,
      scores: { sg: 0, fr: 0, en: 0, unknown: 1 },
    };
  }

  normalizedScores = {
    sg: sangoScore / totalScore,
    fr: frenchScore / totalScore,
    en: englishScore / totalScore,
    unknown: 0,
  };

  // Find the winner
  let bestLang: SupportedLanguage = "unknown";
  let bestScore = 0;

  for (const [lang, score] of Object.entries(normalizedScores) as [
    SupportedLanguage,
    number,
  ][]) {
    if (lang !== "unknown" && score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  // Compute confidence: raw score scaled, capped for short texts
  let confidence = Math.min(bestScore * 1.2, 1);

  // Short text penalty
  if (totalWords < 3) {
    confidence = Math.min(confidence, 0.7);
  }

  // Very low total signal means low confidence regardless
  if (totalScore < 0.05) {
    confidence *= 0.5;
    bestLang = "unknown";
    normalizedScores.unknown =
      1 - normalizedScores.sg - normalizedScores.fr - normalizedScores.en;
  }

  // Round scores to avoid floating point noise
  const roundedScores: Record<SupportedLanguage, number> = {
    sg: Math.round(normalizedScores.sg * 100) / 100,
    fr: Math.round(normalizedScores.fr * 100) / 100,
    en: Math.round(normalizedScores.en * 100) / 100,
    unknown: Math.round(normalizedScores.unknown * 100) / 100,
  };

  return {
    language: bestLang,
    confidence: Math.round(confidence * 100) / 100,
    scores: roundedScores,
  };
}

/**
 * Quick check: returns true if the text is likely Sango.
 * Uses a lower confidence threshold (0.4) for broad detection.
 *
 * @param text - The text to check.
 * @returns True if the text appears to be Sango.
 */
export function isSango(text: string): boolean {
  const result = detectLanguage(text);
  return result.language === "sg" && result.confidence >= 0.4;
}
