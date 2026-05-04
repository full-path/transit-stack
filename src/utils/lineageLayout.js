/**
 * Auto-layout for the lineage view.
 *
 * Algorithm:
 *   1. Build a DAG from lineageConnections.
 *   2. Compute each node's longest-path depth from any source
 *      (Kahn's topological sort).
 *   3. Map depth → column:
 *        depth 0 → col 0 (Vehicle Sources) or col 1 (Back-office Sources)
 *                  based on dataset.sourceCategory
 *        depth 1 → col 2 (Processing)
 *        depth 2 → col 3 (Outputs)
 *        depth 3+ → col 4 (Destinations)
 *   4. Center nodes horizontally within their column and distribute
 *      them evenly top-to-bottom.
 *
 * Nodes with no connections are treated as tier-0 sources.
 * The returned arrays are new objects; callers should push them into
 * React state and save a snapshot beforehand.
 */

import { HEADER_H } from "../constants";

const V_PAD = 18;

export function autoLayout(datasets, jobs, lineageConnections, lineageColBounds, canvasH) {
  const allNodes = [
    ...datasets.map((d) => ({ ...d, _nt: "dataset" })),
    ...jobs.map((j) => ({ ...j, _nt: "job" })),
  ];

  if (!allNodes.length) return { datasets, jobs };

  const nodeIds = new Set(allNodes.map((n) => n.id));
  const adj = Object.fromEntries(allNodes.map((n) => [n.id, []]));
  const inDeg = Object.fromEntries(allNodes.map((n) => [n.id, 0]));

  for (const c of lineageConnections) {
    if (nodeIds.has(c.sourceId) && nodeIds.has(c.targetId)) {
      adj[c.sourceId].push(c.targetId);
      inDeg[c.targetId]++;
    }
  }

  // Longest-path depth via Kahn's
  const depth = Object.fromEntries(allNodes.map((n) => [n.id, 0]));
  const work = { ...inDeg };
  const queue = allNodes.filter((n) => work[n.id] === 0).map((n) => n.id);

  while (queue.length) {
    const id = queue.shift();
    for (const tgt of adj[id]) {
      depth[tgt] = Math.max(depth[tgt], depth[id] + 1);
      if (--work[tgt] === 0) queue.push(tgt);
    }
  }

  // Assign column
  const colAssign = {};
  for (const n of allNodes) {
    const d = depth[n.id];
    if (d === 0) {
      colAssign[n.id] = (n._nt === "dataset" && n.sourceCategory === "back_office") ? 1 : 0;
    } else {
      colAssign[n.id] = Math.min(d + 1, 4);
    }
  }

  // Group by column
  const byCol = Array.from({ length: 5 }, () => []);
  for (const n of allNodes) byCol[colAssign[n.id]].push(n);

  // Position nodes centered in each column
  const pos = {};
  for (let ci = 0; ci < 5; ci++) {
    const nodes = byCol[ci];
    if (!nodes.length) continue;
    const colX = lineageColBounds[ci];
    const colW = lineageColBounds[ci + 1] - lineageColBounds[ci];
    const totalH = nodes.reduce((s, n) => s + n.height, 0) + V_PAD * (nodes.length - 1);
    const avail = canvasH - HEADER_H - V_PAD * 2;
    let y = HEADER_H + V_PAD + Math.max(0, (avail - totalH) / 2);
    for (const n of nodes) {
      pos[n.id] = { x: Math.round(colX + (colW - n.width) / 2), y: Math.round(y) };
      y += n.height + V_PAD;
    }
  }

  return {
    datasets: datasets.map((d) => (pos[d.id] ? { ...d, ...pos[d.id] } : d)),
    jobs: jobs.map((j) => (pos[j.id] ? { ...j, ...pos[j.id] } : j)),
  };
}
