import mongoose from 'mongoose';
import ChangelogEntry from '../ChangelogEntry.js';

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(value)) return new mongoose.Types.ObjectId(value);
  return null;
};

const getTenantId = async (doc) => {
  const direct = doc?.tenantId || doc?.workspace || doc?.workspaceId || doc?.workspace_id;
  if (direct) {
    return toObjectId(direct);
  }

  const userRef = doc?.created_by || doc?.createdBy || doc?.userId || doc?.changedBy;
  if (!userRef) return null;

  const UserModel = mongoose.models.User;
  if (!UserModel) return null;

  const user = await UserModel.findById(userRef).select('workspaceId');
  return toObjectId(user?.workspaceId);
};

const queueWrite = (payload) => {
  Promise.resolve()
    .then(async () => {
      const entry = await ChangelogEntry.create(payload);
      const { handleChangelogAutomation } = await import('../../services/automationRunner.js');
      await handleChangelogAutomation(entry);
    })
    .catch(() => {});
};

const diffFromUpdate = (prev, next, explicitUpdate = {}) => {
  const diff = {};
  const setPayload = explicitUpdate?.$set || explicitUpdate || {};
  const unsetPayload = explicitUpdate?.$unset || {};

  for (const key of Object.keys(setPayload)) {
    const before = prev?.[key];
    const after = setPayload[key];
    if (String(before) !== String(after)) {
      diff[key] = { from: before ?? null, to: after ?? null };
    }
  }

  for (const key of Object.keys(unsetPayload)) {
    diff[key] = { from: prev?.[key] ?? null, to: null };
  }

  if (Object.keys(diff).length === 0 && prev && next) {
    for (const key of Object.keys(next.toObject ? next.toObject() : next)) {
      if (['updated_at', 'updatedAt', '__v'].includes(key)) continue;
      const before = prev[key];
      const after = next[key];
      if (String(before) !== String(after)) {
        diff[key] = { from: before ?? null, to: after ?? null };
      }
    }
  }

  return diff;
};

const inferAction = (entityType, diff = {}, doc = {}) => {
  if (Object.prototype.hasOwnProperty.call(diff, 'status')) {
    const toStatus = diff.status?.to;
    if (entityType === 'task' && (toStatus === 'done' || toStatus === 'completed')) return 'completed';
    if (entityType === 'sprint' && toStatus === 'completed') return 'completed';
    return 'status_changed';
  }

  if (Object.prototype.hasOwnProperty.call(diff, 'assigned_to') || Object.prototype.hasOwnProperty.call(diff, 'assignedTo')) {
    return 'assigned';
  }

  if (entityType === 'milestone' && (doc?.progress >= 100 || doc?.status === 'done')) {
    return 'completed';
  }

  return 'updated';
};

export const attachAutomationChangelogHooks = (schema, { entityType, nameField }) => {
  schema.pre('save', function preSave(next) {
    this.$locals = this.$locals || {};
    this.$locals.__wasNew = this.isNew;
    next();
  });

  schema.pre('findOneAndUpdate', async function preFindOneAndUpdate() {
    this.__previousDoc = await this.model.findOne(this.getQuery()).lean();
  });

  schema.post('save', async function postSave(doc) {
    const tenantId = await getTenantId(doc);
    if (!tenantId) return;

    queueWrite({
      tenantId,
      entityType: typeof entityType === 'function' ? entityType(doc) : entityType,
      action: doc.$locals?.__wasNew ? 'created' : inferAction(typeof entityType === 'function' ? entityType(doc) : entityType, {}, doc),
      entityId: doc._id,
      entityName: doc?.[nameField] || doc?.title || doc?.name || '',
      changedBy: doc?.updatedBy || doc?.created_by || doc?.createdBy || null,
      diff: doc.$locals?.__wasNew ? doc.toObject() : {}
    });
  });

  schema.post('findOneAndUpdate', async function postFindOneAndUpdate(doc) {
    if (!doc) return;
    const tenantId = await getTenantId(doc);
    if (!tenantId) return;

    const prev = this.__previousDoc;
    const update = this.getUpdate() || {};
    const diff = diffFromUpdate(prev, doc, update);
    const resolvedEntityType = typeof entityType === 'function' ? entityType(doc) : entityType;

    queueWrite({
      tenantId,
      entityType: resolvedEntityType,
      action: inferAction(resolvedEntityType, diff, doc),
      entityId: doc._id,
      entityName: doc?.[nameField] || doc?.title || doc?.name || '',
      changedBy: doc?.updatedBy || doc?.created_by || doc?.createdBy || null,
      diff
    });
  });

  schema.post('findOneAndDelete', async function postFindOneAndDelete(doc) {
    if (!doc) return;
    const tenantId = await getTenantId(doc);
    if (!tenantId) return;

    queueWrite({
      tenantId,
      entityType: typeof entityType === 'function' ? entityType(doc) : entityType,
      action: 'deleted',
      entityId: doc._id,
      entityName: doc?.[nameField] || doc?.title || doc?.name || '',
      changedBy: doc?.updatedBy || doc?.created_by || doc?.createdBy || null,
      diff: {}
    });
  });
};
