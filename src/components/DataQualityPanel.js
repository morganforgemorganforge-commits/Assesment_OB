'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ShieldCheck, AlertTriangle, Copy, Filter, Info,
  Check, X, Zap, HelpCircle, ChevronRight, Sparkles
} from 'lucide-react';
import { qualitySummary, detectBulkPatterns } from '../lib/dataQuality';

const ISSUE_META = {
  MISSING_VALUE: {
    label: 'Missing Value',
    color: 'var(--yellow)',
    bg:    'rgba(245,158,11,0.12)',
    badge: 'badge-yellow',
    icon:  <AlertTriangle size={13} />,
  },
  INVALID_FORMAT: {
    label: 'Invalid Format',
    color: 'var(--red)',
    bg:    'rgba(239,68,68,0.12)',
    badge: 'badge-red',
    icon:  <Info size={13} />,
  },
  POSSIBLE_DUPLICATE: {
    label: 'Possible Duplicate',
    color: 'var(--orange)',
    bg:    'rgba(249,115,22,0.12)',
    badge: 'badge-orange',
    icon:  <Copy size={13} />,
  },
};

const CONFIDENCE_META = {
  HIGH:   { label: 'Auto-fixable',  color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <Zap size={12} /> },
  MEDIUM: { label: 'Needs review',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <HelpCircle size={12} /> },
  LOW:    { label: 'Manual only',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  icon: <X size={12} /> },
};

