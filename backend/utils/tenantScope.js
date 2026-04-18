import mongoose from 'mongoose';

export const getTenantIdFromUser = (user) => {
  const tenant = user?.workspace_id || user?.workspaceId || user?.workspace || user?._id;
  if (!tenant) return null;
  return String(tenant);
};

export const normalizeObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
};

export const getTenantQuery = (tenantId, field = 'tenantId') => {
  const objectId = normalizeObjectId(tenantId);
  if (!objectId) return null;
  return { [field]: objectId };
};
