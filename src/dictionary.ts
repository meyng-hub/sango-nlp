// SPDX-License-Identifier: MIT
/**
 * Sango Dictionary
 *
 * In-memory dictionary for Sango vocabulary lookup with support for
 * exact matching, diacritic-insensitive search, and fuzzy matching.
 *
 * The dictionary ships with a built-in vocabulary derived from
 * SangoAI's curated dataset. It can also be extended with custom
 * entries at runtime.
 *
 * @module dictionary
 */

import { normalize, editDistance } from "./stemmer.js";

/** Difficulty level for vocabulary items. */
export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert";

/** An example sentence showing the word in context. */
export interface DictionaryExample {
  /** Example sentence in Sango. */
  sango: string;
  /** French translation of the example. */
  french?: string;
  /** English translation of the example. */
  english?: string;
}

/** A single dictionary entry. */
export interface DictionaryEntry {
  /** The Sango word or phrase. */
  sango: string;
  /** French translation. */
  french: string;
  /** English translation. */
  english: string;
  /** Thematic category (e.g., "greetings", "food", "verbs"). */
  category: string;
  /** Learning difficulty level. */
  difficulty: Difficulty;
  /** Pronunciation guide (e.g., "BAH-rah AH-lah"). */
  pronunciation?: string;
  /** Usage examples. */
  examples?: DictionaryExample[];
}

/** Options for fuzzy search. */
export interface SearchOptions {
  /** Maximum edit distance for fuzzy matches. Default: 2. */
  maxDistance?: number;
  /** Maximum number of results to return. Default: 10. */
  limit?: number;
  /** Filter by category. */
  category?: string;
  /** Filter by difficulty. */
  difficulty?: Difficulty;
}

/** A search result with relevance scoring. */
export interface SearchResult {
  /** The matched dictionary entry. */
  entry: DictionaryEntry;
  /** How closely the query matched (0 = exact, higher = less similar). */
  distance: number;
  /** Which field matched: "sango", "french", or "english". */
  matchedField: "sango" | "french" | "english";
}

/**
 * Built-in vocabulary data.
 * Sourced from SangoAI's curated Sango vocabulary dataset.
 */
