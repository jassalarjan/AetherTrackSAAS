/**
 * GeofenceLocation Model
 * 
 * Defines geofenced locations for attendance verification.
 * Users must be within the specified radius of these locations to check in/out.
 * Uses GeoJSON format for location coordinates.
 */

import mongoose from 'mongoose';

const geofenceLocationSchema = new mongoose.Schema({
  // Reference to workspace
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Workspace ID is required'],
    index: true
  },

  // Location name
  name: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true,
    maxlength: 100
  },

  // Optional description
  description: {
    type: String,
    default: '',
    maxlength: 500
  },

  // GeoJSON location point
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Coordinates are required'],
      validate: {
        validator: function(v) {
          // Validate longitude (-180 to 180) and latitude (-90 to 90)
          return v.length === 2 && 
                 v[0] >= -180 && v[0] <= 180 &&
                 v[1] >= -90 && v[1] <= 90;
        },
        message: 'Invalid coordinates. Longitude must be -180 to 180, latitude must be -90 to 90'
      }
    }
  },

  // Radius in meters
  radiusMeters: {
    type: Number,
    default: 100,
    min: 10,
    max: 5000
  },

  // Whether this geofence is active
  isActive: {
    type: Boolean,
    default: true
  },

  // Creator of the geofence
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
geofenceLocationSchema.index({ location: '2dsphere' });

// Compound index for workspace queries
geofenceLocationSchema.index({ workspaceId: 1, isActive: 1 });

/**
 * Check if a given coordinate is within this geofence
 * @param {number} longitude - Longitude of the point to check
 * @param {number} latitude - Latitude of the point to check
 * @returns {Object} - { within: boolean, distance: number }
 */
geofenceLocationSchema.methods.isWithinGeofence = function(longitude, latitude) {
  const R = 6371000; // Earth's radius in meters
  
  const lat1 = this.location.coordinates[1];
  const lon1 = this.location.coordinates[0];
  const lat2 = latitude;
  const lon2 = longitude;
  
  const dLat = this.toRad(lat2 - lat1);
  const dLon = this.toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return {
    within: distance <= this.radiusMeters,
    distance: Math.round(distance)
  };
};

geofenceLocationSchema.methods.toRad = function(deg) {
  return deg * (Math.PI / 180);
};

const GeofenceLocation = mongoose.model('GeofenceLocation', geofenceLocationSchema);

export default GeofenceLocation;
