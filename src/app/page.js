'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  BarChart2, ShieldCheck, Table, Settings2,
  Upload, FileSpreadsheet, ChevronDown, Sparkles,
  CheckCircle2, AlertTriangle, Copy, XCircle
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

import * as XLSX       from 'xlsx';

import FileUpload      from '../components/FileUpload';
import ChartConfig     from '../components/ChartConfig';
import DataChart       from '../components/DataChart';
import DataQualityPanel from '../components/DataQualityPanel';
import DataTable       from '../components/DataTable';
import Banner          from '../components/Banner';
import AIPanel         from '../components/AIPanel';
import OnboardingTour  from '../components/OnboardingTour';
import { runDataQuality, qualitySummary, flaggedRowSet, detectBulkPatterns } from '../lib/dataQuality';

// ─── Tabs ────────────────────────────────────────
const TABS = [
  { id: 'quality', label: 'Data Quality',    icon: <ShieldCheck size={15} /> },
  { id: 'ai',      label: 'AI Suggestions',  icon: <Sparkles size={15} /> },
  { id: 'table',   label: 'Raw Data',        icon: <Table size={15} /> },
];

const DONUT_COLORS = { clean: '#10b981', flagged: '#f59e0b', duplicate: '#f97316' };

// ─── Default config ───────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  chartType: 'bar',
  xAxis:  '',
  yAxis:  '',
  limit:  50,
  palette:'indigo',
};

