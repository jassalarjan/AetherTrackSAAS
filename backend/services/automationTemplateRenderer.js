const PLACEHOLDER_REGEX = /{{\s*([^{}\s]+)\s*}}/g;

const readPath = (obj, path) => {
  if (!obj || !path) return undefined;
  return String(path)
    .split('.')
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const asBindingsObject = (variableBindings) => {
  if (variableBindings instanceof Map) return Object.fromEntries(variableBindings);
  if (variableBindings && typeof variableBindings === 'object') return variableBindings;
  return {};
};

const unwrapDiffValue = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  if (hasOwn(value, 'to')) return value.to;
  if (hasOwn(value, 'value')) return value.value;
  return value;
};

const resolveFromDiff = (diff, key) => {
  if (!diff || typeof diff !== 'object' || !key) return undefined;

  if (hasOwn(diff, key)) {
    return unwrapDiffValue(diff[key]);
  }

  const nested = readPath(diff, key);
  if (nested !== undefined) {
    return unwrapDiffValue(nested);
  }

  if (!String(key).includes('.')) {
    const asToPath = readPath(diff, `${key}.to`);
    if (asToPath !== undefined) return asToPath;
  }

  return undefined;
};

const resolveSourcePath = (sourcePath, context) => {
  if (!sourcePath || typeof sourcePath !== 'string') return undefined;

  const direct = readPath(context, sourcePath);
  if (direct !== undefined) return direct;

  const fromDiff = resolveFromDiff(context?.diff, sourcePath);
  if (fromDiff !== undefined) return fromDiff;

  return undefined;
};

const buildFallbackValues = (context) => {
  const nowRaw = context?.now || context?.timestamp || new Date();
  const now = nowRaw instanceof Date ? nowRaw : new Date(nowRaw);
  const diff = context?.diff || {};

  return {
    now: now.toISOString(),
    timestamp: now.toISOString(),
    date: now.toLocaleDateString('en-US'),
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    entityType: context?.entityType,
    action: context?.action,
    entityName: context?.entityName,
    entityId: context?.entityId,
    changedBy: context?.changedByName || context?.changedBy || context?.changedByEmail,
    changedByName: context?.changedByName,
    changedByEmail: context?.changedByEmail,
    projectId: context?.projectId || resolveFromDiff(diff, 'projectId'),
    assigneeEmail: context?.assigneeEmail || resolveFromDiff(diff, 'assigned_to'),
    fromStatus: context?.fromStatus || resolveFromDiff(diff, 'status.from'),
    toStatus: context?.toStatus || resolveFromDiff(diff, 'status.to')
  };
};

const stringifyValue = (value) => {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.filter((item) => item != null).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const resolvePlaceholderValue = (placeholder, bindings, context, fallbackValues) => {
  const boundSource = bindings[placeholder];
  if (typeof boundSource === 'string' && boundSource.trim()) {
    const boundValue = resolveSourcePath(boundSource.trim(), context);
    if (boundValue !== undefined) return boundValue;
  }

  const directValue = resolveSourcePath(placeholder, context);
  if (directValue !== undefined) return directValue;

  if (hasOwn(fallbackValues, placeholder)) return fallbackValues[placeholder];

  return '';
};

export const renderAutomationTemplate = (text = '', variableBindings = {}, context = {}) => {
  const source = String(text ?? '');
  if (!source.includes('{{')) return source;

  const safeContext = context && typeof context === 'object' ? context : {};
  const bindings = asBindingsObject(variableBindings);
  const fallbackValues = buildFallbackValues(safeContext);

  return source.replace(PLACEHOLDER_REGEX, (_match, placeholder) => {
    const value = resolvePlaceholderValue(String(placeholder).trim(), bindings, safeContext, fallbackValues);
    return stringifyValue(value);
  });
};