const BUILT_IN_VOCABULARY: DictionaryEntry[] = [
  // === Greetings ===
  {
    sango: "Bara âla",
    french: "Bonjour",
    english: "Hello",
    category: "greetings",
    difficulty: "beginner",
    pronunciation: "BAH-rah AH-lah",
    examples: [
      {
        sango: "Bara âla, tongana nye?",
        french: "Bonjour, comment allez-vous?",
        english: "Hello, how are you?",
      },
    ],
  },
  {
    sango: "Singuila",
    french: "Merci",
    english: "Thank you",
    category: "greetings",
    difficulty: "beginner",
    pronunciation: "sin-GEH-lah",
  },
  {
    sango: "Gwê nzôni",
    french: "Au revoir",
    english: "Goodbye (to person leaving)",
    category: "greetings",
    difficulty: "beginner",
    pronunciation: "gway n-ZOH-nee",
  },
  {
    sango: "Ngba nzôni",
    french: "Au revoir",
    english: "Goodbye (to person staying)",
    category: "greetings",
    difficulty: "beginner",
    pronunciation: "n-GAH n-ZOH-nee",
  },
  {
    sango: "Tongana nye?",
    french: "Comment ca va?",
    english: "How are you?",
    category: "greetings",
    difficulty: "beginner",
    pronunciation: "ton-GAH-nah nyeh",
  },
  {
    sango: "Yeadapê",
    french: "Ca va bien",
    english: "I'm fine",
    category: "greetings",
    difficulty: "beginner",
  },
  {
    sango: "Ndzônî",
    french: "Bienvenue",
    english: "Welcome",
    category: "greetings",
    difficulty: "beginner",
    pronunciation: "n-DZOH-nee",
  },
  {
    sango: "Nzôni lakwi",
    french: "Bonne nuit",
    english: "Good night",
    category: "greetings",
    difficulty: "beginner",
  },
  {
    sango: "Awe",
    french: "Doucement",
    english: "Slow down",
    category: "greetings",
    difficulty: "beginner",
  },
  {
    sango: "Mbî mä",
    french: "Je comprends",
    english: "I understand",
    category: "greetings",
    difficulty: "intermediate",
  },

  // === Numbers ===
  {
    sango: "Ôko",
    french: "Un",
    english: "One",
    category: "numbers",
    difficulty: "beginner",
    pronunciation: "OH-koh",
  },
  {
    sango: "Ûse",
    french: "Deux",
    english: "Two",
    category: "numbers",
    difficulty: "beginner",
    pronunciation: "OO-seh",
  },
  {
    sango: "Ôtä",
    french: "Trois",
    english: "Three",
    category: "numbers",
    difficulty: "beginner",
    pronunciation: "OH-tah",
  },
  {
    sango: "Osiö",
    french: "Quatre",
    english: "Four",
    category: "numbers",
    difficulty: "beginner",
  },
  {
    sango: "Okû",
    french: "Cinq",
    english: "Five",
    category: "numbers",
    difficulty: "beginner",
    pronunciation: "OH-koo",
  },
  {
    sango: "Omene",
    french: "Six",
    english: "Six",
    category: "numbers",
    difficulty: "beginner",
  },
  {
    sango: "Mbárámbárá",
    french: "Sept",
    english: "Seven",
    category: "numbers",
    difficulty: "beginner",
  },
  {
    sango: "Miombe",
    french: "Huit",
    english: "Eight",
    category: "numbers",
    difficulty: "beginner",
  },
  {
    sango: "Gumbaya",
    french: "Neuf",
    english: "Nine",
    category: "numbers",
    difficulty: "beginner",
  },
  {
    sango: "Balë-oko",
    french: "Dix",
    english: "Ten",
    category: "numbers",
    difficulty: "beginner",
    pronunciation: "bah-LEH",
  },

  // === Family ===
  {
    sango: "Baba",
    french: "Pere",
    english: "Father",
    category: "family",
    difficulty: "beginner",
    pronunciation: "BAH-bah",
  },
  {
    sango: "Mama",
    french: "Mere",
    english: "Mother",
    category: "family",
    difficulty: "beginner",
    pronunciation: "MAH-mah",
  },
  {
    sango: "Molengê",
    french: "Enfant",
    english: "Child",
    category: "family",
    difficulty: "beginner",
    pronunciation: "moh-LEHN-geh",
  },
  {
    sango: "Kôlï",
    french: "Frere",
    english: "Brother",
    category: "family",
    difficulty: "beginner",
    pronunciation: "KOH-lee",
  },
  {
    sango: "Wâlï",
    french: "Soeur",
    english: "Sister",
    category: "family",
    difficulty: "beginner",
    pronunciation: "WAH-lee",
  },
  {
    sango: "Mbä",
    french: "Ami",
    english: "Friend",
    category: "family",
    difficulty: "beginner",
    pronunciation: "m-BAH",
  },
  {
    sango: "Bâli",
    french: "Epoux",
    english: "Husband",
    category: "family",
    difficulty: "intermediate",
  },
  {
    sango: "Kôkô",
    french: "Grand-pere",
    english: "Grandfather",
    category: "family",
    difficulty: "intermediate",
  },

  // === Verbs ===
  {
    sango: "Yeke",
    french: "Etre",
    english: "To be",
    category: "verbs",
    difficulty: "intermediate",
    pronunciation: "YEH-keh",
  },
  {
    sango: "Kê",
    french: "Avoir",
    english: "To have",
    category: "verbs",
    difficulty: "intermediate",
  },
  {
    sango: "Sâra",
    french: "Faire",
    english: "To do/make",
    category: "verbs",
    difficulty: "intermediate",
    pronunciation: "SAH-rah",
  },
  {
    sango: "Gwê",
    french: "Aller",
    english: "To go",
    category: "verbs",
    difficulty: "intermediate",
    pronunciation: "gway",
  },
  {
    sango: "Ga",
    french: "Venir",
    english: "To come",
    category: "verbs",
    difficulty: "intermediate",
  },
  {
    sango: "Tê kôbe",
    french: "Manger",
    english: "To eat",
    category: "verbs",
    difficulty: "beginner",
  },
  {
    sango: "Nyön",
    french: "Boire",
    english: "To drink",
    category: "verbs",
    difficulty: "beginner",
  },
  {
    sango: "Längö",
    french: "Dormir",
    english: "To sleep",
    category: "verbs",
    difficulty: "beginner",
    pronunciation: "LAHN-goh",
  },
  {
    sango: "Mä",
    french: "Ecouter",
    english: "To listen",
    category: "verbs",
    difficulty: "intermediate",
  },
  {
    sango: "Bâ",
    french: "Regarder",
    english: "To look/watch",
    category: "verbs",
    difficulty: "intermediate",
  },
  {
    sango: "Hênga",
    french: "Savoir",
    english: "To know",
    category: "verbs",
    difficulty: "intermediate",
  },
  {
    sango: "Tene",
    french: "Dire",
    english: "To say",
    category: "verbs",
    difficulty: "intermediate",
  },
  {
    sango: "Mû",
    french: "Donner",
    english: "To give",
    category: "verbs",
    difficulty: "intermediate",
  },
  {
    sango: "Dîko",
    french: "Lire",
    english: "To read",
    category: "verbs",
    difficulty: "intermediate",
  },
  {
    sango: "Tambêla",
    french: "Marcher",
    english: "To walk",
    category: "verbs",
    difficulty: "intermediate",
  },
  {
    sango: "Yê",
    french: "Aimer",
    english: "To love/like",
    category: "verbs",
    difficulty: "intermediate",
  },
  {
    sango: "Pîka",
    french: "Frapper",
    english: "To hit/strike",
    category: "verbs",
    difficulty: "intermediate",
  },
  {
    sango: "Fâ",
    french: "Tuer",
    english: "To kill/cut",
    category: "verbs",
    difficulty: "advanced",
  },
  {
    sango: "Fa",
    french: "Montrer",
    english: "To show",
    category: "verbs",
    difficulty: "intermediate",
  },

  // === Food ===
  {
    sango: "Kobê",
    french: "Nourriture",
    english: "Food",
    category: "food",
    difficulty: "beginner",
  },
  {
    sango: "Ngû",
    french: "Eau",
    english: "Water",
    category: "food",
    difficulty: "beginner",
    pronunciation: "n-GOO",
  },
  {
    sango: "Mápa",
    french: "Pain",
    english: "Bread",
    category: "food",
    difficulty: "beginner",
  },
  {
    sango: "Nyama",
    french: "Viande",
    english: "Meat",
    category: "food",
    difficulty: "beginner",
    pronunciation: "NYAH-mah",
  },
  {
    sango: "Susu",
    french: "Poisson",
    english: "Fish",
    category: "food",
    difficulty: "beginner",
  },
  {
    sango: "Loso",
    french: "Riz",
    english: "Rice",
    category: "food",
    difficulty: "beginner",
  },
  {
    sango: "Ndala",
    french: "Legume",
    english: "Vegetable",
    category: "food",
    difficulty: "beginner",
  },
  {
    sango: "Kafê",
    french: "Cafe",
    english: "Coffee",
    category: "food",
    difficulty: "beginner",
  },
  {
    sango: "Kâräkö",
    french: "Arachide",
    english: "Peanut",
    category: "food",
    difficulty: "intermediate",
  },
  {
    sango: "Yingo",
    french: "Sel",
    english: "Salt",
    category: "food",
    difficulty: "intermediate",
  },

  // === Time ===
  {
    sango: "Lâa sô",
    french: "Aujourd'hui",
    english: "Today",
    category: "time",
    difficulty: "beginner",
  },
  {
    sango: "Kêkêrêkê",
    french: "Demain",
    english: "Tomorrow",
    category: "time",
    difficulty: "beginner",
  },
  {
    sango: "Bîri",
    french: "Hier",
    english: "Yesterday",
    category: "time",
    difficulty: "beginner",
  },
  {
    sango: "Sô",
    french: "Maintenant",
    english: "Now",
    category: "time",
    difficulty: "beginner",
  },
  {
    sango: "Kôzo",
    french: "Avant",
    english: "Before",
    category: "time",
    difficulty: "intermediate",
  },
  {
    sango: "Pâso",
    french: "Apres",
    english: "After",
    category: "time",
    difficulty: "intermediate",
  },
  {
    sango: "Lâ",
    french: "Jour",
    english: "Day",
    category: "time",
    difficulty: "beginner",
  },
  {
    sango: "Ngbonga",
    french: "Heure",
    english: "Hour/Time",
    category: "time",
    difficulty: "intermediate",
  },

  // === Body ===
  {
    sango: "Li",
    french: "Tete",
    english: "Head",
    category: "body",
    difficulty: "beginner",
  },
  {
    sango: "Mäti",
    french: "Oeil",
    english: "Eye/Eyes",
    category: "body",
    difficulty: "beginner",
  },
  {
    sango: "Ngä",
    french: "Oreille",
    english: "Ear",
    category: "body",
    difficulty: "beginner",
  },
  {
    sango: "Nuru",
    french: "Bouche",
    english: "Mouth",
    category: "body",
    difficulty: "beginner",
  },

  // === Nature ===
  {
    sango: "Keke",
    french: "Arbre",
    english: "Tree",
    category: "nature",
    difficulty: "beginner",
  },
  {
    sango: "Dötî",
    french: "Terre",
    english: "Earth/Ground",
    category: "nature",
    difficulty: "beginner",
  },
  {
    sango: "Nze",
    french: "Lune",
    english: "Moon",
    category: "nature",
    difficulty: "beginner",
  },
  {
    sango: "Tongoro",
    french: "Etoile",
    english: "Star",
    category: "nature",
    difficulty: "intermediate",
  },

  // === Common words ===
  {
    sango: "Nzoni",
    french: "Bon/Bien",
    english: "Good/Well",
    category: "adjectives",
    difficulty: "beginner",
  },
  {
    sango: "Mingi",
    french: "Beaucoup",
    english: "Many/Much",
    category: "adjectives",
    difficulty: "beginner",
  },
  {
    sango: "Mbeni",
    french: "Un autre/Quelqu'un",
    english: "Another/Someone",
    category: "adjectives",
    difficulty: "intermediate",
  },
  {
    sango: "Kwa",
    french: "Travail",
    english: "Work/Job",
    category: "nouns",
    difficulty: "beginner",
  },
  {
    sango: "Tênê",
    french: "Parole",
    english: "Word/Speech",
    category: "nouns",
    difficulty: "beginner",
  },
  {
    sango: "Ködörö",
    french: "Pays/Village",
    english: "Country/Village",
    category: "nouns",
    difficulty: "intermediate",
  },
  {
    sango: "Yângâ",
    french: "Langue",
    english: "Language",
    category: "nouns",
    difficulty: "intermediate",
  },
];

