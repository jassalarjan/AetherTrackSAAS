/**
 * AetherTrack 2030 Tailwind Configuration
 * Reference: System_UI_Shift.md Section 1 - Design System Overhaul
 * 
 * Maps Tailwind utilities to CSS custom properties (tokens)
 */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Dark mode: matches data-theme="dark" attribute (Tailwind v3 custom selector)
  darkMode: ['class', '[data-theme="dark"]'],
  
  safelist: [
    // ── Warm Paper scheme (default) ──
    'bg-canvas', 'bg-base', 'bg-surface', 'bg-raised', 'bg-sunken',
    'text-primary', 'text-secondary', 'text-muted', 'text-faint',
    'border-hair', 'border-soft', 'border-mid', 'border-strong',
    // ── Brand / warm scheme ──
    'bg-brand', 'text-brand', 'border-brand',
    'bg-warm-500', 'bg-warm-600', 'bg-warm-50',
    'text-warm-600',
    'hover:bg-warm-600', 'hover:bg-warm-700',
    // Color scheme backgrounds - for dynamic theming
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
      // ===========================================
      // COLOR SYSTEM - Maps to CSS custom properties
      // Reference: Section 1.2 - Color System
      // ===========================================
      colors: {
        // ── Warm Paper surface tokens (primary design system) ──
        canvas:  'var(--bg-canvas)',
        base:    'var(--bg-base)',
        raised:  'var(--bg-raised)',
        sunken:  'var(--bg-sunken)',

        // ── Warm brand (terracotta) ──
        brand: {
          DEFAULT: 'var(--brand)',
          light:   'var(--brand-light)',
          dim:     'var(--brand-dim)',
          glow:    'var(--brand-glow)',
        },

        // ── Warm Paper text tokens ──
        primary:   'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted:     'var(--text-muted)',
        faint:     'var(--text-faint)',

        // ── Warm Paper border tokens ──
        hair:   'var(--border-hair)',
        soft:   'var(--border-soft)',
        mid:    'var(--border-mid)',
        strong: 'var(--border-strong)',

        // ── Warm scheme palette ──
        warm: {
          50:  '#FDF5EE',
          100: '#F7EBD8',
          200: '#EDD5B5',
          300: '#DFB88A',
          400: '#D4905A',
          500: '#C4713A',
          600: '#A85E30',
          700: '#8C4C26',
          800: '#703C1E',
          900: '#542D16',
        },

        // Surface colors - mapped to tokens
        surface: {
          base: 'var(--color-surface-base)',
          subtle: 'var(--color-surface-subtle)',
          muted: 'var(--color-surface-muted)',
          glass: 'var(--color-surface-glass)',
          elevated: 'var(--color-surface-elevated)',
          ambient: 'var(--color-surface-ambient)',
        },
        
        // Text colors - mapped to tokens
        content: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          inverse: 'var(--color-text-inverse)',
          placeholder: 'var(--color-text-placeholder)',
        },
        
        // Border colors - mapped to tokens
        border: {
          DEFAULT: 'var(--color-border-default)',
          subtle: 'var(--color-border-subtle)',
          strong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)',
        },
        
        // Brand colors - mapped to tokens
        brand: {
          DEFAULT: 'var(--color-brand-primary)',
          primary: 'var(--color-brand-primary)',
          'primary-hover': 'var(--color-brand-primary-hover)',
          secondary: 'var(--color-brand-secondary)',
          accent: 'var(--color-brand-accent)',
        },
        
        // Semantic colors - mapped to tokens
        success: {
          DEFAULT: 'var(--color-success)',
          subtle: 'var(--color-success-subtle)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          subtle: 'var(--color-warning-subtle)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          subtle: 'var(--color-error-subtle)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          subtle: 'var(--color-info-subtle)',
        },
        
        // AI surface
        ai: {
          subtle: 'var(--color-ai-subtle)',
        },
        
        // Priority colors
        priority: {
          critical: 'var(--color-priority-critical)',
          high: 'var(--color-priority-high)',
          medium: 'var(--color-priority-medium)',
          low: 'var(--color-priority-low)',
        },
        
        // Status colors
        status: {
          online: 'var(--color-status-online)',
          away: 'var(--color-status-away)',
          busy: 'var(--color-status-busy)',
          offline: 'var(--color-status-offline)',
        },
        
        // Legacy primary colors (kept for backwards compatibility)
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
      
      // ===========================================
      // TYPOGRAPHY - Fluid scale with clamp
      // Reference: Section 1.3 - Typography
      // ===========================================
      fontFamily: {
        sans:    ['var(--font-body)', 'Instrument Sans', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'Fraunces', 'Georgia', 'serif'],
        mono:    ['var(--font-mono)', 'Fira Code', 'JetBrains Mono', 'monospace'],
        // legacy
        body:    ['var(--font-body)', 'Instrument Sans', 'system-ui', 'sans-serif'],
      },
      
      fontSize: {
        'xs': ['var(--text-xs)', { lineHeight: 'var(--leading-none)' }],
        'sm': ['var(--text-sm)', { lineHeight: 'var(--leading-none)' }],
        'base': ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
        'xl': ['var(--text-xl)', { lineHeight: 'var(--leading-tight)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-tight)' }],
        '3xl': ['var(--text-3xl)', { lineHeight: 'var(--leading-tight)' }],
        '4xl': ['var(--text-4xl)', { lineHeight: 'var(--leading-none)' }],
        '5xl': ['var(--text-5xl)', { lineHeight: 'var(--leading-none)' }],
        // Legacy display sizes
        'display-sm': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'display': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      
      fontWeight: {
        normal: 'var(--font-weight-normal)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
      },
      
      lineHeight: {
        none: 'var(--leading-none)',
        tight: 'var(--leading-tight)',
        snug: 'var(--leading-snug)',
        normal: 'var(--leading-normal)',
        relaxed: 'var(--leading-relaxed)',
      },
      
      letterSpacing: {
        tighter: 'var(--tracking-tight)',
        normal: 'var(--tracking-normal)',
        wider: 'var(--tracking-wide)',
      },
      
      // ===========================================
      // SPACING - 8px base grid
      // Reference: Section 1.4 - Spacing
      // ===========================================
      spacing: {
        '0': 'var(--space-0)',
        'px': 'var(--space-px)',
        '0.5': 'var(--space-05)',
        '1': 'var(--space-1)',
        '1.5': 'var(--space-15)',
        '2': 'var(--space-2)',
        '2.5': 'var(--space-25)',
        '3': 'var(--space-3)',
        '3.5': 'var(--space-35)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '7': 'var(--space-7)',
        '8': 'var(--space-8)',
        '9': 'var(--space-9)',
        '10': 'var(--space-10)',
        '11': 'var(--space-11)',
        '12': 'var(--space-12)',
        '14': 'var(--space-14)',
        '16': 'var(--space-16)',
        '20': 'var(--space-20)',
        '24': 'var(--space-24)',
        '28': 'var(--space-28)',
        '32': 'var(--space-32)',
      },
      
      // ===========================================
      // SHADOWS - Elevation Model
      // Reference: Section 1.5 - Elevation Model
      // ===========================================
      boxShadow: {
        'none': 'var(--shadow-none)',
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'DEFAULT': 'var(--shadow-md)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'float': 'var(--shadow-float)',
        'inner': 'var(--shadow-inner)',
        // Legacy shadows
        'card': 'var(--elevation-1)',
        'elevated': 'var(--elevation-2)',
        'overlay': 'var(--elevation-3)',
      },
      
      // ===========================================
      // BORDER RADIUS
      // Reference: Section 1.6 - Border Radius
      // ===========================================
      borderRadius: {
        'none': 'var(--radius-none)',
        'sm': 'var(--radius-sm)',
        'DEFAULT': 'var(--radius-md)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        'full': 'var(--radius-full)',
        // Semantic radii
        'button': 'var(--radius-button)',
        'input': 'var(--radius-input)',
        'card': 'var(--radius-card)',
        'dialog': 'var(--radius-dialog)',
        'surface': 'var(--radius-surface)',
      },
      
      // ===========================================
      // MOTION SYSTEM - Duration and Easing
      // Reference: Section 1.7 - Motion System
      // ===========================================
      transitionDuration: {
        'instant': 'var(--duration-instant)',
        'fast': 'var(--duration-fast)',
        'DEFAULT': 'var(--duration-default)',
        'slow': 'var(--duration-slow)',
        'slower': 'var(--duration-slower)',
        'slowest': 'var(--duration-slowest)',
      },
      
      transitionTimingFunction: {
        'standard': 'var(--ease-standard)',
        'enter': 'var(--ease-enter)',
        'exit': 'var(--ease-exit)',
        'spring': 'var(--ease-spring)',
        'bounce': 'var(--ease-bounce)',
      },
      
      animation: {
        // Base animations
        'fade-in': 'fadeIn var(--duration-default) var(--ease-standard) forwards',
        'fade-in-up': 'fadeInUp var(--duration-default) var(--ease-standard) forwards',
        'fade-in-down': 'fadeInDown var(--duration-default) var(--ease-standard) forwards',
        'fade-in-left': 'fadeInLeft var(--duration-default) var(--ease-standard) forwards',
        'fade-in-right': 'fadeInRight var(--duration-default) var(--ease-standard) forwards',
        
        // Scale animations
        'scale-in': 'scaleIn var(--duration-default) var(--ease-enter) forwards',
        'scale-out': 'scaleOut var(--duration-default) var(--ease-exit) forwards',
        
        // Slide animations
        'slide-up': 'slideUp var(--duration-default) var(--ease-standard) forwards',
        'slide-down': 'slideDown var(--duration-default) var(--ease-standard) forwards',
        'slide-left': 'slideLeft var(--duration-default) var(--ease-standard) forwards',
        'slide-right': 'slideRight var(--duration-default) var(--ease-standard) forwards',
        
        // Utility animations
        'spin-fast': 'spinFast var(--duration-fast) linear infinite',
        'pulse-scale': 'pulseScale var(--duration-slow) ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle var(--duration-slow) var(--ease-bounce) infinite',
        
        // Shimmer loading (for buttons)
        'shimmer': 'shimmer var(--duration-slow) var(--ease-standard) infinite',
        
        // Float animation
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        
        // Legacy animations (kept for backwards compatibility)
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scroll': 'scroll 2s ease-in-out infinite',
        'count-up': 'countUp 1s ease-out forwards',
        'draw-circle': 'drawCircle 1.5s ease-out forwards',
        'grow-bar': 'growBar 0.8s ease-out forwards',
      },
      
      keyframes: {
        // Fade animations
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInRight: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        
        // Scale animations
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        
        // Slide animations
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        
        // Utility keyframes
        spinFast: {
          'to': { transform: 'rotate(360deg)' },
        },
        pulseScale: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        
        // Shimmer for loading buttons
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        
        // Float animation
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        
        // Legacy keyframes (kept for backwards compatibility)
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
      },
      
      // ===========================================
      // Z-INDEX SCALE
      // Reference: Section 1 - Size Tokens
      // ===========================================
      zIndex: {
        'dropdown': 'var(--z-dropdown)',
        'sticky': 'var(--z-sticky)',
        'fixed': 'var(--z-fixed)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        'modal': 'var(--z-modal)',
        'popover': 'var(--z-popover)',
        'tooltip': 'var(--z-tooltip)',
        'toast': 'var(--z-toast)',
        'command': 'var(--z-command)',
      },
      
      // ===========================================
      // CUSTOM UTILITIES FOR TOKEN SYSTEM
      // ===========================================
      transitionProperty: {
        'colors': 'color, background-color, border-color',
        'shadow': 'box-shadow',
        'transform': 'transform',
      },
      
      // Custom ring utility using focus ring token
      ringWidth: {
        'focus': 'var(--focus-ring-width)',
      },
      ringOffsetWidth: {
        'focus': 'var(--focus-ring-offset)',
      },
    },
  },
  
  // ===========================================
  // PLUGINS
  // ===========================================
  plugins: [],
};
