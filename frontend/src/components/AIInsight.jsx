import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

/**
 * AI Insight Banner Component
 * Displays AI-powered suggestions and insights with a dismissible interface
 * Matches the warm paper design system from ui_inspire.html
 * 
 * @param {string} title - Insight title/label
 * @param {string} message - Main insight message
 * @param {array} actions - Array of action buttons: [{ label, onClick, variant }]
 * @param {function} onDismiss - Callback when dismissed (optional)
 * @param {boolean} defaultDismissed - Initial dismissed state
 */
const AIInsight = ({ 
  title = 'AI Suggestion', 
  message, 
  actions = [], 
  onDismiss = null,
  defaultDismissed = false 
}) => {
  const [dismissed, setDismissed] = useState(defaultDismissed);

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  if (dismissed) return null;

  return (
    <div className="ai-insight">
      <div className="ai-insight-icon">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="ai-insight-content">
        <div className="ai-insight-label">{title}</div>
        <div className="ai-insight-text">{message}</div>
        {actions.length > 0 && (
          <div className="ai-btns">
            {actions.map((action, index) => (
              <button
                key={index}
                className={`btn btn-sm ${action.variant === 'ghost' ? 'btn-ghost' : 'btn-primary'}`}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        className="ai-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss insight"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default AIInsight;
