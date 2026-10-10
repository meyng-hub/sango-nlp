// SPDX-License-Identifier: MIT
/**
 * @meyng/sango-nlp
 *
 * The first NLP toolkit for Sango, the co-official language of the
 * Central African Republic (with French, 5M+ speakers).
 *
 * Provides tokenization, language detection, stemming, normalization,
 * and dictionary lookup for Sango text processing.
 *
 * @packageDocumentation
 */

// === Tokenizer ===
export {
  tokenize,
  extractWords,
  isParticle,
  SANGO_PARTICLES,
} from "./tokenizer.js";

export type { Token, TokenType } from "./tokenizer.js";

// === Language Detection ===
export { detectLanguage, isSango } from "./language-detect.js";

export type { DetectionResult, SupportedLanguage } from "./language-detect.js";

// === Stemmer & Normalization ===
export { stem, normalize, equalsNormalized, editDistance } from "./stemmer.js";

// === Dictionary ===
export { SangoDictionary, lookup } from "./dictionary.js";

export type {
  DictionaryEntry,
  DictionaryExample,
  Difficulty,
  SearchOptions,
  SearchResult,
} from "./dictionary.js";