/**
 * Sango dictionary with exact, normalized, and fuzzy lookup capabilities.
 *
 * @example
 * ```ts
 * import { SangoDictionary } from "@meyng/sango-nlp";
 *
 * const dict = new SangoDictionary();
 *
 * // Exact lookup
 * const entry = dict.lookup("nzoni");
 * // { sango: "Nzoni", french: "Bon/Bien", english: "Good/Well", ... }
 *
 * // Fuzzy search
 * const results = dict.search("nzni", { maxDistance: 2 });
 * // [{ entry: { sango: "Nzoni", ... }, distance: 1, matchedField: "sango" }]
 *
 * // Search by French
 * const frResults = dict.search("bonjour");
 * // [{ entry: { sango: "Bara âla", french: "Bonjour", ... }, distance: 0, matchedField: "french" }]
 * ```
 */
export class SangoDictionary {
  private entries: DictionaryEntry[];

  /** Index: normalized Sango word -> entry index for O(1) lookup. */
  private sangoIndex: Map<string, number[]>;

  /** Index: normalized French word -> entry index. */
  private frenchIndex: Map<string, number[]>;

  /** Index: normalized English word -> entry index. */
  private englishIndex: Map<string, number[]>;

  /**
   * Creates a new SangoDictionary, optionally with additional entries
   * merged into the built-in vocabulary.
   *
   * @param additionalEntries - Extra entries to add to the built-in vocabulary.
   */
  constructor(additionalEntries: DictionaryEntry[] = []) {
    this.entries = [...BUILT_IN_VOCABULARY, ...additionalEntries];
    this.sangoIndex = new Map();
    this.frenchIndex = new Map();
    this.englishIndex = new Map();

    this.buildIndices();
  }

