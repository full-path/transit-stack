/**
 * Persistence layer using browser localStorage.
 *
 * Data is keyed by STORAGE_KEY. On first load after the v3→v4 upgrade,
 * any existing v3 data is migrated and re-saved under the v4 key.
 */

const STORAGE_KEY = "transit-stack-v4";
const LEGACY_KEY  = "transit-stack-v3";

function migrateV3(v3) {
  return {
    ...v3,
    datasets: [],
    jobs: [],
    funders: [],
    lineageConnections: [],
    lineageColWidths: null, // populated on first load by defaultLineageColWidths
    activeView: "systems",
  };
}

/**
 * Load saved state from localStorage.
 * @returns {object | null}
 */
export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateV3(JSON.parse(legacy));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return null;
  } catch (err) {
    console.error("Failed to load state from localStorage:", err);
    return null;
  }
}

/**
 * Save state to localStorage.
 * @param {object} data
 */
export function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save state to localStorage:", err);
  }
}

/**
 * Clear saved state.
 */
export function clear() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear localStorage:", err);
  }
}
