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
 * Width and height are in CSS pixels, which map 1:1 to SVG user units.
 */
export const PAPER_SIZES = {
  letter: { name: 'Letter (11×8.5″)', w: 1056, h: 816 },
  legal: { name: 'Legal (14×8.5″)', w: 1344, h: 816 },
  tabloid: { name: "11×17 / Tabloid", w: 1632, h: 1056 },
  a4: { name: "A4 Landscape", w: 1123, h: 794 },
  a3: { name: "A3 Landscape", w: 1588, h: 1123 },
};

export const DEFAULT_PAPER = "letter";

/** Layout constants used by both the canvas and the interaction handlers. */
export const HEADER_H = 36;
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
