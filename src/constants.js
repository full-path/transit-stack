/**
 * Transit Stack domain constants.
 *
 * These define the fixed vocabulary of the diagram: which categories exist,
 * what statuses a system or connection can have, what management types apply
 * to connections, and what paper sizes are available for the canvas.
 *
 * Category order is fixed and not user-configurable by design — consistency
 * across agencies is a project goal.
 */

export const CATEGORIES = [
  { id: "payment", label: "💳 Payment", name: "Payment", bg: "#fce5cd44", hdr: "#be7d43" },
  { id: "in_vehicle", label: "🚌 In-Vehicle", name: "In-Vehicle", bg: "#d9ead344", hdr: "#6aa84f" },
  { id: "operations", label: "⚙️ Operations", name: "Operations", bg: "#cfe2f344", hdr: "#4a86e8" },
  { id: "outreach_access", label: "📣 Outreach & Access", name: "Outreach & Access", bg: "#f4cccc44", hdr: "#e06666" },
  { id: "planning_reporting", label: "📊 Planning & Reporting", name: "Planning & Reporting", bg: "#d9d2e944", hdr: "#7c3aed" },
];

export const CAT_IDS = CATEGORIES.map((c) => c.id);

/**
 * System and connection status. Determines fill color (systems) and
 * line color (connections).
 */
export const STATUS = {
  in_use: { name: "In Use", fill: "#c6e4c0", stroke: "#4a9e4a", connColor: "#3d8b3d" },
  planned: { name: "Planned", fill: "#fdd9b5", stroke: "#e69138", connColor: "#d17e1f" },
  needed: { name: "Needed", fill: "#fff3b0", stroke: "#c9a800", connColor: "#b09300" },
};

/**
 * Connection management types. Determines dash pattern.
 *   - vendor: solid line (the vendor maintains the integration)
 *   - agency: dashed (the agency maintains it in-house)
 *   - manual: dotted (no automated integration — manual process)
 */
export const MGMT = {
  vendor: { name: "Vendor-managed", dash: "" },
  agency: { name: "Agency-managed", dash: "10,5" },
  manual: { name: "Manual", dash: "4,4" },
};

/**
 * Paper sizes for the canvas. All landscape orientation, 96 DPI.
 *
 * w/h are the PRINTABLE area in CSS px (page dimensions minus 0.5in margins on
 * each side). 1 SVG user unit = 1 CSS px = 1/96 inch, so font sizes follow the
 * standard web convention: 16px = 12pt, 13px ≈ 10pt, etc.
 *
 * printSize / printW / printH are used to set the @page rule and explicit SVG
 * dimensions at print time so the coordinate mapping holds exactly.
 */
export const PAPER_SIZES = {
  //               page dims          − 1in per axis at 96 dpi         printable inches
  letter: { name: 'Letter (11×8.5″)', w: 960, h: 720, printSize: "letter landscape", printW: 10, printH: 7.5 },
  legal: { name: 'Legal (14×8.5″)', w: 1248, h: 720, printSize: "legal landscape", printW: 13, printH: 7.5 },
  tabloid: { name: "11×17 / Tabloid", w: 1536, h: 960, printSize: "tabloid landscape", printW: 16, printH: 10 },
  a4: { name: "A4 Landscape", w: 1026, h: 698, printSize: "A4 landscape", printW: 10.693, printH: 7.268 },
  a3: { name: "A3 Landscape", w: 1491, h: 1027, printSize: "A3 landscape", printW: 15.535, printH: 10.693 },
};

export const DEFAULT_PAPER = "letter";

/** Visual border style for systems, keyed by management state. */
export const SYS_BORDER = {
  agency: { stroke: "red", strokeWidth: 5 },
  unspecified: { stroke: "yellow", strokeWidth: 5 },
  vendor: { stroke: "#aaa", strokeWidth: 1.5 },
};

// ── Lineage view columns ──
export const LINEAGE_COLUMNS = [
  { id: "vehicle_sources",   label: "Vehicle Sources",    name: "Vehicle Sources",    bg: "#e8f4f844", hdr: "#2e7d9e" },
  { id: "backoffice_sources",label: "Back-office Sources", name: "Back-office Sources", bg: "#f0f4e844", hdr: "#5a7a2e" },
  { id: "processing",        label: "Processing",          name: "Processing",          bg: "#f4ece844", hdr: "#9e6b2e" },
  { id: "outputs",           label: "Outputs",             name: "Outputs",             bg: "#f4e8f044", hdr: "#7a2e7a" },
  { id: "destinations",      label: "Destinations",        name: "Destinations",        bg: "#e8eaf444", hdr: "#3d4fa8" },
];

export const LINEAGE_COL_IDS = LINEAGE_COLUMNS.map((c) => c.id);

export const DATASET_TYPES = [
  { id: "extract",     name: "Extract" },
  { id: "spreadsheet", name: "Spreadsheet" },
  { id: "report",      name: "Report" },
  { id: "dashboard",   name: "Dashboard" },
  { id: "feed",        name: "Feed" },
  { id: "db_table",    name: "DB Table" },
];

export const JOB_TYPES = [
  { id: "manual_export",    name: "Manual Export" },
  { id: "manual_transform", name: "Manual Transform" },
  { id: "manual_entry",     name: "Manual Entry" },
  { id: "file_transfer",    name: "File Transfer" },
  { id: "upload",           name: "Upload" },
  { id: "automated",        name: "Automated" },
];