export default function DataQualityPanel({ flags, totalRows, onApplyFix, onApplyBulkFix }) {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [decisions, setDecisions]       = useState({});
  const [bulkApplied, setBulkApplied]   = useState(new Set());
  const PER_PAGE = 12;

  const summary      = useMemo(() => qualitySummary(flags), [flags]);
  const bulkPatterns  = useMemo(() => detectBulkPatterns(flags), [flags]);

  const filtered = useMemo(() => {
    let f = flags;
    if (activeFilter !== 'ALL') f = f.filter(x => x.issue === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(x =>
        x.reason.toLowerCase().includes(q) ||
        x.field.toLowerCase().includes(q) ||
        String(x.row + 1).includes(q)
      );
    }
    return f;
  }, [flags, activeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleDecision = useCallback((flagKey, decision, fix) => {
    setDecisions(prev => ({ ...prev, [flagKey]: decision }));
    if (decision === 'accept' && fix && onApplyFix) {
      onApplyFix(fix);
    }
  }, [onApplyFix]);

  const handleBulkApply = useCallback((pattern, idx) => {
    setBulkApplied(prev => new Set([...prev, idx]));
    if (onApplyBulkFix) {
      onApplyBulkFix(pattern);
    }
  }, [onApplyBulkFix]);

  const flagKey = (f, i) => `${f.row}-${f.field}-${f.issue}-${i}`;

  if (!flags || flags.length === 0) {
    return (
      <div className="dq-root">
        <div className="dq-clean">
          <ShieldCheck size={40} style={{ color: 'var(--green)' }} />
          <h3>All Clear</h3>
          <p>No data quality issues were detected across {totalRows} rows.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dq-root animate-in">
      {/* Bulk Pattern Banners */}
      {bulkPatterns.length > 0 && (
        <div className="bulk-banners">
          {bulkPatterns.map((bp, idx) => (
            <div
              key={idx}
              className={`bulk-banner ${bulkApplied.has(idx) ? 'bulk-applied' : ''}`}
            >
              <div className="bulk-banner-left">
                <Sparkles size={16} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
                <div>
                  <div className="bulk-banner-title">
                    Pattern detected: <strong>{bp.pattern}</strong>
                  </div>
                  <div className="bulk-banner-sub">
                    {bp.rowIndices.length} rows in <code>{bp.field}</code> have the same fixable issue
                  </div>
                </div>
              </div>
              <div className="bulk-banner-actions">
                {!bulkApplied.has(idx) ? (
                  <button
                    className="btn-fix btn-fix-accept"
                    onClick={() => handleBulkApply(bp, idx)}
                  >
                    <Zap size={13} />
                    Fix all {bp.rowIndices.length} rows
                  </button>
                ) : (
                  <span className="bulk-done-label">
                    <Check size={14} /> Applied
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="dq-summary">
        {Object.entries(ISSUE_META).map(([key, meta]) => (
          <button
            key={key}
            className={`dq-stat-btn${activeFilter === key ? ' dq-stat-active' : ''}`}
            style={{ '--hue-bg': meta.bg, '--hue-color': meta.color }}
            onClick={() => { setActiveFilter(activeFilter === key ? 'ALL' : key); setPage(1); }}
          >
            <span className="dq-stat-icon">{meta.icon}</span>
            <div>
              <div className="dq-stat-val">{summary[key] || 0}</div>
              <div className="dq-stat-lbl">{meta.label}</div>
            </div>
          </button>
        ))}
        <button
          className={`dq-stat-btn${activeFilter === 'ALL' ? ' dq-stat-active' : ''}`}
          style={{ '--hue-bg': 'rgba(99,102,241,0.12)', '--hue-color': 'var(--accent-light)' }}
          onClick={() => { setActiveFilter('ALL'); setPage(1); }}
        >
          <span className="dq-stat-icon"><Filter size={13} /></span>
          <div>
            <div className="dq-stat-val">{flags.length}</div>
            <div className="dq-stat-lbl">Total Issues</div>
          </div>
        </button>
      </div>

      {/* Search */}
      <input
        className="input dq-search"
        placeholder="Search flags by row, field, or reason..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
      />

      {/* Flag Cards */}
      <div className="flag-list">
        {paged.length === 0 ? (
          <div className="flag-empty">
            <p>No matching flags</p>
          </div>
        ) : paged.map((flag, i) => {
          const meta = ISSUE_META[flag.issue] || ISSUE_META.MISSING_VALUE;
          const conf = CONFIDENCE_META[flag.confidence] || CONFIDENCE_META.LOW;
          const fk = flagKey(flag, (page - 1) * PER_PAGE + i);
          const decision = decisions[fk];

          return (
            <div
              key={fk}
              className={`flag-card animate-slide ${decision ? 'flag-decided flag-' + decision : ''}`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {/* Top row: Row# + badges */}
              <div className="flag-card-top">
                <span className="row-pill">Row #{flag.row + 1}</span>
                <span className={`badge ${meta.badge}`}>
                  {meta.icon} {meta.label}
                </span>
                <span className="conf-badge" style={{ background: conf.bg, color: conf.color }}>
                  {conf.icon} {conf.label}
                </span>
              </div>

              {/* Field */}
              <div className="flag-field">
                <code>{flag.field}</code>
              </div>

              {/* Plain-English reason */}
              <p className="flag-reason">
                {flag.reason}
              </p>


            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="dq-pagination">
          <span className="dq-page-info">
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} flags
          </span>
          <div className="dq-page-btns">
            <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  className={`btn btn-ghost${page === p ? ' active' : ''}`}
                  onClick={() => setPage(p)}
                  style={{ minWidth: 36, padding: '8px 12px' }}
                >
                  {p}
                </button>
              );
            })}
            <button className="btn btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .dq-root { display: flex; flex-direction: column; gap: 16px; }

        .dq-clean {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 10px; padding: 48px;
          text-align: center; color: var(--text-muted);
        }
        .dq-clean h3 { color: var(--green); font-size: 1.1rem; }
        .dq-clean p  { font-size: 0.85rem; }

        /* Bulk Banners */
        .bulk-banners { display: flex; flex-direction: column; gap: 10px; }
        .bulk-banner {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 14px 18px;
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: var(--radius-md);
          transition: var(--transition);
        }
        .bulk-banner:hover { border-color: rgba(99, 102, 241, 0.4); }
        .bulk-applied { opacity: 0.6; }
        .bulk-banner-left { display: flex; align-items: center; gap: 12px; }
        .bulk-banner-title { font-size: 0.85rem; color: var(--text-primary); }
        .bulk-banner-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .bulk-banner-sub code {
          background: rgba(255,255,255,0.08); padding: 1px 5px;
          border-radius: 4px; font-size: 0.8em;
        }
        .bulk-banner-actions { flex-shrink: 0; }
        .bulk-done-label {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.8rem; color: var(--green); font-weight: 600;
        }

        /* Summary */
        .dq-summary { display: flex; gap: 10px; flex-wrap: wrap; }
        .dq-stat-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px;
          background: var(--hue-bg);
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          cursor: pointer; transition: var(--transition);
          flex: 1; min-width: 140px;
          color: var(--text-primary); font-family: inherit;
        }
        .dq-stat-btn:hover { border-color: var(--hue-color); transform: translateY(-1px); }
        .dq-stat-active {
          border-color: var(--hue-color) !important;
          box-shadow: 0 0 0 2px var(--hue-color, rgba(99,102,241,0.25));
        }
        .dq-stat-icon { color: var(--hue-color); flex-shrink: 0; }
        .dq-stat-val  { font-size: 1.4rem; font-weight: 800; color: var(--hue-color); line-height: 1; }
        .dq-stat-lbl  { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; margin-top: 3px; }

        .dq-search { margin-top: 4px; }

        /* Flag Cards */
        .flag-list { display: flex; flex-direction: column; gap: 10px; }
        .flag-empty {
          text-align: center; padding: 32px; color: var(--text-muted);
          font-size: 0.85rem;
        }
        .flag-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 16px 18px;
          transition: var(--transition);
        }
        .flag-card:hover {
          border-color: rgba(255,255,255,0.12);
          box-shadow: var(--shadow-sm);
        }
        .flag-decided { opacity: 0.7; }
        .flag-accept { border-left: 3px solid var(--green); }
        .flag-reject { border-left: 3px solid var(--red); }

        .flag-card-top {
          display: flex; align-items: center; gap: 8px;
          flex-wrap: wrap; margin-bottom: 8px;
        }
        .row-pill {
          display: inline-block; padding: 2px 10px;
          background: rgba(255,255,255,0.06);
          border-radius: 99px; font-size: 0.78rem;
          font-weight: 600; color: var(--text-secondary);
        }
        .conf-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 10px; border-radius: 99px;
          font-size: 0.72rem; font-weight: 600;
        }
        .flag-field {
          margin-bottom: 6px;
        }
        .flag-field code {
          font-size: 0.8rem; padding: 2px 8px;
          background: rgba(255,255,255,0.06);
          border-radius: 4px; color: var(--accent-light);
        }
        .flag-reason {
          font-size: 0.84rem; color: var(--text-secondary);
          line-height: 1.55; margin: 0 0 4px 0;
        }

        /* Fix row */
        .flag-fix-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-top: 10px; padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,0.06);
          flex-wrap: wrap;
        }
        .fix-suggestion {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.82rem; color: var(--text-muted);
        }
        .fix-label strong { color: var(--text-primary); }
        .fix-actions { display: flex; gap: 6px; }

        .btn-fix {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 14px; border-radius: var(--radius-sm);
          font-size: 0.78rem; font-weight: 600;
          border: 1px solid transparent; cursor: pointer;
          font-family: inherit; transition: var(--transition);
        }
        .btn-fix-accept {
          background: rgba(16,185,129,0.12); color: var(--green);
          border-color: rgba(16,185,129,0.25);
        }
        .btn-fix-accept:hover {
          background: rgba(16,185,129,0.22);
          border-color: var(--green);
          transform: translateY(-1px);
        }
        .btn-fix-reject {
          background: rgba(239,68,68,0.08); color: var(--red);
          border-color: rgba(239,68,68,0.2);
        }
        .btn-fix-reject:hover {
          background: rgba(239,68,68,0.16);
          border-color: var(--red);
          transform: translateY(-1px);
        }

        /* Decision feedback */
        .flag-decision {
          display: flex; align-items: center; gap: 6px;
          margin-top: 10px; padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.78rem; font-weight: 600;
        }
        .flag-accepted {
          background: rgba(16,185,129,0.1); color: var(--green);
        }
        .flag-rejected {
          background: rgba(239,68,68,0.08); color: var(--text-muted);
        }

        /* Pagination */
        .dq-pagination {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px; padding-top: 8px;
        }
        .dq-page-info { font-size: 0.8rem; color: var(--text-muted); }
        .dq-page-btns { display: flex; gap: 6px; align-items: center; }
      `}</style>
    </div>
  );
}
