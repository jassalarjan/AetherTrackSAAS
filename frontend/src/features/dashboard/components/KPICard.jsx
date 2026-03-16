import React from 'react';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

/**
 * KPI Card Component - Displays key performance indicators with sparklines and deltas
 * Matches the warm paper design system from ui_inspire.html
 *
 * @param {string}  title        - KPI title
 * @param {string|number} value  - Main KPI value
 * @param {string}  unit         - Optional unit (%, tasks, etc.)
 * @param {object}  delta        - Change indicator: { value, trend: 'up'|'down'|'neutral', label }
 * @param {array}   sparklineData - Array of values for sparkline chart (optional)
 * @param {string}  accentColor  - CSS color variable for accent (default: --brand)
 * @param {boolean} isLoading    - Show skeleton placeholder while data is loading
 */
const KPICard = ({
  title,
  value,
  unit = '',
  delta = null,
  sparklineData = [],
  accentColor = 'var(--brand)',
  onClick = null,
  isLoading = false,
}) => {
  /* ── Skeleton state ── */
  if (isLoading) {
    return (
      <div
        className="kpi-card"
        aria-busy="true"
        aria-label="Loading metric"
        style={{ '--kpi-accent': accentColor }}
      >
        <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
          {/* label skeleton */}
          <div style={{ height: '10px', width: '50%', borderRadius: 'var(--r-sm)', background: 'var(--bg-surface)' }} />
          {/* value skeleton */}
          <div style={{ height: '28px', width: '65%', borderRadius: 'var(--r-sm)', background: 'var(--bg-surface)', marginTop: 'var(--s1)' }} />
          {/* delta skeleton */}
          <div style={{ height: '16px', width: '40%', borderRadius: 'var(--r-full)', background: 'var(--bg-surface)' }} />
        </div>
      </div>
    );
  }
  // Generate sparkline path from data
  const generateSparklinePath = () => {
    if (!sparklineData || sparklineData.length === 0) return '';
    
    const width = 100;
    const height = 30;
    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;
    
    const points = sparklineData.map((val, i) => {
      const x = (i / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    });
    
    // Create area path
    const areaPath = `M0,${height} L${points[0]} ${points.join(' L')} L${width},${height} Z`;
    // Create line path
    const linePath = `M${points.join(' L')}`;
    
    return { areaPath, linePath };
  };

  const { areaPath, linePath } = generateSparklinePath();

  const getDeltaIcon = () => {
    if (!delta) return null;
    switch (delta.trend) {
      case 'up': return <TrendingUp className="w-3.5 h-3.5" />;
      case 'down': return <TrendingDown className="w-3.5 h-3.5" />;
      default: return <ArrowRight className="w-3.5 h-3.5" />;
    }
  };

  const getDeltaColor = () => {
    if (!delta) return '';
    switch (delta.trend) {
      case 'up': return 'var(--success)';
      case 'down': return 'var(--danger)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div
      className="kpi-card"
      style={{ '--kpi-accent': accentColor }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      /* Keyboard: Enter/Space activates the card when it has an onClick handler */
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); }
      } : undefined}
    >
      {/* Header */}
      <div className="kpi-label">{title}</div>
      
      {/* Value */}
      <div className="kpi-val">
        {value}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      
      {/* Delta Indicator */}
      {delta && (
        <div className="kpi-delta" style={{ color: getDeltaColor() }}>
          {getDeltaIcon()}
          <span>{delta.value > 0 ? '+' : ''}{delta.value}{delta.unit || ''}</span>
          <span className="kpi-delta-label">{delta.label}</span>
        </div>
      )}
      
      {/* Sparkline */}
      {sparklineData.length > 0 && (
        <div className="kpi-sparkline">
          <svg 
            viewBox="0 0 100 30" 
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Area fill */}
            <path 
              d={areaPath} 
              fill={accentColor}
              opacity="0.18"
            />
            {/* Line */}
            <path 
              d={linePath} 
              stroke={accentColor}
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>
      )}
      
      {/* Accent bar */}
      <div className="kpi-accent-bar"></div>
    </div>
  );
};

export default KPICard;
