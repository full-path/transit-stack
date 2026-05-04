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

import { useState, useEffect, useRef } from "react";
import { CATEGORIES, STATUS, MGMT, DATASET_TYPES, JOB_TYPES, SOURCE_CATEGORIES } from "../constants";
import { inputClass, AttrEditor } from "./shared";

const Header = ({ label, onDeselect }) => (
  <div className="flex items-center justify-between mb-3">
    <span className="font-bold text-sm text-gray-800">{label}</span>
    <button onClick={onDeselect} className="text-gray-400 hover:text-gray-700">
      &times;
    </button>
  </div>
);

// Note: this wrapper is a <div>, not a <label>, on purpose. Wrapping a
// native <select> inside a <label> causes the browser to forward a
// synthetic click from the label back to the control, which dismisses
// the dropdown menu the instant it opens.
const Label = ({ label, children }) => (
  <div className="block mb-2">
    <span className="font-semibold text-gray-600 block mb-0.5">{label}</span>
    {children}
  </div>
);

export default function PropsPanel({
  sel,
  systems,
  vendors,
  connections,
  datasets,
  jobs,
  funders,
  lineageConnections,
  setSystems,
  setVendors,
  setConnections,
  setDatasets,
  setJobs,
  setFunders,
  setLineageConnections,
  onDeselect,
}) {
  const [editedItem, setEditedItem] = useState(null);
  const editedItemRef = useRef(null);
  editedItemRef.current = editedItem;

  useEffect(() => {
    if (!sel) {
      setEditedItem(null);
      return;
    }
    const { type, id } = sel;
    let item;
    if (type === "system") item = systems.find((s) => s.id === id);
    if (type === "vendor") item = vendors.find((v) => v.id === id);
    if (type === "connection") item = connections.find((c) => c.id === id);
    if (type === "dataset") item = datasets.find((d) => d.id === id);
    if (type === "job") item = jobs.find((j) => j.id === id);
    if (type === "funder") item = funders.find((f) => f.id === id);
    if (type === "lineage_connection") item = lineageConnections.find((c) => c.id === id);
    setEditedItem(item);
  }, [sel]); // DO NOT listen to arrays - causes re-renders

  const handleBlur = () => {
    if (!editedItemRef.current) return;
    const { type, id } = sel;
    const patch = editedItemRef.current;
    if (type === "system") updateSys(id, patch);
    if (type === "vendor") updateVen(id, patch);
    if (type === "connection") updateCon(id, patch);
    if (type === "dataset") updateDs(id, patch);
    if (type === "job") updateJob(id, patch);
    if (type === "funder") updateFunder(id, patch);
    if (type === "lineage_connection") updateLConn(id, patch);
  };

  if (!sel || !editedItem) return null;

  const { type, id } = sel;

  const updateSys = (id, patch) =>
    setSystems((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const updateVen = (id, patch) =>
    setVendors((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const updateCon = (id, patch) =>
    setConnections((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const updateDs = (id, patch) =>
    setDatasets((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const updateJob = (id, patch) =>
    setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  const updateFunder = (id, patch) =>
    setFunders((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const updateLConn = (id, patch) =>
    setLineageConnections((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const panelClass =
    "w-64 bg-white border-l border-gray-200 p-3 overflow-y-auto text-xs";

  // ── System ──
  if (type === "system") {
    const s = editedItem;
    if (!s) return null;
    const liveSystem = systems.find((sys) => sys.id === id);
    return (
      <div className={panelClass}>
        <Header label="System" onDeselect={onDeselect} />
        <Label label="Name">
          <input
            className={inputClass}
            value={s.name}
            onChange={(e) => setEditedItem({ ...s, name: e.target.value })}
            onBlur={handleBlur}
          />
        </Label>
        <Label label="Status">
          <select
            className={inputClass}
            value={s.status}
            onChange={(e) => {
              const patch = { status: e.target.value };
              setEditedItem({ ...s, ...patch });
              updateSys(id, patch);
            }}
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
            onChange={(e) => {
              const patch = { agencyManaged: e.target.checked };
              setEditedItem({ ...s, ...patch });
              updateSys(id, patch);
            }}
          />
          <span className="font-semibold text-gray-600">Agency-managed</span>
        </label>
        <Label label="Description">
          <textarea
            className={inputClass}
            rows={2}
            value={s.description || ""}
            onChange={(e) => setEditedItem({ ...s, description: e.target.value })}
            onBlur={handleBlur}
          />
        </Label>
        <div className="mb-2">
          <span className="font-semibold text-gray-600 block mb-0.5">
            Attributes
          </span>
          <AttrEditor
            attrs={s.attributes || {}}
            onChange={(a) => setEditedItem({ ...s, attributes: a })}
            onBlur={handleBlur}
          />
        </div>
        <div className="text-gray-400 mt-3 border-t pt-2">
          <p>
            Category:{" "}
            <span className="text-gray-600">
              {liveSystem?._category
                ? CATEGORIES.find((c) => c.id === liveSystem._category)?.name
                : "—"}
            </span>
          </p>
          <p>
            Vendor:{" "}
            <span className="text-gray-600">
              {liveSystem?._vendorName || (s.agencyManaged ? "Agency" : "Unspecified")}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // ── Vendor ──
  if (type === "vendor") {
    const v = editedItem;
    if (!v) return null;
    return (
      <div className={panelClass}>
        <Header label="Vendor" onDeselect={onDeselect} />
        <Label label="Name">
          <input
            className={inputClass}
            value={v.name}
            onChange={(e) => setEditedItem({ ...v, name: e.target.value })}
            onBlur={handleBlur}
          />
        </Label>
        <Label label="Description">
          <textarea
            className={inputClass}
            rows={2}
            value={v.description || ""}
            onChange={(e) => setEditedItem({ ...v, description: e.target.value })}
            onBlur={handleBlur}
          />
        </Label>
        <div className="mb-2">
          <span className="font-semibold text-gray-600 block mb-0.5">
            Attributes
          </span>
          <AttrEditor
            attrs={v.attributes || {}}
            onChange={(a) => setEditedItem({ ...v, attributes: a })}
            onBlur={handleBlur}
          />
        </div>
        <p className="text-gray-400 mt-2">Drag corners to resize.</p>
      </div>
    );
  }

  // ── Connection ──
  if (type === "connection") {
    const c = editedItem;
    if (!c) return null;
    const sysName = (sid) => systems.find((s) => s.id === sid)?.name || sid;
    return (
      <div className={panelClass}>
        <Header label="Connection" onDeselect={onDeselect} />
        <p className="text-gray-500 mb-2">
          {sysName(c.sourceId)} → {sysName(c.targetId)}
        </p>
        <Label label="Label">
          <input
            className={inputClass}
            value={c.label || ""}
            onChange={(e) => setEditedItem({ ...c, label: e.target.value })}
            onBlur={handleBlur}
            placeholder="e.g., GTFS feed"
          />
        </Label>
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={c.bidirectional || false}
            onChange={(e) => {
              const patch = { bidirectional: e.target.checked };
              setEditedItem({ ...c, ...patch });
              updateCon(id, patch);
            }}
          />
          <span className="font-semibold text-gray-600">Bidirectional</span>
        </label>
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={c.dataStandardized ?? true}
            onChange={(e) => {
              const patch = { dataStandardized: e.target.checked };
              setEditedItem({ ...c, ...patch });
              updateCon(id, patch);
            }}
          />
          <span className="font-semibold text-gray-600">Standardized data</span>
        </label>
        <Label label="Management">
          <select
            className={inputClass}
            value={c.managementType || "vendor"}
            onChange={(e) => {
              const patch = { managementType: e.target.value };
              setEditedItem({ ...c, ...patch });
              updateCon(id, patch);
            }}
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
            onChange={(e) => {
              const patch = { status: e.target.value };
              setEditedItem({ ...c, ...patch });
              updateCon(id, patch);
            }}
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
            onChange={(e) => setEditedItem({ ...c, vendorName: e.target.value })}
            onBlur={handleBlur}
            placeholder="Optional"
          />
        </Label>
        <Label label="Description">
          <textarea
            className={inputClass}
            rows={2}
            value={c.description || ""}
            onChange={(e) => setEditedItem({ ...c, description: e.target.value })}
            onBlur={handleBlur}
          />
        </Label>
        <div className="mb-2">
          <span className="font-semibold text-gray-600 block mb-0.5">
            Attributes
          </span>
          <AttrEditor
            attrs={c.attributes || {}}
            onChange={(a) => setEditedItem({ ...c, attributes: a })}
            onBlur={handleBlur}
          />
        </div>
      </div>
    );
  }

  // ── Dataset ──
  if (type === "dataset") {
    const d = editedItem;
    if (!d) return null;
    return (
      <div className={panelClass}>
        <Header label="Dataset" onDeselect={onDeselect} />
        <Label label="Name">
          <input className={inputClass} value={d.name} onChange={(e) => setEditedItem({ ...d, name: e.target.value })} onBlur={handleBlur} />
        </Label>
        <Label label="Type">
          <select className={inputClass} value={d.datasetType || "extract"} onChange={(e) => { const patch = { datasetType: e.target.value }; setEditedItem({ ...d, ...patch }); updateDs(id, patch); }}>
            {DATASET_TYPES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Label>
        <Label label="Source Category">
          <select className={inputClass} value={d.sourceCategory || "na"} onChange={(e) => { const patch = { sourceCategory: e.target.value }; setEditedItem({ ...d, ...patch }); updateDs(id, patch); }}>
            {SOURCE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Label>
        <Label label="Namespace">
          <input className={inputClass} value={d.namespace || ""} placeholder="e.g., Google Sheets" onChange={(e) => setEditedItem({ ...d, namespace: e.target.value })} onBlur={handleBlur} />
        </Label>
        <Label label="Update Frequency">
          <input className={inputClass} value={d.updateFrequency || ""} placeholder="e.g., Daily" onChange={(e) => setEditedItem({ ...d, updateFrequency: e.target.value })} onBlur={handleBlur} />
        </Label>
        <Label label="Description">
          <textarea className={inputClass} rows={2} value={d.description || ""} onChange={(e) => setEditedItem({ ...d, description: e.target.value })} onBlur={handleBlur} />
        </Label>
        <div className="mb-2">
          <span className="font-semibold text-gray-600 block mb-0.5">Attributes</span>
          <AttrEditor attrs={d.attributes || {}} onChange={(a) => setEditedItem({ ...d, attributes: a })} onBlur={handleBlur} />
        </div>
      </div>
    );
  }

  // ── Job ──
  if (type === "job") {
    const j = editedItem;
    if (!j) return null;
    return (
      <div className={panelClass}>
        <Header label="Job" onDeselect={onDeselect} />
        <Label label="Name">
          <input className={inputClass} value={j.name} onChange={(e) => setEditedItem({ ...j, name: e.target.value })} onBlur={handleBlur} />
        </Label>
        <Label label="Type">
          <select className={inputClass} value={j.jobType || "manual_export"} onChange={(e) => { const patch = { jobType: e.target.value }; setEditedItem({ ...j, ...patch }); updateJob(id, patch); }}>
            {JOB_TYPES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Label>
        <Label label="Responsible Person">
          <input className={inputClass} value={j.responsiblePerson || ""} placeholder="e.g., Jane Smith" onChange={(e) => setEditedItem({ ...j, responsiblePerson: e.target.value })} onBlur={handleBlur} />
        </Label>
        <Label label="Frequency">
          <input className={inputClass} value={j.frequency || ""} placeholder="e.g., Monthly" onChange={(e) => setEditedItem({ ...j, frequency: e.target.value })} onBlur={handleBlur} />
        </Label>
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input type="checkbox" checked={j.automated || false} onChange={(e) => { const patch = { automated: e.target.checked }; setEditedItem({ ...j, ...patch }); updateJob(id, patch); }} />
          <span className="font-semibold text-gray-600">Automated</span>
        </label>
        <Label label="Description">
          <textarea className={inputClass} rows={2} value={j.description || ""} onChange={(e) => setEditedItem({ ...j, description: e.target.value })} onBlur={handleBlur} />
        </Label>
        <div className="mb-2">
          <span className="font-semibold text-gray-600 block mb-0.5">Attributes</span>
          <AttrEditor attrs={j.attributes || {}} onChange={(a) => setEditedItem({ ...j, attributes: a })} onBlur={handleBlur} />
        </div>
      </div>
    );
  }

  // ── Funder ──
  if (type === "funder") {
    const f = editedItem;
    if (!f) return null;
    return (
      <div className={panelClass}>
        <Header label="Funder" onDeselect={onDeselect} />
        <Label label="Name">
          <input className={inputClass} value={f.name} onChange={(e) => setEditedItem({ ...f, name: e.target.value })} onBlur={handleBlur} />
        </Label>
        <Label label="Program Name">
          <input className={inputClass} value={f.programName || ""} onChange={(e) => setEditedItem({ ...f, programName: e.target.value })} onBlur={handleBlur} />
        </Label>
        <Label label="Contact">
          <input className={inputClass} value={f.contact || ""} onChange={(e) => setEditedItem({ ...f, contact: e.target.value })} onBlur={handleBlur} />
        </Label>
        <Label label="Reporting Frequency">
          <input className={inputClass} value={f.reportingFrequency || ""} placeholder="e.g., Quarterly" onChange={(e) => setEditedItem({ ...f, reportingFrequency: e.target.value })} onBlur={handleBlur} />
        </Label>
        <Label label="Notes">
          <textarea className={inputClass} rows={3} value={f.notes || ""} onChange={(e) => setEditedItem({ ...f, notes: e.target.value })} onBlur={handleBlur} />
        </Label>
        <p className="text-gray-400 mt-2">Drag corners to resize.</p>
      </div>
    );
  }

  // ── Lineage Connection ──
  if (type === "lineage_connection") {
    const c = editedItem;
    if (!c) return null;
    const allNodes = [...(datasets || []), ...(jobs || [])];
    const nodeName = (nid) => allNodes.find((n) => n.id === nid)?.name || nid;
    return (
      <div className={panelClass}>
        <Header label="Lineage Connection" onDeselect={onDeselect} />
        <p className="text-gray-500 mb-2">{nodeName(c.sourceId)} → {nodeName(c.targetId)}</p>
        <Label label="Description">
          <textarea className={inputClass} rows={2} value={c.description || ""} onChange={(e) => setEditedItem({ ...c, description: e.target.value })} onBlur={handleBlur} />
        </Label>
      </div>
    );
  }

  return null;
}
