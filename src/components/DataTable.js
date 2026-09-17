'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Table, Search, ChevronLeft, ChevronRight,
  AlertTriangle, Copy, Download, FileDown, Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { flaggedRowSet, flagsForRow } from '../lib/dataQuality';

const ISSUE_COLORS = {
  MISSING_VALUE:      'var(--yellow)',
  INVALID_FORMAT:     'var(--red)',
  POSSIBLE_DUPLICATE: 'var(--orange)',
};

export default function DataTable({ rows, headers, flags, fileName, aiEdits = new Set() }) {
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [filter,      setFilter]      = useState('ALL'); // ALL | FLAGGED | AI_EDITED
  const [exporting,   setExporting]   = useState(false);
  const PER_PAGE = 20;

  const badRows = useMemo(() => flaggedRowSet(flags || []), [flags]);
  const dupRows = useMemo(() => new Set(
    (flags || []).filter(f => f.issue === 'POSSIBLE_DUPLICATE').map(f => f.row)
  ), [flags]);
  const aiEditedRows = useMemo(() => new Set(
    [...aiEdits].map(key => parseInt(key.split(':')[0]))
  ), [aiEdits]);

  const filtered = useMemo(() => {
    let data = rows.map((r, i) => ({ ...r, __idx: i }));
    if (filter === 'FLAGGED')    data = data.filter(r => badRows.has(r.__idx));
    if (filter === 'AI_EDITED')  data = data.filter(r => aiEditedRows.has(r.__idx));
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(r =>
        headers.some(h => String(r[h] || '').toLowerCase().includes(q))
      );
    }
    return data;
  }, [rows, headers, search, filter, badRows, aiEditedRows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleFilter = (f) => { setFilter(f); setPage(1); };
  const handleSearch = (v) => { setSearch(v); setPage(1); };

  /* ── Clean data rows (strip __idx) for export ── */
  const cleanRows = useCallback(() =>
    rows.map(r => {
      const out = {};
      headers.forEach(h => { out[h] = r[h] ?? ''; });
      return out;
    }),
  [rows, headers]);

  /* ── Export as Excel (.xlsx) ── */
  const exportExcel = useCallback(() => {
    setExporting(true);
    try {
      const ws = XLSX.utils.json_to_sheet(cleanRows(), { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Cleaned Data');
      const name = fileName ? `Cleaned_${fileName.replace(/\.[^.]+$/, '')}.xlsx` : 'Cleaned_Export.xlsx';
      XLSX.writeFile(wb, name);
    } finally {
      setExporting(false);
    }
  }, [cleanRows, headers, fileName]);

  /* ── Export as CSV ── */
  const exportCSV = useCallback(() => {
    setExporting(true);
    try {
      const ws = XLSX.utils.json_to_sheet(cleanRows(), { header: headers });
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = fileName ? `Cleaned_${fileName.replace(/\.[^.]+$/, '')}.csv` : 'Cleaned_Export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [cleanRows, headers, fileName]);

  return (
    <div className="dt-root animate-in">

      {/* ── Export Banner ──────────────────────────────────────────────────── */}
      <div className="export-bar">
        <div className="export-bar-left">
          <FileDown size={16} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
          <div>
            <div className="export-bar-title">Export current data</div>
            <div className="export-bar-sub">
              {rows.length.toLocaleString()} rows · {headers.length} columns · all accepted fixes included
            </div>
          </div>
        </div>
        <div className="export-bar-actions">
          <button
            className="export-btn export-btn-csv"
            onClick={exportCSV}
            disabled={exporting || rows.length === 0}
            title="Download as CSV"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            className="export-btn export-btn-excel"
            onClick={exportExcel}
            disabled={exporting || rows.length === 0}
            title="Download as Excel"
          >
            <Download size={14} />
            Export Excel
          </button>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="dt-toolbar">
        <div className="dt-search-wrap">
          <Search size={14} className="dt-search-icon" />
          <input
            className="input dt-search-input"
            placeholder="Search any cell…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <div className="dt-filter-btns">
          <button
            className={`btn btn-ghost${filter === 'ALL' ? ' active' : ''}`}
            onClick={() => handleFilter('ALL')}
          >
            All rows
            <span className="dt-count">{rows.length}</span>
          </button>
          <button
            className={`btn btn-ghost${filter === 'FLAGGED' ? ' active' : ''}`}
            onClick={() => handleFilter('FLAGGED')}
          >
            <AlertTriangle size={13} />
            Flagged only
            <span className="dt-count" style={{ background: 'rgba(245,158,11,0.2)', color: 'var(--yellow)' }}>
              {badRows.size}
            </span>
          </button>
          {aiEdits.size > 0 && (
            <button
              className={`btn btn-ghost${filter === 'AI_EDITED' ? ' active' : ''}`}
              onClick={() => handleFilter('AI_EDITED')}
            >
              <Sparkles size={13} style={{ color: '#818cf8' }} />
              AI edited
              <span className="dt-count" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>
                {aiEditedRows.size}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: 50 }}>#</th>
              {headers.map(h => <th key={h}>{h}</th>)}
              <th style={{ width: 80 }}>Issues</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={headers.length + 2} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No rows match your search
                </td>
              </tr>
            ) : paged.map((row) => {
              const rowIdx   = row.__idx;
              const rowFlags = flagsForRow(flags || [], rowIdx);
              const isDup    = dupRows.has(rowIdx);
              const isBad    = badRows.has(rowIdx);

              return (
                <tr
                  key={rowIdx}
                  className={isDup ? 'duplicate' : isBad ? 'flagged' : ''}
                  title={rowFlags.length ? rowFlags.map(f => f.reason).join('\n') : undefined}
                >
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{rowIdx + 1}</td>
                  {headers.map(h => {
                    const cellFlags  = rowFlags.filter(f => f.field === h);
                    const cellColor  = cellFlags.length ? ISSUE_COLORS[cellFlags[0].issue] : undefined;
                    const isAiEdited = aiEdits.has(`${rowIdx}:${h}`);
                    return (
                      <td
                        key={h}
                        className={h === headers[0] ? 'highlight' : ''}
                        style={{
                          ...(cellColor ? { color: cellColor, fontWeight: 500 } : {}),
                          ...(isAiEdited ? {
                            background: 'rgba(16,185,129,0.06)',
                            boxShadow: 'inset 0 0 0 1px rgba(16,185,129,0.25)',
                          } : {}),
                          position: 'relative',
                        }}
                        title={isAiEdited ? `✦ AI fixed: ${h}` : (cellFlags.length ? cellFlags[0].reason : undefined)}
                      >
                        {isAiEdited && (
                          <span style={{
                            position: 'absolute', top: 3, right: 4,
                            fontSize: '0.55rem', color: '#10b981', opacity: 0.8,
                          }}>✦</span>
                        )}
                        {String(row[h] ?? '')}
                      </td>
                    );
                  })}
                  <td>
                    {rowFlags.length > 0 && (
                      <span
                        className={`badge ${isDup ? 'badge-orange' : 'badge-yellow'}`}
                        style={{ cursor: 'default' }}
                        title={rowFlags.map(f => f.reason).join('\n')}
                      >
                        {isDup ? <Copy size={10} /> : <AlertTriangle size={10} />}
                        {rowFlags.length}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      <div className="dt-pagination">
        <span className="dt-page-info">
          {filtered.length === 0
            ? 'No rows'
            : `Showing ${(page-1)*PER_PAGE+1}–${Math.min(page*PER_PAGE, filtered.length)} of ${filtered.length} rows`}
        </span>
        <div className="dt-page-btns">
          <button className="btn btn-ghost dt-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={14} />
          </button>
          <span className="dt-pg-label">{page} / {totalPages}</span>
          <button className="btn btn-ghost dt-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .dt-root { display: flex; flex-direction: column; gap: 14px; }

        /* Export bar */
        .export-bar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 14px 18px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; flex-wrap: wrap;
        }
        .export-bar-left  { display: flex; align-items: center; gap: 12px; }
        .export-bar-title { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
        .export-bar-sub   { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .export-bar-actions { display: flex; gap: 8px; flex-shrink: 0; }

        .export-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 8px;
          font-size: 0.8rem; font-weight: 600; font-family: inherit;
          cursor: pointer; border: 1px solid transparent;
          transition: all 0.18s; white-space: nowrap;
        }
        .export-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .export-btn-csv {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.12);
          color: var(--text-secondary);
        }
        .export-btn-csv:hover:not(:disabled) {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.25);
          color: var(--text-primary);
        }
        .export-btn-excel {
          background: rgba(16,185,129,0.1);
          border-color: rgba(16,185,129,0.3);
          color: #10b981;
        }
        .export-btn-excel:hover:not(:disabled) {
          background: rgba(16,185,129,0.2);
          border-color: #10b981;
          transform: translateY(-1px);
        }

        /* Toolbar */
        .dt-toolbar        { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .dt-search-wrap    { position: relative; flex: 1; min-width: 220px; }
        .dt-search-icon    { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .dt-search-input   { padding-left: 34px; }
        .dt-filter-btns    { display: flex; gap: 8px; }
        .dt-count {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 22px; height: 18px; padding: 0 6px;
          background: rgba(255,255,255,0.08); border-radius: 99px;
          font-size: 0.7rem; font-weight: 700;
        }

        /* Pagination */
        .dt-pagination  { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
        .dt-page-info   { font-size: 0.8rem; color: var(--text-muted); }
        .dt-page-btns   { display: flex; align-items: center; gap: 8px; }
        .dt-pg-btn      { padding: 8px; min-width: 36px; }
        .dt-pg-label    { font-size: 0.85rem; color: var(--text-secondary); min-width: 60px; text-align: center; }
      `}</style>
    </div>
  );
}