export default function Page() {
  const [fileData,    setFileData]    = useState(null);
  const [activeSheet, setActiveSheet] = useState(null);
  const [config,      setConfig]      = useState(DEFAULT_CONFIG);
  const [activeTab,   setActiveTab]   = useState('quality');
  const [configOpen,  setConfigOpen]  = useState(true);

  // ── Derived sheet data ─────────────────────────────────────────────────────
  const sheetName = activeSheet || fileData?.sheetNames?.[0];
  const sheetData = fileData?.sheets?.[sheetName];
  const rows      = sheetData?.rows    || [];
  const headers   = sheetData?.headers || [];

  // ── Run quality checks (memoised) ──────────────────────────────────────────
  const flags   = useMemo(() => runDataQuality(rows, headers), [rows, headers]);
  const summary = useMemo(() => qualitySummary(flags), [flags]);

  // ── Handle file load ───────────────────────────────────────────────────────
  const handleData = (data) => {
    setFileData(data);
    setActiveSheet(null);
    setConfig({ ...DEFAULT_CONFIG, sheet: data?.sheetNames?.[0] });
    setActiveTab('quality');
  };

  // ── Handle config change (including sheet swap) ────────────────────────────
  const handleConfig = (newCfg) => {
    if (newCfg.sheet && newCfg.sheet !== sheetName) {
      setActiveSheet(newCfg.sheet);
      setConfig({ ...newCfg, xAxis: '', yAxis: '' });
    } else {
      setConfig(newCfg);
    }
  };

  // ── Apply a single fix (accept button) ─────────────────────────────────────
  const handleApplyFix = useCallback(({ row, field, value }) => {
    setFileData(prev => {
      const newFileData = { ...prev };
      const currentSheetName = sheetName || newFileData.sheetNames[0];
      const currentSheet = newFileData.sheets[currentSheetName];
      if (!currentSheet || !currentSheet.rows[row]) return prev;
      
      const newRows = [...currentSheet.rows];
      newRows[row] = { ...newRows[row], [field]: value };
      currentSheet.rows = newRows;
      
      return newFileData;
    });
  }, [sheetName]);

  // ── Apply a bulk pattern fix ───────────────────────────────────────────────
  const handleBulkFix = useCallback((pattern) => {
    setFileData(prev => {
      const newFileData = { ...prev };
      const currentSheetName = sheetName || newFileData.sheetNames[0];
      const currentSheet = newFileData.sheets[currentSheetName];
      if (!currentSheet) return prev;
      
      const newRows = [...currentSheet.rows];
      const currentFlags = runDataQuality(newRows, headers);
      
      currentFlags.forEach(f => {
        if (!f.suggestedFix) return;
        if (f.field !== pattern.field || f.issue !== pattern.issue) return;
        if (pattern.rowIndices.includes(f.row)) {
          newRows[f.row] = { ...newRows[f.row], [f.field]: f.suggestedFix.value };
        }
      });
      
      currentSheet.rows = newRows;
      return newFileData;
    });
  }, [sheetName, headers]);

  // ── Export to Excel ────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!rows || rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Data');
    XLSX.writeFile(wb, `Exported_${fileData?.fileName || 'Data.xlsx'}`);
  }, [rows, headers, sheetName, fileData]);

  const hasData    = rows.length > 0;
  const flagCount  = flags.length;
  const dupCount   = summary.POSSIBLE_DUPLICATE || 0;
  const badRowSet  = useMemo(() => flaggedRowSet(flags), [flags]);
  const cleanRows  = rows.length - badRowSet.size;
  const flaggedOnly = badRowSet.size - (dupCount > 0 ? new Set(flags.filter(f => f.issue === 'POSSIBLE_DUPLICATE').map(f => f.row)).size : 0);
  const dupRowCount = dupCount > 0 ? new Set(flags.filter(f => f.issue === 'POSSIBLE_DUPLICATE').map(f => f.row)).size : 0;

  return (
    <div className="page-root">
      <OnboardingTour />
      {/* ── Ambient glow orbs ───────────────────────────────────────────────── */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════════════════════ */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon"><Sparkles size={18} /></div>
            <div>
              <h1 className="brand-name">LoanVision</h1>
              <p className="brand-sub">Excel → Insights in seconds</p>
            </div>
          </div>

          {hasData && (
            <div className="header-stats">
              <div className="hstat">
                <FileSpreadsheet size={14} />
                <span>{rows.length.toLocaleString()} rows</span>
              </div>
              <div className="hstat">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{headers.length} cols</span>
              </div>
              {flagCount > 0 && (
                <button
                  className="hstat hstat-warn"
                  onClick={() => setActiveTab('quality')}
                  title="View data quality issues"
                >
                  <ShieldCheck size={14} />
                  <span>{flagCount} issues</span>
                  {dupCount > 0 && (
                    <span className="badge badge-orange" style={{ padding: '1px 7px', fontSize: '0.7rem' }}>
                      {dupCount / 2} dupes
                    </span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Banner ──────────────────────────────────────────────────────── */}
      <Banner
        id="new-features-banner"
        message="🎉 New features: Bulk Pattern Fixes and Confidence Tiers are now available!"
        variant="normal"
        height="2.5rem"
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN
      ═══════════════════════════════════════════════════════════════════════ */}
      <main className="app-main">

        {/* ── Upload zone ─────────────────────────────────────────────────── */}
        {!hasData && (
          <section className="upload-section animate-in">
            <div className="upload-hero">
              <div className="upload-badge">
                <Upload size={14} />
                <span>Loan Register Analyser</span>
              </div>
              <h2 className="upload-title">
                Drop your Excel file<br />
                <span className="gradient-text">and get instant insights</span>
              </h2>
              <p className="upload-desc">
                Supports <code>.xlsx</code> / <code>.xls</code> · Parses all sheets ·
                Runs data quality checks automatically
              </p>
            </div>

            <div className="upload-card card">
              <FileUpload onData={handleData} />
            </div>

            {/* ── Feature chips ─────────────────────────────────────────── */}
            <div className="feature-chips">
              {[
                { icon: <BarChart2 size={14} />, text: '5 chart types' },
                { icon: <ShieldCheck size={14} />, text: 'Auto quality checks' },
                { icon: <Table size={14} />, text: 'Inline flagging' },
              ].map((f, i) => (
                <div key={i} className="chip">
                  {f.icon}
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Dashboard ───────────────────────────────────────────────────── */}
        {hasData && (
          <div className="dashboard animate-in">

            {/* ══════════════════════════════════════════════════════════
                SUMMARY STATS — the main event
            ══════════════════════════════════════════════════════════ */}
            <section className="summary-section">
              {/* Mini donut */}
              <div className="summary-donut card">
                <div className="donut-wrap">
                  <ResponsiveContainer width={150} height={150}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Clean', value: cleanRows },
                          { name: 'Flagged', value: flaggedOnly },
                          { name: 'Duplicate', value: dupRowCount },
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                        startAngle={90} endAngle={-270}
                        strokeWidth={0}
                      >
                        {[
                          { key: 'clean', color: DONUT_COLORS.clean },
                          { key: 'flagged', color: DONUT_COLORS.flagged },
                          { key: 'duplicate', color: DONUT_COLORS.duplicate },
                        ].filter((_, i) => [cleanRows, flaggedOnly, dupRowCount][i] > 0)
                         .map((c, i) => <Cell key={i} fill={c.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center">
                    <span className="donut-big">{rows.length}</span>
                    <span className="donut-lbl">rows</span>
                  </div>
                </div>
                <div className="donut-legend">
                  <div className="legend-item"><span className="legend-dot" style={{ background: DONUT_COLORS.clean }} /><span>Clean</span><strong>{cleanRows}</strong></div>
                  <div className="legend-item"><span className="legend-dot" style={{ background: DONUT_COLORS.flagged }} /><span>Flagged</span><strong>{badRowSet.size}</strong></div>
                  <div className="legend-item"><span className="legend-dot" style={{ background: DONUT_COLORS.duplicate }} /><span>Duplicates</span><strong>{dupRowCount}</strong></div>
                </div>
              </div>

              {/* Stat cards */}
              <div className="summary-cards">
                <div className="sum-card" style={{ '--s-color': 'var(--accent)' }}>
                  <div className="sum-card-icon"><FileSpreadsheet size={18} /></div>
                  <div className="sum-card-val">{rows.length.toLocaleString()}</div>
                  <div className="sum-card-lbl">Total Rows</div>
                  <div className="sum-card-sub">{headers.length} columns · sheet "{sheetName}"</div>
                </div>

                <div className="sum-card" style={{ '--s-color': 'var(--green)' }}>
                  <div className="sum-card-icon"><CheckCircle2 size={18} /></div>
                  <div className="sum-card-val">{cleanRows.toLocaleString()}</div>
                  <div className="sum-card-lbl">Clean Rows</div>
                  <div className="sum-card-sub">{rows.length > 0 ? ((cleanRows / rows.length) * 100).toFixed(1) : 0}% pass all checks</div>
                </div>

                <div className="sum-card" style={{ '--s-color': 'var(--yellow)' }}>
                  <div className="sum-card-icon"><AlertTriangle size={18} /></div>
                  <div className="sum-card-val">{badRowSet.size}</div>
                  <div className="sum-card-lbl">Flagged Rows</div>
                  <div className="sum-card-sub">
                    {summary.MISSING_VALUE || 0} missing · {summary.INVALID_FORMAT || 0} format
                  </div>
                </div>

                <div className="sum-card" style={{ '--s-color': 'var(--orange)' }}>
                  <div className="sum-card-icon"><Copy size={18} /></div>
                  <div className="sum-card-val">{dupCount > 0 ? `${Math.floor(dupCount / 2)}` : '0'}</div>
                  <div className="sum-card-lbl">Duplicate Pairs</div>
                  <div className="sum-card-sub">{dupRowCount} rows involved · needs review</div>
                </div>
              </div>
            </section>

            {/* ── Text Insights ─────────────────────────────────────────── */}
            <div className="insight-text animate-in" style={{ animationDelay: '0.1s' }}>
              <strong>Insights:</strong> Analysed <strong>{rows.length.toLocaleString()}</strong> loans in the {sheetName} sheet. 
              {cleanRows === rows.length ? (
                <span> All rows passed quality checks with flying colours.</span>
              ) : (
                <span> Found <strong>{badRowSet.size}</strong> rows with issues, including {dupCount > 0 ? <strong>{dupRowCount} duplicates</strong> : 'no duplicates'} requiring manual review.</span>
              )}
              {config.xAxis && config.yAxis && (
                <span> The chart below visualises <strong>{config.yAxis}</strong> broken down by <strong>{config.xAxis}</strong>.</span>
              )}
            </div>

            {/* ── Body: sidebar + content ───────────────────────────────── */}
            <div className="dash-body">

              {/* Sidebar */}
              <aside className="sidebar card">
                <div className="sidebar-header" onClick={() => setConfigOpen(o => !o)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Settings2 size={15} style={{ color: 'var(--accent-light)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Configuration</span>
                  </div>
                  <ChevronDown
                    size={14}
                    style={{
                      color: 'var(--text-muted)',
                      transform: configOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                </div>

                {configOpen && (
                  <div className="sidebar-body animate-in">
                    <ChartConfig
                      headers={headers}
                      sheetNames={fileData.sheetNames}
                      config={{ ...config, sheet: sheetName }}
                      onChange={handleConfig}
                    />
                  </div>
                )}

                <hr className="divider" />

                {/* File info */}
                <div className="file-info">
                  <FileSpreadsheet size={13} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500, wordBreak: 'break-all' }}>
                      {fileData.fileName}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {fileData.sheetNames.length} sheet{fileData.sheetNames.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', marginTop: 4, justifyContent: 'center', fontSize: '0.8rem' }}
                  onClick={() => handleData(null)}
                >
                  <Upload size={13} />
                  Upload new file
                </button>
              </aside>

              {/* Main panel */}
              <div className="main-panel">
                
                {/* ── Always Visible Chart ── */}
                <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <BarChart2 size={16} style={{ color: 'var(--accent-light)' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Visualisation</h3>
                  </div>
                  <DataChart data={rows} config={config} />
                </div>

                {/* Tabs */}
                <div className="tabs">
                  {TABS.map(t => (
                    <button
                      key={t.id}
                      className={`tab-btn${activeTab === t.id ? ' tab-active' : ''}`}
                      onClick={() => setActiveTab(t.id)}
                    >
                      {t.icon}
                      {t.label}
                      {t.id === 'quality' && flagCount > 0 && (
                        <span className="tab-badge">{flagCount}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="tab-content card">
                  {activeTab === 'quality' && (
                    <DataQualityPanel
                      flags={flags}
                      totalRows={rows.length}
                      onApplyFix={handleApplyFix}
                      onApplyBulkFix={handleBulkFix}
                    />
                  )}

                  {activeTab === 'ai' && (
                    <AIPanel
                      rows={rows}
                      onApplyFix={handleApplyFix}
                    />
                  )}

                  {activeTab === 'table' && (
                    <DataTable
                      rows={rows}
                      headers={headers}
                      flags={flags}
                      fileName={fileData?.fileName}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        /* ── Layout ─────────────────────────────────────────────────────── */
        .page-root {
          position: relative;
          min-height: 100vh;
          z-index: 1;
        }

        /* Ambient orbs */
        .orb {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(120px);
          opacity: 0.12;
          z-index: 0;
        }
        .orb-1 {
          width: 600px; height: 600px;
          background: var(--accent);
          top: -200px; left: -200px;
        }
        .orb-2 {
          width: 500px; height: 500px;
          background: var(--accent-2);
          bottom: -150px; right: -150px;
        }

        /* ── Header ─────────────────────────────────────────────────────── */
        .app-header {
          position: sticky; top: 0; z-index: 100;
          border-bottom: 1px solid var(--border);
          background: rgba(10,12,20,0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .header-inner {
          max-width: 1400px; margin: 0 auto;
          padding: 14px 32px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .brand { display: flex; align-items: center; gap: 14px; }
        .brand-icon {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          box-shadow: 0 0 20px var(--accent-glow);
        }
        .brand-name { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.5px; }
        .brand-sub  { font-size: 0.72rem; color: var(--text-muted); font-weight: 400; margin-top: 1px; }

        .header-stats { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .hstat {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 99px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .hstat-warn {
          cursor: pointer;
          border-color: rgba(245,158,11,0.3);
          background: rgba(245,158,11,0.08);
          color: var(--yellow);
          font-family: inherit;
          transition: var(--transition);
        }
        .hstat-warn:hover {
          background: rgba(245,158,11,0.15);
          border-color: var(--yellow);
        }

        /* ── Main ───────────────────────────────────────────────────────── */
        .app-main {
          max-width: 1400px; margin: 0 auto;
          padding: 32px;
          position: relative; z-index: 1;
        }

        /* ── Upload section ─────────────────────────────────────────────── */
        .upload-section {
          max-width: 680px; margin: 60px auto;
          display: flex; flex-direction: column; gap: 28px;
        }
        .upload-hero { text-align: center; }
        .upload-badge {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 14px;
          background: var(--accent-glow);
          border: 1px solid var(--border-glow);
          border-radius: 99px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--accent-light);
          margin-bottom: 18px;
        }
        .upload-title {
          font-size: 2.2rem; font-weight: 800;
          line-height: 1.2; letter-spacing: -0.8px;
          margin-bottom: 12px;
        }
        .gradient-text {
          background: linear-gradient(90deg, var(--accent-light), var(--accent-2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .upload-desc { font-size: 0.9rem; color: var(--text-muted); }
        .upload-desc code {
          background: rgba(255,255,255,0.08);
          padding: 1px 5px; border-radius: 4px;
          font-size: 0.85em;
          color: var(--accent-light);
        }
        .upload-card { padding: 32px; }

        .feature-chips {
          display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;
        }
        .chip {
          display: flex; align-items: center; gap: 7px;
          padding: 7px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 99px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .chip svg { color: var(--accent-light); }

        /* ── Dashboard ──────────────────────────────────────────────────── */
        .dashboard { display: flex; flex-direction: column; gap: 20px; }

        /* Stat bar */
        .stat-bar {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }
        .mini-stat {
          padding: 16px 18px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          border-top: 2px solid var(--s-color, var(--accent));
          transition: var(--transition);
        }
        .mini-stat:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .mini-stat-val { font-size: 1.5rem; font-weight: 800; line-height: 1; }
        .mini-stat-lbl { font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }

        /* Body */
        .dash-body {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 20px;
          align-items: start;
        }

        /* Sidebar */
        .sidebar {
          position: sticky; top: 80px;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .sidebar-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px;
          cursor: pointer;
          user-select: none;
          transition: var(--transition);
        }
        .sidebar-header:hover { background: rgba(255,255,255,0.03); }
        .sidebar-body { padding: 0 20px 20px; }
        .file-info {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 20px;
        }

        /* Main panel */
        .main-panel { display: flex; flex-direction: column; gap: 0; }

        /* Tabs */
        .tabs {
          display: flex; gap: 4px;
          padding: 0 0 0 4px;
          margin-bottom: -1px;
          position: relative; z-index: 1;
        }
        .tab-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 18px;
          background: transparent;
          border: 1px solid transparent;
          border-bottom: none;
          border-radius: var(--radius-md) var(--radius-md) 0 0;
          color: var(--text-muted);
          font-family: inherit;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition);
          position: relative;
        }
        .tab-btn:hover { color: var(--text-secondary); background: rgba(255,255,255,0.03); }
        .tab-active {
          color: var(--text-primary) !important;
          background: rgba(255,255,255,0.04) !important;
          border-color: var(--border) !important;
          border-bottom-color: var(--bg-card) !important;
        }
        .tab-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 18px; height: 18px; padding: 0 5px;
          background: rgba(245,158,11,0.25);
          color: var(--yellow);
          border-radius: 99px;
          font-size: 0.68rem;
          font-weight: 700;
        }

        /* Tab content */
        .tab-content {
          border-radius: 0 var(--radius-lg) var(--radius-lg) var(--radius-lg);
          padding: 24px;
          min-height: 480px;
        }



        /* ── Responsive ─────────────────────────────────────────────────── */
        @media (max-width: 1100px) {
          .stat-bar { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 900px) {
          .dash-body { grid-template-columns: 1fr; }
          .sidebar { position: static; }
          .app-main { padding: 16px; }
          .header-inner { padding: 12px 16px; }
        }
        @media (max-width: 600px) {
          .stat-bar { grid-template-columns: repeat(2, 1fr); }
          .upload-title { font-size: 1.6rem; }
        }
      `}</style>
    </div>
  );
}
