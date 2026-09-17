'use client';

import { Settings2 } from 'lucide-react';

const CHART_TYPES = [
  { id: 'bar',      label: 'Bar' },
  { id: 'line',     label: 'Line' },
  { id: 'area',     label: 'Area' },
  { id: 'pie',      label: 'Pie' },
  { id: 'scatter',  label: 'Scatter' },
  { id: 'composed', label: 'Composed' },
];

export default function ChartConfig({ headers, sheetNames, config, onChange }) {
  const update = (key, value) => onChange({ ...config, [key]: value });

  return (
    <div className="chart-config">
      <div className="config-header">
        <Settings2 size={16} className="config-icon" />
        <span>Chart Settings</span>
      </div>

      <div className="config-grid">
        {/* Sheet selector */}
        {sheetNames && sheetNames.length > 1 && (
          <div className="config-field">
            <label className="config-label">Sheet</label>
            <select
              className="select"
              value={config.sheet || sheetNames[0]}
              onChange={e => update('sheet', e.target.value)}
            >
              {sheetNames.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* Chart type */}
        <div className="config-field full">
          <label className="config-label">Chart Type</label>
          <div className="chart-type-grid">
            {CHART_TYPES.map(ct => (
              <button
                key={ct.id}
                className={`btn btn-ghost chart-type-btn${config.chartType === ct.id ? ' active' : ''}`}
                onClick={() => update('chartType', ct.id)}
                type="button"
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* X axis */}
        <div className="config-field">
          <label className="config-label">X Axis / Category</label>
          <select
            className="select"
            value={config.xAxis || ''}
            onChange={e => update('xAxis', e.target.value)}
          >
            <option value="">— Select column —</option>
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        {/* Y axis — hidden for Pie (uses a single value column) */}
        {config.chartType !== 'pie' ? (
          <div className="config-field">
            <label className="config-label">Y Axis / Value</label>
            <select
              className="select"
              value={config.yAxis || ''}
              onChange={e => update('yAxis', e.target.value)}
            >
              <option value="">— Select column —</option>
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ) : (
          <div className="config-field">
            <label className="config-label">Value Column</label>
            <select
              className="select"
              value={config.yAxis || ''}
              onChange={e => update('yAxis', e.target.value)}
            >
              <option value="">— Select column —</option>
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        )}

        {/* Row limit */}
        <div className="config-field">
          <label className="config-label">Max Rows to Display</label>
          <select
            className="select"
            value={config.limit || 50}
            onChange={e => update('limit', Number(e.target.value))}
          >
            {[20, 50, 100, 200, 500].map(n => (
              <option key={n} value={n}>{n} rows</option>
            ))}
          </select>
        </div>

        {/* Color scheme */}
        <div className="config-field">
          <label className="config-label">Colour Palette</label>
          <select
            className="select"
            value={config.palette || 'indigo'}
            onChange={e => update('palette', e.target.value)}
          >
            <option value="indigo">Indigo</option>
            <option value="cyan">Cyan Wave</option>
            <option value="rose">Rose Garden</option>
            <option value="emerald">Emerald</option>
            <option value="amber">Amber</option>
            <option value="rainbow">Rainbow</option>
          </select>
        </div>
      </div>

      <style jsx>{`
        .chart-config {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .config-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }
        .config-icon { color: var(--accent-light); }
        .config-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .config-field { display: flex; flex-direction: column; gap: 6px; }
        .config-field.full { grid-column: 1 / -1; }
        .config-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .chart-type-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .chart-type-btn {
          padding: 8px 16px;
          font-size: 0.8rem;
          border-radius: var(--radius-sm);
        }
        @media (max-width: 600px) {
          .config-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
