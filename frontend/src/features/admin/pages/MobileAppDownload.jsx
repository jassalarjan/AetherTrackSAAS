import { useState } from 'react';
import { Download, Smartphone, Shield, Zap, CheckCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';

export default function MobileAppDownload() {
  const { user } = useAuth();
  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleDownloadAPK = () => {
    setDownloadStarted(true);
    // Trigger download
    const link = document.createElement('a');
    link.href = '/downloads/AetherTrack.apk';
    link.download = 'AetherTrack.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Reset after a moment
    setTimeout(() => setDownloadStarted(false), 2000);
  };

  const features = [
    {
      icon: Shield,
      title: 'Secure Access',
      description: 'Enterprise-grade encryption for all data transfers',
    },
    {
      icon: Zap,
      title: 'Offline Mode',
      description: 'Continue working even without internet connection',
    },
    {
      icon: Smartphone,
      title: 'Native Performance',
      description: 'Built with Capacitor for optimal mobile experience',
    },
    {
      icon: CheckCircle,
      title: 'Auto Updates',
      description: 'Automatic updates delivered in the background',
    },
  ];

  const requirements = [
    'Android 8.0 or higher',
    'Minimum 200 MB free storage',
    'Internet connection recommended',
  ];

  return (
    <ResponsivePageLayout title="Mobile App Download" showHeader>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            AetherTrack Mobile App
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Download the AetherTrack app for Android and manage your tasks and projects on the go.
          </p>
        </div>

        {/* Download Card */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 sm:p-8 mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Download Now
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Get the latest version of AetherTrack for your Android device
              </p>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="mb-1">📦 Version: 1.0.0</p>
                <p>📊 Size: ~6.5 MB</p>
              </div>
            </div>
            <button
              onClick={handleDownloadAPK}
              disabled={downloadStarted}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Download className={`w-5 h-5 ${downloadStarted ? 'animate-bounce' : ''}`} />
              <span>{downloadStarted ? 'Downloading...' : 'Download APK'}</span>
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Key Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 sm:p-6"
              >
                <feature.icon className="w-8 h-8 text-amber-500 mb-3" />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* System Requirements */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 sm:p-8 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
            System Requirements
          </h2>
          <ul className="space-y-3">
            {requirements.map((req, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">{req}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Installation Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-200 mb-4">
            How to Install
          </h2>
          <ol className="space-y-4 list-decimal list-inside text-gray-700 dark:text-gray-300">
            <li>Click the "Download APK" button above</li>
            <li>Open your device's file manager and navigate to the Downloads folder</li>
            <li>Tap the AetherTrack.apk file</li>
            <li>Follow the on-screen prompts to install the app</li>
            <li>Grant necessary permissions when requested</li>
            <li>Launch the app and log in with your credentials</li>
          </ol>
        </div>

        {/* Support Note */}
        <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            Having issues? Check our support documentation or contact the admin team for assistance.
          </p>
        </div>
      </div>
    </ResponsivePageLayout>
  );
}
