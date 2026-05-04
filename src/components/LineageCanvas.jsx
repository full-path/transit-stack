import {
  LINEAGE_COLUMNS,
  HEADER_H,
  FONT_SIZE,
  PT_TO_PX,
  FUNDER_STYLE,
  DATASET_STYLE,
  JOB_STYLE,
  LINEAGE_CONN_STYLE,
  PORT_COLOR,
} from "../constants";
import { edgePt, portPositions } from "../utils/geometry";
import { wrapText } from "../utils/text";

export default function LineageCanvas({
  canvasH,
  lineageColBounds,
  lineageColWidths,
  datasets,
  jobs,
  funders,
  lineageConnections,
  sel,
  hoveredSys,
  setHoveredSys,
  inter,
}) {
  return (
    <>
      {/* Lineage columns */}
      {LINEAGE_COLUMNS.map((col, i) => {
        const x0 = lineageColBounds[i];
        const w = lineageColWidths[i];
        return (
          <g key={col.id}>
            <rect x={x0} y={HEADER_H} width={w} height={canvasH - HEADER_H} fill={col.bg} />
            <rect x={x0} y={0} width={w} height={HEADER_H} fill={col.hdr} />
            {(() => {
              const fontPx = FONT_SIZE.categoryHeader * PT_TO_PX;
              const lineH = fontPx * 1.1;
              const lines = wrapText(col.name.toUpperCase(), w - 8, fontPx);
              const startY = HEADER_H / 2 - (lines.length - 1) * lineH / 2;
              return (
                <text x={x0 + w / 2} textAnchor="middle" dominantBaseline="central" fontSize={fontPx} fontWeight="700" fill="#fff" letterSpacing="0.4">
                  {lines.map((line, li) => <tspan key={li} x={x0 + w / 2} y={startY + li * lineH}>{line}</tspan>)}
                </text>
              );
            })()}
            {i < LINEAGE_COLUMNS.length - 1 && (
              <rect data-role="lineage-col-resize" data-ci={i} x={x0 + w - 4} y={0} width={8} height={canvasH} fill="transparent" style={{ cursor: "col-resize" }} />
            )}
          </g>
        );
      })}
      {lineageColBounds.slice(1, -1).map((x, i) => (
        <line key={i} x1={x} y1={HEADER_H} x2={x} y2={canvasH} stroke="#00000010" strokeWidth={1} />
      ))}

      {/* Funder containers */}
      {funders.map((f) => {
        const isSel = sel?.type === "funder" && sel.id === f.id;
        return (
          <g key={f.id}>
            <rect data-role="funder" data-id={f.id} x={f.x} y={f.y} width={f.width} height={f.height} rx={FUNDER_STYLE.rx} fill={FUNDER_STYLE.fill} stroke={isSel ? FUNDER_STYLE.strokeSelected : FUNDER_STYLE.stroke} strokeWidth={isSel ? FUNDER_STYLE.strokeWidthSelected : FUNDER_STYLE.strokeWidth} style={{ cursor: "move" }} />
            <text x={f.x + FUNDER_STYLE.labelPaddingX} y={f.y + FONT_SIZE.funderLabel * PT_TO_PX + FUNDER_STYLE.labelPaddingTop} fontSize={FONT_SIZE.funderLabel * PT_TO_PX} fontWeight="600" fill="#6a1b9a" style={{ pointerEvents: "none" }}>{f.name}</text>
            {isSel && ["tl", "tr", "bl", "br"].map((corner) => {
              const hx = corner.includes("l") ? f.x : f.x + f.width;
              const hy = corner.includes("t") ? f.y : f.y + f.height;
              return <rect key={corner} data-role="resize" data-type="funder" data-id={f.id} data-corner={corner} x={hx - 5} y={hy - 5} width={10} height={10} rx={2} fill="white" stroke="#333" strokeWidth={1.5} style={{ cursor: corner === "tl" || corner === "br" ? "nwse-resize" : "nesw-resize" }} />;
            })}
          </g>
        );
      })}

      {/* Lineage connections */}
      {lineageConnections.map((c) => {
        const allNodes = [...datasets, ...jobs];
        const src = allNodes.find((n) => n.id === c.sourceId);
        const tgt = allNodes.find((n) => n.id === c.targetId);
        if (!src || !tgt) return null;
        const isSel = sel?.type === "lineage_connection" && sel.id === c.id;
        const srcC = { x: src.x + src.width / 2, y: src.y + src.height / 2 };
        const tgtC = { x: tgt.x + tgt.width / 2, y: tgt.y + tgt.height / 2 };
        const p1 = edgePt(src, tgtC.x, tgtC.y);
        const p2 = edgePt(tgt, srcC.x, srcC.y);
        const pk = [c.sourceId, c.targetId].sort().join("-");
        const pi = lineageConnections.filter((cc) => [cc.sourceId, cc.targetId].sort().join("-") === pk).indexOf(c);
        const pDx = -(tgtC.y - srcC.y), pDy = tgtC.x - srcC.x;
        const pL = Math.sqrt(pDx * pDx + pDy * pDy) || 1;
        const off = (pi - 0.5) * 14;
        const mx = (p1.x + p2.x) / 2 + (pDx / pL) * off;
        const my = (p1.y + p2.y) / 2 + (pDy / pL) * off;
        const d = `M${p1.x},${p1.y} Q${mx},${my} ${p2.x},${p2.y}`;
        const stroke = isSel ? LINEAGE_CONN_STYLE.strokeSelected : LINEAGE_CONN_STYLE.stroke;
        const strokeW = isSel ? LINEAGE_CONN_STYLE.strokeWidthSelected : LINEAGE_CONN_STYLE.strokeWidth;
        return (
          <g key={c.id}>
            <path d={d} fill="none" stroke="transparent" strokeWidth={12} data-role="lineage-connection" data-id={c.id} style={{ cursor: "pointer" }} />
            <path d={d} fill="none" stroke={stroke} strokeWidth={strokeW} strokeDasharray={LINEAGE_CONN_STYLE.dash} markerEnd={isSel ? "url(#lineage-arrow-sel)" : "url(#lineage-arrow)"} style={{ pointerEvents: "none" }} />
          </g>
        );
      })}

      {/* Dataset nodes */}
      {datasets.map((d) => {
        const isSel = sel?.type === "dataset" && sel.id === d.id;
        const isHov = hoveredSys === d.id;
        const fontPx = FONT_SIZE.datasetName * PT_TO_PX;
        return (
          <g key={d.id} onMouseEnter={() => setHoveredSys(d.id)} onMouseLeave={() => setHoveredSys(null)}>
            <rect data-role="dataset" data-id={d.id} x={d.x} y={d.y} width={d.width} height={d.height} rx={DATASET_STYLE.rx} fill={DATASET_STYLE.fill} stroke={isSel ? DATASET_STYLE.strokeSelected : DATASET_STYLE.stroke} strokeWidth={isSel ? DATASET_STYLE.strokeWidthSelected : DATASET_STYLE.strokeWidth} style={{ cursor: "move" }} />
            <text x={d.x + d.width / 2} y={d.y + d.height / 2} textAnchor="middle" dominantBaseline="central" fontSize={fontPx} fontWeight="600" fill="#1565c0" style={{ pointerEvents: "none" }}>
              {d.name.length > 18 ? d.name.slice(0, 17) + "…" : d.name}
            </text>
            {(isHov || isSel) && portPositions(d).map((p) => (
              <circle key={p.side} data-role="lineage-port" data-id={d.id} data-node-type="dataset" cx={p.x} cy={p.y} r={5} fill="white" stroke={PORT_COLOR} strokeWidth={2} style={{ cursor: "crosshair" }} />
            ))}
            {isSel && ["tl", "tr", "bl", "br"].map((corner) => {
              const hx = corner.includes("l") ? d.x : d.x + d.width;
              const hy = corner.includes("t") ? d.y : d.y + d.height;
              return <rect key={corner} data-role="resize" data-type="dataset" data-id={d.id} data-corner={corner} x={hx - 5} y={hy - 5} width={10} height={10} rx={2} fill="white" stroke="#333" strokeWidth={1.5} style={{ cursor: corner === "tl" || corner === "br" ? "nwse-resize" : "nesw-resize" }} />;
            })}
          </g>
        );
      })}

      {/* Job nodes */}
      {jobs.map((j) => {
        const isSel = sel?.type === "job" && sel.id === j.id;
        const isHov = hoveredSys === j.id;
        const fontPx = FONT_SIZE.jobName * PT_TO_PX;
        return (
          <g key={j.id} onMouseEnter={() => setHoveredSys(j.id)} onMouseLeave={() => setHoveredSys(null)}>
            <rect data-role="job" data-id={j.id} x={j.x} y={j.y} width={j.width} height={j.height} rx={JOB_STYLE.rx} fill={JOB_STYLE.fill} stroke={isSel ? JOB_STYLE.strokeSelected : JOB_STYLE.stroke} strokeWidth={isSel ? JOB_STYLE.strokeWidthSelected : JOB_STYLE.strokeWidth} style={{ cursor: "move" }} />
            <text x={j.x + j.width / 2} y={j.y + j.height / 2} textAnchor="middle" dominantBaseline="central" fontSize={fontPx} fontWeight="600" fill="#bf360c" style={{ pointerEvents: "none" }}>
              {j.name.length > 18 ? j.name.slice(0, 17) + "…" : j.name}
            </text>
            {(isHov || isSel) && portPositions(j).map((p) => (
              <circle key={p.side} data-role="lineage-port" data-id={j.id} data-node-type="job" cx={p.x} cy={p.y} r={5} fill="white" stroke={PORT_COLOR} strokeWidth={2} style={{ cursor: "crosshair" }} />
            ))}
            {isSel && ["tl", "tr", "bl", "br"].map((corner) => {
              const hx = corner.includes("l") ? j.x : j.x + j.width;
              const hy = corner.includes("t") ? j.y : j.y + j.height;
              return <rect key={corner} data-role="resize" data-type="job" data-id={j.id} data-corner={corner} x={hx - 5} y={hy - 5} width={10} height={10} rx={2} fill="white" stroke="#333" strokeWidth={1.5} style={{ cursor: corner === "tl" || corner === "br" ? "nwse-resize" : "nesw-resize" }} />;
            })}
          </g>
        );
      })}

      {/* Rubber band while lineage-connecting */}
      {inter.mode === "lineage-connecting" && (() => {
        const allNodes = [...datasets, ...jobs];
        const src = allNodes.find((n) => n.id === inter.sourceId);
        if (!src) return null;
        const p1 = edgePt(src, inter.currentPt.x, inter.currentPt.y);
        return <line x1={p1.x} y1={p1.y} x2={inter.currentPt.x} y2={inter.currentPt.y} stroke={PORT_COLOR} strokeWidth={2} strokeDasharray="6,3" opacity={0.7} style={{ pointerEvents: "none" }} />;
      })()}
    </>
  );
}
