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
  STATUS,
  MGMT,
  PAPER_SIZES,
  DEFAULT_PAPER,
  HEADER_H,
  MIN_COL_W,
  SYS_W,
  SYS_H,
  SYS_RX,
  SYS_BORDER,
  FONT_SIZE,
  PT_TO_PX,
  VENDOR_STYLE,
  CONN_THICKNESS,
  CONN_LABEL_STYLE,
  CONN_VENDOR_STYLE,
  PORT_COLOR,
  CANVAS_BG,
  FONT_FAMILY,
  defaultColWidths,
} from "./constants";
import { edgePt, rectContains, portPositions } from "./utils/geometry";
import { load, save } from "./utils/storage";
import {
  uid,
  buildExport,
  parseImport,
  downloadFile,
} from "./utils/exportImport";
import PropsPanel from "./components/PropsPanel";
import Legend from "./components/Legend";
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
  const [sel, setSel] = useState(null); // { type: "system"|"vendor"|"connection", id }
  const [showSettings, setShowSettings] = useState(false);
  const [hoveredSys, setHoveredSys] = useState(null);

  // Interaction ref (not in React state — mutated during mousemove)
  const interRef = useRef({ mode: "idle" });
  const [interRender, setInterRender] = useState(0); // bump to force re-render during connecting

  const svgRef = useRef();
  const fileRef = useRef();

  // ── Derived values ──
  const paper = PAPER_SIZES[paperSize] || PAPER_SIZES[DEFAULT_PAPER];
  const canvasW = paper.w;
  const canvasH = paper.h;

  const colBounds = useMemo(() => {
    const b = [0];
    colWidths.forEach((w) => b.push(b[b.length - 1] + w));
    return b;
  }, [colWidths]);

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
      setColWidths(
        saved.colWidths ||
          defaultColWidths(
            (PAPER_SIZES[saved.paperSize || DEFAULT_PAPER] || PAPER_SIZES[DEFAULT_PAPER]).w
          )
      );
      setVendors(saved.vendors || []);
      setSystems(saved.systems || []);
      setConnections(saved.connections || []);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      save({ agencyName, docVersion, docDate, paperSize, colWidths, vendors, systems, connections });
    }
  }, [agencyName, docVersion, docDate, paperSize, colWidths, vendors, systems, connections, loaded]);

  useEffect(() => {
    let el = document.getElementById("transit-stack-page-style");
    if (!el) {
      el = document.createElement("style");
      el.id = "transit-stack-page-style";
      document.head.appendChild(el);
    }
    el.textContent = `@page { size: ${paper.printSize}; margin: 0.5in; } @media print { svg { width: ${paper.printW}in !important; height: ${paper.printH}in !important; } }`;
  }, [paper.printSize]);

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
        ss.map((s) => ({
          ...s,
          x: s.x * rx,
          y: Math.min(s.y * ry, newP.h - s.height),
        }))
      );
      setPaperSize(newKey);
    },
    [paperSize]
  );

  // ── Column width adjustment (zero-sum: steals from last column) ──
  const adjustColWidth = useCallback((ci, newW) => {
    setColWidths((prev) => {
      const clamped = Math.max(MIN_COL_W, Math.round(newW));
      const delta = clamped - prev[ci];
      const nw = [...prev];
      nw[ci] = clamped;
      const comp = ci === nw.length - 1 ? ci - 1 : nw.length - 1;
      nw[comp] = Math.max(MIN_COL_W, nw[comp] - delta);
      return nw;
    });
  }, []);

  // ── Add / delete items ──
  const addSystem = () => {
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
    if (sel.type === "system") {
      setSystems((p) => p.filter((s) => s.id !== sel.id));
      setConnections((p) => p.filter((c) => c.sourceId !== sel.id && c.targetId !== sel.id));
    } else if (sel.type === "vendor") {
      setVendors((p) => p.filter((v) => v.id !== sel.id));
    } else if (sel.type === "connection") {
      setConnections((p) => p.filter((c) => c.id !== sel.id));
    }
    setSel(null);
  };

  // ── Mouse interaction ──
  const onMouseDown = useCallback(
    (e) => {
      const pt = svgCoords(e);
      const target = e.target;
      const role = target.getAttribute("data-role");
      const eid = target.getAttribute("data-id");

      if (role === "port") {
        e.stopPropagation();
        interRef.current = { mode: "connecting", sourceId: eid, startPt: pt, currentPt: pt };
        setInterRender((r) => r + 1);
        return;
      }
      if (role === "resize") {
        e.stopPropagation();
        const corner = target.getAttribute("data-corner");
        const v = vendors.find((x) => x.id === eid);
        if (v) interRef.current = { mode: "resizing", id: eid, corner, origRect: { ...v }, startPt: pt };
        return;
      }
      if (role === "system") {
        e.stopPropagation();
        setSel({ type: "system", id: eid });
        const s = systems.find((x) => x.id === eid);
        if (s) interRef.current = { mode: "dragging", type: "system", id: eid, offset: { x: pt.x - s.x, y: pt.y - s.y } };
        return;
      }
      if (role === "vendor") {
        e.stopPropagation();
        setSel({ type: "vendor", id: eid });
        const v = vendors.find((x) => x.id === eid);
        if (v) interRef.current = { mode: "dragging", type: "vendor", id: eid, offset: { x: pt.x - v.x, y: pt.y - v.y } };
        return;
      }
      if (role === "connection") {
        e.stopPropagation();
        setSel({ type: "connection", id: eid });
        return;
      }
      if (role === "col-resize") {
        e.stopPropagation();
        interRef.current = { mode: "col-resize", ci: parseInt(target.getAttribute("data-ci")), startX: pt.x, origWidths: [...colWidths] };
        return;
      }
      setSel(null);
    },
    [svgCoords, systems, vendors, colWidths]
  );

  const onMouseMove = useCallback(
    (e) => {
      const inter = interRef.current;
      if (inter.mode === "idle") return;
      const pt = svgCoords(e);

      if (inter.mode === "dragging" && inter.type === "system") {
        setSystems((ss) =>
          ss.map((s) =>
            s.id === inter.id
              ? { ...s, x: Math.max(0, Math.min(canvasW - s.width, pt.x - inter.offset.x)), y: Math.max(HEADER_H, Math.min(canvasH - s.height, pt.y - inter.offset.y)) }
              : s
          )
        );
      } else if (inter.mode === "dragging" && inter.type === "vendor") {
        setVendors((vs) =>
          vs.map((v) =>
            v.id === inter.id
              ? { ...v, x: Math.max(0, Math.min(canvasW - v.width, pt.x - inter.offset.x)), y: Math.max(HEADER_H, Math.min(canvasH - v.height, pt.y - inter.offset.y)) }
              : v
          )
        );
      } else if (inter.mode === "resizing") {
        const { id, corner, origRect, startPt } = inter;
        const dx = pt.x - startPt.x;
        const dy = pt.y - startPt.y;
        setVendors((vs) =>
          vs.map((v) => {
            if (v.id !== id) return v;
            let { x, y, width, height } = origRect;
            if (corner.includes("r")) width = Math.max(80, width + dx);
            if (corner.includes("l")) { x += dx; width = Math.max(80, width - dx); }
            if (corner.includes("b")) height = Math.max(60, height + dy);
            if (corner.includes("t")) { y = Math.max(HEADER_H, y + dy); height = Math.max(60, height - dy); }
            return { ...v, x, y, width, height };
          })
        );
      } else if (inter.mode === "connecting") {
        inter.currentPt = pt;
        setInterRender((r) => r + 1);
      } else if (inter.mode === "col-resize") {
        const dx = pt.x - inter.startX;
        const ci = inter.ci;
        const nL = Math.max(MIN_COL_W, inter.origWidths[ci] + dx);
        const nR = Math.max(MIN_COL_W, inter.origWidths[ci + 1] - dx);
        if (nL >= MIN_COL_W && nR >= MIN_COL_W) {
          const nw = [...inter.origWidths];
          nw[ci] = Math.round(nL);
          nw[ci + 1] = Math.round(nR);
          setColWidths(nw);
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
          (s) =>
            s.id !== inter.sourceId &&
            pt.x >= s.x &&
            pt.x <= s.x + s.width &&
            pt.y >= s.y &&
            pt.y <= s.y + s.height
        );
        if (tgt) {
          const c = {
            id: uid(),
            sourceId: inter.sourceId,
            targetId: tgt.id,
            bidirectional: false,
            dataStandardized: true,
            managementType: "vendor",
            status: "in_use",
            label: "",
            vendorName: "",
            description: "",
            attributes: {},
          };
          setConnections((p) => [...p, c]);
          setSel({ type: "connection", id: c.id });
        }
      }
      interRef.current = { mode: "idle" };
      setInterRender((r) => r + 1);
    },
    [svgCoords, systems]
  );

  useEffect(() => {
    const up = (e) => onMouseUp(e);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [onMouseUp]);

  // ── Export/Import handlers ──
  const doExport = () => {
    const data = buildExport({ enrichedSystems, vendors, connections, agencyName, docVersion, docDate, paperSize, colWidths });
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
        const parsed = JSON.parse(ev.target.result);
        const state = parseImport(parsed);
        setAgencyName(state.agencyName);
        setDocVersion(state.docVersion);
        setDocDate(state.docDate);
        setPaperSize(state.paperSize);
        setColWidths(state.colWidths);
        setVendors(state.vendors);
        setSystems(state.systems);
        setConnections(state.connections);
        setSel(null);
      } catch (err) {
        alert("Parse error: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Render ──
  if (!loaded) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;

  const inter = interRef.current;

  // Derived connection annotation dimensions (font-size-aware)
  const labelFontPx  = FONT_SIZE.connectionLabel  * PT_TO_PX;
  const labelBoxH    = labelFontPx * CONN_LABEL_STYLE.lineHeight;
  const labelCharW   = labelFontPx * CONN_LABEL_STYLE.charWidthRatio;
  const vendorFontPx = FONT_SIZE.connectionVendor * PT_TO_PX;
  const vendorBoxH   = vendorFontPx * CONN_VENDOR_STYLE.lineHeight;
  const vendorCharW  = vendorFontPx * CONN_VENDOR_STYLE.charWidthRatio;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* ── TOOLBAR ── */}
      <div className="print:hidden bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-wrap">
        <span className="font-bold text-sm text-gray-800 mr-1">Transit Stack</span>
        <input
          className="border-b border-gray-300 bg-transparent px-1 py-0.5 text-xs focus:outline-none focus:border-gray-600 text-gray-700 w-36 placeholder-gray-300"
          placeholder="Agency name…"
          value={agencyName}
          onChange={(e) => setAgencyName(e.target.value)}
        />
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <label className="flex items-center gap-1 text-xs text-gray-500">
          v
          <input
            className="border-b border-gray-300 bg-transparent px-0.5 py-0.5 text-xs w-10 focus:outline-none text-gray-700"
            value={docVersion}
            onChange={(e) => setDocVersion(e.target.value)}
          />
        </label>
        <input
          type="date"
          className="border-b border-gray-300 bg-transparent px-0.5 py-0.5 text-xs focus:outline-none text-gray-700"
          value={docDate}
          onChange={(e) => setDocDate(e.target.value)}
        />
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button onClick={addVendor} className={btnPrimary}>+ Vendor</button>
        <button onClick={addSystem} className={btnPrimary}>+ System</button>
        {sel && (
          <button onClick={deleteSelected} className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded hover:bg-red-100 border border-red-200">
            Delete
          </button>
        )}
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button onClick={doExport} className={btnSecondary}>Export JSON</button>
        <button onClick={doExportSvg} className={btnSecondary}>Export SVG</button>
        <input ref={fileRef} type="file" accept=".json" onChange={doImport} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className={btnSecondary}>Import</button>
        <button onClick={() => setShowSettings((p) => !p)} className={btnSecondary}>
          {showSettings ? "Hide" : "Canvas"}
        </button>
      </div>

      {/* ── SETTINGS BAR ── */}
      {showSettings && (
        <div className="print:hidden bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-4 flex-wrap text-xs">
          <label className="flex items-center gap-1 font-medium text-gray-600">
            Paper:
            <select
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
          {CATEGORIES.map((cat, i) => (
            <label key={cat.id} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: cat.hdr }} />
              <span className="text-gray-500">{cat.name.split(" ")[0]}:</span>
              <input
                type="number"
                className="border border-gray-300 rounded px-1 py-0.5 w-14 text-xs"
                value={colWidths[i]}
                onChange={(e) => adjustColWidth(i, +e.target.value || MIN_COL_W)}
              />
            </label>
          ))}
          <span className="text-gray-400 ml-1">= {colWidths.reduce((a, b) => a + b, 0)}px</span>
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

            {/* Category columns */}
            {CATEGORIES.map((cat, i) => {
              const x0 = colBounds[i];
              const w = colWidths[i];
              return (
                <g key={cat.id}>
                  <rect x={x0} y={HEADER_H} width={w} height={canvasH - HEADER_H} fill={cat.bg} />
                  <rect x={x0} y={0} width={w} height={HEADER_H} fill={cat.hdr} />
                  <text x={x0 + w / 2} y={HEADER_H / 2} textAnchor="middle" dominantBaseline="central" fontSize={FONT_SIZE.categoryHeader * PT_TO_PX} fontWeight="700" fill="#fff" letterSpacing="0.4">
                    {cat.name.toUpperCase()}
                  </text>
                  {i < CATEGORIES.length - 1 && (
                    <rect data-role="col-resize" data-ci={i} x={x0 + w - 4} y={0} width={8} height={canvasH} fill="transparent" style={{ cursor: "col-resize" }} />
                  )}
                </g>
              );
            })}

            {colBounds.slice(1, -1).map((x, i) => (
              <line key={i} x1={x} y1={HEADER_H} x2={x} y2={canvasH} stroke="#00000010" strokeWidth={1} />
            ))}

            {/* Vendors */}
            {vendors.map((v) => {
              const isSel = sel?.type === "vendor" && sel.id === v.id;
              return (
                <g key={v.id}>
                  <rect data-role="vendor" data-id={v.id} x={v.x} y={v.y} width={v.width} height={v.height} rx={VENDOR_STYLE.rx} fill={VENDOR_STYLE.fill} stroke={isSel ? VENDOR_STYLE.strokeSelected : VENDOR_STYLE.stroke} strokeWidth={isSel ? VENDOR_STYLE.strokeWidthSelected : VENDOR_STYLE.strokeWidth} style={{ cursor: "move" }} />
                  <text x={v.x + 8} y={v.y + 14} fontSize={FONT_SIZE.vendorLabel * PT_TO_PX} fontWeight="600" fill="#555" style={{ pointerEvents: "none" }}>{v.name}</text>
                  {isSel &&
                    ["tl", "tr", "bl", "br"].map((corner) => {
                      const hx = corner.includes("l") ? v.x : v.x + v.width;
                      const hy = corner.includes("t") ? v.y : v.y + v.height;
                      return (
                        <rect key={corner} data-role="resize" data-id={v.id} data-corner={corner} x={hx - 5} y={hy - 5} width={10} height={10} rx={2} fill="white" stroke="#333" strokeWidth={1.5} style={{ cursor: corner === "tl" || corner === "br" ? "nwse-resize" : "nesw-resize" }} />
                      );
                    })}
                </g>
              );
            })}

            {/* Systems */}
            {enrichedSystems.map((s) => {
              const st = STATUS[s.status] || STATUS.in_use;
              const isSel = sel?.type === "system" && sel.id === s.id;
              const isHov = hoveredSys === s.id;
              const hasDesc = s.description && s.description.trim().length > 0;

              const bStyle = s.agencyManaged ? SYS_BORDER.agency : !s._vendorId ? SYS_BORDER.unspecified : SYS_BORDER.vendor;
              let bCol = isSel ? "#111" : bStyle.stroke;
              let bW = isSel ? 3 : bStyle.strokeWidth;

              return (
                <g key={s.id} onMouseEnter={() => setHoveredSys(s.id)} onMouseLeave={() => setHoveredSys(null)}>
                  <rect data-role="system" data-id={s.id} x={s.x} y={s.y} width={s.width} height={s.height} rx={SYS_RX} fill={st.fill} stroke={bCol} strokeWidth={bW} style={{ cursor: "move" }} />
                  <text x={s.x + s.width / 2} y={s.y + s.height / 2 - (hasDesc ? 5 : 0)} textAnchor="middle" dominantBaseline="central" fontSize={FONT_SIZE.systemName * PT_TO_PX} fontWeight="700" fill="#1a1a1a" style={{ pointerEvents: "none" }}>
                    {s.name.length > 20 ? s.name.slice(0, 19) + "…" : s.name}
                  </text>
                  {hasDesc && (
                    <text x={s.x + s.width / 2} y={s.y + s.height / 2 + 9} textAnchor="middle" dominantBaseline="central" fontSize={FONT_SIZE.systemDesc * PT_TO_PX} fill="#555" style={{ pointerEvents: "none" }}>
                      {s.description.length > 24 ? s.description.slice(0, 23) + "…" : s.description}
                    </text>
                  )}
                  {(isHov || isSel) &&
                    portPositions(s).map((p) => (
                      <circle key={p.side} data-role="port" data-id={s.id} cx={p.x} cy={p.y} r={5} fill="white" stroke={PORT_COLOR} strokeWidth={2} style={{ cursor: "crosshair" }} />
                    ))}
                </g>
              );
            })}

            {/* Arrow markers */}
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
            </defs>

            {/* Connections */}
            {connections.map((c, ci) => {
              const src = enrichedSystems.find((s) => s.id === c.sourceId);
              const tgt = enrichedSystems.find((s) => s.id === c.targetId);
              if (!src || !tgt) return null;

              const st = STATUS[c.status] || STATUS.in_use;
              const mgmt = MGMT[c.managementType] || MGMT.vendor;
              const thick = c.dataStandardized ? CONN_THICKNESS.standard : CONN_THICKNESS.nonStandard;
              const isSel = sel?.type === "connection" && sel.id === c.id;

              const srcC = { x: src.x + src.width / 2, y: src.y + src.height / 2 };
              const tgtC = { x: tgt.x + tgt.width / 2, y: tgt.y + tgt.height / 2 };
              const p1 = edgePt(src, tgtC.x, tgtC.y);
              const p2 = edgePt(tgt, srcC.x, srcC.y);

              // Offset parallel connections
              const pk = [c.sourceId, c.targetId].sort().join("-");
              const pi = connections.filter((cc) => [cc.sourceId, cc.targetId].sort().join("-") === pk).indexOf(c);
              const pDx = -(tgtC.y - srcC.y), pDy = tgtC.x - srcC.x;
              const pL = Math.sqrt(pDx * pDx + pDy * pDy) || 1;
              const off = (pi - 0.5) * 16;
              const oX = (pDx / pL) * off, oY = (pDy / pL) * off;

              const mx = (p1.x + p2.x) / 2 + oX;
              const my = (p1.y + p2.y) / 2 + oY;
              const d = `M${p1.x},${p1.y} Q${mx},${my} ${p2.x},${p2.y}`;
              const qx = (p1.x + 2 * mx + p2.x) / 4;
              const qy = (p1.y + 2 * my + p2.y) / 4;
              const q25x = (9 * p1.x + 6 * mx + p2.x) / 16;
              const q25y = (9 * p1.y + 6 * my + p2.y) / 16;

              return (
                <g key={c.id}>
                  <path d={d} fill="none" stroke="transparent" strokeWidth={12} data-role="connection" data-id={c.id} style={{ cursor: "pointer" }} />
                  <path d={d} fill="none" stroke={isSel ? "#111" : st.connColor} strokeWidth={thick} strokeDasharray={mgmt.dash} opacity={isSel ? 1 : 0.75} markerEnd={`url(#a-${c.status})`} markerStart={c.bidirectional ? `url(#ar-${c.status})` : undefined} style={{ pointerEvents: "none" }} />
                  {c.label && (() => {
                    const bw = c.label.length * labelCharW + CONN_LABEL_STYLE.paddingH * 2;
                    return (
                      <g style={{ pointerEvents: "none" }}>
                        <rect x={qx - bw / 2} y={qy - labelBoxH / 2} width={bw} height={labelBoxH} rx={CONN_LABEL_STYLE.rx} fill="white" stroke={st.connColor} strokeWidth={CONN_LABEL_STYLE.strokeWidth} opacity={CONN_LABEL_STYLE.opacity} />
                        <text x={qx} y={qy} textAnchor="middle" dominantBaseline="central" fontSize={labelFontPx} fontWeight={CONN_LABEL_STYLE.fontWeight} fill={st.connColor}>{c.label}</text>
                      </g>
                    );
                  })()}
                  {c.vendorName && (() => {
                    const name = c.vendorName.length > CONN_VENDOR_STYLE.maxChars ? c.vendorName.slice(0, CONN_VENDOR_STYLE.maxChars - 1) + "…" : c.vendorName;
                    const vw = ("via " + name).length * vendorCharW + CONN_VENDOR_STYLE.paddingH * 2;
                    return (
                      <g style={{ pointerEvents: "none" }}>
                        <rect x={q25x - vw / 2} y={q25y - vendorBoxH / 2} width={vw} height={vendorBoxH} rx={CONN_VENDOR_STYLE.rx} fill="white" stroke={st.connColor} strokeWidth={CONN_VENDOR_STYLE.strokeWidth} strokeDasharray={CONN_VENDOR_STYLE.strokeDash} opacity={CONN_VENDOR_STYLE.opacity} />
                        <text x={q25x} y={q25y} textAnchor="middle" dominantBaseline="central" fontSize={vendorFontPx} fill={CONN_VENDOR_STYLE.fill} fontStyle={CONN_VENDOR_STYLE.fontStyle}>via {name}</text>
                      </g>
                    );
                  })()}
                </g>
              );
            })}

            {/* Rubber band while connecting */}
            {inter.mode === "connecting" &&
              (() => {
                const src = systems.find((s) => s.id === inter.sourceId);
                if (!src) return null;
                const p1 = edgePt(src, inter.currentPt.x, inter.currentPt.y);
                return (
                  <line x1={p1.x} y1={p1.y} x2={inter.currentPt.x} y2={inter.currentPt.y} stroke={PORT_COLOR} strokeWidth={2} strokeDasharray="6,3" opacity={0.7} style={{ pointerEvents: "none" }} />
                );
              })()}

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
            setSystems={setSystems}
            setVendors={setVendors}
            setConnections={setConnections}
            onDeselect={() => setSel(null)}
          />
        </div>
      </div>
    </div>
  );
}
