import React, { useState, useEffect } from 'react';
import { SectionLoader } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';
import geofenceApi from '../api/geofenceApi';
import ResponsivePageLayout from '../components/layouts/ResponsivePageLayout';
import MapView from '../components/MapView';
import ConfirmModal from '../components/modals/ConfirmModal';
import { 
  MapPin, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, 
  AlertCircle, Check, X, Upload, Download, Map, List,
  Search, RefreshCw
} from 'lucide-react';

export default function GeofenceManagement() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { toggleMobileSidebar } = useSidebar();
  const isDark = theme === 'dark';

  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    radiusMeters: 100,
    isActive: true
  });

  const isAdmin = user && (user.role === 'admin' || user.role === 'hr');

  useEffect(() => {
    if (isAdmin) {
      fetchGeofences();
    }
  }, [isAdmin]);

  const fetchGeofences = async () => {
    try {
      setLoading(true);
      // geofenceApi.getGeofences() returns response.data directly
      const data = await geofenceApi.getGeofences();
      // Backend returns { success: true, geofences: [...] } or just the array
      setGeofences(data?.geofences ?? data ?? []);
    } catch (error) {
      console.error('Error fetching geofences:', error);
      // Handle different error response formats
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load geofences';
      setMessage({ type: 'error', text: errorMessage });
      setGeofences([]); // Ensure geofences is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRadiusChange = (e) => {
    setFormData(prev => ({
      ...prev,
      radiusMeters: parseInt(e.target.value) || 0
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        name: formData.name,
        description: formData.description,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radiusMeters: formData.radiusMeters,
        isActive: formData.isActive
      };

      if (editingGeofence) {
        await geofenceApi.updateGeofence(editingGeofence._id || editingGeofence.id, data);
        setMessage({ type: 'success', text: 'Geofence updated successfully!' });
      } else {
        await geofenceApi.createGeofence(data);
        setMessage({ type: 'success', text: 'Geofence created successfully!' });
      }

      resetForm();
      fetchGeofences();
    } catch (error) {
      console.error('Error saving geofence:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to save geofence' 
      });
    }
  };

  const handleEdit = (geofence) => {
    setEditingGeofence(geofence);
    setFormData({
      name: geofence.name || '',
      description: geofence.description || '',
      latitude: geofence.latitude?.toString() || '',
      longitude: geofence.longitude?.toString() || '',
      radiusMeters: geofence.radiusMeters || geofence.radius || 100,
      isActive: geofence.isActive !== false
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    
    try {
      await geofenceApi.deleteGeofence(deletingId);
      setMessage({ type: 'success', text: 'Geofence deleted successfully!' });
      fetchGeofences();
    } catch (error) {
      console.error('Error deleting geofence:', error);
      setMessage({ type: 'error', text: 'Failed to delete geofence' });
    } finally {
      setShowDeleteModal(false);
      setDeletingId(null);
    }
  };

  const handleToggle = async (geofence) => {
    try {
      await geofenceApi.toggleGeofence(geofence._id || geofence.id);
      fetchGeofences();
    } catch (error) {
      console.error('Error toggling geofence:', error);
      setMessage({ type: 'error', text: 'Failed to update geofence status' });
    }
  };

  const handleBulkImport = async () => {
    // Create file input for CSV/JSON
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        let geofencesData;

        if (file.name.endsWith('.json')) {
          geofencesData = JSON.parse(text);
          if (!Array.isArray(geofencesData)) {
            geofencesData = [geofencesData];
          }
        } else {
          // Parse CSV (simple implementation)
          const lines = text.split('\n').filter(l => l.trim());
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          geofencesData = lines.slice(1).map(line => {
            const values = line.split(',');
            const obj = {};
            headers.forEach((h, i) => {
              obj[h] = values[i]?.trim();
            });
            return obj;
          });
        }

        const formatted = geofencesData.map(g => ({
          name: g.name,
          description: g.description || '',
          latitude: parseFloat(g.latitude),
          longitude: parseFloat(g.longitude),
          radiusMeters: parseInt(g.radiusMeters || g.radius) || 100,
          isActive: g.isActive !== 'false'
        }));

        await geofenceApi.bulkCreateGeofences(formatted);
        setMessage({ type: 'success', text: `Successfully imported ${formatted.length} geofences!` });
        fetchGeofences();
      } catch (error) {
        console.error('Error importing geofences:', error);
        setMessage({ type: 'error', text: 'Failed to import geofences. Check file format.' });
      }
    };
    input.click();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      latitude: '',
      longitude: '',
      radiusMeters: 100,
      isActive: true
    });
    setEditingGeofence(null);
    setShowForm(false);
  };

  const filteredGeofences = geofences.filter(g =>
    g.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeGeofences = filteredGeofences.filter(g => g.isActive !== false);
  const inactiveGeofences = filteredGeofences.filter(g => g.isActive === false);

  if (!isAdmin) {
    return (
      <ResponsivePageLayout>
        <div className={`flex items-center justify-center h-64 ${
          'text-[var(--text-muted)]'
        }`}>
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <p className="text-lg font-medium">Access Denied</p>
            <p>You don't have permission to access this page.</p>
          </div>
        </div>
      </ResponsivePageLayout>
    );
  }

  return (
    <ResponsivePageLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMobileSidebar}
              className={`lg:hidden p-2 rounded-lg ${
                'hover:bg-[var(--bg-surface)]'
              }`}
            >
              <MapPin className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Geofence Management
              </h1>
              <p className={`text-sm ${
                'text-[var(--text-muted)]'
              }`}>
                Manage locations for attendance verification
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Toggle */}
            <div className={`flex rounded-lg p-1 ${
              'bg-[var(--bg-surface)]'
            }`}>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-500 text-white' 
                    : isDark 
                      ? 'text-[#9da8b9] hover:text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'map' 
                    ? 'bg-blue-500 text-white' 
                    : isDark 
                      ? 'text-[#9da8b9] hover:text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Map className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleBulkImport}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isDark 
                  ? 'bg-[#282f39] text-white hover:bg-[#333a47]' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </button>

            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C4713A] text-white hover:bg-[#A35C28] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Geofence
            </button>
          </div>
        </div>

        {/* Message Toast */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}>
            {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
            <button 
              onClick={() => setMessage({ type: '', text: '' })}
              className="ml-auto hover:opacity-80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <div className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border ${
            isDark 
              ? 'bg-[#1c2027] border-[#333a47]' 
              : 'bg-white border-gray-200'
          }`}>
            <Search className={`w-4 h-4 text-[var(--text-muted)]`} />
            <input
              type="text"
              placeholder="Search geofences..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`flex-1 bg-transparent outline-none ${
                isDark ? 'text-white placeholder-[#9da8b9]' : 'text-gray-900 placeholder-gray-400'
              }`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="h-64">
            <SectionLoader label="Loading geofences…" minHeight="250px" />
          </div>
        ) : viewMode === 'map' ? (
          <div className={`rounded-lg border overflow-hidden ${
            'border-[var(--border-soft)]'
          }`}>
            <MapView
              geofences={filteredGeofences}
              height="500px"
              zoom={12}
              showGeofence={false}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Geofences */}
            {activeGeofences.length > 0 && (
              <div>
                <h3 className={`text-sm font-medium mb-2 ${
                  'text-[var(--text-muted)]'
                }`}>
                  Active Geofences ({activeGeofences.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeGeofences.map(geofence => (
                    <GeofenceCard
                      key={geofence._id || geofence.id}
                      geofence={geofence}
                      isDark={isDark}
                      onEdit={handleEdit}
                      onDelete={() => {
                        setDeletingId(geofence._id || geofence.id);
                        setShowDeleteModal(true);
                      }}
                      onToggle={() => handleToggle(geofence)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Inactive Geofences */}
            {inactiveGeofences.length > 0 && (
              <div>
                <h3 className={`text-sm font-medium mb-2 ${
                  'text-[var(--text-muted)]'
                }`}>
                  Inactive Geofences ({inactiveGeofences.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {inactiveGeofences.map(geofence => (
                    <GeofenceCard
                      key={geofence._id || geofence.id}
                      geofence={geofence}
                      isDark={isDark}
                      onEdit={handleEdit}
                      onDelete={() => {
                        setDeletingId(geofence._id || geofence.id);
                        setShowDeleteModal(true);
                      }}
                      onToggle={() => handleToggle(geofence)}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredGeofences.length === 0 && (
              <div className={`text-center py-12 ${
                'text-[var(--text-muted)]'
              }`}>
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No geofences found</p>
                <p>Click "Add Geofence" to create your first geofence</p>
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`relative w-full max-w-lg rounded-lg shadow-xl ${
              'bg-[var(--bg-raised)]'
            }`}>
              <div className="flex items-center justify-between p-4 border-b ${
                'border-[var(--border-soft)]'
              }">
                <h2 className={`text-lg font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {editingGeofence ? 'Edit Geofence' : 'Add New Geofence'}
                </h2>
                <button
                  onClick={resetForm}
                  className={`p-1 rounded ${
                    'hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDark ? 'text-white' : 'text-gray-700'
                  }`}>
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDark 
                        ? 'bg-[#282f39] border-[#333a47] text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Office Building"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDark ? 'text-white' : 'text-gray-700'
                  }`}>
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={2}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDark 
                        ? 'bg-[#282f39] border-[#333a47] text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Optional description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDark ? 'text-white' : 'text-gray-700'
                    }`}>
                      Latitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDark 
                          ? 'bg-[#282f39] border-[#333a47] text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="28.6139"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDark ? 'text-white' : 'text-gray-700'
                    }`}>
                      Longitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDark 
                          ? 'bg-[#282f39] border-[#333a47] text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="77.2090"
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDark ? 'text-white' : 'text-gray-700'
                  }`}>
                    Radius: {formData.radiusMeters} meters
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={formData.radiusMeters}
                    onChange={handleRadiusChange}
                    className="w-full"
                  />
                  <div className={`flex justify-between text-xs ${
                    'text-[var(--text-muted)]'
                  }`}>
                    <span>10m</span>
                    <span>1000m</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="isActive" className={`text-sm ${
                    isDark ? 'text-white' : 'text-gray-700'
                  }`}>
                    Active
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className={`px-4 py-2 rounded-lg ${
                      isDark 
                        ? 'bg-[#282f39] text-white hover:bg-[#333a47]' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#C4713A] text-white hover:bg-[#A35C28]"
                  >
                    {editingGeofence ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingId(null);
          }}
          onConfirm={handleDelete}
          title="Delete Geofence"
          message="Are you sure you want to delete this geofence? This action cannot be undone."
          confirmText="Delete"
          variant="danger"
        />
      </div>
    </ResponsivePageLayout>
  );
}

// Geofence Card Component
function GeofenceCard({ geofence, isDark, onEdit, onDelete, onToggle }) {
  const [showMap, setShowMap] = useState(false);

  return (
    <div className={`p-4 rounded-lg border transition-colors ${
      geofence.isActive !== false
        ? isDark 
          ? 'bg-[#1c2027] border-[#333a47]' 
          : 'bg-white border-gray-200'
        : isDark 
          ? 'bg-[#1c2027] border-[#333a47] opacity-60' 
          : 'bg-gray-50 border-gray-200 opacity-60'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className={`font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {geofence.name}
          </h3>
          {geofence.description && (
            <p className={`text-sm ${
              'text-[var(--text-muted)]'
            }`}>
              {geofence.description}
            </p>
          )}
        </div>
        <button
          onClick={onToggle}
          className={`p-1 rounded transition-colors ${
            geofence.isActive !== false
              ? 'text-green-500 hover:bg-green-500/10'
              : isDark 
                ? 'text-[#9da8b9] hover:bg-[#282f39]' 
                : 'text-gray-400 hover:bg-gray-100'
          }`}
        >
          {geofence.isActive !== false ? (
            <ToggleRight className="w-5 h-5" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      <div className={`text-sm space-y-1 mb-3 ${
        'text-[var(--text-muted)]'
      }`}>
        <p>📍 {geofence.latitude?.toFixed(6)}, {geofence.longitude?.toFixed(6)}</p>
        <p>⭕ Radius: {geofence.radiusMeters || geofence.radius || 100}m</p>
      </div>

      {/* Mini Map Preview */}
      {showMap && (
        <div className="mb-3 rounded-lg overflow-hidden">
          <MapView
            latitude={geofence.latitude}
            longitude={geofence.longitude}
            radius={geofence.radiusMeters || geofence.radius || 100}
            height="150px"
            zoom={14}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowMap(!showMap)}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
            'hover:bg-[var(--bg-surface)]'
          }`}
        >
          <Map className="w-3 h-3" />
          {showMap ? 'Hide Map' : 'Show Map'}
        </button>
        
        <button
          onClick={() => onEdit(geofence)}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
            'hover:bg-[var(--bg-surface)]'
          }`}
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>

        <button
          onClick={onDelete}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded text-red-500 ${
            isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'
          }`}
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  );
}
