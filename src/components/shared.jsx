/**
 * Shared UI primitives used by multiple components.
 */


/** Tailwind class strings for consistent form styling. */
export const inputClass =
  "w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white";
export const btnPrimary =
  "px-3 py-1.5 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-gray-700";
export const btnSecondary =
  "px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 border border-gray-300";
export const btnDanger =
  "px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded hover:bg-red-100 border border-red-200";

/**
 * A key-value attribute editor. Used in the properties panel for
 * systems, vendors, and connections.
 *
 * @param {{ attrs: object, onChange: (attrs: object) => void }} props
 */
export function AttrEditor({ attrs, onChange }) {
  const entries = Object.entries(attrs || {});

  const updateKey = (oldKey, newKey, value) => {
    const updated = {};
    for (const [k, v] of Object.entries(attrs)) {
      updated[k === oldKey ? newKey : k] = k === oldKey ? value : v;
    }
    onChange(updated);
  };

  const removeKey = (key) => {
    const updated = { ...attrs };
    delete updated[key];
    onChange(updated);
  };

  return (
    <div className="space-y-1">
      {entries.map(([k, v], i) => (
        <div key={i} className="flex gap-1">
          <input
            className={inputClass + " flex-1"}
            placeholder="Key"
            value={k}
            onChange={(e) => updateKey(k, e.target.value, v)}
          />
          <input
            className={inputClass + " flex-1"}
            placeholder="Value"
            value={v}
            onChange={(e) => onChange({ ...attrs, [k]: e.target.value })}
          />
          <button
            onClick={() => removeKey(k)}
            className="text-red-400 hover:text-red-600 text-sm px-1"
          >
            &times;
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange({ ...(attrs || {}), "": "" })}
        className="text-xs text-blue-600 hover:text-blue-800"
      >
        + attribute
      </button>
    </div>
  );
}
