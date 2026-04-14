/**
 * PropsPanel: the right-hand properties inspector.
 *
 * Renders different forms depending on what is selected:
 * a system, a vendor, or a connection. When nothing is selected,
 * renders nothing (returns null).
 *
 * All mutations go through the setSystems/setVendors/setConnections
 * callbacks passed from the parent — this component owns no state.
 */

import React from "react";
import { CATEGORIES, STATUS, MGMT } from "../constants";
import { inputClass, AttrEditor } from "./shared";

export default function PropsPanel({
  sel,
  systems,
  vendors,
  connections,
  setSystems,
  setVendors,
  setConnections,
  onDeselect,
}) {
  if (!sel) return null;

  const { type, id } = sel;

  const updateSys = (id, patch) =>
    setSystems((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const updateVen = (id, patch) =>
    setVendors((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const updateCon = (id, patch) =>
    setConnections((cs) =>
      cs.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );

  const panelClass =
    "w-64 bg-white border-l border-gray-200 p-3 overflow-y-auto text-xs";

  const Header = ({ label }) => (
    <div className="flex items-center justify-between mb-3">
      <span className="font-bold text-sm text-gray-800">{label}</span>
      <button
        onClick={onDeselect}
        className="text-gray-400 hover:text-gray-700"
      >
        &times;
      </button>
    </div>
  );

  const Label = ({ label, children }) => (
    <label className="block mb-2">
      <span className="font-semibold text-gray-600 block mb-0.5">{label}</span>
      {children}
    </label>
  );

  // ── System ──
  if (type === "system") {
    const s = systems.find((x) => x.id === id);
    if (!s) return null;
    return (
      <div className={panelClass}>
        <Header label="System" />
        <Label label="Name">
          <input
            className={inputClass}
            value={s.name}
            onChange={(e) => updateSys(id, { name: e.target.value })}
          />
        </Label>
        <Label label="Status">
          <select
            className={inputClass}
            value={s.status}
            onChange={(e) => updateSys(id, { status: e.target.value })}
          >
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.name}
              </option>
            ))}
          </select>
        </Label>
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={s.agencyManaged || false}
            onChange={(e) => updateSys(id, { agencyManaged: e.target.checked })}
          />
          <span className="font-semibold text-gray-600">Agency-managed</span>
        </label>
        <Label label="Description">
          <textarea
            className={inputClass}
            rows={2}
            value={s.description || ""}
            onChange={(e) => updateSys(id, { description: e.target.value })}
          />
        </Label>
        <div className="mb-2">
          <span className="font-semibold text-gray-600 block mb-0.5">
            Attributes
          </span>
          <AttrEditor
            attrs={s.attributes || {}}
            onChange={(a) => updateSys(id, { attributes: a })}
          />
        </div>
        <div className="text-gray-400 mt-3 border-t pt-2">
          <p>
            Category:{" "}
            <span className="text-gray-600">
              {s._category
                ? CATEGORIES.find((c) => c.id === s._category)?.name
                : "—"}
            </span>
          </p>
          <p>
            Vendor:{" "}
            <span className="text-gray-600">
              {s._vendorName || (s.agencyManaged ? "Agency" : "Unspecified")}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // ── Vendor ──
  if (type === "vendor") {
    const v = vendors.find((x) => x.id === id);
    if (!v) return null;
    return (
      <div className={panelClass}>
        <Header label="Vendor" />
        <Label label="Name">
          <input
            className={inputClass}
            value={v.name}
            onChange={(e) => updateVen(id, { name: e.target.value })}
          />
        </Label>
        <Label label="Description">
          <textarea
            className={inputClass}
            rows={2}
            value={v.description || ""}
            onChange={(e) => updateVen(id, { description: e.target.value })}
          />
        </Label>
        <div className="mb-2">
          <span className="font-semibold text-gray-600 block mb-0.5">
            Attributes
          </span>
          <AttrEditor
            attrs={v.attributes || {}}
            onChange={(a) => updateVen(id, { attributes: a })}
          />
        </div>
        <p className="text-gray-400 mt-2">Drag corners to resize.</p>
      </div>
    );
  }

  // ── Connection ──
  if (type === "connection") {
    const c = connections.find((x) => x.id === id);
    if (!c) return null;
    const sysName = (sid) => systems.find((s) => s.id === sid)?.name || sid;
    return (
      <div className={panelClass}>
        <Header label="Connection" />
        <p className="text-gray-500 mb-2">
          {sysName(c.sourceId)} → {sysName(c.targetId)}
        </p>
        <Label label="Label">
          <input
            className={inputClass}
            value={c.label || ""}
            onChange={(e) => updateCon(id, { label: e.target.value })}
            placeholder="e.g., GTFS feed"
          />
        </Label>
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={c.bidirectional || false}
            onChange={(e) =>
              updateCon(id, { bidirectional: e.target.checked })
            }
          />
          <span className="font-semibold text-gray-600">Bidirectional</span>
        </label>
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={c.dataStandardized ?? true}
            onChange={(e) =>
              updateCon(id, { dataStandardized: e.target.checked })
            }
          />
          <span className="font-semibold text-gray-600">Standardized data</span>
        </label>
        <Label label="Management">
          <select
            className={inputClass}
            value={c.managementType || "vendor"}
            onChange={(e) =>
              updateCon(id, { managementType: e.target.value })
            }
          >
            {Object.entries(MGMT).map(([k, v]) => (
              <option key={k} value={k}>
                {v.name}
              </option>
            ))}
          </select>
        </Label>
        <Label label="Status">
          <select
            className={inputClass}
            value={c.status || "in_use"}
            onChange={(e) => updateCon(id, { status: e.target.value })}
          >
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.name}
              </option>
            ))}
          </select>
        </Label>
        <Label label="Vendor (e.g., ISP)">
          <input
            className={inputClass}
            value={c.vendorName || ""}
            onChange={(e) => updateCon(id, { vendorName: e.target.value })}
            placeholder="Optional"
          />
        </Label>
        <Label label="Description">
          <textarea
            className={inputClass}
            rows={2}
            value={c.description || ""}
            onChange={(e) => updateCon(id, { description: e.target.value })}
          />
        </Label>
        <div className="mb-2">
          <span className="font-semibold text-gray-600 block mb-0.5">
            Attributes
          </span>
          <AttrEditor
            attrs={c.attributes || {}}
            onChange={(a) => updateCon(id, { attributes: a })}
          />
        </div>
      </div>
    );
  }

  return null;
}
