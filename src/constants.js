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
  { id: "payment", name: "💳 Payment", bg: "#fce5cd44", hdr: "#be7d43" },
  { id: "in_vehicle", name: "🚌 In-Vehicle", bg: "#d9ead344", hdr: "#6aa84f" },
  { id: "operations", name: "⚙️ Operations", bg: "#cfe2f344", hdr: "#4a86e8" },
  { id: "outreach_access", name: "📣 Outreach & Access", bg: "#f4cccc44", hdr: "#e06666" },
  { id: "planning_reporting", name: "📊 Planning & Reporting", bg: "#d9d2e944", hdr: "#7c3aed" },
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
  letter:  { name: 'Letter (11×8.5″)', w:  960, h: 720,  printSize: "letter landscape",  printW: 10,     printH: 7.5    },
  legal:   { name: 'Legal (14×8.5″)',  w: 1248, h: 720,  printSize: "legal landscape",   printW: 13,     printH: 7.5    },
  tabloid: { name: "11×17 / Tabloid",  w: 1536, h: 960,  printSize: "tabloid landscape", printW: 16,     printH: 10     },
  a4:      { name: "A4 Landscape",     w: 1026, h: 698,  printSize: "A4 landscape",      printW: 10.693, printH: 7.268  },
  a3:      { name: "A3 Landscape",     w: 1491, h: 1027, printSize: "A3 landscape",      printW: 15.535, printH: 10.693 },
};

export const DEFAULT_PAPER = "letter";

/** Visual border style for systems, keyed by management state. */
export const SYS_BORDER = {
  agency:      { stroke: "#d32f2f", strokeWidth: 3 },
  unspecified: { stroke: "#c9a800", strokeWidth: 3 },
  vendor:      { stroke: "#aaa",    strokeWidth: 1.5 },
};

/** Visual style for vendor boxes. */
export const VENDOR_STYLE = {
  fill: "#e8e8e8",
  stroke: "#bbb",
  strokeWidth: 1.5,
  strokeSelected: "#333",
  strokeWidthSelected: 2,
  rx: 10,
  labelPaddingX:   8,  // px from left edge to label text
  labelPaddingTop: 4,  // px above font cap-height (added to fontSize_px for baseline y)
};

/** Connection stroke widths. Standardized data uses a thicker line. */
export const CONN_THICKNESS = { standard: 3.5, nonStandard: 1.5 };

/** Visual style for the label badge rendered at the midpoint of a connection. */
export const CONN_LABEL_STYLE = {
  fontWeight:     "600",
  lineHeight:     1.6,   // box height = fontSize_px × lineHeight
  charWidthRatio: 0.6,   // box width  = charCount × (fontSize_px × charWidthRatio) + paddingH×2
  paddingH:       4,     // horizontal padding, each side (px)
  rx:             3,
  strokeWidth:    0.75,
  opacity:        0.95,
};

/** Visual style for the "via VendorName" annotation rendered near connection source. */
export const CONN_VENDOR_STYLE = {
  fill:           "#777",
  fontStyle:      "italic",
  lineHeight:     1.6,
  charWidthRatio: 0.55,
  paddingH:       4,
  maxChars:       9,     // truncation limit for vendor name display
  rx:             3,
  strokeWidth:    0.5,
  strokeDash:     "3,2",
  opacity:        0.9,
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
  categoryHeader:    12,
  vendorLabel:       12,
  systemName:        12,
  systemDesc:        11,
  watermark:         10,
  connectionLabel:   10,
  connectionVendor:  10,
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
