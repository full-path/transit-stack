import {
  CATEGORIES,
  STATUS,
  MGMT,
  HEADER_H,
  SYS_RX,
  SYS_BORDER,
  FONT_SIZE,
  PT_TO_PX,
  VENDOR_STYLE,
  CONN_THICKNESS,
  CONN_LABEL_STYLE,
  CONN_VENDOR_STYLE,
  PORT_COLOR,
} from "../constants";
import { edgePt, portPositions } from "../utils/geometry";
import { wrapText } from "../utils/text";

export default function SystemsCanvas({
  canvasH,
  colBounds,
  colWidths,
  enrichedSystems,
  vendors,
  connections,
  sel,
  hoveredSys,
  setHoveredSys,
  inter,
}) {
  const labelFontPx  = FONT_SIZE.connectionLabel  * PT_TO_PX;
  const labelBoxH    = labelFontPx * CONN_LABEL_STYLE.lineHeight;
  const labelCharW   = labelFontPx * CONN_LABEL_STYLE.charWidthRatio;
  const vendorFontPx = FONT_SIZE.connectionVendor * PT_TO_PX;
  const vendorBoxH   = vendorFontPx * CONN_VENDOR_STYLE.lineHeight;
  const vendorCharW  = vendorFontPx * CONN_VENDOR_STYLE.charWidthRatio;

  return (
    <>
      {/* Category columns */}
      {CATEGORIES.map((cat, i) => {
        const x0 = colBounds[i];
        const w = colWidths[i];
        return (
          <g key={cat.id}>
            <rect x={x0} y={HEADER_H} width={w} height={canvasH - HEADER_H} fill={cat.bg} />
            <rect x={x0} y={0} width={w} height={HEADER_H} fill={cat.hdr} />
            {(() => {
              const fontPx = FONT_SIZE.categoryHeader * PT_TO_PX;
              const lineH = fontPx * 1.1;
              const lines = wrapText(cat.label.toUpperCase(), w - 8, fontPx);
              const startY = HEADER_H / 2 - (lines.length - 1) * lineH / 2;
              return (
                <text x={x0 + w / 2} textAnchor="middle" dominantBaseline="central" fontSize={fontPx} fontWeight="700" fill="#fff" letterSpacing="0.4">
                  {lines.map((line, li) => (
                    <tspan key={li} x={x0 + w / 2} y={startY + li * lineH}>{line}</tspan>
                  ))}
                </text>
              );
            })()}
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
            <text x={v.x + VENDOR_STYLE.labelPaddingX} y={v.y + FONT_SIZE.vendorLabel * PT_TO_PX + VENDOR_STYLE.labelPaddingTop} fontSize={FONT_SIZE.vendorLabel * PT_TO_PX} fontWeight="600" fill="#555" style={{ pointerEvents: "none" }}>{v.name}</text>
            {isSel && ["tl", "tr", "bl", "br"].map((corner) => {
              const hx = corner.includes("l") ? v.x : v.x + v.width;
              const hy = corner.includes("t") ? v.y : v.y + v.height;
              return <rect key={corner} data-role="resize" data-type="vendor" data-id={v.id} data-corner={corner} x={hx - 5} y={hy - 5} width={10} height={10} rx={2} fill="white" stroke="#333" strokeWidth={1.5} style={{ cursor: corner === "tl" || corner === "br" ? "nwse-resize" : "nesw-resize" }} />;
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
        const bCol = isSel ? "#111" : bStyle.stroke;
        const bW = isSel ? 3 : bStyle.strokeWidth;
        return (
          <g key={s.id} onMouseEnter={() => setHoveredSys(s.id)} onMouseLeave={() => setHoveredSys(null)}>
            <rect data-role="system" data-id={s.id} x={s.x} y={s.y} width={s.width} height={s.height} rx={SYS_RX} fill={st.fill} stroke={bCol} strokeWidth={bW} style={{ cursor: "move" }} />
            {(() => {
              const nameFontPx = FONT_SIZE.systemName * PT_TO_PX;
              const descFontPx = FONT_SIZE.systemDesc * PT_TO_PX;
              const descLineH = descFontPx * 1.2;
              const gap = 3;
              const descLines = hasDesc ? wrapText(s.description, s.width - 16, descFontPx) : [];
              const descBlockH = descLines.length > 0 ? gap + descLines.length * descLineH : 0;
              const blockH = nameFontPx + descBlockH;
              const blockTopY = s.y + s.height / 2 - blockH / 2;
              const nameCY = blockTopY + nameFontPx / 2;
              const descTopY = blockTopY + nameFontPx + gap + descLineH / 2;
              return (
                <>
                  <text x={s.x + s.width / 2} y={nameCY} textAnchor="middle" dominantBaseline="central" fontSize={nameFontPx} fontWeight="700" fill="#1a1a1a" style={{ pointerEvents: "none" }}>
                    {s.name.length > 20 ? s.name.slice(0, 19) + "…" : s.name}
                  </text>
                  {descLines.length > 0 && (
                    <text x={s.x + s.width / 2} textAnchor="middle" dominantBaseline="central" fontSize={descFontPx} fill="#555" style={{ pointerEvents: "none" }}>
                      {descLines.map((line, li) => <tspan key={li} x={s.x + s.width / 2} y={descTopY + li * descLineH}>{line}</tspan>)}
                    </text>
                  )}
                </>
              );
            })()}
            {(isHov || isSel) && portPositions(s).map((p) => (
              <circle key={p.side} data-role="port" data-id={s.id} cx={p.x} cy={p.y} r={5} fill="white" stroke={PORT_COLOR} strokeWidth={2} style={{ cursor: "crosshair" }} />
            ))}
            {isSel && ["tl", "tr", "bl", "br"].map((corner) => {
              const hx = corner.includes("l") ? s.x : s.x + s.width;
              const hy = corner.includes("t") ? s.y : s.y + s.height;
              return <rect key={corner} data-role="resize" data-type="system" data-id={s.id} data-corner={corner} x={hx - 5} y={hy - 5} width={10} height={10} rx={2} fill="white" stroke="#333" strokeWidth={1.5} style={{ cursor: corner === "tl" || corner === "br" ? "nwse-resize" : "nesw-resize" }} />;
            })}
          </g>
        );
      })}

      {/* Connections */}
      {connections.map((c) => {
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
      {inter.mode === "connecting" && (() => {
        const src = enrichedSystems.find((s) => s.id === inter.sourceId);
        if (!src) return null;
        const p1 = edgePt(src, inter.currentPt.x, inter.currentPt.y);
        return <line x1={p1.x} y1={p1.y} x2={inter.currentPt.x} y2={inter.currentPt.y} stroke={PORT_COLOR} strokeWidth={2} strokeDasharray="6,3" opacity={0.7} style={{ pointerEvents: "none" }} />;
      })()}
    </>
  );
}
