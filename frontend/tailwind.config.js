export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  safelist: [
    // Color scheme backgrounds
    'bg-blue-500', 'bg-blue-600', 'bg-blue-50',
    'bg-purple-500', 'bg-purple-600', 'bg-purple-50',
    'bg-green-500', 'bg-green-600', 'bg-green-50',
    'bg-orange-500', 'bg-orange-600', 'bg-orange-50',
    'bg-pink-500', 'bg-pink-600', 'bg-pink-50',
    'bg-teal-500', 'bg-teal-600', 'bg-teal-50',
    'bg-indigo-500', 'bg-indigo-600', 'bg-indigo-50',
    'bg-rose-500', 'bg-rose-600', 'bg-rose-50',
    'bg-cyan-500', 'bg-cyan-600', 'bg-cyan-50',
    'bg-emerald-500', 'bg-emerald-600', 'bg-emerald-50',
    'bg-amber-500', 'bg-yellow-500', 'bg-red-500',
    // Color scheme text colors
    'text-blue-600',
    'text-purple-600',
    'text-green-600',
    'text-orange-600',
    'text-pink-600',
    'text-teal-600',
    'text-indigo-600',
    'text-rose-600',
    'text-cyan-600',
    'text-emerald-600',
    // Color scheme hover states
    'hover:bg-blue-600', 'hover:bg-blue-700',
    'hover:bg-purple-600', 'hover:bg-purple-700',
    'hover:bg-green-600', 'hover:bg-green-700',
    'hover:bg-orange-600', 'hover:bg-orange-700',
    'hover:bg-pink-600', 'hover:bg-pink-700',
    'hover:bg-teal-600', 'hover:bg-teal-700',
    'hover:bg-indigo-600', 'hover:bg-indigo-700',
    'hover:bg-rose-600', 'hover:bg-rose-700',
    'hover:bg-cyan-600', 'hover:bg-cyan-700',
    'hover:bg-emerald-600', 'hover:bg-emerald-700',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontSize: {
        'display-sm': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'display': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.6s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scroll': 'scroll 2s ease-in-out infinite',
        'count-up': 'countUp 1s ease-out forwards',
        'draw-circle': 'drawCircle 1.5s ease-out forwards',
        'grow-bar': 'growBar 0.8s ease-out forwards',
        'slideUp': 'slideUp 0.3s ease-out',
        'scaleIn': 'scaleIn 0.2s ease-out',
        'slideInRight': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        scroll: {
          '0%': { opacity: '0', transform: 'translateY(0)' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(8px)' },
        },
        countUp: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        drawCircle: {
          '0%': { strokeDashoffset: '251.2' },
          '100%': { strokeDashoffset: '62.8' },
        },
        growBar: {
          '0%': { transform: 'scaleY(0)', transformOrigin: 'bottom' },
          '100%': { transform: 'scaleY(1)', transformOrigin: 'bottom' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};