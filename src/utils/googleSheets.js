/**
 * Google Sheets integration for Transit Stack.
 *
 * Uses Google Identity Services (GIS) token model for OAuth 2.0 — entirely
 * client-side, no backend required. Diagram state is stored as a JSON blob
 * in cell A1 of the user's spreadsheet (same format as JSON export/import).
 *
 * Setup: set VITE_GOOGLE_CLIENT_ID in .env.local to your Google Cloud OAuth
 * 2.0 client ID. The client must have your deployment origin in its list of
 * authorized JavaScript origins.
 */

const SHEET_ID_KEY = "ts-sheet-id";

export function getStoredSheetId() {
  return localStorage.getItem(SHEET_ID_KEY) || "";
}

export function storeSheetId(val) {
  if (val) localStorage.setItem(SHEET_ID_KEY, val);
  else localStorage.removeItem(SHEET_ID_KEY);
}

/** Extract sheet ID from a full Google Sheets URL, or return the value as-is. */
export function parseSheetId(urlOrId) {
  const m = (urlOrId || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : (urlOrId || "").trim();
}

function loadGIS() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

let _tokenClient = null;

/**
 * Load GIS and initialize the token client.
 * @param {string} clientId - Google OAuth 2.0 client ID.
 * @param {function} onToken - Callback invoked with the token response.
 */
export async function initTokenClient(clientId, onToken) {
  await loadGIS();
  _tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    callback: onToken,
  });
}

/** Trigger the OAuth token request (shows popup on first use, silent after). */
export function requestAccessToken() {
  if (!_tokenClient) throw new Error("Token client not initialized");
  _tokenClient.requestAccessToken();
}

async function sheetsRequest(accessToken, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
  if (res.status === 401) throw new Error("AUTH_EXPIRED");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || `Sheets API error ${res.status}`);
  }
  return res;
}

/**
 * Read the value from a single cell.
 * @returns {string|null} The cell value, or null if the cell is empty.
 */
export async function readCell(accessToken, sheetId, cell = "A1") {
  const res = await sheetsRequest(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${cell}`
  );
  const data = await res.json();
  return data.values?.[0]?.[0] ?? null;
}

/** Write a string value to a single cell. */
export async function writeCell(accessToken, sheetId, cell = "A1", value) {
  await sheetsRequest(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${cell}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: [[value]] }),
    }
  );
}
