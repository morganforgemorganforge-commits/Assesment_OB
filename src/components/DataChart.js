'use client';

import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis,
  ComposedChart,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { BarChart2 } from 'lucide-react';

// ─── Colour Palettes ──────────────────────────────────────────────────────────
const PALETTES = {
  indigo:  ['#6366f1','#818cf8','#a5b4fc','#c7d2fe','#4f46e5','#7c3aed'],
  cyan:    ['#22d3ee','#06b6d4','#0891b2','#38bdf8','#7dd3fc','#0e7490'],
  rose:    ['#f43f5e','#fb7185','#fda4af','#e11d48','#be123c','#ff6b9d'],
  emerald: ['#10b981','#34d399','#6ee7b7','#059669','#047857','#a7f3d0'],
  amber:   ['#f59e0b','#fbbf24','#fcd34d','#d97706','#b45309','#fef3c7'],
  rainbow: ['#6366f1','#22d3ee','#10b981','#f59e0b','#ef4444','#f472b6'],
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1e2030',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: '0.82rem',
      boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
    }}>
      {label && <p style={{ color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#818cf8', margin: '2px 0' }}>
          <span style={{ color: '#cbd5e1' }}>{p.name}: </span>
          <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Custom Pie Label ─────────────────────────────────────────────────────────
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── Axis Tick Style ──────────────────────────────────────────────────────────
const tickStyle = { fill: '#64748b', fontSize: 11, fontFamily: 'Inter, sans-serif' };
const gridStyle = { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: '3 3' };

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DataChart({ data, config }) {
  const { chartType = 'bar', xAxis, yAxis, palette = 'indigo', limit = 50 } = config;
  const colors = PALETTES[palette] || PALETTES.indigo;

  if (!data || data.length === 0 || !xAxis || !yAxis) {
    return (
      <div className="empty-state">
        <BarChart2 size={48} />
        <h3>No chart to display</h3>
        <p>Select an X Axis and Y Axis column from the settings panel to visualise your data.</p>
      </div>
    );
  }

  // Prepare & limit data
  const chartData = data.slice(0, limit).map(row => ({
    ...row,
    [xAxis]: row[xAxis] !== undefined && row[xAxis] !== '' ? row[xAxis] : '(blank)',
    [yAxis]: typeof row[yAxis] === 'string'
      ? parseFloat(String(row[yAxis]).replace(/[₹$£€,\s]/g, '')) || 0
      : Number(row[yAxis]) || 0,
  }));

  const commonProps = {
    data: chartData,
    margin: { top: 10, right: 20, left: 0, bottom: 60 },
  };

  const xProps = {
    dataKey: xAxis,
    tick: { ...tickStyle, angle: -35, textAnchor: 'end' },
    interval: 'preserveStartEnd',
    stroke: 'rgba(255,255,255,0.08)',
  };

  const yProps = {
    tick: tickStyle,
    stroke: 'rgba(255,255,255,0.08)',
    tickFormatter: (v) => typeof v === 'number' ? v.toLocaleString() : v,
    width: 70,
  };

  const renderChart = () => {
    switch (chartType) {
      // ── Bar ──────────────────────────────────────────────────────────────
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid {...gridStyle} />
            <XAxis {...xProps} />
            <YAxis {...yProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            <Bar dataKey={yAxis} fill={colors[0]} radius={[4, 4, 0, 0]} name={yAxis}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        );

      // ── Line ─────────────────────────────────────────────────────────────
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid {...gridStyle} />
            <XAxis {...xProps} />
            <YAxis {...yProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey={yAxis}
              stroke={colors[0]}
              strokeWidth={2.5}
              dot={{ r: 3, fill: colors[0] }}
              activeDot={{ r: 6, fill: colors[1] }}
              name={yAxis}
            />
          </LineChart>
        );

      // ── Area ─────────────────────────────────────────────────────────────
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor={colors[0]} stopOpacity={0.4} />
                <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridStyle} />
            <XAxis {...xProps} />
            <YAxis {...yProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey={yAxis}
              stroke={colors[0]}
              strokeWidth={2.5}
              fill="url(#areaGrad)"
              name={yAxis}
            />
          </AreaChart>
        );

      // ── Pie ───────────────────────────────────────────────────────────────
      case 'pie': {
        // Aggregate by xAxis label
        const aggregated = {};
        chartData.forEach(row => {
          const k = String(row[xAxis]);
          aggregated[k] = (aggregated[k] || 0) + (Number(row[yAxis]) || 0);
        });
        const pieData = Object.entries(aggregated).map(([name, value]) => ({ name, value }));
        return (
          <PieChart margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius="65%"
              dataKey="value"
              labelLine={false}
              label={renderPieLabel}
              nameKey="name"
            >
              {pieData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
          </PieChart>
        );
      }

      // ── Scatter ───────────────────────────────────────────────────────────
      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid {...gridStyle} />
            <XAxis dataKey={xAxis} type="category" {...xProps} />
            <YAxis dataKey={yAxis} {...yProps} />
            <ZAxis range={[50, 200]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            <Scatter data={chartData} fill={colors[0]} name={`${xAxis} vs ${yAxis}`} />
          </ScatterChart>
        );

      // ── Composed ──────────────────────────────────────────────────────────
      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <defs>
              <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={colors[1]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[1]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridStyle} />
            <XAxis {...xProps} />
            <YAxis {...yProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            <Area type="monotone" dataKey={yAxis} fill="url(#compGrad)" stroke="none" name={`${yAxis} area`} />
            <Bar dataKey={yAxis} fill={colors[0]} radius={[3, 3, 0, 0]} opacity={0.85} name={yAxis}>
              {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Bar>
            <Line type="monotone" dataKey={yAxis} stroke={colors[2]} strokeWidth={2} dot={false} name={`${yAxis} trend`} />
          </ComposedChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="chart-wrapper animate-in">
      <ResponsiveContainer width="100%" height={420}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
