/**
 * Legend: an SVG <g> element rendered at the bottom of the canvas.
 * Explains the visual encoding: status colors, border meanings,
 * line thickness, and dash patterns.
 */

import { STATUS, MGMT, SYS_BORDER, CONN_THICKNESS } from "../constants";

export default function Legend({ canvasW, canvasH }) {
  const ly = canvasH - 58;

  return (
    <g style={{ pointerEvents: "none" }}>
      <rect
        x={8} y={ly - 8} width={canvasW - 16} height={52}
        rx={6} fill="white" stroke="#ddd" strokeWidth={1} opacity={0.92}
      />

      {/* Status row */}
      <text x={16} y={ly + 9} fontSize="12" fontWeight="700" fill="#444">
        STATUS:
      </text>
      {Object.entries(STATUS).map(([k, v], i) => (
        <g key={k} transform={`translate(${70 + i * 80}, ${ly + 2})`}>
          <rect x={0} y={-4} width={14} height={14} rx={3}
            fill={v.fill} stroke={v.stroke} strokeWidth={1} />
          <text x={18} y={4} fontSize="12" fill="#555" dominantBaseline="central">
            {v.name}
          </text>
        </g>
      ))}

      {/* Border meanings */}
      <text x={330} y={ly + 9} fontSize="12" fontWeight="700" fill="#444">
        BORDERS:
      </text>
      <g transform={`translate(400, ${ly})`}>
        <rect x={0} y={-4} width={14} height={14} rx={3}
          fill="#eee" stroke={SYS_BORDER.agency.stroke} strokeWidth={2.5} />
        <text x={18} y={4} fontSize="12" fill="#555" dominantBaseline="central">
          Agency-managed
        </text>
      </g>
      <g transform={`translate(530, ${ly})`}>
        <rect x={0} y={-4} width={14} height={14} rx={3}
          fill="#eee" stroke={SYS_BORDER.unspecified.stroke} strokeWidth={2.5} />
        <text x={18} y={4} fontSize="12" fill="#555" dominantBaseline="central">
          Unspecified management
        </text>
      </g>

      {/* Connection line encodings */}
      <text x={16} y={ly + 28} fontSize="12" fontWeight="700" fill="#444">
        LINES:
      </text>
      <g transform={`translate(58, ${ly + 24})`}>
        <line x1={0} y1={0} x2={25} y2={0} stroke="#666" strokeWidth={CONN_THICKNESS.standard} />
        <text x={30} y={1} fontSize="12" fill="#555" dominantBaseline="central">
          Standard
        </text>
      </g>
      <g transform={`translate(160, ${ly + 24})`}>
        <line x1={0} y1={0} x2={25} y2={0} stroke="#666" strokeWidth={CONN_THICKNESS.nonStandard} />
        <text x={30} y={1} fontSize="12" fill="#555" dominantBaseline="central">
          Non-standard
        </text>
      </g>
      {Object.entries(MGMT).map(([k, v], i) => (
        <g key={k} transform={`translate(${290 + i * 150}, ${ly + 24})`}>
          <line x1={0} y1={0} x2={25} y2={0}
            stroke="#666" strokeWidth={2} strokeDasharray={v.dash || "none"} />
          <text x={30} y={1} fontSize="12" fill="#555" dominantBaseline="central">
            {v.name}
          </text>
        </g>
      ))}
    </g>
  );
}
