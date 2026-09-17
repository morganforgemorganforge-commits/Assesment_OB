/**
 * dataQuality.js - Schema-aware data-quality engine for the Loan Register.
 *
 * Schema: branch | customer_name | loan_amount | loan_date | phone | status
 *
 * Each flag: { row, field, issue, reason, confidence, suggestedFix, relatedRow? }
 * confidence: 'HIGH' | 'MEDIUM' | 'LOW'
 * suggestedFix: { value, label } | null
 */

function findCol(headers, ...candidates) {
  for (const c of candidates) {
    const match = headers.find(h => h.toLowerCase().includes(c.toLowerCase()));
    if (match) return match;
  }
  return null;
}

export function detectSchemaColumns(headers) {
  return {
    branch: findCol(headers, 'branch'),
    name:   findCol(headers, 'customer_name', 'customer name', 'name'),
    amount: findCol(headers, 'loan_amount', 'loan amount', 'amount'),
    date:   findCol(headers, 'loan_date', 'loan date', 'date'),
    phone:  findCol(headers, 'phone'),
    status: findCol(headers, 'status'),
  };
}

const VALID_STATUSES  = ['active', 'closed', 'npa'];
const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_10_DIGIT  = /^\d{10}$/;

function normalisePhone(v) {
  return String(v || '').replace(/[\s\-().+]/g, '');
}

function normaliseAmount(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v).replace(/[,\s]/g, ''));
  return isNaN(n) ? null : n;
}

// Infer a YYYY-MM-DD value from common alternate date formats
function inferDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // DD/MM/YYYY  DD-MM-YYYY  DD.MM.YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    if (parseInt(m) >= 1 && parseInt(m) <= 12 && parseInt(d) >= 1 && parseInt(d) <= 31) {
      return { value: `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`, format: 'DD/MM/YYYY', confidence: 'HIGH' };
    }
  }
  // DD/MM/YY
  const dmy2 = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/);
  if (dmy2) {
    const [, d, m, y] = dmy2;
    return { value: `20${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`, format: 'DD/MM/YY', confidence: 'MEDIUM' };
  }
  // Excel serial
  if (/^\d+$/.test(s)) {
    const serial = parseInt(s);
    if (serial > 40000 && serial < 60000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      epoch.setUTCDate(epoch.getUTCDate() + serial);
      return { value: epoch.toISOString().slice(0, 10), format: 'Excel serial', confidence: 'HIGH' };
    }
  }
  return null;
}

function inferStatus(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  for (const v of VALID_STATUSES) {
    if (s === v || s.includes(v) || v.includes(s)) {
      return { value: v.charAt(0).toUpperCase() + v.slice(1), confidence: 'HIGH' };
    }
  }
  const match = VALID_STATUSES.find(v => v[0] === s[0]);
  if (match) return { value: match.charAt(0).toUpperCase() + match.slice(1), confidence: 'MEDIUM' };
  return null;
}

