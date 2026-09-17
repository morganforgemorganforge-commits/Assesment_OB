'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Check, X, AlertTriangle, ChevronRight, Brain, Zap, FileSearch, CheckCircle2 } from 'lucide-react';

/* ── Animated loader steps ── */
const LOAD_STEPS = [
  { icon: <FileSearch size={18} />, text: 'Reading your data…' },
  { icon: <Brain size={18} />,       text: 'Sending to OpenRouter AI…' },
  { icon: <Zap size={18} />,         text: 'Analysing patterns & anomalies…' },
  { icon: <CheckCircle2 size={18} />,text: 'Compiling suggestions…' },
];

function AILoader() {
  const [step, setStep]     = useState(0);
  const [dots, setDots]     = useState('');

  useEffect(() => {
    const stepTimer = setInterval(() =>
      setStep(s => (s < LOAD_STEPS.length - 1 ? s + 1 : s)), 3500
    );
    const dotTimer = setInterval(() =>
      setDots(d => d.length >= 3 ? '' : d + '.'), 500
    );
    return () => { clearInterval(stepTimer); clearInterval(dotTimer); };
  }, []);

  return (
    <div className="ai-loader">
      <div className="ai-loader-visual">
        <div className="ai-loader-ring" />
        <div className="ai-loader-ring ai-loader-ring-2" />
        <Sparkles size={22} className="ai-loader-icon" />
      </div>

      <div className="ai-loader-steps">
        {LOAD_STEPS.map((s, i) => (
          <div
            key={i}
            className={`ai-loader-step ${i < step ? 'step-done' : i === step ? 'step-active' : 'step-pending'}`}
          >
            <div className="step-indicator">
              {i < step
                ? <Check size={12} />
                : i === step
                  ? <div className="step-pulse" />
                  : <div className="step-dot" />
              }
            </div>
            <span className="step-text">
              {s.text}{i === step ? dots : ''}
            </span>
          </div>
        ))}
      </div>

      <p className="ai-loader-sub">This usually takes 5–15 seconds</p>
    </div>
  );
}

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

  /* ── CTA / empty state ── */
  if (!suggestions && !loading && !error) {
    return (
      <div className="ai-cta-wrapper">
        <div className="ai-cta-icon">
          <Sparkles size={32} />
        </div>
        <h3 className="ai-cta-title">AI Data Quality Assistant</h3>
        <p className="ai-cta-desc">
          Run OpenRouter AI over your raw data to detect subtle typos, context-aware anomalies,
          and formatting issues that rule-based checks miss.
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
        <style jsx>{`
          .ai-cta-wrapper {
            display: flex; flex-direction: column; align-items: center;
            text-align: center; padding: 56px 32px; max-width: 520px; margin: 0 auto;
          }
          .ai-cta-icon {
            width: 72px; height: 72px; border-radius: 18px;
            background: rgba(129,140,248,0.1); border: 1px solid rgba(129,140,248,0.22);
            display: flex; align-items: center; justify-content: center;
            color: #818cf8; margin-bottom: 20px;
          }
          .ai-cta-title { font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 12px; }
          .ai-cta-desc  { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.65; margin-bottom: 24px; }
          .ai-cta-meta  {
            display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;
            font-size: 0.78rem; color: var(--text-muted); margin-bottom: 32px;
          }
          .ai-run-btn {
            display: inline-flex; align-items: center; gap: 8px;
            background: #fff; color: #000; border: none;
            padding: 13px 28px; border-radius: 8px;
            font-size: 0.92rem; font-weight: 700; font-family: inherit;
            cursor: pointer; transition: all 0.2s;
            box-shadow: 0 2px 12px rgba(0,0,0,0.35);
          }
          .ai-run-btn:hover { background: #e5e5e5; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
        `}</style>
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
        {!loading && (
          <button className="btn btn-ghost" onClick={runAnalysis} style={{ fontSize: '0.8rem' }}>
            <Sparkles size={14} /> Re-run
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="ai-error">
          <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span><strong>Error:</strong> {error}</span>
        </div>
      )}

      {/* Loader */}
      {loading && <AILoader />}

      {/* No suggestions */}
      {suggestions && suggestions.length === 0 && !loading && (
        <div className="dq-clean">
          <Check size={40} style={{ color: 'var(--green)' }} />
          <h3>No suggestions</h3>
          <p>The AI found no additional improvements beyond the rule-based checks.</p>
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
                style={{
                  animationDelay: `${idx * 25}ms`,
                  borderLeft: decision === 'accept'
                    ? '3px solid var(--green)'
                    : decision === 'reject'
                      ? '3px solid rgba(255,255,255,0.08)'
                      : undefined,
                  opacity: decision ? 0.7 : 1,
                }}
              >
                {/* Top row */}
                <div className="flag-card-top">
                  <span className="row-pill">Row #{s.row + 1}</span>
                  <span className="badge" style={{ background: 'rgba(129,140,248,0.12)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.22)' }}>
                    <Sparkles size={11} /> AI Suggestion
                  </span>
                </div>

                {/* Field + Reason */}
                <div className="flag-field"><code>{s.field}</code></div>
                <p className="flag-reason">{s.reason}</p>

                {/* Diff + actions */}
                {!decision ? (
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
                    <div className="ai-diff-actions">
                      <button className="btn-fix btn-fix-accept" onClick={() => handleDecision(idx, 'accept', s)}>
                        <Check size={13} /> Accept
                      </button>
                      <button className="btn-fix btn-fix-reject" onClick={() => handleDecision(idx, 'reject', s)}>
                        <X size={13} /> Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`flag-decision ${decision === 'accept' ? 'flag-accepted' : 'flag-rejected'}`}>
                    {decision === 'accept'
                      ? <><Check size={13} /> Fix accepted &mdash; updated to &ldquo;{s.suggestedValue}&rdquo;</>
                      : <><X size={13} /> Suggestion rejected</>
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        /* ── CTA ── */
        .ai-cta { display:flex; flex-direction:column; align-items:center; padding:56px 32px; text-align:center; }
        .ai-cta-icon {
          width:72px; height:72px; border-radius:18px;
          background:rgba(129,140,248,0.1); border:1px solid rgba(129,140,248,0.22);
          display:flex; align-items:center; justify-content:center;
          color:#818cf8; margin-bottom:20px;
        }
        .ai-cta-title { font-size:1.2rem; font-weight:700; color:#fff; margin-bottom:10px; }
        .ai-cta-desc  { font-size:0.87rem; color:var(--text-secondary); max-width:380px; line-height:1.65; margin-bottom:20px; }
        .ai-cta-meta  { display:flex; gap:16px; flex-wrap:wrap; justify-content:center; font-size:0.75rem; color:var(--text-muted); margin-bottom:28px; }
        .ai-run-btn {
          display:inline-flex; align-items:center; gap:8px;
          background:#818cf8; color:#fff; border:none;
          padding:12px 24px; border-radius:8px;
          font-size:0.9rem; font-weight:600; font-family:inherit; cursor:pointer; transition:all 0.2s;
        }
        .ai-run-btn:hover { background:#6366f1; transform:translateY(-1px); }

        /* ── Header ── */
        .ai-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
        .ai-header-left { display:flex; align-items:center; gap:10px; }

        /* ── Error ── */
        .ai-error {
          display:flex; align-items:center; gap:10px;
          background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2);
          border-radius:10px; padding:12px 16px; font-size:0.84rem;
          color:var(--text-secondary); margin-bottom:12px;
        }

        /* ── Loader ── */
        .ai-loader {
          display:flex; flex-direction:column; align-items:center;
          padding:48px 24px; gap:24px;
        }
        .ai-loader-visual {
          position:relative; width:72px; height:72px;
          display:flex; align-items:center; justify-content:center;
        }
        .ai-loader-ring {
          position:absolute; inset:0;
          border:2px solid transparent;
          border-top-color:#818cf8;
          border-radius:50%;
          animation:aiRing 1.1s linear infinite;
        }
        .ai-loader-ring-2 {
          inset:8px;
          border-top-color:#6366f1;
          animation-duration:0.75s;
          animation-direction:reverse;
        }
        .ai-loader-icon { color:#818cf8; z-index:1; }
        @keyframes aiRing { 100% { transform:rotate(360deg); } }

        .ai-loader-steps {
          display:flex; flex-direction:column; gap:10px; width:100%; max-width:300px;
        }
        .ai-loader-step {
          display:flex; align-items:center; gap:10px;
          font-size:0.85rem; transition:all 0.3s;
        }
        .step-indicator {
          width:22px; height:22px; border-radius:50%; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          border:1px solid rgba(255,255,255,0.12);
          font-size:0.7rem;
        }
        .step-done .step-indicator { background:rgba(16,185,129,0.15); border-color:var(--green); color:var(--green); }
        .step-active .step-indicator { background:rgba(129,140,248,0.15); border-color:#818cf8; }
        .step-pending .step-indicator { background:transparent; }

        .step-pulse {
          width:8px; height:8px; border-radius:50%; background:#818cf8;
          animation:pulse 1s ease-in-out infinite;
        }
        .step-dot { width:6px; height:6px; border-radius:50%; background:rgba(255,255,255,0.15); }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }

        .step-done   .step-text { color:var(--text-muted); text-decoration:line-through; }
        .step-active .step-text { color:var(--text-primary); font-weight:600; }
        .step-pending .step-text { color:var(--text-muted); }

        .ai-loader-sub { font-size:0.75rem; color:var(--text-muted); }

        /* ── Diff row ── */
        .ai-diff-row {
          display:flex; align-items:center; gap:10px;
          margin-top:12px; padding-top:12px;
          border-top:1px solid rgba(255,255,255,0.06);
          flex-wrap:wrap;
        }
        .ai-diff-box {
          display:flex; flex-direction:column; gap:3px;
          padding:8px 12px; border-radius:8px;
        }
        .ai-diff-before { background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.18); min-width:100px; }
        .ai-diff-after  { background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.18); min-width:100px; }
        .ai-diff-label  { font-size:0.65rem; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; }
        .ai-diff-before .ai-diff-label { color:#ef4444; }
        .ai-diff-after  .ai-diff-label { color:#10b981; }
        .ai-diff-val    { font-size:0.88rem; font-weight:600; }
        .ai-diff-before .ai-diff-val { color:#ef4444; text-decoration:line-through; }
        .ai-diff-after  .ai-diff-val { color:#10b981; }

        .ai-diff-actions { display:flex; gap:6px; flex-shrink:0; margin-left:auto; align-self:center; }
      `}</style>
    </div>
  );
}