  /**
   * Builds lookup indices for fast exact and normalized matching.
   */
  private buildIndices(): void {
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Index by normalized Sango
      const normalizedSango = normalize(entry.sango.toLowerCase());
      const sangoEntries = this.sangoIndex.get(normalizedSango) ?? [];
      sangoEntries.push(i);
      this.sangoIndex.set(normalizedSango, sangoEntries);

      // Index by normalized French
      const normalizedFrench = normalize(entry.french.toLowerCase());
      const frenchEntries = this.frenchIndex.get(normalizedFrench) ?? [];
      frenchEntries.push(i);
      this.frenchIndex.set(normalizedFrench, frenchEntries);

      // Index by normalized English
      const normalizedEnglish = normalize(entry.english.toLowerCase());
      const englishEntries = this.englishIndex.get(normalizedEnglish) ?? [];
      englishEntries.push(i);
      this.englishIndex.set(normalizedEnglish, englishEntries);
    }
  }

  /**
   * Looks up a word in the dictionary by Sango form.
   * Performs diacritic-insensitive, case-insensitive matching.
   *
   * @param word - The Sango word to look up.
   * @returns The first matching dictionary entry, or null if not found.
   */
  lookup(word: string): DictionaryEntry | null {
    const normalizedWord = normalize(word.toLowerCase());
    const indices = this.sangoIndex.get(normalizedWord);

    if (indices && indices.length > 0) {
      return this.entries[indices[0]];
    }

    return null;
  }

  /**
   * Looks up a word across all languages (Sango, French, English).
   * Tries exact normalized match in each language.
   *
   * @param word - The word to look up in any language.
   * @returns The first matching entry with the matched field, or null.
   */
  lookupAny(
    word: string,
  ): { entry: DictionaryEntry; field: "sango" | "french" | "english" } | null {
    const normalizedWord = normalize(word.toLowerCase());

    const sangoIndices = this.sangoIndex.get(normalizedWord);
    if (sangoIndices && sangoIndices.length > 0) {
      return { entry: this.entries[sangoIndices[0]], field: "sango" };
    }

    const frenchIndices = this.frenchIndex.get(normalizedWord);
    if (frenchIndices && frenchIndices.length > 0) {
      return { entry: this.entries[frenchIndices[0]], field: "french" };
    }

    const englishIndices = this.englishIndex.get(normalizedWord);
    if (englishIndices && englishIndices.length > 0) {
      return { entry: this.entries[englishIndices[0]], field: "english" };
    }

    return null;
  }

  /**
   * Searches the dictionary with fuzzy matching across all languages.
   * Results are sorted by edit distance (closest matches first).
   *
   * @param query - The search query.
   * @param options - Search configuration.
   * @returns Array of search results sorted by relevance.
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const { maxDistance = 2, limit = 10, category, difficulty } = options;

    const results: SearchResult[] = [];
    const normalizedQuery = normalize(query.toLowerCase());

    for (const entry of this.entries) {
      // Apply filters
      if (category && entry.category !== category) continue;
      if (difficulty && entry.difficulty !== difficulty) continue;

      // Check each field for matches
      const fields: Array<{
        value: string;
        field: "sango" | "french" | "english";
      }> = [
        { value: entry.sango, field: "sango" },
        { value: entry.french, field: "french" },
        { value: entry.english, field: "english" },
      ];

      let bestDistance = Infinity;
      let bestField: "sango" | "french" | "english" = "sango";

      for (const { value, field } of fields) {
        const normalizedValue = normalize(value.toLowerCase());

        // Exact normalized match
        if (normalizedValue === normalizedQuery) {
          bestDistance = 0;
          bestField = field;
          break;
        }

        // Substring match (treat as distance 0.5)
        if (
          normalizedValue.includes(normalizedQuery) ||
          normalizedQuery.includes(normalizedValue)
        ) {
          const d = 0.5;
          if (d < bestDistance) {
            bestDistance = d;
            bestField = field;
          }
          continue;
        }

        // Edit distance
        const d = editDistance(normalizedQuery, normalizedValue);
        if (d < bestDistance) {
          bestDistance = d;
          bestField = field;
        }
      }

      if (bestDistance <= maxDistance) {
        results.push({
          entry,
          distance: bestDistance,
          matchedField: bestField,
        });
      }
    }

    // Sort by distance, then alphabetically by Sango word
    results.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.entry.sango.localeCompare(b.entry.sango);
    });

    return results.slice(0, limit);
  }

  /**
   * Returns all entries in a given category.
   *
   * @param category - The category to filter by.
   * @returns All entries matching the category.
   */
  getByCategory(category: string): DictionaryEntry[] {
    return this.entries.filter((e) => e.category === category);
  }

  /**
   * Returns all unique categories in the dictionary.
   */
  getCategories(): string[] {
    return [...new Set(this.entries.map((e) => e.category))].sort();
  }

  /**
   * Returns the total number of entries in the dictionary.
   */
  get size(): number {
    return this.entries.length;
  }

  /**
   * Adds a new entry to the dictionary at runtime.
   * Rebuilds indices after insertion.
   *
   * @param entry - The dictionary entry to add.
   */
  addEntry(entry: DictionaryEntry): void {
    this.entries.push(entry);
    const i = this.entries.length - 1;

    const normalizedSango = normalize(entry.sango.toLowerCase());
    const sangoEntries = this.sangoIndex.get(normalizedSango) ?? [];
    sangoEntries.push(i);
    this.sangoIndex.set(normalizedSango, sangoEntries);

    const normalizedFrench = normalize(entry.french.toLowerCase());
    const frenchEntries = this.frenchIndex.get(normalizedFrench) ?? [];
    frenchEntries.push(i);
    this.frenchIndex.set(normalizedFrench, frenchEntries);

    const normalizedEnglish = normalize(entry.english.toLowerCase());
    const englishEntries = this.englishIndex.get(normalizedEnglish) ?? [];
    englishEntries.push(i);
    this.englishIndex.set(normalizedEnglish, englishEntries);
  }

  /**
   * Checks if a word exists in the dictionary (diacritic-insensitive).
   *
   * @param word - The Sango word to check.
   * @returns True if the word is in the dictionary.
   */
  has(word: string): boolean {
    return this.lookup(word) !== null;
  }

  /**
   * Returns all entries as a readonly array.
   */
  getAllEntries(): readonly DictionaryEntry[] {
    return this.entries;
  }
}

/**
 * Convenience function: creates a dictionary and looks up a word.
 * For repeated lookups, prefer creating a `SangoDictionary` instance.
 *
 * @param word - The Sango word to look up.
 * @returns The matching dictionary entry, or null.
 */
export function lookup(word: string): DictionaryEntry | null {
  const dict = new SangoDictionary();
  return dict.lookup(word);
}
