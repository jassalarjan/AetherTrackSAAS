import React from 'react';

// Simple Avatar component that always shows the CC logo.
// Accepts `size` prop (string with Tailwind classes) and `className` for extra styling.
const Avatar = ({ size = 'w-10 h-10', className = '', alt = 'User' }) => {
  const classes = `${size} rounded-full object-cover ${className}`.trim();

  return (
    <img
      src="/icons/cc-logo.png"
      alt={alt}
      className={classes}
      onError={(e) => {
        // Fallback to a simple blank SVG data URL if icon missing
        e.currentTarget.onerror = null;
        e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" alignment-baseline="middle" text-anchor="middle" fill="%23999" font-family="Arial, Helvetica, sans-serif" font-size="10">CC</text></svg>';
      }}
    />
  );
};

export default Avatar;
