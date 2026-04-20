# Transit Stack

A vibe-coded drag-and-drop diagram editor for inventorying transit agency technology systems, vendors, and data flows. Produces structured JSON exports suitable for analysis by humans, spreadsheets, or large language models.

**No server required.** Transit Stack runs entirely in the browser. State is saved to `localStorage`. Export and import use JSON files.

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

This tool lets a transit planner:

1. **Place vendor and system widgets** on a canvas organized into five fixed category columns: Payment, In-Vehicle, Operations, Outreach & Access, and Planning & Reporting.
2. **Resize vendors and systems** by dragging their corner handles when selected.
3. **Draw connections** between systems by dragging from one system's port to another.
4. **Set attributes** on each element via a properties panel (status, description, management type, data standardization, etc.).
5. **Export** the diagram as JSON (for data analysis) or SVG (for sharing).
6. **Print** directly from the browser (Cmd+P / Ctrl+P). The toolbar hides automatically and the page size and orientation match the canvas paper setting.
7. **Import** a previously exported JSON file to restore the exact layout.

Relationships are derived from spatial placement:
- A system's **category** is determined by which column its center falls in.
- A system's **vendor** is determined by which vendor box fully contains it.
- A system flagged as **agency-managed** gets a red border regardless of vendor containment.
- A system not contained by any vendor gets a yellow "unspecified management" border.

## Project Structure

```
transit-stack/
├── index.html              Entry point
├── package.json            Dependencies and scripts
├── vite.config.js          Build tool configuration
├── tailwind.config.js      Tailwind CSS configuration
├── postcss.config.js       PostCSS configuration
├── docs/
│   └── schema.md           JSON export format specification
└── src/
    ├── main.jsx            React entry point
    ├── index.css            Tailwind directives
    ├── App.jsx              Main component (canvas, toolbar, state, interaction)
    ├── constants.js         Domain constants (categories, statuses, paper sizes)
    ├── components/
    │   ├── shared.jsx       Reusable UI primitives (AttrEditor, CSS classes)
    │   ├── PropsPanel.jsx   Right-hand properties inspector
    │   └── Legend.jsx       SVG legend rendered on the canvas
    └── utils/
        ├── geometry.js      Pure geometry functions (edge points, containment)
        ├── storage.js       localStorage persistence wrapper
        └── exportImport.js  JSON export builder, import parser, file download
```

## Visual Encoding

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

## JSON Export Format

See [docs/schema.md](docs/schema.md) for the full specification. The export is designed to be:

- **Self-documenting**: enum definitions (categories, statuses, management types) are included inline.
- **Denormalized**: human-readable names appear alongside machine-readable IDs.
- **Layout-complete**: all spatial coordinates are included for exact visual reproduction on import.

## Technology

- **React 18** — UI framework
- **Vite** — build tool
- **Tailwind CSS 3** — utility-first styling
- **SVG** — all canvas rendering is native SVG (no canvas/WebGL)

No server-side code. No database. No authentication. No external API calls.

## License

MIT. See [LICENSE](LICENSE).

## Credits

The transit stack term and concept was first developed by the team at [Trillium Solutions](https://trilliumtransit.com/2016/10/10/transit-stack-diagram/). Subsequent iterations developed were developed by [Full Path](https://fullpath.io) with funding by the [Oregon Department of Transportation Public Transit Division](https://www.oregon.gov/odot/rptd/pages/index.aspx).

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make changes. Keep commits focused.
4. Test manually by running `npm run dev` and exercising the UI.
5. Submit a pull request with a clear description of what changed and why.

There are no automated tests yet. Adding them — especially for `geometry.js`, `exportImport.js`, and the spatial relationship derivation logic — would be a valuable contribution.
