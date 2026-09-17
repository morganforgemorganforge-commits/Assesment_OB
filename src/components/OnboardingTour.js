'use client';

import { useState, useEffect } from 'react';
import {
  Upload, ShieldCheck, Sparkles, Table, Download,
  CheckCircle2, ChevronRight, ChevronLeft, X, Zap
} from 'lucide-react';

const STEPS = [
  {
    icon: <Upload size={36} />,
    title: 'Upload Your Excel File',
    description: 'Drag and drop any .xlsx or .xls file. We support multiple sheets and auto-detect your column schema instantly — no configuration needed.',
    hint: 'Works with loan registers, financial data, customer lists, and more.',
  },
  {
    icon: <ShieldCheck size={36} />,
    title: 'Automatic Data Quality Check',
    description: 'Our rule-based engine scans every row for missing values, invalid formats, duplicate records, and more — all with plain-English explanations for each issue.',
    hint: 'Accept or reject suggested fixes with a single click. Nothing is auto-deleted.',
  },
  {
    icon: <Sparkles size={36} />,
    title: 'AI-Powered Suggestions',
    description: 'Go deeper with AI analysis powered by OpenRouter. It catches subtle typos and context-aware anomalies that rules alone would miss — like "Actve" instead of "Active".',
    hint: 'Your data is analyzed securely and never stored.',
  },
  {
    icon: <Zap size={36} />,
    title: 'Bulk Pattern Fixes',
    description: 'When the same issue appears across many rows (e.g. dates in DD/MM/YYYY format), we detect the pattern and let you fix all instances with a single click.',
    hint: 'Confidence tiers tell you when to trust automation vs. defer to a human.',
  },
  {
    icon: <Table size={36} />,
    title: 'Review & Visualise',
    description: 'Browse the full raw data table alongside live charts. Every fix you accept is immediately reflected in the table so you always see the current state of your data.',
    hint: 'Switch between Data Quality, AI Suggestions, and Raw Data tabs at any time.',
  },
  {
    icon: <Download size={36} />,
    title: 'Export Clean Data',
    description: 'Once you\'re happy with your data, export it back to Excel in one click. The downloaded file contains your original data with all accepted fixes applied.',
    hint: 'Your cleaned data is ready to use immediately.',
  },
];

export default function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep]       = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('tour-seen');
    if (!seen) {
      // Small delay for a smoother first impression
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem('tour-seen', 'true');
    }, 300);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className={`tour-overlay ${exiting ? 'tour-exiting' : 'tour-entering'}`}>
      <div className={`tour-modal ${exiting ? 'modal-exiting' : 'modal-entering'}`}>
        
        {/* Close */}
        <button className="tour-close" onClick={dismiss} title="Skip tour">
          <X size={16} />
        </button>

        {/* Progress bar */}
        <div className="tour-progress-bar">
          <div className="tour-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Step dots */}
        <div className="tour-dots">
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`tour-dot ${i === step ? 'tour-dot-active' : ''} ${i < step ? 'tour-dot-done' : ''}`}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
            >
              {i < step && <CheckCircle2 size={10} />}
            </button>
          ))}
        </div>

        {/* Icon */}
        <div className="tour-icon">
          {current.icon}
        </div>

        {/* Step counter */}
        <div className="tour-step-count">
          Step {step + 1} of {STEPS.length}
        </div>

        {/* Content */}
        <div className="tour-content" key={step}>
          <h2 className="tour-title">{current.title}</h2>
          <p className="tour-desc">{current.description}</p>
          <div className="tour-hint">
            <Zap size={12} />
            {current.hint}
          </div>
        </div>

        {/* Nav buttons */}
        <div className="tour-nav">
          <button
            className="btn btn-ghost tour-btn-prev"
            onClick={prev}
            disabled={step === 0}
          >
            <ChevronLeft size={16} /> Back
          </button>

          <button className="btn tour-btn-next" onClick={next}>
            {isLast ? (
              <>Get Started <CheckCircle2 size={16} /></>
            ) : (
              <>Next <ChevronRight size={16} /></>
            )}
          </button>
        </div>

        {/* Skip link */}
        <button className="tour-skip" onClick={dismiss}>
          Skip tour
        </button>
      </div>
    </div>
  );
}
