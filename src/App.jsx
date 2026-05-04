/**
 * App.jsx — Transit Stack main application component.
 *
 * This is the top-level orchestrator. It owns all application state,
 * handles mouse interaction on the SVG canvas, and delegates rendering
 * of the properties panel and legend to child components.
 *
 * State architecture:
 *   - React useState for all mutable state (systems, vendors, connections,
 *     canvas config, selection, UI toggles).
 *   - A useRef for in-progress interaction state (dragging, connecting,
 *     resizing) to avoid re-renders on every mousemove pixel.
 *   - A useEffect that auto-saves to localStorage on every state change.
 *   - A useMemo that derives category and vendor assignments from spatial
 *     positions (enrichedSystems).
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  CATEGORIES,
  CAT_IDS,
  LINEAGE_COLUMNS,
  STATUS,
  PAPER_SIZES,
  DEFAULT_PAPER,
  HEADER_H,
  MIN_COL_W,
  SYS_W,
  SYS_H,
  DATASET_STYLE,
  JOB_STYLE,
  FUNDER_STYLE,
  LINEAGE_CONN_STYLE,
  FONT_SIZE,
  PT_TO_PX,
  CANVAS_BG,
  FONT_FAMILY,
  defaultColWidths,
  defaultLineageColWidths,
  normalizeColWidths,
} from "./constants";
import { rectContains } from "./utils/geometry";
import { load, save } from "./utils/storage";
import {
  uid,
  buildExport,
  parseImport,
  downloadFile,
} from "./utils/exportImport";
import { autoLayout } from "./utils/lineageLayout";
import {
  getStoredSheetId,
  storeSheetId,
  parseSheetId,
  initTokenClient,
  requestAccessToken,
  readCell,
  writeCell,
} from "./utils/googleSheets";
import PropsPanel from "./components/PropsPanel";
import Legend from "./components/Legend";
import SystemsCanvas from "./components/SystemsCanvas";
import LineageCanvas from "./components/LineageCanvas";
import { btnPrimary, btnSecondary } from "./components/shared";

export default function App() {
  // ── State ──
  const [loaded, setLoaded] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [docVersion, setDocVersion] = useState("1.0");
  const [docDate, setDocDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [paperSize, setPaperSize] = useState(DEFAULT_PAPER);
  const [colWidths, setColWidths] = useState(
    defaultColWidths(PAPER_SIZES[DEFAULT_PAPER].w)
  );
  const [vendors, setVendors] = useState([]);
  const [systems, setSystems] = useState([]);
  const [connections, setConnections] = useState([]);
  const [activeView, setActiveView] = useState("systems"); // "systems" | "lineage"
  const [datasets, setDatasets] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [funders, setFunders] = useState([]);
  const [lineageConnections, setLineageConnections] = useState([]);
  const [lineageColWidths, setLineageColWidths] = useState(
    defaultLineageColWidths(PAPER_SIZES[DEFAULT_PAPER].w)
  );
  const [sel, setSel] = useState(null); // { type: "system"|"vendor"|"connection"|"dataset"|"job"|"funder"|"lineage_connection", id }
  const [showSettings, setShowSettings] = useState(false);
  const [hoveredSys, setHoveredSys] = useState(null);

  // ── Google Sheets ──
  const [gToken, setGToken] = useState(null);
  const [sheetUrl, setSheetUrl] = useState(getStoredSheetId);
  const [gStatus, setGStatus] = useState("idle"); // "idle" | "connecting" | "saving" | "loading"
  const [gError, setGError] = useState("");

  // Interaction ref (not in React state — mutated during mousemove)
  const interRef = useRef({ mode: "idle" });
  const [, setInterRender] = useState(0); // bump to force re-render during connecting

  const svgRef = useRef();
  const fileRef = useRef();

  // ── Undo / Redo ──
  const historyRef = useRef([]);
  const futureRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const latestStateRef = useRef(null);
  latestStateRef.current = { agencyName, docVersion, docDate, paperSize, colWidths, lineageColWidths, vendors, systems, connections, activeView, datasets, jobs, funders, lineageConnections };

  // ── Derived values ──
  const paper = PAPER_SIZES[paperSize] || PAPER_SIZES[DEFAULT_PAPER];
  const canvasW = paper.w;
  const canvasH = paper.h;

  const colBounds = useMemo(() => {
    const b = [0];
    colWidths.forEach((w) => b.push(b[b.length - 1] + w));
    return b;
  }, [colWidths]);

  const lineageColBounds = useMemo(() => {
    const b = [0];
    lineageColWidths.forEach((w) => b.push(b[b.length - 1] + w));
    return b;
  }, [lineageColWidths]);

  /**
   * enrichedSystems: each system augmented with derived fields:
   *   _category  — which category column its center falls in
   *   _vendorId  — ID of the vendor box that fully contains it (or null)
   *   _vendorName — name of that vendor (or null)
   */
  const enrichedSystems = useMemo(() => {
    return systems.map((s) => {
      const cx = s.x + s.width / 2;
      let cat = null;
      for (let i = 0; i < CAT_IDS.length; i++) {
        if (cx >= colBounds[i] && cx < colBounds[i + 1]) {
          cat = CAT_IDS[i];
          break;
        }
      }
      let vendorId = null,
        vendorName = null;
      for (const v of vendors) {
        if (rectContains(v, s)) {
          vendorId = v.id;
          vendorName = v.name;
          break;
        }
      }
      return { ...s, _category: cat, _vendorId: vendorId, _vendorName: vendorName };
    });
  }, [systems, vendors, colBounds]);

  // ── Persistence ──
  useEffect(() => {
    const saved = load();
    if (saved) {
      setAgencyName(saved.agencyName || "");
      setDocVersion(saved.docVersion || "1.0");
      setDocDate(saved.docDate || new Date().toISOString().slice(0, 10));
      setPaperSize(saved.paperSize || DEFAULT_PAPER);
      const loadedPaper = PAPER_SIZES[saved.paperSize || DEFAULT_PAPER] || PAPER_SIZES[DEFAULT_PAPER];
      setColWidths(normalizeColWidths(saved.colWidths || defaultColWidths(loadedPaper.w), loadedPaper.w));
      setLineageColWidths(normalizeColWidths(saved.lineageColWidths || defaultLineageColWidths(loadedPaper.w), loadedPaper.w));
      setVendors(saved.vendors || []);
      setSystems(saved.systems || []);
      setConnections(saved.connections || []);
      setActiveView(saved.activeView || "systems");
      setDatasets(saved.datasets || []);
      setJobs(saved.jobs || []);
      setFunders(saved.funders || []);
      setLineageConnections(saved.lineageConnections || []);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      save({ agencyName, docVersion, docDate, paperSize, colWidths, lineageColWidths, vendors, systems, connections, activeView, datasets, jobs, funders, lineageConnections });
    }
  }, [agencyName, docVersion, docDate, paperSize, colWidths, lineageColWidths, vendors, systems, connections, activeView, datasets, jobs, funders, lineageConnections, loaded]);

  useEffect(() => {
    let el = document.getElementById("transit-stack-page-style");
    if (!el) {
      el = document.createElement("style");
      el.id = "transit-stack-page-style";
      document.head.appendChild(el);
    }
    el.textContent = `@page { size: ${paper.printSize}; margin: 0.5in; } @media print { svg { width: ${paper.printW}in !important; height: ${paper.printH}in !important; } }`;
  }, [paper.printSize]);

  // ── Undo / Redo helpers ──
  const saveSnapshot = useCallback((snap) => {
    historyRef.current = [...historyRef.current.slice(-49), snap ?? latestStateRef.current];
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const applyState = useCallback((s) => {
    setAgencyName(s.agencyName);
    setDocVersion(s.docVersion);
    setDocDate(s.docDate);
    setPaperSize(s.paperSize);
    setColWidths(s.colWidths);
    setLineageColWidths(s.lineageColWidths);
    setVendors(s.vendors);
    setSystems(s.systems);
    setConnections(s.connections);
    setActiveView(s.activeView || "systems");
    setDatasets(s.datasets || []);
    setJobs(s.jobs || []);
    setFunders(s.funders || []);
    setLineageConnections(s.lineageConnections || []);
  }, []);

  const travel = useCallback((fromRef, toRef, setCanFrom, setCanTo) => {
    if (!fromRef.current.length) return;
    toRef.current = [...toRef.current.slice(-49), latestStateRef.current];
    const target = fromRef.current.at(-1);
    fromRef.current = fromRef.current.slice(0, -1);
    applyState(target);
    setCanFrom(fromRef.current.length > 0);
    setCanTo(true);
  }, [applyState]);

  const undo = useCallback(() => travel(historyRef, futureRef, setCanUndo, setCanRedo), [travel]);
  const redo = useCallback(() => travel(futureRef, historyRef, setCanRedo, setCanUndo), [travel]);

  // ── SVG coordinate helper ──
  const svgCoords = useCallback(
    (e) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvasW / rect.width),
        y: (e.clientY - rect.top) * (canvasH / rect.height),
      };
    },
    [canvasW, canvasH]
  );

  // ── Paper size change with proportional rescale ──
  const changePaperSize = useCallback(
    (newKey) => {
      const oldP = PAPER_SIZES[paperSize] || PAPER_SIZES[DEFAULT_PAPER];
      const newP = PAPER_SIZES[newKey];
      if (!newP) return;
      saveSnapshot();
      const rx = newP.w / oldP.w;
      const ry = newP.h / oldP.h;
      setColWidths((prev) => {
        const scaled = prev.map((w) => Math.max(MIN_COL_W, Math.round(w * rx)));
        const sum = scaled.reduce((a, b) => a + b, 0);
        scaled[scaled.length - 1] = Math.max(MIN_COL_W, scaled[scaled.length - 1] + (newP.w - sum));
        return scaled;
      });
      setVendors((vs) =>
        vs.map((v) => ({
          ...v,
          x: v.x * rx,
          y: Math.min(v.y * ry, newP.h - v.height),
          width: v.width * rx,
          height: v.height * ry,
        }))
      );
      setSystems((ss) =>
        ss.map((s) => ({ ...s, x: s.x * rx, y: Math.min(s.y * ry, newP.h - s.height) }))
      );
      setDatasets((ds) =>
        ds.map((d) => ({ ...d, x: d.x * rx, y: Math.min(d.y * ry, newP.h - d.height) }))
      );
      setJobs((js) =>
        js.map((j) => ({ ...j, x: j.x * rx, y: Math.min(j.y * ry, newP.h - j.height) }))
      );
      setFunders((fs) =>
        fs.map((f) => ({ ...f, x: f.x * rx, y: Math.min(f.y * ry, newP.h - f.height), width: f.width * rx, height: f.height * ry }))
      );
      setLineageColWidths((prev) => {
        const scaled = prev.map((w) => Math.max(MIN_COL_W, Math.round(w * rx)));
        const sum = scaled.reduce((a, b) => a + b, 0);
        scaled[scaled.length - 1] = Math.max(MIN_COL_W, scaled[scaled.length - 1] + (newP.w - sum));
        return scaled;
      });
      setPaperSize(newKey);
    },
    [paperSize, saveSnapshot]
  );

  // ── Column width adjustment (zero-sum: steals from last column) ──
  const adjustColWidth = useCallback((ci, newW) => {
    setColWidths((prev) => {
      const comp = ci === prev.length - 1 ? ci - 1 : prev.length - 1;
      const maxW = prev.reduce((a, b) => a + b, 0) - (prev.length - 1) * MIN_COL_W;
      const clamped = Math.max(MIN_COL_W, Math.min(Math.round(newW), maxW));
      const delta = clamped - prev[ci];
      const nw = [...prev];
      nw[ci] = clamped;
      nw[comp] = nw[comp] - delta;
      return nw;
    });
  }, []);

  const adjustLineageColWidth = useCallback((ci, newW) => {
    setLineageColWidths((prev) => {
      const comp = ci === prev.length - 1 ? ci - 1 : prev.length - 1;
      const maxW = prev.reduce((a, b) => a + b, 0) - (prev.length - 1) * MIN_COL_W;
      const clamped = Math.max(MIN_COL_W, Math.min(Math.round(newW), maxW));
      const delta = clamped - prev[ci];
      const nw = [...prev];
      nw[ci] = clamped;
      nw[comp] = nw[comp] - delta;
      return nw;
    });
  }, []);

  // ── Add / delete items ──
  const addSystem = () => {
    saveSnapshot();
    const s = {
      id: uid(), name: "New System",
      x: canvasW / 2 - SYS_W / 2, y: canvasH / 2 - SYS_H / 2,
      width: SYS_W, height: SYS_H,
      status: "in_use", agencyManaged: false, description: "", attributes: {},
    };
    setSystems((p) => [...p, s]);
    setSel({ type: "system", id: s.id });
  };

  const addVendor = () => {
    saveSnapshot();
    const v = {
      id: uid(), name: "New Vendor",
      x: canvasW / 2 - 120, y: canvasH / 2 - 80,
      width: 240, height: 160,
      description: "", attributes: {},
    };
    setVendors((p) => [...p, v]);
    setSel({ type: "vendor", id: v.id });
  };

  const deleteSelected = () => {
    if (!sel) return;
    saveSnapshot();
    if (sel.type === "system") {
      setSystems((p) => p.filter((s) => s.id !== sel.id));
      setConnections((p) => p.filter((c) => c.sourceId !== sel.id && c.targetId !== sel.id));
    } else if (sel.type === "vendor") {
      setVendors((p) => p.filter((v) => v.id !== sel.id));
    } else if (sel.type === "connection") {
      setConnections((p) => p.filter((c) => c.id !== sel.id));
    } else if (sel.type === "dataset") {
      setDatasets((p) => p.filter((d) => d.id !== sel.id));
      setLineageConnections((p) => p.filter((c) => c.sourceId !== sel.id && c.targetId !== sel.id));
    } else if (sel.type === "job") {
      setJobs((p) => p.filter((j) => j.id !== sel.id));
      setLineageConnections((p) => p.filter((c) => c.sourceId !== sel.id && c.targetId !== sel.id));
    } else if (sel.type === "funder") {
      setFunders((p) => p.filter((f) => f.id !== sel.id));
    } else if (sel.type === "lineage_connection") {
      setLineageConnections((p) => p.filter((c) => c.id !== sel.id));
    }
    setSel(null);
  };

  const addDataset = () => {
    saveSnapshot();
    const d = {
      id: uid(), name: "New Dataset",
      x: canvasW / 2 - DATASET_STYLE.defaultW / 2, y: canvasH / 2 - DATASET_STYLE.defaultH / 2,
      width: DATASET_STYLE.defaultW, height: DATASET_STYLE.defaultH,
      datasetType: "extract", sourceCategory: "na",
      namespace: "", updateFrequency: "", sourceSystemId: null, description: "", attributes: {},
    };
    setDatasets((p) => [...p, d]);
    setSel({ type: "dataset", id: d.id });
  };

  const addJob = () => {
    saveSnapshot();
    const j = {
      id: uid(), name: "New Job",
      x: canvasW / 2 - JOB_STYLE.defaultW / 2, y: canvasH / 2 - JOB_STYLE.defaultH / 2,
      width: JOB_STYLE.defaultW, height: JOB_STYLE.defaultH,
      jobType: "manual_export", responsiblePerson: "", frequency: "", automated: false, description: "", attributes: {},
    };
    setJobs((p) => [...p, j]);
    setSel({ type: "job", id: j.id });
  };

  const addFunder = () => {
    saveSnapshot();
    const f = {
      id: uid(), name: "New Funder",
      x: canvasW / 2 - FUNDER_STYLE.defaultW / 2, y: canvasH / 2 - FUNDER_STYLE.defaultH / 2,
      width: FUNDER_STYLE.defaultW, height: FUNDER_STYLE.defaultH,
      programName: "", contact: "", reportingFrequency: "", notes: "",
    };
    setFunders((p) => [...p, f]);
    setSel({ type: "funder", id: f.id });
  };

  const autoLayoutLineage = useCallback(() => {
    saveSnapshot();
    const result = autoLayout(datasets, jobs, lineageConnections, lineageColBounds, canvasH);
    setDatasets(result.datasets);
    setJobs(result.jobs);
  }, [datasets, jobs, lineageConnections, lineageColBounds, canvasH, saveSnapshot]);

  // ── Mouse interaction ──
  const onMouseDown = useCallback(
    (e) => {
      const pt = svgCoords(e);
      const target = e.target;
      const role = target.getAttribute("data-role");
      const eid = target.getAttribute("data-id");

      if (role === "port") {
        e.stopPropagation();
        interRef.current = { mode: "connecting", sourceId: eid, startPt: pt, currentPt: pt, snapshot: latestStateRef.current };
        setInterRender((r) => r + 1);
        return;
      }
      if (role === "resize") {
        e.stopPropagation();
        const corner = target.getAttribute("data-corner");
        const rtype = target.getAttribute("data-type");
        if (rtype === "system") {
          const s = systems.find((x) => x.id === eid);
          if (s) interRef.current = { mode: "resizing", rtype, id: eid, corner, origRect: { ...s }, startPt: pt, snapshot: latestStateRef.current };
        } else if (rtype === "dataset") {
          const d = datasets.find((x) => x.id === eid);
          if (d) interRef.current = { mode: "resizing", rtype, id: eid, corner, origRect: { ...d }, startPt: pt, snapshot: latestStateRef.current };
        } else if (rtype === "job") {
          const j = jobs.find((x) => x.id === eid);
          if (j) interRef.current = { mode: "resizing", rtype, id: eid, corner, origRect: { ...j }, startPt: pt, snapshot: latestStateRef.current };
        } else if (rtype === "funder") {
          const f = funders.find((x) => x.id === eid);
          if (f) interRef.current = { mode: "resizing", rtype, id: eid, corner, origRect: { ...f }, startPt: pt, snapshot: latestStateRef.current };
        } else {
          const v = vendors.find((x) => x.id === eid);
          if (v) interRef.current = { mode: "resizing", rtype, id: eid, corner, origRect: { ...v }, startPt: pt, snapshot: latestStateRef.current };
        }
        return;
      }
      if (role === "system") {
        e.stopPropagation();
        setSel({ type: "system", id: eid });
        const s = systems.find((x) => x.id === eid);
        if (s) interRef.current = { mode: "dragging", type: "system", id: eid, offset: { x: pt.x - s.x, y: pt.y - s.y }, snapshot: latestStateRef.current };
        return;
      }
      if (role === "vendor") {
        e.stopPropagation();
        setSel({ type: "vendor", id: eid });
        const v = vendors.find((x) => x.id === eid);
        if (v) interRef.current = { mode: "dragging", type: "vendor", id: eid, offset: { x: pt.x - v.x, y: pt.y - v.y }, snapshot: latestStateRef.current };
        return;
      }
      if (role === "dataset") {
        e.stopPropagation();
        setSel({ type: "dataset", id: eid });
        const d = datasets.find((x) => x.id === eid);
        if (d) interRef.current = { mode: "dragging", type: "dataset", id: eid, offset: { x: pt.x - d.x, y: pt.y - d.y }, snapshot: latestStateRef.current };
        return;
      }
      if (role === "job") {
        e.stopPropagation();
        setSel({ type: "job", id: eid });
        const j = jobs.find((x) => x.id === eid);
        if (j) interRef.current = { mode: "dragging", type: "job", id: eid, offset: { x: pt.x - j.x, y: pt.y - j.y }, snapshot: latestStateRef.current };
        return;
      }
      if (role === "funder") {
        e.stopPropagation();
        setSel({ type: "funder", id: eid });
        const f = funders.find((x) => x.id === eid);
        if (f) interRef.current = { mode: "dragging", type: "funder", id: eid, offset: { x: pt.x - f.x, y: pt.y - f.y }, snapshot: latestStateRef.current };
        return;
      }
      if (role === "lineage-port") {
        e.stopPropagation();
        interRef.current = { mode: "lineage-connecting", sourceId: eid, sourceType: target.getAttribute("data-node-type"), startPt: pt, currentPt: pt, snapshot: latestStateRef.current };
        setInterRender((r) => r + 1);
        return;
      }
      if (role === "connection") {
        e.stopPropagation();
        setSel({ type: "connection", id: eid });
        return;
      }
      if (role === "lineage-connection") {
        e.stopPropagation();
        setSel({ type: "lineage_connection", id: eid });
        return;
      }
      if (role === "col-resize") {
        e.stopPropagation();
        interRef.current = { mode: "col-resize", ci: parseInt(target.getAttribute("data-ci")), startX: pt.x, origWidths: [...colWidths], snapshot: latestStateRef.current };
        return;
      }
      if (role === "lineage-col-resize") {
        e.stopPropagation();
        interRef.current = { mode: "lineage-col-resize", ci: parseInt(target.getAttribute("data-ci")), startX: pt.x, origWidths: [...lineageColWidths], snapshot: latestStateRef.current };
        return;
      }
      setSel(null);
    },
    [svgCoords, systems, vendors, datasets, jobs, funders, colWidths, lineageColWidths]
  );

  const onMouseMove = useCallback(
    (e) => {
      const inter = interRef.current;
      if (inter.mode === "idle") return;
      const pt = svgCoords(e);

      if (inter.mode === "dragging" && inter.type === "system") {
        inter.moved = true;
        setSystems((ss) =>
          ss.map((s) => s.id === inter.id
            ? { ...s, x: Math.max(0, Math.min(canvasW - s.width, pt.x - inter.offset.x)), y: Math.max(HEADER_H, Math.min(canvasH - s.height, pt.y - inter.offset.y)) }
            : s)
        );
      } else if (inter.mode === "dragging" && inter.type === "vendor") {
        inter.moved = true;
        setVendors((vs) =>
          vs.map((v) => v.id === inter.id
            ? { ...v, x: Math.max(0, Math.min(canvasW - v.width, pt.x - inter.offset.x)), y: Math.max(HEADER_H, Math.min(canvasH - v.height, pt.y - inter.offset.y)) }
            : v)
        );
      } else if (inter.mode === "dragging" && inter.type === "dataset") {
        inter.moved = true;
        setDatasets((ds) =>
          ds.map((d) => d.id === inter.id
            ? { ...d, x: Math.max(0, Math.min(canvasW - d.width, pt.x - inter.offset.x)), y: Math.max(HEADER_H, Math.min(canvasH - d.height, pt.y - inter.offset.y)) }
            : d)
        );
      } else if (inter.mode === "dragging" && inter.type === "job") {
        inter.moved = true;
        setJobs((js) =>
          js.map((j) => j.id === inter.id
            ? { ...j, x: Math.max(0, Math.min(canvasW - j.width, pt.x - inter.offset.x)), y: Math.max(HEADER_H, Math.min(canvasH - j.height, pt.y - inter.offset.y)) }
            : j)
        );
      } else if (inter.mode === "dragging" && inter.type === "funder") {
        inter.moved = true;
        setFunders((fs) =>
          fs.map((f) => f.id === inter.id
            ? { ...f, x: Math.max(0, Math.min(canvasW - f.width, pt.x - inter.offset.x)), y: Math.max(HEADER_H, Math.min(canvasH - f.height, pt.y - inter.offset.y)) }
            : f)
        );
      } else if (inter.mode === "resizing") {
        inter.moved = true;
        const { id, corner, origRect, startPt, rtype } = inter;
        const dx = pt.x - startPt.x;
        const dy = pt.y - startPt.y;
        const applyResize = (rect, minW, minH) => {
          let { x, y, width, height } = rect;
          if (corner.includes("r")) width = Math.max(minW, width + dx);
          if (corner.includes("l")) { x += dx; width = Math.max(minW, width - dx); }
          if (corner.includes("b")) height = Math.max(minH, height + dy);
          if (corner.includes("t")) { y = Math.max(HEADER_H, y + dy); height = Math.max(minH, height - dy); }
          return { x, y, width, height };
        };
        if (rtype === "system") {
          setSystems((ss) => ss.map((s) => s.id !== id ? s : { ...s, ...applyResize(origRect, 60, 30) }));
        } else if (rtype === "dataset") {
          setDatasets((ds) => ds.map((d) => d.id !== id ? d : { ...d, ...applyResize(origRect, 60, 30) }));
        } else if (rtype === "job") {
          setJobs((js) => js.map((j) => j.id !== id ? j : { ...j, ...applyResize(origRect, 60, 30) }));
        } else if (rtype === "funder") {
          setFunders((fs) => fs.map((f) => f.id !== id ? f : { ...f, ...applyResize(origRect, 80, 60) }));
        } else {
          setVendors((vs) => vs.map((v) => v.id !== id ? v : { ...v, ...applyResize(origRect, 80, 60) }));
        }
      } else if (inter.mode === "connecting" || inter.mode === "lineage-connecting") {
        inter.currentPt = pt;
        setInterRender((r) => r + 1);
      } else if (inter.mode === "col-resize") {
        inter.moved = true;
        const dx = pt.x - inter.startX;
        const ci = inter.ci;
        const nL = inter.origWidths[ci] + dx;
        const nR = inter.origWidths[ci + 1] - dx;
        if (nL >= MIN_COL_W && nR >= MIN_COL_W) {
          const nw = [...inter.origWidths];
          nw[ci] = Math.round(nL);
          nw[ci + 1] = Math.round(nR);
          setColWidths(nw);
        }
      } else if (inter.mode === "lineage-col-resize") {
        inter.moved = true;
        const dx = pt.x - inter.startX;
        const ci = inter.ci;
        const nL = inter.origWidths[ci] + dx;
        const nR = inter.origWidths[ci + 1] - dx;
        if (nL >= MIN_COL_W && nR >= MIN_COL_W) {
          const nw = [...inter.origWidths];
          nw[ci] = Math.round(nL);
          nw[ci + 1] = Math.round(nR);
          setLineageColWidths(nw);
        }
      }
    },
    [svgCoords, canvasW, canvasH]
  );

  const onMouseUp = useCallback(
    (e) => {
      const inter = interRef.current;
      if (inter.mode === "idle") return; // Don't do anything on simple clicks

      if (inter.mode === "connecting") {
        const pt = svgCoords(e);
        const tgt = systems.find(
          (s) => s.id !== inter.sourceId && pt.x >= s.x && pt.x <= s.x + s.width && pt.y >= s.y && pt.y <= s.y + s.height
        );
        if (tgt) {
          saveSnapshot(inter.snapshot);
          const c = { id: uid(), sourceId: inter.sourceId, targetId: tgt.id, bidirectional: false, dataStandardized: true, managementType: "vendor", status: "in_use", label: "", vendorName: "", description: "", attributes: {} };
          setConnections((p) => [...p, c]);
          setSel({ type: "connection", id: c.id });
        }
      } else if (inter.mode === "lineage-connecting") {
        const pt = svgCoords(e);
        const allNodes = [
          ...datasets.map((d) => ({ ...d, nodeType: "dataset" })),
          ...jobs.map((j) => ({ ...j, nodeType: "job" })),
        ];
        const tgt = allNodes.find(
          (n) => n.id !== inter.sourceId && pt.x >= n.x && pt.x <= n.x + n.width && pt.y >= n.y && pt.y <= n.y + n.height
        );
        if (tgt) {
          saveSnapshot(inter.snapshot);
          const c = { id: uid(), sourceId: inter.sourceId, targetId: tgt.id, description: "" };
          setLineageConnections((p) => [...p, c]);
          setSel({ type: "lineage_connection", id: c.id });
        }
      } else if (inter.moved && inter.snapshot) {
        saveSnapshot(inter.snapshot);
      }
      interRef.current = { mode: "idle" };
      setInterRender((r) => r + 1);
    },
    [svgCoords, systems, datasets, jobs, saveSnapshot]
  );

  useEffect(() => {
    const up = (e) => onMouseUp(e);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [onMouseUp]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // ── Export/Import handlers ──
  const doExport = () => {
    const data = buildExport({ enrichedSystems, vendors, connections, datasets, jobs, funders, lineageConnections, agencyName, docVersion, docDate, paperSize, colWidths, lineageColWidths });
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, (agencyName || "transit_stack").replace(/\s+/g, "_") + ".json", "application/json");
  };

  const doExportSvg = () => {
    if (!svgRef.current) return;
    const src = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svgRef.current);
    downloadFile(src, (agencyName || "transit_stack").replace(/\s+/g, "_") + ".svg", "image/svg+xml");
  };

  const doImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        applyImportedState(parseImport(JSON.parse(ev.target.result)));
      } catch (err) {
        alert("Parse error: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Google Sheets handlers ──
  const applyImportedState = (state) => {
    setAgencyName(state.agencyName);
    setDocVersion(state.docVersion);
    setDocDate(state.docDate);
    setPaperSize(state.paperSize);
    setColWidths(state.colWidths);
    setLineageColWidths(state.lineageColWidths);
    setVendors(state.vendors);
    setSystems(state.systems);
    setConnections(state.connections);
    setDatasets(state.datasets || []);
    setJobs(state.jobs || []);
    setFunders(state.funders || []);
    setLineageConnections(state.lineageConnections || []);
    setSel(null);
    historyRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  };

  const connectGoogle = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setGError("Set VITE_GOOGLE_CLIENT_ID in .env.local to enable Sheets");
      return;
    }
    setGStatus("connecting");
    setGError("");
    try {
      await initTokenClient(clientId, (response) => {
        if (response.error) {
          setGStatus("idle");
          setGError(response.error_description || response.error);
          return;
        }
        setGToken(response.access_token);
        setGStatus("idle");
      });
      requestAccessToken();
    } catch (e) {
      setGStatus("idle");
      setGError(e.message);
    }
  };

  const handleSheetUrlChange = (val) => {
    setSheetUrl(val);
    storeSheetId(val);
  };

  const saveToSheet = async () => {
    const id = parseSheetId(sheetUrl);
    if (!gToken || !id) return;
    setGStatus("saving");
    setGError("");
    try {
      const data = buildExport({ enrichedSystems, vendors, connections, datasets, jobs, funders, lineageConnections, agencyName, docVersion, docDate, paperSize, colWidths, lineageColWidths });
      await writeCell(gToken, id, "A1", JSON.stringify(data));
      setGStatus("idle");
    } catch (e) {
      setGStatus("idle");
      if (e.message === "AUTH_EXPIRED") { setGToken(null); setGError("Session expired — reconnect to save"); }
      else setGError(e.message);
    }
  };

  const loadFromSheet = async () => {
    const id = parseSheetId(sheetUrl);
    if (!gToken || !id) return;
    setGStatus("loading");
    setGError("");
    try {
      const jsonStr = await readCell(gToken, id, "A1");
      if (!jsonStr) throw new Error("Cell A1 is empty");
      applyImportedState(parseImport(JSON.parse(jsonStr)));
      setGStatus("idle");
    } catch (e) {
      setGStatus("idle");
      if (e.message === "AUTH_EXPIRED") { setGToken(null); setGError("Session expired — reconnect to load"); }
      else setGError(e.message);
    }
  };

  const switchView = (view) => {
    setSel(null);
    setActiveView(view);
  };

  // ── Render ──
  if (!loaded) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;

  const inter = interRef.current;
  const withSnapshot = (setter) => (val) => { saveSnapshot(); setter(val); };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* ── TOOLBAR ── */}
      <div className="print:hidden bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-wrap">
        <span className="font-bold text-sm text-gray-800 mr-1">Transit Stack</span>
        <input
          id="field-agency-name"
          className="border-b border-gray-300 bg-transparent px-1 py-0.5 text-xs focus:outline-none focus:border-gray-600 text-gray-700 w-36 placeholder-gray-300"
          placeholder="Agency name…"
          value={agencyName}
          onChange={(e) => setAgencyName(e.target.value)}
        />
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <label htmlFor="field-doc-version" className="flex items-center gap-1 text-xs text-gray-500">
          v
          <input
            id="field-doc-version"
            className="border-b border-gray-300 bg-transparent px-0.5 py-0.5 text-xs w-10 focus:outline-none text-gray-700"
            value={docVersion}
            onChange={(e) => setDocVersion(e.target.value)}
          />
        </label>
        <input
          id="field-doc-date"
          type="date"
          className="border-b border-gray-300 bg-transparent px-0.5 py-0.5 text-xs focus:outline-none text-gray-700"
          value={docDate}
          onChange={(e) => setDocDate(e.target.value)}
        />
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <div className="flex border border-gray-300 rounded overflow-hidden text-xs">
          <button onClick={() => switchView("systems")} className={`px-3 py-1.5 font-medium ${activeView === "systems" ? "bg-gray-800 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Systems</button>
          <button onClick={() => switchView("lineage")} className={`px-3 py-1.5 font-medium ${activeView === "lineage" ? "bg-gray-800 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Lineage</button>
        </div>
        {activeView === "systems" ? (
          <>
            <button onClick={addVendor} className={btnPrimary}>+ Vendor</button>
            <button onClick={addSystem} className={btnPrimary}>+ System</button>
          </>
        ) : (
          <>
            <button onClick={addFunder} className={btnPrimary}>+ Funder</button>
            <button onClick={addDataset} className={btnPrimary}>+ Dataset</button>
            <button onClick={addJob} className={btnPrimary}>+ Job</button>
            <button onClick={autoLayoutLineage} className={btnSecondary}>Auto-layout</button>
          </>
        )}
        {sel && (
          <button onClick={deleteSelected} className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded hover:bg-red-100 border border-red-200">
            Delete
          </button>
        )}
        <button onClick={undo} disabled={!canUndo} className={btnSecondary} style={!canUndo ? { opacity: 0.4 } : {}}>Undo</button>
        <button onClick={redo} disabled={!canRedo} className={btnSecondary} style={!canRedo ? { opacity: 0.4 } : {}}>Redo</button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button onClick={doExport} className={btnSecondary}>Export JSON</button>
        <button onClick={doExportSvg} className={btnSecondary}>Export SVG</button>
        <input ref={fileRef} type="file" accept=".json" onChange={doImport} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className={btnSecondary}>Import</button>
        <button onClick={() => setShowSettings((p) => !p)} className={btnSecondary}>
          {showSettings ? "Hide" : "Canvas"}
        </button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        {!gToken ? (
          <button
            onClick={connectGoogle}
            disabled={gStatus === "connecting"}
            className={btnSecondary}
            style={gStatus === "connecting" ? { opacity: 0.6 } : {}}
          >
            {gStatus === "connecting" ? "Connecting…" : "Sheets"}
          </button>
        ) : (
          <>
            <input
              type="text"
              className="border-b border-gray-300 bg-transparent px-1 py-0.5 text-xs focus:outline-none text-gray-700 w-44 placeholder-gray-300"
              placeholder="Sheet URL or ID…"
              value={sheetUrl}
              onChange={(e) => handleSheetUrlChange(e.target.value)}
            />
            <button
              onClick={loadFromSheet}
              disabled={!sheetUrl.trim() || gStatus === "loading"}
              className={btnSecondary}
              style={!sheetUrl.trim() || gStatus === "loading" ? { opacity: 0.4 } : {}}
            >
              {gStatus === "loading" ? "Loading…" : "Load"}
            </button>
            <button
              onClick={saveToSheet}
              disabled={!sheetUrl.trim() || gStatus === "saving"}
              className={btnSecondary}
              style={!sheetUrl.trim() || gStatus === "saving" ? { opacity: 0.4 } : {}}
            >
              {gStatus === "saving" ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => { setGToken(null); setGError(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 px-1"
              title="Disconnect Google"
            >
              ×
            </button>
          </>
        )}
        {gError && <span className="text-xs text-red-500 max-w-xs truncate" title={gError}>{gError}</span>}
      </div>

      {/* ── SETTINGS BAR ── */}
      {showSettings && (
        <div className="print:hidden bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-4 flex-wrap text-xs">
          <label htmlFor="field-paper-size" className="flex items-center gap-1 font-medium text-gray-600">
            Paper:
            <select
              id="field-paper-size"
              className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white"
              value={paperSize}
              onChange={(e) => changePaperSize(e.target.value)}
            >
              {Object.entries(PAPER_SIZES).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </label>
          <span className="text-gray-400">|</span>
          <span className="text-gray-500 font-medium">Column widths:</span>
          {activeView === "systems" ? (
            <>
              {CATEGORIES.map((cat, i) => (
                <label key={cat.id} htmlFor={`field-col-width-${cat.id}`} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm" style={{ background: cat.hdr }} />
                  <span className="text-gray-500">{cat.label.split(" ")[0]}:</span>
                  <input
                    id={`field-col-width-${cat.id}`}
                    type="number"
                    className="border border-gray-300 rounded px-1 py-0.5 w-14 text-xs"
                    value={colWidths[i]}
                    onChange={(e) => adjustColWidth(i, +e.target.value || MIN_COL_W)}
                  />
                </label>
              ))}
              <span className="text-gray-400 ml-1">= {colWidths.reduce((a, b) => a + b, 0)}px</span>
            </>
          ) : (
            <>
              {LINEAGE_COLUMNS.map((col, i) => (
                <label key={col.id} htmlFor={`field-lcol-width-${col.id}`} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm" style={{ background: col.hdr }} />
                  <span className="text-gray-500">{col.name.split(" ")[0]}:</span>
                  <input
                    id={`field-lcol-width-${col.id}`}
                    type="number"
                    className="border border-gray-300 rounded px-1 py-0.5 w-14 text-xs"
                    value={lineageColWidths[i]}
                    onChange={(e) => adjustLineageColWidth(i, +e.target.value || MIN_COL_W)}
                  />
                </label>
              ))}
              <span className="text-gray-400 ml-1">= {lineageColWidths.reduce((a, b) => a + b, 0)}px</span>
            </>
          )}
        </div>
      )}

      {/* ── MAIN AREA ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── SVG Canvas ── */}
        <div className="flex-1 overflow-auto bg-gray-200 cursor-default">
          <svg
            ref={svgRef}
            width="100%"
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
            style={{ fontFamily: FONT_FAMILY, display: "block", maxWidth: canvasW }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
          >
            <rect x={0} y={0} width={canvasW} height={canvasH} fill={CANVAS_BG} />

            {/* Arrow markers (shared) */}
            <defs>
              {Object.entries(STATUS).map(([k, st]) => (
                <marker key={"a-" + k} id={"a-" + k} viewBox="0 0 10 8" refX="10" refY="4" markerWidth="8" markerHeight="6" orient="auto">
                  <path d="M0,0 L10,4 L0,8 Z" fill={st.connColor} />
                </marker>
              ))}
              {Object.entries(STATUS).map(([k, st]) => (
                <marker key={"ar-" + k} id={"ar-" + k} viewBox="0 0 10 8" refX="0" refY="4" markerWidth="8" markerHeight="6" orient="auto">
                  <path d="M10,0 L0,4 L10,8 Z" fill={st.connColor} />
                </marker>
              ))}
              <marker id="lineage-arrow" viewBox="0 0 10 8" refX="10" refY="4" markerWidth="7" markerHeight="5" orient="auto">
                <path d="M0,0 L10,4 L0,8 Z" fill={LINEAGE_CONN_STYLE.stroke} />
              </marker>
              <marker id="lineage-arrow-sel" viewBox="0 0 10 8" refX="10" refY="4" markerWidth="7" markerHeight="5" orient="auto">
                <path d="M0,0 L10,4 L0,8 Z" fill={LINEAGE_CONN_STYLE.strokeSelected} />
              </marker>
            </defs>

            {activeView === "systems" ? (
              <SystemsCanvas
                canvasH={canvasH}
                colBounds={colBounds}
                colWidths={colWidths}
                enrichedSystems={enrichedSystems}
                vendors={vendors}
                connections={connections}
                sel={sel}
                hoveredSys={hoveredSys}
                setHoveredSys={setHoveredSys}
                inter={inter}
              />
            ) : (
              <LineageCanvas
                canvasH={canvasH}
                lineageColBounds={lineageColBounds}
                lineageColWidths={lineageColWidths}
                datasets={datasets}
                jobs={jobs}
                funders={funders}
                lineageConnections={lineageConnections}
                sel={sel}
                hoveredSys={hoveredSys}
                setHoveredSys={setHoveredSys}
                inter={inter}
              />
            )}

            <Legend canvasW={canvasW} canvasH={canvasH} />

            {agencyName && (
              <text x={canvasW - 10} y={HEADER_H + 16} textAnchor="end" fontSize={FONT_SIZE.watermark * PT_TO_PX} fill="#999" style={{ pointerEvents: "none" }}>
                {agencyName} — v{docVersion} — {docDate}
              </text>
            )}
          </svg>
        </div>

        {/* ── Properties Panel ── */}
        <div className="print:hidden">
          <PropsPanel
            sel={sel}
            systems={enrichedSystems}
            vendors={vendors}
            connections={connections}
            datasets={datasets}
            jobs={jobs}
            funders={funders}
            lineageConnections={lineageConnections}
            setSystems={withSnapshot(setSystems)}
            setVendors={withSnapshot(setVendors)}
            setConnections={withSnapshot(setConnections)}
            setDatasets={withSnapshot(setDatasets)}
            setJobs={withSnapshot(setJobs)}
            setFunders={withSnapshot(setFunders)}
            setLineageConnections={withSnapshot(setLineageConnections)}
            onDeselect={() => setSel(null)}
          />
        </div>
      </div>
    </div>
  );
}
