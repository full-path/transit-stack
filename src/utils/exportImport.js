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
  LINEAGE_COL_IDS,
  STATUS,
  MGMT,
  PAPER_SIZES,
  DEFAULT_PAPER,
  SYS_W,
  SYS_H,
  DATASET_STYLE,
  JOB_STYLE,
  FUNDER_STYLE,
  defaultColWidths,
  defaultLineageColWidths,
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
 */
export function buildExport({
  enrichedSystems,
  vendors,
  connections,
  datasets,
  jobs,
  funders,
  lineageConnections,
  agencyName,
  docVersion,
  docDate,
  paperSize,
  colWidths,
  lineageColWidths,
}) {
  const paper = PAPER_SIZES[paperSize] || PAPER_SIZES[DEFAULT_PAPER];

  const openlineage = buildOpenLineage(datasets, jobs, lineageConnections, agencyName);

  return {
    transitStack: {
      schemaVersion: "4.0",
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
        lineageColumnWidths: Object.fromEntries(
          LINEAGE_COL_IDS.map((id, i) => [id, lineageColWidths[i]])
        ),
      },
      categories: CATEGORIES.map((c) => ({ id: c.id, name: c.name })),
      statusOptions: Object.entries(STATUS).map(([k, v]) => ({ id: k, name: v.name })),
      managementTypes: Object.entries(MGMT).map(([k, v]) => ({ id: k, name: v.name })),
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
        categoryName: CATEGORIES.find((c) => c.id === s._category)?.name || null,
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
      lineage: {
        funders: funders.map((f) => ({
          id: f.id,
          name: f.name,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          programName: f.programName || null,
          contact: f.contact || null,
          reportingFrequency: f.reportingFrequency || null,
          notes: f.notes || null,
        })),
        datasets: datasets.map((d) => ({
          id: d.id,
          name: d.name,
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height,
          datasetType: d.datasetType || null,
          sourceCategory: d.sourceCategory || "na",
          namespace: d.namespace || null,
          updateFrequency: d.updateFrequency || null,
          sourceSystemId: d.sourceSystemId || null,
          description: d.description || null,
          attributes: d.attributes || {},
        })),
        jobs: jobs.map((j) => ({
          id: j.id,
          name: j.name,
          x: j.x,
          y: j.y,
          width: j.width,
          height: j.height,
          jobType: j.jobType || null,
          responsiblePerson: j.responsiblePerson || null,
          frequency: j.frequency || null,
          automated: j.automated || false,
          description: j.description || null,
          attributes: j.attributes || {},
        })),
        connections: lineageConnections.map((c) => ({
          id: c.id,
          sourceId: c.sourceId,
          targetId: c.targetId,
          description: c.description || null,
        })),
      },
    },
    openlineage: openlineage,
  };
}

/**
 * Serialize lineage data as OpenLineage-compatible events.
 * Each job is emitted as a COMPLETE event (design-time / declared lineage).
 * Manual-specific metadata is in the custom transitStack:manualJobFacet.
 */
function buildOpenLineage(datasets, jobs, lineageConnections, agencyName) {
  const producer = `transit-stack/${agencyName || "unknown"}`;
  const schemaURL = "https://openlineage.io/spec/1-0-5/OpenLineage.json";

  const events = jobs.map((j) => {
    const isManual = j.jobType !== "automated";
    const inputs = lineageConnections
      .filter((c) => c.targetId === j.id)
      .map((c) => {
        const ds = datasets.find((d) => d.id === c.sourceId);
        if (!ds) return null;
        return { namespace: ds.namespace || agencyName || "default", name: ds.name };
      })
      .filter(Boolean);
    const outputs = lineageConnections
      .filter((c) => c.sourceId === j.id)
      .map((c) => {
        const ds = datasets.find((d) => d.id === c.targetId);
        if (!ds) return null;
        return { namespace: ds.namespace || agencyName || "default", name: ds.name };
      })
      .filter(Boolean);

    return {
      eventType: "COMPLETE",
      eventTime: new Date().toISOString(),
      run: { runId: crypto.randomUUID() },
      job: {
        namespace: agencyName || "default",
        name: j.name,
        facets: {
          jobType: {
            _producer: producer,
            _schemaURL: schemaURL,
            processingType: "BATCH",
            integration: isManual ? "manual" : "automated",
            jobType: j.jobType || null,
          },
          ...(isManual && {
            "transitStack:manualJobFacet": {
              _producer: producer,
              _schemaURL: schemaURL,
              isManual: true,
              responsiblePerson: j.responsiblePerson || null,
              frequency: j.frequency || null,
              jobType: j.jobType || null,
              note: "Declared lineage — not runtime-instrumented",
            },
          }),
        },
      },
      inputs,
      outputs,
    };
  });

  return {
    note: "Declared (design-time) lineage. Events are COMPLETE-only and represent asserted data flows, not observed runtime executions.",
    events,
  };
}

/**
 * Parse an imported JSON object into app state.
 * Handles missing fields with sensible defaults.
 * Compatible with v3.x files (lineage fields simply absent).
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

  const lineageColWidths = normalizeColWidths(
    ts.canvas?.lineageColumnWidths
      ? LINEAGE_COL_IDS.map((id, i) => ts.canvas.lineageColumnWidths[id] || defaultLineageColWidths(paper.w)[i])
      : defaultLineageColWidths(paper.w),
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

  const lin = ts.lineage || {};

  const funders = (lin.funders || []).map((f) => ({
    id: f.id || uid(),
    name: f.name || "",
    x: f.x || 100,
    y: f.y || 100,
    width: f.width || FUNDER_STYLE.defaultW,
    height: f.height || FUNDER_STYLE.defaultH,
    programName: f.programName || "",
    contact: f.contact || "",
    reportingFrequency: f.reportingFrequency || "",
    notes: f.notes || "",
  }));

  const datasets = (lin.datasets || []).map((d) => ({
    id: d.id || uid(),
    name: d.name || "",
    x: d.x || 100,
    y: d.y || 100,
    width: d.width || DATASET_STYLE.defaultW,
    height: d.height || DATASET_STYLE.defaultH,
    datasetType: d.datasetType || "extract",
    sourceCategory: d.sourceCategory || "na",
    namespace: d.namespace || "",
    updateFrequency: d.updateFrequency || "",
    sourceSystemId: d.sourceSystemId || null,
    description: d.description || "",
    attributes: d.attributes || {},
  }));

  const jobs = (lin.jobs || []).map((j) => ({
    id: j.id || uid(),
    name: j.name || "",
    x: j.x || 100,
    y: j.y || 100,
    width: j.width || JOB_STYLE.defaultW,
    height: j.height || JOB_STYLE.defaultH,
    jobType: j.jobType || "manual_export",
    responsiblePerson: j.responsiblePerson || "",
    frequency: j.frequency || "",
    automated: j.automated || false,
    description: j.description || "",
    attributes: j.attributes || {},
  }));

  const lineageConnections = (lin.connections || []).map((c) => ({
    id: c.id || uid(),
    sourceId: c.sourceId || "",
    targetId: c.targetId || "",
    description: c.description || "",
  }));

  return {
    agencyName: ts.agencyName || "",
    docVersion: ts.docVersion || "1.0",
    docDate: ts.docDate || new Date().toISOString().slice(0, 10),
    paperSize,
    colWidths,
    lineageColWidths,
    vendors,
    systems,
    connections,
    datasets,
    jobs,
    funders,
    lineageConnections,
  };
}

/**
 * Trigger a browser file download.
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
