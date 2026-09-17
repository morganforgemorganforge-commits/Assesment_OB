'use client';

import { useState, useMemo } from 'react';
import { Table, Search, ChevronLeft, ChevronRight, AlertTriangle, Copy } from 'lucide-react';
import { flaggedRowSet, flagsForRow } from '../lib/dataQuality';

const ISSUE_COLORS = {
  MISSING_VALUE:      'var(--yellow)',
  INVALID_FORMAT:     'var(--red)',
  POSSIBLE_DUPLICATE: 'var(--orange)',
};

export default function DataTable({ rows, headers, flags }) {
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);
  const [filter, setFilter] = useState('ALL'); // ALL | FLAGGED
  const PER_PAGE = 20;

  const badRows   = useMemo(() => flaggedRowSet(flags || []), [flags]);
  const dupRows   = useMemo(() => new Set((flags || []).filter(f => f.issue === 'POSSIBLE_DUPLICATE').map(f => f.row)), [flags]);

  const filtered = useMemo(() => {
    let data = rows.map((r, i) => ({ ...r, __idx: i }));
    if (filter === 'FLAGGED') data = data.filter(r => badRows.has(r.__idx));
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(r =>
        headers.some(h => String(r[h] || '').toLowerCase().includes(q))
      );
    }
    return data;
  }, [rows, headers, search, filter, badRows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleFilter = (f) => { setFilter(f); setPage(1); };
  const handleSearch = (v) => { setSearch(v); setPage(1); };

  return (
    <div className="dt-root animate-in">
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
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
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
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
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {rowIdx + 1}
                  </td>
                  {headers.map(h => {
                    const cellFlags = rowFlags.filter(f => f.field === h);
                    const cellColor = cellFlags.length
                      ? ISSUE_COLORS[cellFlags[0].issue]
                      : undefined;
                    return (
                      <td
                        key={h}
                        className={h === headers[0] ? 'highlight' : ''}
                        style={cellColor ? { color: cellColor, fontWeight: 500 } : {}}
                        title={cellFlags.length ? cellFlags[0].reason : undefined}
                      >
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

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      <div className="dt-pagination">
        <span className="dt-page-info">
          {filtered.length === 0 ? 'No rows' : `Showing ${(page-1)*PER_PAGE+1}–${Math.min(page*PER_PAGE, filtered.length)} of ${filtered.length} rows`}
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

        .dt-toolbar {
          display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
        }
        .dt-search-wrap {
          position: relative; flex: 1; min-width: 220px;
        }
        .dt-search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: var(--text-muted); pointer-events: none;
        }
        .dt-search-input { padding-left: 34px; }

        .dt-filter-btns { display: flex; gap: 8px; }
        .dt-count {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 22px; height: 18px; padding: 0 6px;
          background: rgba(255,255,255,0.08);
          border-radius: 99px;
          font-size: 0.7rem; font-weight: 700;
        }

        .dt-pagination {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 10px;
        }
        .dt-page-info { font-size: 0.8rem; color: var(--text-muted); }
        .dt-page-btns { display: flex; align-items: center; gap: 8px; }
        .dt-pg-btn    { padding: 8px; min-width: 36px; }
        .dt-pg-label  { font-size: 0.85rem; color: var(--text-secondary); min-width: 60px; text-align: center; }
      `}</style>
    </div>
  );
}
