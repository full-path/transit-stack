# Transit Stack JSON Schema — Version 3.1

This document specifies the JSON export format produced by Transit Stack. The format is designed for three consumers: the Transit Stack application itself (for import), human readers (for review), and large language models (for analysis).

## Root Object

```json
{
  "transitStack": { ... }
}
```

All content is nested under a `transitStack` key to make the file self-identifying.

## Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `schemaVersion` | string | Always `"3.1"` for this format version. |
| `docVersion` | string | User-assigned version number for this document (e.g., `"1.0"`, `"2.3"`). |
| `docDate` | string | User-assigned date for this document version (ISO 8601 date, e.g., `"2026-04-13"`). |
| `exportDate` | string | Date this export was generated (ISO 8601 date). |
| `agencyName` | string | Name of the transit agency. |
| `canvas` | object | Canvas dimensions and column configuration. |
| `categories` | array | Reference list of the five fixed category definitions. |
| `statusOptions` | array | Reference list of status values (`in_use`, `planned`, `needed`). |
| `managementTypes` | array | Reference list of connection management types. |
| `vendors` | array | All vendor widgets with positions and attributes. |
| `systems` | array | All system widgets with positions, derived relationships, and attributes. |
| `connections` | array | All connections between systems with attributes. |

## Canvas

```json
{
  "paperSize": "letter",
  "paperSizeName": "Letter (11×8.5\")",
  "width": 1056,
  "height": 816,
  "categoryWidths": {
    "payment": 179,
    "in_vehicle": 201,
    "operations": 232,
    "outreach_access": 222,
    "planning_reporting": 222
  }
}
```

`width` and `height` are in CSS pixels at 96 DPI, corresponding to the selected paper size in landscape orientation. Category widths always sum to `width`.

### Paper Size Options

| Key | Name | Width | Height |
|-----|------|-------|--------|
| `letter` | Letter (11×8.5″) | 1056 | 816 |
| `legal` | Legal (14×8.5″) | 1344 | 816 |
| `tabloid` | 11×17 / Tabloid | 1632 | 1056 |
| `a4` | A4 Landscape | 1123 | 794 |
| `a3` | A3 Landscape | 1588 | 1123 |

## Vendors

Each vendor is a rectangular container widget.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier. |
| `name` | string | Vendor name displayed on the widget. |
| `x`, `y` | number | Top-left corner position in SVG user units. |
| `width`, `height` | number | Dimensions in SVG user units. |
| `description` | string or null | Free-text description. |
| `attributes` | object | Arbitrary key-value pairs (e.g., `contractExpiry`, `hosting`). |

## Systems

Each system is a rectangular widget placed on the canvas. Category and vendor are **derived from position**, not stored as user input.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier. |
| `name` | string | System name displayed on the widget. |
| `x`, `y` | number | Top-left corner position. |
| `width`, `height` | number | Dimensions (default 140×52). |
| `status` | string | One of `in_use`, `planned`, `needed`. |
| `statusName` | string | Human-readable status (denormalized). |
| `agencyManaged` | boolean | If true, the system is operated by the agency regardless of vendor containment. |
| `category` | string or null | Derived: which category column the system's center falls in. |
| `categoryName` | string or null | Human-readable category name (denormalized). |
| `vendorId` | string or null | Derived: ID of the vendor widget that fully contains this system. |
| `vendorName` | string or null | Human-readable vendor name (denormalized). |
| `description` | string or null | Free-text description, shown as subtitle on the widget. |
| `attributes` | object | Arbitrary key-value pairs. |

## Connections

Each connection represents a data flow between two systems.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier. |
| `sourceSystemId` | string | ID of the source system. |
| `sourceSystemName` | string | Source system name (denormalized). |
| `targetSystemId` | string | ID of the target system. |
| `targetSystemName` | string | Target system name (denormalized). |
| `bidirectional` | boolean | If true, arrows render at both ends. |
| `dataStandardized` | boolean | If true, thick line; if false, thin line. |
| `managementType` | string | One of `vendor`, `agency`, `manual`. Determines dash pattern. |
| `managementTypeName` | string | Human-readable (denormalized). |
| `status` | string | One of `in_use`, `planned`, `needed`. Determines line color. |
| `statusName` | string | Human-readable (denormalized). |
| `label` | string or null | Short label displayed at the midpoint of the connection path. |
| `vendorName` | string or null | Optional vendor for the connection itself (e.g., an ISP). Displayed as a "via" badge. |
| `description` | string or null | Longer description, visible only in the properties panel. |
| `attributes` | object | Arbitrary key-value pairs. |

## Design Principles

1. **IDs are opaque.** They have no semantic meaning. Use the denormalized `*Name` fields for human or LLM consumption.

2. **Derived fields are read-only on export.** `category`, `categoryName`, `vendorId`, and `vendorName` on systems are computed from spatial position at export time. On import, these fields are ignored — position is authoritative.

3. **Attributes are unstructured.** The `attributes` object on any element accepts arbitrary key-value string pairs. Common keys include `contractExpiry`, `hosting`, `painPoint`, `product`, but none are enforced.

4. **Null means absent.** Optional fields use `null` rather than empty string when no value has been set.
