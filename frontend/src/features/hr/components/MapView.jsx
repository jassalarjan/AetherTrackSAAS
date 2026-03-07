import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon issue with webpack/vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icon
const createCustomIcon = (color = '#3b82f6') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

// Component to fit bounds to markers
function FitBounds({ markers, geofences }) {
  const map = useMap();
  const prevMarkersRef = useRef(null);
  const prevGeofencesRef = useRef(null);

  useEffect(() => {
    const markersChanged = JSON.stringify(markers) !== JSON.stringify(prevMarkersRef.current);
    const geofencesChanged = JSON.stringify(geofences) !== JSON.stringify(prevGeofencesRef.current);

    if ((markersChanged || geofencesChanged) && (markers?.length > 0 || geofences?.length > 0)) {
      const bounds = [];
      
      if (markers && markers.length > 0) {
        markers.forEach(m => {
          if (m.lat && m.lng) {
            bounds.push([m.lat, m.lng]);
          }
        });
      }

      if (geofences && geofences.length > 0) {
        geofences.forEach(g => {
          if (g.latitude && g.longitude) {
            bounds.push([g.latitude, g.longitude]);
          }
        });
      }

      if (bounds.length > 0) {
        if (bounds.length === 1) {
          map.setView(bounds[0], 16);
        } else {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      }

      prevMarkersRef.current = markers;
      prevGeofencesRef.current = geofences;
    }
  }, [markers, geofences, map]);

  return null;
}

export default function MapView({
  latitude,
  longitude,
  radius = 50,
  geofences = [],
  height = '300px',
  zoom = 15,
  showGeofence = true,
  geofenceColor = '#3b82f6',
  markerColor = '#ef4444',
  className = ''
}) {
  const position = latitude && longitude ? [latitude, longitude] : [28.6139, 77.2090]; // Default to Delhi

  // Parse geofences if passed as JSON string
  const parsedGeofences = geofences.map(g => {
    if (typeof g === 'string') {
      try {
        return JSON.parse(g);
      } catch {
        return g;
      }
    }
    return g;
  });

  return (
    <div className={`rounded-lg overflow-hidden ${className}`} style={{ height }}>
      <MapContainer
        center={position}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Single marker for location */}
        {latitude && longitude && (
          <Marker 
            position={[latitude, longitude]} 
            icon={createCustomIcon(markerColor)}
          />
        )}

        {/* Single geofence circle */}
        {showGeofence && latitude && longitude && radius && (
          <Circle
            center={[latitude, longitude]}
            radius={radius}
            pathOptions={{
              color: geofenceColor,
              fillColor: geofenceColor,
              fillOpacity: 0.1,
              weight: 2
            }}
          />
        )}

        {/* Multiple geofences */}
        {parsedGeofences.map((geofence, index) => {
          if (!geofence.latitude || !geofence.longitude) return null;
          
          const isActive = geofence.isActive !== false;
          const color = isActive ? geofenceColor : '#9ca3af';
          
          return (
            <Circle
              key={geofence._id || geofence.id || index}
              center={[geofence.latitude, geofence.longitude]}
              radius={geofence.radiusMeters || geofence.radius || 100}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: isActive ? 0.15 : 0.05,
                weight: 2,
                dashArray: isActive ? undefined : '5, 5'
              }}
            />
          );
        })}

        {/* Fit bounds to show all markers and geofences */}
        <FitBounds 
          markers={latitude && longitude ? [{ lat: latitude, lng: longitude }] : []} 
          geofences={parsedGeofences}
        />
      </MapContainer>
    </div>
  );
}

// Export additional utilities
export { createCustomIcon };
