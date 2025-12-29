import React from 'react';

// Avatar component that shows user's profile picture or fallback to initials
// Accepts `size` prop (string with Tailwind classes), `className` for extra styling,
// `src` for the profile picture URL, and `name` for generating initials fallback
const Avatar = ({ 
  size = 'w-10 h-10', 
  className = '', 
  alt = 'User',
  src = null,
  name = ''
}) => {
  const classes = `${size} rounded-full object-cover ${className}`.trim();

  // Generate initials from name
  const getInitials = (fullName) => {
    if (!fullName) return 'U';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  // If there's a profile picture, show it
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={classes}
        onError={(e) => {
          // Fallback to initials if image fails to load
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.classList.remove('hidden');
        }}
      />
    );
  }

  // Fallback to initials avatar
  const initials = getInitials(name || alt);
  
  // Generate a consistent color based on the name
  const getColorFromName = (str) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const bgColor = getColorFromName(name || alt || 'User');

  return (
    <div 
      className={`${size} rounded-full ${bgColor} flex items-center justify-center text-white font-semibold ${className}`.trim()}
      style={{ fontSize: 'calc(0.4 * min(100%, 100%))' }}
    >
      <span className="text-xs">{initials}</span>
    </div>
  );
};

export default Avatar;
