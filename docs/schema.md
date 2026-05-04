# Transit Stack JSON Schema — Version 4.0

This document specifies the JSON export format produced by Transit Stack. The format is designed for three consumers: the Transit Stack application itself (for import), human readers (for review), and large language models (for analysis).

## Root Object

```json
{
  "transitStack": { ... },
  "openlineage": { ... }
}
```

`transitStack` contains the full diagram state. `openlineage` contains declared (design-time) lineage events in [OpenLineage](https://openlineage.io) format.

---

## `transitStack`

### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `schemaVersion` | string | `"4.0"` for this format version. |
| `docVersion` | string | User-assigned version number for this document (e.g., `"1.0"`). |
| `docDate` | string | User-assigned date (ISO 8601, e.g., `"2026-05-01"`). |
| `exportDate` | string | Date this export was generated (ISO 8601). |
| `agencyName` | string | Name of the transit agency. |
| `canvas` | object | Canvas dimensions and column configuration. |
| `categories` | array | Reference list of the five Systems-view category definitions. |
| `statusOptions` | array | Reference list of status values (`in_use`, `planned`, `needed`). |
| `managementTypes` | array | Reference list of connection management types. |
| `vendors` | array | All vendor container widgets (Systems view). |
| `systems` | array | All system widgets with positions and derived relationships (Systems view). |
| `connections` | array | All connections between systems (Systems view). |
| `lineage` | object | All Lineage-view data: funders, datasets, jobs, and lineage connections. |

### Canvas

```json
{
  "paperSize": "letter",
  "paperSizeName": "Letter (11×8.5\")",
  "width": 960,
  "height": 720,
  "categoryWidths": {
    "payment": 192,
    "in_vehicle": 192,
    "operations": 192,
    "outreach_access": 192,
    "planning_reporting": 192
  },
  "lineageColumnWidths": {
    "vehicle_sources": 192,
    "backoffice_sources": 192,
    "processing": 192,
    "outputs": 192,
    "destinations": 192
  }
}
```

`width` and `height` are the printable area in CSS pixels at 96 DPI (page dimensions minus 0.5 in margins on each side). Category widths and lineage column widths each sum to `width`.

#### Paper Size Options

| Key | Name | Width (px) | Height (px) |
|-----|------|-----------|------------|
| `letter` | Letter (11×8.5″) | 960 | 720 |
| `legal` | Legal (14×8.5″) | 1248 | 720 |
| `tabloid` | 11×17 / Tabloid | 1536 | 960 |
| `a4` | A4 Landscape | 1026 | 698 |
| `a3` | A3 Landscape | 1491 | 1027 |

---

## Systems View

### Vendors

Each vendor is a rectangular container widget.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier. |
| `name` | string | Vendor name displayed on the widget. |
| `x`, `y` | number | Top-left corner position in SVG user units. |
| `width`, `height` | number | Dimensions in SVG user units. |
| `description` | string or null | Free-text description. |
| `attributes` | object | Arbitrary key-value pairs (e.g., `contractExpiry`, `hosting`). |

### Systems

Each system is a rectangular widget placed on the canvas. Category and vendor are **derived from position**, not stored as user input.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier. |
| `name` | string | System name. |
| `x`, `y` | number | Top-left corner position. |
| `width`, `height` | number | Dimensions (default 140×52). |
| `status` | string | One of `in_use`, `planned`, `needed`. |
| `statusName` | string | Human-readable status (denormalized). |
| `agencyManaged` | boolean | True if operated by the agency regardless of vendor containment. |
| `category` | string or null | Derived: which category column the system's center falls in. |
| `categoryName` | string or null | Human-readable category name (denormalized). |
| `vendorId` | string or null | Derived: ID of the vendor widget that fully contains this system. |
| `vendorName` | string or null | Human-readable vendor name (denormalized). |
| `description` | string or null | Free-text description (shown as subtitle on the widget). |
| `attributes` | object | Arbitrary key-value pairs. |

### Connections

Each connection represents a data flow between two systems.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier. |
| `sourceSystemId` | string | ID of the source system. |
| `sourceSystemName` | string | Source system name (denormalized). |
| `targetSystemId` | string | ID of the target system. |
| `targetSystemName` | string | Target system name (denormalized). |
| `bidirectional` | boolean | If true, arrows render at both ends. |
| `dataStandardized` | boolean | Thick line if true, thin line if false. |
| `managementType` | string | One of `vendor`, `agency`, `manual`. Determines dash pattern. |
| `managementTypeName` | string | Human-readable (denormalized). |
| `status` | string | One of `in_use`, `planned`, `needed`. Determines line color. |
| `statusName` | string | Human-readable (denormalized). |
| `label` | string or null | Short label at the midpoint of the connection. |
| `vendorName` | string or null | Optional vendor for the connection (e.g., an ISP). Rendered as a "via" badge. |
| `description` | string or null | Longer description, visible only in the properties panel. |
| `attributes` | object | Arbitrary key-value pairs. |

---

## Lineage View (`lineage`)

The `lineage` object contains four arrays.

### Funders

Funder boxes are resizable containers used to group datasets that have grant or reporting obligations.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier. |
| `name` | string | Funder name (e.g., "FTA Section 5310"). |
| `x`, `y` | number | Top-left corner position. |
| `width`, `height` | number | Dimensions. |
| `programName` | string or null | Grant program name. |
| `contact` | string or null | Agency contact person for this funder. |
| `reportingFrequency` | string or null | How often reports are due (e.g., "Quarterly"). |
| `notes` | string or null | Free-text notes. |

### Datasets

A dataset represents any data artifact: a file, table, feed, dashboard, or spreadsheet.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier. |
| `name` | string | Dataset name. |
| `x`, `y` | number | Top-left corner position. |
| `width`, `height` | number | Dimensions (default 130×46). |
| `datasetType` | string | One of `extract`, `spreadsheet`, `report`, `dashboard`, `feed`, `db_table`. |
| `sourceCategory` | string | One of `vehicle`, `back_office`, `na`. Controls which source column the dataset lands in during auto-layout. |
| `namespace` | string or null | Logical namespace for OpenLineage (e.g., a system name or storage location). |
| `updateFrequency` | string or null | How often this dataset is refreshed (e.g., "Daily"). |
| `sourceSystemId` | string or null | ID of a system from the Systems view that produces this dataset. |
| `description` | string or null | Free-text description. |
| `attributes` | object | Arbitrary key-value pairs. |

### Jobs

A job represents a transformation or transfer step: a manual export, an automated ETL, a file upload, etc.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier. |
| `name` | string | Job name. |
| `x`, `y` | number | Top-left corner position. |
| `width`, `height` | number | Dimensions (default 130×46). |
| `jobType` | string | One of `manual_export`, `manual_transform`, `manual_entry`, `file_transfer`, `upload`, `automated`. |
| `responsiblePerson` | string or null | Name of the person who performs or owns this job. |
| `frequency` | string or null | How often the job runs (e.g., "Monthly"). |
| `automated` | boolean | True if the job runs without human intervention. |
| `description` | string or null | Free-text description. |
| `attributes` | object | Arbitrary key-value pairs. |

### Lineage Connections

Each lineage connection is a directed edge from a dataset or job to another dataset or job.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier. |
| `sourceId` | string | ID of the source node (dataset or job). |
| `targetId` | string | ID of the target node (dataset or job). |
| `description` | string or null | Free-text description of this data flow. |

---

## `openlineage`

The `openlineage` top-level key contains declared (design-time) lineage serialized in [OpenLineage](https://openlineage.io) event format. Events are `COMPLETE`-only and represent asserted data flows, not observed runtime executions.

```json
{
  "note": "Declared (design-time) lineage...",
  "events": [ ... ]
}
```

Each event corresponds to one job from the lineage view:

```json
{
  "eventType": "COMPLETE",
  "eventTime": "2026-05-01T00:00:00.000Z",
  "run": { "runId": "<uuid>" },
  "job": {
    "namespace": "<agencyName>",
    "name": "<jobName>",
    "facets": {
      "jobType": {
        "processingType": "BATCH",
        "integration": "manual | automated",
        "jobType": "<jobType>"
      },
      "transitStack:manualJobFacet": { ... }
    }
  },
  "inputs": [ { "namespace": "...", "name": "..." } ],
  "outputs": [ { "namespace": "...", "name": "..." } ]
}
```

`transitStack:manualJobFacet` is present only for non-automated jobs and carries `responsiblePerson`, `frequency`, and a note that this is declared lineage.

---

## Design Principles

1. **IDs are opaque.** They have no semantic meaning. Use the denormalized `*Name` fields for human or LLM consumption.

2. **Derived fields are read-only on export.** `category`, `categoryName`, `vendorId`, and `vendorName` on systems are computed from spatial position at export time. On import, these fields are ignored — position is authoritative.

3. **Attributes are unstructured.** The `attributes` object on any element accepts arbitrary key-value string pairs. Common keys include `contractExpiry`, `hosting`, `painPoint`, `product`, but none are enforced.

4. **Null means absent.** Optional fields use `null` rather than empty string when no value has been set.

5. **Backwards compatibility.** Files exported with schema version 3.x import cleanly into v4.0. The `lineage` section defaults to empty arrays when absent.
