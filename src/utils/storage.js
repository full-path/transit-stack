/**
 * Persistence layer using browser localStorage.
 *
 * This replaces the `window.storage` API available in Claude's artifact
 * runtime. The interface is intentionally simple: load() returns the full
 * app state or null, save() writes it. All serialization is JSON.
 *
 * localStorage has a ~5-10 MB limit depending on browser. A transit stack
 * with 50 systems, 20 vendors, and 40 connections serializes to roughly
 * 30-50 KB, so this is not a practical constraint.
 *
 * Data is keyed by STORAGE_KEY. Changing this key effectively resets the
 * app for all users, so do so only on breaking schema changes.
 */

const STORAGE_KEY = "transit-stack-v3";

/**
 * Load saved state from localStorage.
 * @returns {object | null} The parsed state, or null if nothing is saved.
 */
export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("Failed to load state from localStorage:", err);
    return null;
  }
}

/**
 * Save state to localStorage.
 * @param {object} data - The full app state to persist.
 */
export function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save state to localStorage:", err);
  }
}

/**
 * Clear saved state. Used by "Clear All Data" action.
 */
export function clear() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear localStorage:", err);
  }
}
