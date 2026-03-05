import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Home, ArrowLeft, SearchX } from 'lucide-react';
import ResponsivePageLayout from '../components/layouts/ResponsivePageLayout';

function NotFoundContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      {/* Large 404 */}
      <div
        className={`text-[8rem] sm:text-[10rem] font-extrabold leading-none select-none ${
          isDark ? 'text-white/5' : 'text-black/5'
        }`}
      >
        404
      </div>

      {/* Icon + message */}
      <div className="relative -mt-12 sm:-mt-16 mb-6">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg ${
            'bg-[var(--bg-raised)] border border-[var(--border-soft)]'
          }`}
        >
          <SearchX size={28} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
        </div>
      </div>

      <h1
        className={`text-2xl sm:text-3xl font-bold mb-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}
      >
        Page not found
      </h1>

      <p
        className={`text-sm sm:text-base mb-1 max-w-md ${
          'text-[var(--text-muted)]'
        }`}
      >
        The route{' '}
        <code
          className={`px-1.5 py-0.5 rounded text-xs font-mono ${
            'bg-[var(--bg-surface)] text-[var(--brand)]'
          }`}
        >
          {location.pathname}
        </code>{' '}
        doesn't exist in this app.
      </p>

      <p
        className={`text-xs sm:text-sm mb-8 ${
          'text-[var(--text-muted)]'
        }`}
      >
        It may have been moved, deleted, or you may have mistyped the URL.
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            isDark
              ? 'border-[#282f39] text-[#9da8b9] hover:bg-[#282f39] hover:text-white'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <ArrowLeft size={15} />
          Go back
        </button>

        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-[#A35C28] text-white transition-colors shadow-sm"
        >
          <Home size={15} />
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default function NotFound() {
  const { user } = useAuth();
  const { theme } = useTheme();   // always called — no conditional hooks
  const isDark = theme === 'dark';

  // Logged-in users get the full layout with sidebar
  if (user) {
    return (
      <ResponsivePageLayout title="Page Not Found">
        <NotFoundContent />
      </ResponsivePageLayout>
    );
  }

  // Guests get a standalone centered page (no sidebar context)
  return (
    <div
      className={`min-h-screen flex items-center justify-center ${
        'bg-[var(--bg-base)]'
      }`}
    >
      <NotFoundContent />
    </div>
  );
}
