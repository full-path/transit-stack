# Transit Stack

A drag-and-drop diagram editor for inventorying transit agency technology systems, vendors, and data flows. Produces structured JSON exports suitable for analysis by humans, spreadsheets, or large language models.

**No server required.** Transit Stack runs entirely in the browser. State is saved to `localStorage`. Export and import use JSON files. Optional Google Sheets integration stores the JSON payload in a spreadsheet cell.

## Quick Start

Requires [Node.js](https://nodejs.org/) 18 or later.

```bash
git clone <repo-url>
cd transit-stack
npm install
npm run dev
```

This starts a local development server at `http://localhost:5173`. Open it in a browser.

To build static files for deployment:

```bash
npm run build
```

Output goes to `dist/`. Serve it from any static hosting (GitHub Pages, Netlify, Cloudflare Pages, or just `npx serve dist`).

## What It Does

Transit agencies use a variety of software systems for scheduling, dispatch, fare collection, passenger information, reporting, and planning. These systems are provided by different vendors and connected (or not connected) by data flows of varying quality. A "Transit Stack" diagram maps this landscape. The goal is for this tool to support transit agencies, particularly small ones, to be able to share a common language to describe and share their transit-specific technology infrastructure.

The tool has two views, toggled in the toolbar:

### Systems View

Place vendor and system widgets on a canvas organized into five fixed category columns: Payment, In-Vehicle, Operations, Outreach & Access, and Planning & Reporting.

1. **Place vendors and systems** by clicking "+ Vendor" or "+ System" in the toolbar.
2. **Resize** by dragging the corner handles when selected.
3. **Draw connections** by hovering over a system to reveal port circles, then dragging to another system.
4. **Set attributes** via the right-hand properties panel (status, description, management type, data standardization, etc.).

Relationships are derived from spatial placement:
- A system's **category** is determined by which column its center falls in.
- A system's **vendor** is determined by which vendor box fully contains it.
- A system flagged as **agency-managed** gets a red border regardless of vendor containment.
- A system not contained by any vendor gets a yellow "unspecified management" border.

### Lineage View

Map data flows across five columns: Vehicle Sources, Back-office Sources, Processing, Outputs, and Destinations.

1. **Add datasets and jobs** using the toolbar buttons.
2. **Add funders** as container boxes for datasets that have grant reporting requirements.
3. **Connect nodes** by hovering to reveal ports and dragging to another node.
4. **Auto-layout** positions all nodes by computing each node's longest path from any source, assigning it to the appropriate column, and distributing nodes evenly top-to-bottom. It is undoable.
5. **Set source category** on datasets (Vehicle / Back-office / N/A) to control which source column they land in during auto-layout.

### Shared Features

- **Export** the diagram as JSON (for data analysis) or SVG (for sharing).
- **Print** directly from the browser (Cmd+P / Ctrl+P). The toolbar hides automatically.
- **Import** a previously exported JSON file to restore the exact layout.
- **Undo/Redo** with Ctrl+Z / Ctrl+Y (or Cmd+Z / Cmd+Shift+Z on Mac).
- **Google Sheets** — connect via OAuth to save/load the JSON payload to/from a spreadsheet cell.

## Project Structure

```
transit-stack/
├── index.html              Entry point
├── package.json            Dependencies and scripts
├── vite.config.js          Build tool configuration
├── tailwind.config.js      Tailwind CSS configuration
├── docs/
│   └── schema.md           JSON export format specification
└── src/
    ├── main.jsx            React entry point
    ├── index.css           Tailwind directives
    ├── App.jsx             Top-level component: state, interactions, toolbar, persistence
    ├── constants.js        Domain constants (categories, statuses, paper sizes, styles)
    ├── components/
    │   ├── shared.jsx      Reusable UI primitives (AttrEditor, CSS class strings)
    │   ├── PropsPanel.jsx  Right-hand properties inspector
    │   ├── SystemsCanvas.jsx  SVG rendering for the Systems view
    │   ├── LineageCanvas.jsx  SVG rendering for the Lineage view
    │   └── Legend.jsx      SVG legend rendered on the canvas
    └── utils/
        ├── geometry.js     Pure geometry functions (edge points, containment)
        ├── text.js         SVG text word-wrap utility
        ├── lineageLayout.js  Auto-layout algorithm (topological sort → column assignment)
        ├── storage.js      localStorage persistence wrapper (v3→v4 migration)
        ├── exportImport.js JSON export builder, import parser, OpenLineage serializer
        └── googleSheets.js Google Sheets OAuth and Sheets API helpers
```

## Visual Encoding

### Systems View

| Element | Visual Property | Meaning |
|---------|----------------|---------|
| System fill | Green / Orange / Yellow | In Use / Planned / Needed |
| System border | Thick red | Agency-managed |
| System border | Thick yellow | No vendor assigned |
| System border | Thin gray | Vendor-assigned |
| Connection color | Green / Orange / Yellow | In Use / Planned / Needed |
| Connection thickness | Thick (3.5px) | Standardized data |
| Connection thickness | Thin (1.5px) | Non-standard data |
| Connection dash | Solid | Vendor-managed |
| Connection dash | Dashed (10,5) | Agency-managed |
| Connection dash | Dotted (4,4) | Manual process |
| Connection arrows | One end | One-way data flow |
| Connection arrows | Both ends | Bidirectional |

### Lineage View

| Element | Visual Property | Meaning |
|---------|----------------|---------|
| Dataset node | Blue rectangle | A data artifact (extract, spreadsheet, feed, etc.) |
| Job node | Orange rounded rectangle | A transformation or transfer step |
| Funder box | Purple container | A funding source with reporting obligations |
| Lineage connection | Dashed arrow | Directed data flow from source to target |

## JSON Export Format

See [docs/schema.md](docs/schema.md) for the full specification. The export is designed to be:

- **Self-documenting**: enum definitions (categories, statuses, management types) are included inline.
- **Denormalized**: human-readable names appear alongside machine-readable IDs.
- **Layout-complete**: all spatial coordinates are included for exact visual reproduction on import.

The export also includes an `openlineage` top-level key containing declared (design-time) lineage events in [OpenLineage](https://openlineage.io) format. Each job becomes a `COMPLETE` event. Manual jobs carry a custom `transitStack:manualJobFacet`.

## Technology

- **React 18** — UI framework
- **Vite** — build tool
- **Tailwind CSS 3** — utility-first styling
- **SVG** — all canvas rendering is native SVG (no canvas/WebGL)

No server-side code. No database. No authentication (beyond OAuth for the optional Google Sheets integration). No external API calls beyond Google APIs.

## License

MIT. See [LICENSE](LICENSE).

## Credits

The transit stack term and concept was first developed by the team at [Trillium Solutions](https://trilliumtransit.com/2016/10/10/transit-stack-diagram/). Subsequent iterations were developed by [Full Path](https://fullpath.io) with early funding by the [Oregon Department of Transportation Public Transit Division](https://www.oregon.gov/odot/rptd/pages/index.aspx).

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make changes. Keep commits focused.
4. Test manually by running `npm run dev` and exercising the UI.
5. Submit a pull request with a clear description of what changed and why.

There are no automated tests yet. Adding them — especially for `geometry.js`, `exportImport.js`, `lineageLayout.js`, and the spatial relationship derivation logic — would be a valuable contribution.
