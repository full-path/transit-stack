/**
 * Transit Stack JSON export and import.
 *
 * The export format is designed to be:
 *   1. Self-documenting: enum definitions are included inline so an LLM
 *      or human reader can interpret the file without a separate schema.
 *   2. Denormalized: names appear alongside IDs so cross-referencing is
 *      not required for basic comprehension.
 *   3. Layout-complete: all spatial coordinates are included so an
 *      imported file reproduces the exact visual layout of the original.
 *
 * See docs/schema.md for the full specification.
 */

import {
  CATEGORIES,
  CAT_IDS,
  STATUS,
  MGMT,
  PAPER_SIZES,
  DEFAULT_PAPER,
  SYS_W,
  SYS_H,
  defaultColWidths,
  normalizeColWidths,
} from "../constants";

/**
 * Generate a short random ID. Not cryptographically secure;
 * used only for local widget identity.
 */
export function uid() {
  return crypto.randomUUID().slice(0, 8);
}

/**
 * Build the export object from the current app state.
 *
 * @param {object} state - The full app state.
 * @param {object[]} state.enrichedSystems - Systems with derived _category, _vendorId, _vendorName.
 * @param {object[]} state.vendors
 * @param {object[]} state.connections
 * @param {string} state.agencyName
 * @param {string} state.docVersion
 * @param {string} state.docDate
 * @param {string} state.paperSize
 * @param {number[]} state.colWidths
 * @returns {object} The export object with a `transitStack` root key.
 */
export function buildExport({
  enrichedSystems,
  vendors,
  connections,
  agencyName,
  docVersion,
  docDate,
  paperSize,
  colWidths,
}) {
  const paper = PAPER_SIZES[paperSize] || PAPER_SIZES[DEFAULT_PAPER];

  return {
    transitStack: {
      schemaVersion: "3.1",
      docVersion,
      docDate,
      exportDate: new Date().toISOString().slice(0, 10),
      agencyName,
      canvas: {
        paperSize,
        paperSizeName: paper.name,
        width: paper.w,
        height: paper.h,
        categoryWidths: Object.fromEntries(
          CAT_IDS.map((id, i) => [id, colWidths[i]])
        ),
      },
      categories: CATEGORIES.map((c) => ({ id: c.id, name: c.name })),
      statusOptions: Object.entries(STATUS).map(([k, v]) => ({
        id: k,
        name: v.name,
      })),
      managementTypes: Object.entries(MGMT).map(([k, v]) => ({
        id: k,
        name: v.name,
      })),
      vendors: vendors.map((v) => ({
        id: v.id,
        name: v.name,
        x: v.x,
        y: v.y,
        width: v.width,
        height: v.height,
        description: v.description || null,
        attributes: v.attributes || {},
      })),
      systems: enrichedSystems.map((s) => ({
        id: s.id,
        name: s.name,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        status: s.status,
        statusName: STATUS[s.status]?.name,
        agencyManaged: s.agencyManaged,
        category: s._category,
        categoryName:
          CATEGORIES.find((c) => c.id === s._category)?.name || null,
        vendorId: s._vendorId,
        vendorName: s._vendorName,
        description: s.description || null,
        attributes: s.attributes || {},
      })),
      connections: connections.map((c) => {
        const src = enrichedSystems.find((s) => s.id === c.sourceId);
        const tgt = enrichedSystems.find((s) => s.id === c.targetId);
        return {
          id: c.id,
          sourceSystemId: c.sourceId,
          sourceSystemName: src?.name || c.sourceId,
          targetSystemId: c.targetId,
          targetSystemName: tgt?.name || c.targetId,
          bidirectional: c.bidirectional,
          dataStandardized: c.dataStandardized,
          managementType: c.managementType,
          managementTypeName: MGMT[c.managementType]?.name,
          status: c.status,
          statusName: STATUS[c.status]?.name,
          label: c.label || null,
          vendorName: c.vendorName || null,
          description: c.description || null,
          attributes: c.attributes || {},
        };
      }),
    },
  };
}

/**
 * Parse an imported JSON object into app state.
 * Handles missing fields with sensible defaults.
 *
 * @param {object} parsed - The raw parsed JSON.
 * @returns {object} State fields: agencyName, docVersion, docDate, paperSize, colWidths, vendors, systems, connections.
 */
export function parseImport(parsed) {
  const ts = parsed.transitStack || parsed;

  const paperSize =
    ts.canvas?.paperSize && PAPER_SIZES[ts.canvas.paperSize]
      ? ts.canvas.paperSize
      : DEFAULT_PAPER;

  const paper = PAPER_SIZES[paperSize];

  const colWidths = normalizeColWidths(
    ts.canvas?.categoryWidths
      ? CAT_IDS.map((id, i) => ts.canvas.categoryWidths[id] || defaultColWidths(paper.w)[i])
      : defaultColWidths(paper.w),
    paper.w
  );

  const vendors = (ts.vendors || []).map((v) => ({
    id: v.id || uid(),
    name: v.name || "",
    x: v.x || 100,
    y: v.y || 100,
    width: v.width || 240,
    height: v.height || 160,
    description: v.description || "",
    attributes: v.attributes || {},
  }));

  const systems = (ts.systems || []).map((s) => ({
    id: s.id || uid(),
    name: s.name || "",
    x: s.x || 100,
    y: s.y || 100,
    width: s.width || SYS_W,
    height: s.height || SYS_H,
    status: s.status || "in_use",
    agencyManaged: s.agencyManaged || false,
    description: s.description || "",
    attributes: s.attributes || {},
  }));

  const connections = (ts.connections || []).map((c) => ({
    id: c.id || uid(),
    sourceId: c.sourceSystemId || c.sourceId || "",
    targetId: c.targetSystemId || c.targetId || "",
    bidirectional: c.bidirectional || false,
    dataStandardized: c.dataStandardized ?? true,
    managementType: c.managementType || "vendor",
    status: c.status || "in_use",
    label: c.label || "",
    vendorName: c.vendorName || "",
    description: c.description || "",
    attributes: c.attributes || {},
  }));

  return {
    agencyName: ts.agencyName || "",
    docVersion: ts.docVersion || "1.0",
    docDate: ts.docDate || new Date().toISOString().slice(0, 10),
    paperSize,
    colWidths,
    vendors,
    systems,
    connections,
  };
}

/**
 * Trigger a browser file download.
 *
 * @param {string} content - File content.
 * @param {string} filename - Download filename.
 * @param {string} mimeType - MIME type for the blob.
 */
export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
