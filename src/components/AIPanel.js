'use client';

import { useState } from 'react';
import { Sparkles, Check, X, AlertTriangle, Loader2, ChevronRight } from 'lucide-react';

export default function AIPanel({ rows, onApplyFix }) {
  const [loading,     setLoading]     = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [error,       setError]       = useState(null);
  const [decisions,   setDecisions]   = useState({});

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setSuggestions(null);
    setDecisions({});
    try {
      const res  = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch suggestions');
      setSuggestions(data.suggestions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = (index, decision, suggestion) => {
    setDecisions(prev => ({ ...prev, [index]: decision }));
    if (decision === 'accept' && onApplyFix) {
      onApplyFix({ row: suggestion.row, field: suggestion.field, value: suggestion.suggestedValue });
    }
  };

  /* ── Empty / CTA state ── */
  if (!suggestions && !loading && !error) {
    return (
      <div className="ai-cta">
        <div className="ai-cta-icon">
          <Sparkles size={32} />
        </div>
        <h3 className="ai-cta-title">AI Data Quality Assistant</h3>
        <p className="ai-cta-desc">
          Run OpenRouter AI over your raw data to detect subtle typos, context-aware anomalies,
          and formatting issues that strict rule-based checks might miss.
        </p>
        <div className="ai-cta-meta">
          <span>✦ First 50 rows analysed</span>
          <span>✦ Data never stored</span>
          <span>✦ GPT-4o mini</span>
        </div>
        <button className="ai-run-btn" onClick={runAnalysis}>
          <Sparkles size={16} />
          Run AI Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="dq-root animate-in">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header-left">
          <Sparkles size={18} style={{ color: '#818cf8' }} />
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>AI Suggestions</h3>
            {suggestions && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={runAnalysis} disabled={loading} style={{ fontSize: '0.8rem' }}>
          {loading ? <Loader2 size={14} className="ai-spin" /> : <Sparkles size={14} />}
          {loading ? 'Analysing…' : 'Re-run'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="ai-error">
          <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span><strong>Error:</strong> {error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="ai-loading">
          <Loader2 size={36} className="ai-spin" style={{ marginBottom: 12 }} />
          <p>Sending data to OpenRouter…</p>
          <span>This usually takes 5–15 seconds</span>
        </div>
      )}

      {/* No suggestions */}
      {suggestions && suggestions.length === 0 && !loading && (
        <div className="dq-clean">
          <Check size={40} style={{ color: 'var(--green)' }} />
          <h3>No suggestions</h3>
          <p>The AI could not find any additional improvements beyond the rule-based checks.</p>
        </div>
      )}

      {/* Suggestion cards */}
      {suggestions && suggestions.length > 0 && !loading && (
        <div className="flag-list">
          {suggestions.map((s, idx) => {
            const decision = decisions[idx];
            return (
              <div
                key={idx}
                className={`flag-card animate-slide ${decision ? 'flag-decided' : ''}`}
                style={{ animationDelay: `${idx * 25}ms`, borderLeft: decision === 'accept' ? '3px solid var(--green)' : decision === 'reject' ? '3px solid rgba(255,255,255,0.1)' : undefined }}
              >
                {/* Top row */}
                <div className="flag-card-top">
                  <span className="row-pill">Row #{s.row + 1}</span>
                  <span className="badge" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.25)' }}>
                    <Sparkles size={11} /> AI Suggestion
                  </span>
                </div>

                {/* Field */}
                <div className="flag-field">
                  <code>{s.field}</code>
                </div>

                {/* Reason */}
                <p className="flag-reason">{s.reason}</p>

                {/* Before → After */}
                {!decision && (
                  <div className="ai-diff-row">
                    <div className="ai-diff-box ai-diff-before">
                      <span className="ai-diff-label">Original</span>
                      <span className="ai-diff-val">{s.originalValue}</span>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <div className="ai-diff-box ai-diff-after">
                      <span className="ai-diff-label">Suggested</span>
                      <span className="ai-diff-val">{s.suggestedValue}</span>
                    </div>
                    <div className="fix-actions" style={{ marginLeft: 'auto' }}>
                      <button className="btn-fix btn-fix-accept" onClick={() => handleDecision(idx, 'accept', s)}>
                        <Check size={13} /> Accept
                      </button>
                      <button className="btn-fix btn-fix-reject" onClick={() => handleDecision(idx, 'reject', s)}>
                        <X size={13} /> Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Decision badge */}
                {decision === 'accept' && (
                  <div className="flag-decision flag-accepted">
                    <Check size={13} /> Fix accepted — updated to &quot;{s.suggestedValue}&quot;
                  </div>
                )}
                {decision === 'reject' && (
                  <div className="flag-decision flag-rejected">
                    <X size={13} /> Suggestion rejected — keeping original value
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .ai-spin { animation: aiSpin 1s linear infinite; display: block; }
        @keyframes aiSpin { 100% { transform: rotate(360deg); } }

        .ai-cta {
          display: flex; flex-direction: column; align-items: center;
          padding: 48px 32px; text-align: center; gap: 0;
        }
        .ai-cta-icon {
          width: 72px; height: 72px; border-radius: 18px;
          background: rgba(129,140,248,0.1);
          border: 1px solid rgba(129,140,248,0.2);
          display: flex; align-items: center; justify-content: center;
          color: #818cf8; margin-bottom: 20px;
        }
        .ai-cta-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 10px; color: #fff; }
        .ai-cta-desc {
          font-size: 0.87rem; color: var(--text-secondary);
          max-width: 380px; line-height: 1.65; margin-bottom: 20px;
        }
        .ai-cta-meta {
          display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;
          font-size: 0.75rem; color: var(--text-muted); margin-bottom: 28px;
        }
        .ai-run-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: #818cf8; color: #fff; border: none;
          padding: 12px 24px; border-radius: 8px;
          font-size: 0.9rem; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: all 0.2s;
        }
        .ai-run-btn:hover { background: #6366f1; transform: translateY(-1px); }

        .ai-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px;
        }
        .ai-header-left { display: flex; align-items: center; gap: 10px; }

        .ai-error {
          display: flex; align-items: center; gap: 10px;
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px; padding: 12px 16px;
          font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 12px;
        }

        .ai-loading {
          display: flex; flex-direction: column; align-items: center;
          padding: 48px; text-align: center; color: var(--text-muted);
        }
        .ai-loading p   { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 6px; }
        .ai-loading span { font-size: 0.78rem; }

        .ai-diff-row {
          display: flex; align-items: center; gap: 10px;
          margin-top: 12px; padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.06);
          flex-wrap: wrap;
        }
        .ai-diff-box {
          display: flex; flex-direction: column; gap: 2px;
          padding: 8px 12px; border-radius: 8px; min-width: 110px;
        }
        .ai-diff-before {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.18);
        }
        .ai-diff-after {
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.18);
        }
        .ai-diff-label {
          font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .ai-diff-before .ai-diff-label { color: #ef4444; }
        .ai-diff-after  .ai-diff-label { color: #10b981; }
        .ai-diff-val {
          font-size: 0.85rem; font-weight: 600;
          text-decoration: none;
        }
        .ai-diff-before .ai-diff-val { color: #ef4444; text-decoration: line-through; }
        .ai-diff-after  .ai-diff-val { color: #10b981; }
      `}</style>
    </div>
  );
}