function levenshtein(a, b) {
  a = String(a || '').toLowerCase().trim();
  b = String(b || '').toLowerCase().trim();
  if (a === b) return 0;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function similarity(a, b) {
  a = String(a || '').toLowerCase().trim();
  b = String(b || '').toLowerCase().trim();
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - levenshtein(a, b) / maxLen;
}

function checkMissing(rows, cols) {
  const flags = [];
  const required = Object.values(cols).filter(Boolean);
  rows.forEach((row, idx) => {
    required.forEach(field => {
      const val = row[field];
      if (val === null || val === undefined || String(val).trim() === '') {
        flags.push({
          row, field, issue: 'MISSING_VALUE',
          reason: `"${field}" is empty — this field is required for every loan record.`,
          confidence: 'LOW', suggestedFix: null,
        });
      }
    });
  });
  return flags;
}

function checkFormats(rows, cols) {
  const flags = [];
  rows.forEach((row, idx) => {
    // phone
    if (cols.phone) {
      const raw = String(row[cols.phone] || '').trim();
      const stripped = normalisePhone(raw);
      const digitsOnly = stripped.replace(/\D/g, '');
      if (raw && !PHONE_10_DIGIT.test(stripped)) {
        flags.push({
          row: idx, field: cols.phone, issue: 'INVALID_FORMAT',
          reason: `Phone "${raw}" has ${digitsOnly.length} digit${digitsOnly.length !== 1 ? 's' : ''} — expected exactly 10.`,
          confidence: digitsOnly.length === 10 ? 'HIGH' : 'LOW',
          suggestedFix: digitsOnly.length === 10 ? { value: digitsOnly, label: `Strip to "${digitsOnly}"` } : null,
        });
      }
    }
    // date
    if (cols.date) {
      const raw = String(row[cols.date] || '').trim();
      if (raw && !DATE_YYYY_MM_DD.test(raw)) {
        const inferred = inferDate(raw);
        flags.push({
          row: idx, field: cols.date, issue: 'INVALID_FORMAT',
          reason: `Date "${raw}" is not YYYY-MM-DD.${inferred ? ` Detected as ${inferred.format}.` : ' Format not recognised.'}`,
          confidence: inferred ? inferred.confidence : 'LOW',
          suggestedFix: inferred ? { value: inferred.value, label: `Convert to "${inferred.value}"` } : null,
        });
      }
    }
    // amount
    if (cols.amount) {
      const raw = String(row[cols.amount] || '').trim();
      if (raw) {
        const n = normaliseAmount(raw);
        if (n === null) {
          flags.push({ row: idx, field: cols.amount, issue: 'INVALID_FORMAT',
            reason: `Loan amount "${raw}" cannot be parsed as a number.`,
            confidence: 'LOW', suggestedFix: null });
        } else if (n <= 0) {
          flags.push({ row: idx, field: cols.amount, issue: 'INVALID_FORMAT',
            reason: `Loan amount ${n} must be positive — zero and negative values are not valid.`,
            confidence: 'LOW', suggestedFix: null });
        }
      }
    }
    // status
    if (cols.status) {
      const raw = String(row[cols.status] || '').trim();
      if (raw && !VALID_STATUSES.includes(raw.toLowerCase())) {
        const inferred = inferStatus(raw);
        flags.push({
          row: idx, field: cols.status, issue: 'INVALID_FORMAT',
          reason: `Status "${raw}" is not one of: Active, Closed, NPA.`,
          confidence: inferred ? inferred.confidence : 'LOW',
          suggestedFix: inferred ? { value: inferred.value, label: `Change to "${inferred.value}"` } : null,
        });
      }
    }
  });
  return flags;
}

function checkDuplicates(rows, cols) {
  const flags = [];
  const n = rows.length;
  const flaggedPairs = new Set();
  const pairKey = (a, b) => `${Math.min(a,b)}-${Math.max(a,b)}`;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (flaggedPairs.has(pairKey(i, j))) continue;
      const rowA = rows[i], rowB = rows[j];
      const reasons = [];
      let confidence = 'LOW';

      if (cols.phone) {
        const pA = normalisePhone(rowA[cols.phone]);
        const pB = normalisePhone(rowB[cols.phone]);
        if (pA && pB && pA === pB && PHONE_10_DIGIT.test(pA)) {
          reasons.push(`identical phone number (${rowA[cols.phone]})`);
          confidence = 'MEDIUM';
        }
      }
      if (reasons.length === 0 && cols.name) {
        const nameSim = similarity(rowA[cols.name], rowB[cols.name]);
        if (nameSim >= 0.8) {
          const supporting = [];
          let supportCount = 0;
          if (cols.amount) {
            const amtA = normaliseAmount(rowA[cols.amount]);
            const amtB = normaliseAmount(rowB[cols.amount]);
            if (amtA !== null && amtB !== null && amtA === amtB) { supporting.push(`same loan amount (${rowA[cols.amount]})`); supportCount++; }
          }
          if (cols.date) {
            const dA = String(rowA[cols.date] || '').trim();
            const dB = String(rowB[cols.date] || '').trim();
            if (dA && dB && dA === dB) { supporting.push(`same loan date (${dA})`); supportCount++; }
          }
          if (supportCount > 0) {
            reasons.push(`name similarity ${(nameSim * 100).toFixed(0)}%`, ...supporting);
            confidence = supportCount >= 2 ? 'MEDIUM' : 'LOW';
          }
        }
      }
      if (reasons.length > 0) {
        flaggedPairs.add(pairKey(i, j));
        const rt = reasons.join(', ');
        flags.push({ row: i, field: cols.phone || cols.name || '(multiple)', issue: 'POSSIBLE_DUPLICATE',
          reason: `May be a duplicate of Row ${j+1}: ${rt}. Needs manual review — row has NOT been deleted.`,
          confidence, suggestedFix: null, relatedRow: j });
        flags.push({ row: j, field: cols.phone || cols.name || '(multiple)', issue: 'POSSIBLE_DUPLICATE',
          reason: `May be a duplicate of Row ${i+1}: ${rt}. Needs manual review — row has NOT been deleted.`,
          confidence, suggestedFix: null, relatedRow: i });
      }
    }
  }
  return flags;
}

/**
 * Finds groups of 2+ flags sharing the same field+issue pattern.
 * Returns: { field, issue, pattern, confidence, rowIndices }[]
 */
export function detectBulkPatterns(flags) {
  const groups = {};
  flags.forEach(f => {
    if (!f.suggestedFix) return;
    const isDate = f.field.toLowerCase().includes('date');
    const key = isDate
      ? `${f.field}||${f.issue}||DATE_FMT`
      : `${f.field}||${f.issue}||${f.suggestedFix.label}`;
    if (!groups[key]) {
      groups[key] = {
        field: f.field, issue: f.issue, confidence: f.confidence,
        pattern: isDate ? 'Standardise date format to YYYY-MM-DD' : f.suggestedFix.label,
        rowIndices: [],
      };
    }
    if (!groups[key].rowIndices.includes(f.row)) groups[key].rowIndices.push(f.row);
  });
  return Object.values(groups)
    .filter(g => g.rowIndices.length >= 2)
    .sort((a, b) => b.rowIndices.length - a.rowIndices.length);
}

export function runDataQuality(rows, headers) {
  if (!rows || rows.length === 0) return [];
  const cols = detectSchemaColumns(headers);
  const flags = [
    ...checkMissing(rows, cols),
    ...checkFormats(rows, cols),
    ...checkDuplicates(rows, cols),
  ];
  const seen = new Set();
  return flags.filter(f => {
    const id = `${f.row}|${f.field}|${f.issue}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function flaggedRowSet(flags) { return new Set(flags.map(f => f.row)); }
export function flagsForRow(flags, rowIndex) { return flags.filter(f => f.row === rowIndex); }
export function qualitySummary(flags) {
  return flags.reduce((acc, f) => { acc[f.issue] = (acc[f.issue] || 0) + 1; return acc; }, {});
}