export const SOURCE_CATEGORIES = [
  { id: "vehicle",     name: "Vehicle" },
  { id: "back_office", name: "Back-office" },
  { id: "na",          name: "N/A" },
];

/** Visual style for dataset nodes. */
export const DATASET_STYLE = {
  fill: "#e3f2fd",
  stroke: "#1976d2",
  strokeWidth: 1.5,
  strokeSelected: "#0d47a1",
  strokeWidthSelected: 2.5,
  rx: 4,
  defaultW: 130,
  defaultH: 46,
};

/** Visual style for job nodes. */
export const JOB_STYLE = {
  fill: "#fff3e0",
  stroke: "#e65100",
  strokeWidth: 1.5,
  strokeSelected: "#bf360c",
  strokeWidthSelected: 2.5,
  rx: 14,
  defaultW: 130,
  defaultH: 46,
};

/** Visual style for funder boxes (recipient containers). */
export const FUNDER_STYLE = {
  fill: "#f3e5f5",
  stroke: "#7b1fa2",
  strokeWidth: 1.5,
  strokeSelected: "#4a148c",
  strokeWidthSelected: 2,
  rx: 10,
  labelPaddingX: 8,
  labelPaddingTop: 4,
  defaultW: 240,
  defaultH: 160,
};

/** Visual style for lineage connections. */
export const LINEAGE_CONN_STYLE = {
  stroke: "#555",
  strokeSelected: "#111",
  strokeWidth: 1.5,
  strokeWidthSelected: 2.5,
  dash: "6,3",
};

/** Visual style for vendor boxes. */
export const VENDOR_STYLE = {
  fill: "#e8e8e8",
  stroke: "#bbb",
  strokeWidth: 1.5,
  strokeSelected: "#333",
  strokeWidthSelected: 2,
  rx: 10,
  labelPaddingX: 8,  // px from left edge to label text
  labelPaddingTop: 4,  // px above font cap-height (added to fontSize_px for baseline y)
};

/** Connection stroke widths. Standardized data uses a thicker line. */
export const CONN_THICKNESS = { standard: 3.5, nonStandard: 1.5 };

/** Visual style for the label badge rendered at the midpoint of a connection. */
export const CONN_LABEL_STYLE = {
  fontWeight: "600",
  lineHeight: 1.6,   // box height = fontSize_px × lineHeight
  charWidthRatio: 0.6,   // box width  = charCount × (fontSize_px × charWidthRatio) + paddingH×2
  paddingH: 4,     // horizontal padding, each side (px)
  rx: 3,
  strokeWidth: 0.75,
  opacity: 0.95,
};

/** Visual style for the "via VendorName" annotation rendered near connection source. */
export const CONN_VENDOR_STYLE = {
  fill: "#777",
  fontStyle: "italic",
  lineHeight: 1.6,
  charWidthRatio: 0.55,
  paddingH: 4,
  maxChars: 9,     // truncation limit for vendor name display
  rx: 3,
  strokeWidth: 0.5,
  strokeDash: "3,2",
  opacity: 0.9,
};

/** Color used for interactive port circles and the rubber-band connector line. */
export const PORT_COLOR = "#4a86e8";

/** SVG canvas background fill. */
export const CANVAS_BG = "#fdfdfd";

/** Font stack for all SVG text on the canvas. */
export const FONT_FAMILY = "'DM Sans', system-ui, sans-serif";

/** Corner radii for canvas shapes. */
export const SYS_RX = 6;

/** Multiply pt values by this to get SVG px units (96 px/in ÷ 72 pt/in). */
export const PT_TO_PX = 96 / 72;

/** Font sizes in pt. Apply PT_TO_PX when used as SVG fontSize attributes. */
export const FONT_SIZE = {
  categoryHeader: 12,
  vendorLabel: 12,
  funderLabel: 12,
  systemName: 12,
  systemDesc: 11,
  datasetName: 11,
  jobName: 11,
  watermark: 10,
  connectionLabel: 10,
  connectionVendor: 10,
};

/** Layout constants used by both the canvas and the interaction handlers. */
export const HEADER_H = 45;
export const MIN_COL_W = 100;
export const SYS_W = 140;
export const SYS_H = 52;

/**
 * Returns default column widths that sum to `totalW`, distributed
 * roughly in proportion to typical content density per category.
 */
export function defaultColWidths(totalW) {
  const ratios = [0.20, 0.20, 0.20, 0.20, 0.20];
  return ratios.map((r) => Math.round(totalW * r));
}

/** Default lineage column widths — equal distribution across 5 columns. */
export function defaultLineageColWidths(totalW) {
  const ratios = [0.20, 0.20, 0.20, 0.20, 0.20];
  return ratios.map((r) => Math.round(totalW * r));
}

/**
 * Scale widths proportionally so they sum to totalW, then nudge the last
 * column to absorb any rounding error. Each column is guaranteed ≥ MIN_COL_W.
 */
export function normalizeColWidths(widths, totalW) {
  const sum = widths.reduce((a, b) => a + b, 0);
  if (sum === totalW) return widths;
  const scale = totalW / sum;
  const nw = widths.map((w) => Math.max(MIN_COL_W, Math.round(w * scale)));
  const diff = totalW - nw.reduce((a, b) => a + b, 0);
  nw[nw.length - 1] = Math.max(MIN_COL_W, nw[nw.length - 1] + diff);
  return nw;
}
