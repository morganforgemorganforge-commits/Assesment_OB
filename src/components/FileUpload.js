'use client';

import { useCallback, useState } from 'react';
import { UploadCloud, FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function FileUpload({ onData }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [fileName, setFileName] = useState(null);

  const parseFile = useCallback((file) => {
    setError(null);
    setLoading(true);

    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const extOk = /\.(xlsx|xls)$/i.test(file.name);
    if (!allowed.includes(file.type) && !extOk) {
      setError('Please upload a valid .xlsx or .xls file.');
      setLoading(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data    = new Uint8Array(e.target.result);
        const wb      = XLSX.read(data, { type: 'array', cellDates: true });
        const sheets  = wb.SheetNames;
        const allSheets = {};

        sheets.forEach(name => {
          const ws   = wb.Sheets[name];
          const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
          const headers = json.length > 0 ? Object.keys(json[0]) : [];
          allSheets[name] = { rows: json, headers };
        });

        setFileName(file.name);
        onData({ sheets: allSheets, sheetNames: sheets, fileName: file.name });
      } catch (err) {
        setError('Failed to parse the file. Make sure it is a valid Excel file.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [onData]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleInput = (e) => {
    const file = e.target.files[0];
    if (file) parseFile(file);
    e.target.value = '';
  };

  const handleClear = () => {
    setFileName(null);
    setError(null);
    onData(null);
  };

  return (
    <div className="file-upload-root">
      {/* ── Success State ─────────────────────────────────────── */}
      {fileName && !loading && (
        <div className="file-success animate-in">
          <FileSpreadsheet size={22} className="file-icon" />
          <span className="file-name">{fileName}</span>
          <button className="btn btn-ghost clear-btn" onClick={handleClear} title="Remove file">
            <X size={14} />
            Remove
          </button>
        </div>
      )}

      {/* ── Drop Zone ─────────────────────────────────────────── */}
      {!fileName && (
        <label
          className={`dropzone${dragging ? ' dragging' : ''}${loading ? ' loading-state' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          htmlFor="excel-input"
        >
          <input
            id="excel-input"
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleInput}
          />
          <div className="dropzone-icon">
            {loading
              ? <div className="spinner" />
              : <UploadCloud size={40} strokeWidth={1.5} />
            }
          </div>
          <p className="dropzone-title">
            {loading ? 'Parsing file…' : 'Drop your Excel file here'}
          </p>
          <p className="dropzone-sub">
            {loading ? 'Reading rows and running quality checks…' : 'or click to browse  ·  .xlsx / .xls supported'}
          </p>
          {!loading && (
            <div className="dropzone-btn">
              <UploadCloud size={14} />
              Choose File
            </div>
          )}
        </label>
      )}

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <div className="upload-error animate-in">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <style jsx>{`
        .file-upload-root { width: 100%; }

        /* Drop Zone */
        .dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: 2px dashed var(--border);
          border-radius: var(--radius-lg);
          padding: 56px 40px;
          cursor: pointer;
          transition: var(--transition);
          background: rgba(255,255,255,0.02);
          text-align: center;
        }
        .dropzone:hover, .dropzone.dragging {
          border-color: var(--accent);
          background: var(--accent-glow);
          box-shadow: 0 0 0 4px rgba(99,102,241,0.08);
        }
        .dropzone.loading-state { pointer-events: none; opacity: 0.8; }

        .dropzone-icon { color: var(--accent-light); }
        .dropzone-title { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); }
        .dropzone-sub   { font-size: 0.85rem; color: var(--text-muted); }
        .dropzone-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          padding: 9px 22px;
          background: var(--accent);
          color: #fff;
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          font-weight: 500;
          transition: var(--transition);
        }
        .dropzone:hover .dropzone-btn {
          background: var(--accent-light);
          box-shadow: 0 0 16px rgba(99,102,241,0.35);
        }

        /* Spinner */
        .spinner {
          width: 40px; height: 40px;
          border: 3px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Success bar */
        .file-success {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.25);
          border-radius: var(--radius-md);
        }
        .file-icon  { color: var(--green); flex-shrink: 0; }
        .file-name  { flex: 1; font-size: 0.9rem; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .clear-btn  { flex-shrink: 0; font-size: 0.8rem; padding: 6px 14px; }

        /* Error */
        .upload-error {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 12px 16px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          color: var(--red);
        }
      `}</style>
    </div>
  );
}
