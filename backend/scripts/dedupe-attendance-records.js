import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Attendance from '../models/Attendance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

function parseArgs(argv) {
  const args = {
    apply: false,
    userId: null,
    from: null,
    to: null,
    limitGroups: null,
  };

  for (const item of argv) {
    if (item === '--apply') args.apply = true;
    if (item.startsWith('--user=')) args.userId = item.split('=')[1] || null;
    if (item.startsWith('--from=')) args.from = item.split('=')[1] || null;
    if (item.startsWith('--to=')) args.to = item.split('=')[1] || null;
    if (item.startsWith('--limit-groups=')) {
      const n = Number(item.split('=')[1]);
      args.limitGroups = Number.isFinite(n) && n > 0 ? n : null;
    }
  }

  return args;
}

function toLocalDayKey(dateValue) {
  const d = new Date(dateValue);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateBound(value, endOfDay = false) {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  if (endOfDay) {
    dt.setHours(23, 59, 59, 999);
  } else {
    dt.setHours(0, 0, 0, 0);
  }
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function hasVerificationData(att) {
  const v = att.verification || {};
  return Boolean(
    v.photoUrl ||
    v.photoPublicId ||
    (v.gpsLocation && (v.gpsLocation.latitude != null || v.gpsLocation.longitude != null)) ||
    v.geoPoint ||
    v.deviceInfo ||
    v.serverTimestamp
  );
}

function statusWeight(status) {
  const order = {
    holiday: 60,
    leave: 55,
    present: 50,
    wfh: 48,
    half_day: 45,
    absent: 30,
  };
  return order[status] || 0;
}

function completenessScore(att) {
  let score = 0;

  if (att.checkIn) score += 100;
  if (att.checkOut) score += 100;
  if (att.isOverride || att.isOverridden) score += 80;
  if (att.adminReview?.reviewedAt) score += 60;
  if (hasVerificationData(att)) score += 50;
  if (Array.isArray(att.verificationFlags) && att.verificationFlags.length > 0) score += 20;
  if (att.reason && String(att.reason).trim()) score += 10;
  if (att.notes && String(att.notes).trim()) score += 10;
  score += statusWeight(att.status);

  return score;
}

function pickKeeper(records) {
  return records
    .slice()
    .sort((a, b) => {
      const scoreDiff = completenessScore(b) - completenessScore(a);
      if (scoreDiff !== 0) return scoreDiff;

      const aUpdated = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bUpdated = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bUpdated - aUpdated;
    })[0];
}

function selectBestStatus(records, fallbackStatus) {
  const statuses = records.map((r) => r.status).filter(Boolean);
  if (statuses.length === 0) return fallbackStatus || 'absent';

  const hasOverrideStatus = records
    .filter((r) => r.isOverride || r.isOverridden)
    .map((r) => r.status)
    .filter(Boolean)
    .sort((a, b) => statusWeight(b) - statusWeight(a))[0];

  if (hasOverrideStatus) return hasOverrideStatus;
  return statuses.sort((a, b) => statusWeight(b) - statusWeight(a))[0];
}

function mergeVerification(records, keeper) {
  const firstWithVerification = records.find((r) => hasVerificationData(r));
  if (!firstWithVerification) return keeper.verification || undefined;

  const v = firstWithVerification.verification || {};
  const merged = {
    ...(keeper.verification || {}),
    ...v,
    gpsLocation: {
      ...(keeper.verification?.gpsLocation || {}),
      ...(v.gpsLocation || {}),
    },
    deviceInfo: {
      ...(keeper.verification?.deviceInfo || {}),
      ...(v.deviceInfo || {}),
    },
  };

  return merged;
}

function mergeGroup(records) {
  const keeper = pickKeeper(records);
  const others = records.filter((r) => String(r._id) !== String(keeper._id));

  const checkIns = records.map((r) => r.checkIn).filter(Boolean).map((d) => new Date(d));
  const checkOuts = records.map((r) => r.checkOut).filter(Boolean).map((d) => new Date(d));

  const earliestCheckIn = checkIns.length ? new Date(Math.min(...checkIns.map((d) => d.getTime()))) : null;
  const latestCheckOut = checkOuts.length ? new Date(Math.max(...checkOuts.map((d) => d.getTime()))) : null;

  const reviewRecords = records.filter((r) => r.adminReview?.reviewedAt);
  const latestReviewSource = reviewRecords.sort(
    (a, b) => new Date(b.adminReview.reviewedAt).getTime() - new Date(a.adminReview.reviewedAt).getTime()
  )[0];

  const overrideSource = records
    .filter((r) => r.isOverride || r.isOverridden)
    .sort((a, b) => new Date(b.overrideTimestamp || b.updatedAt || 0).getTime() - new Date(a.overrideTimestamp || a.updatedAt || 0).getTime())[0];

  const mergedFlags = Array.from(
    new Set(records.flatMap((r) => (Array.isArray(r.verificationFlags) ? r.verificationFlags : [])))
  );

  const notesCandidate = records
    .map((r) => r.notes)
    .filter((v) => typeof v === 'string' && v.trim())
    .sort((a, b) => b.length - a.length)[0];

  const reasonCandidate = records
    .map((r) => r.reason)
    .filter((v) => typeof v === 'string' && v.trim())
    .sort((a, b) => b.length - a.length)[0];

  return {
    keeper,
    duplicateIds: others.map((r) => r._id),
    mergedUpdate: {
      checkIn: earliestCheckIn || keeper.checkIn || null,
      checkOut: latestCheckOut || keeper.checkOut || null,
      status: selectBestStatus(records, keeper.status),
      notes: notesCandidate ?? keeper.notes,
      reason: reasonCandidate ?? keeper.reason,
      projectId: keeper.projectId || records.find((r) => r.projectId)?.projectId || null,
      exceptionId: keeper.exceptionId || records.find((r) => r.exceptionId)?.exceptionId || null,
      verification: mergeVerification(records, keeper),
      verificationFlags: mergedFlags,
      verificationStatus: keeper.verificationStatus || records.find((r) => r.verificationStatus)?.verificationStatus || 'pending',
      adminReview: latestReviewSource?.adminReview || keeper.adminReview,
      isOverride: Boolean(keeper.isOverride || overrideSource?.isOverride),
      isOverridden: Boolean(keeper.isOverridden || overrideSource?.isOverridden),
      overrideBy: keeper.overrideBy || overrideSource?.overrideBy || null,
      overrideReason: keeper.overrideReason || overrideSource?.overrideReason || '',
      overrideTimestamp: keeper.overrideTimestamp || overrideSource?.overrideTimestamp || null,
      attachmentUrl: keeper.attachmentUrl || records.find((r) => r.attachmentUrl)?.attachmentUrl || null,
      attachmentType: keeper.attachmentType || records.find((r) => r.attachmentType)?.attachmentType || null,
      workMode: keeper.workMode || records.find((r) => r.workMode)?.workMode || null,
      shift_id: keeper.shift_id || records.find((r) => r.shift_id)?.shift_id || null,
      expected_hours: keeper.expected_hours ?? records.find((r) => r.expected_hours != null)?.expected_hours ?? null,
      late_minutes: Math.max(...records.map((r) => Number(r.late_minutes || 0))),
      early_exit_minutes: Math.max(...records.map((r) => Number(r.early_exit_minutes || 0))),
      overtime_hours: Math.max(...records.map((r) => Number(r.overtime_hours || 0))),
      shift_status: keeper.shift_status || records.find((r) => r.shift_status)?.shift_status || null,
    },
  };
}

async function dedupeAttendance() {
  const args = parseArgs(process.argv.slice(2));

  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not set in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const query = {};
  if (args.userId) {
    if (!mongoose.Types.ObjectId.isValid(args.userId)) {
      console.error('ERROR: --user must be a valid ObjectId');
      process.exit(1);
    }
    query.userId = new mongoose.Types.ObjectId(args.userId);
  }

  const fromDate = parseDateBound(args.from, false);
  const toDate = parseDateBound(args.to, true);

  if ((args.from && !fromDate) || (args.to && !toDate)) {
    console.error('ERROR: --from / --to must be in YYYY-MM-DD format');
    process.exit(1);
  }

  if (fromDate || toDate) {
    query.date = {};
    if (fromDate) query.date.$gte = fromDate;
    if (toDate) query.date.$lte = toDate;
  }

  const records = await Attendance.find(query)
    .sort({ userId: 1, date: 1, createdAt: 1 })
    .lean();

  const grouped = new Map();
  for (const r of records) {
    const key = `${String(r.userId)}__${toLocalDayKey(r.date)}`;
    const bucket = grouped.get(key) || [];
    bucket.push(r);
    grouped.set(key, bucket);
  }

  const duplicateGroups = Array.from(grouped.entries())
    .filter(([, arr]) => arr.length > 1)
    .map(([key, arr]) => ({ key, records: arr }));

  const selectedGroups = args.limitGroups
    ? duplicateGroups.slice(0, args.limitGroups)
    : duplicateGroups;

  console.log(`Scanned records: ${records.length}`);
  console.log(`Duplicate user+day groups found: ${duplicateGroups.length}`);
  if (args.limitGroups) {
    console.log(`Processing first ${selectedGroups.length} groups due to --limit-groups=${args.limitGroups}`);
  }

  const report = {
    mode: args.apply ? 'APPLY' : 'DRY_RUN',
    totalRecordsScanned: records.length,
    duplicateGroupsFound: duplicateGroups.length,
    duplicateGroupsProcessed: selectedGroups.length,
    mergedGroups: 0,
    deletedRecords: 0,
    groups: [],
  };

  for (const group of selectedGroups) {
    const { keeper, duplicateIds, mergedUpdate } = mergeGroup(group.records);

    const groupReport = {
      key: group.key,
      count: group.records.length,
      keeperId: String(keeper._id),
      duplicateIds: duplicateIds.map((id) => String(id)),
      before: group.records.map((r) => ({
        id: String(r._id),
        date: r.date,
        status: r.status,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        isOverride: !!r.isOverride,
        verificationStatus: r.verificationStatus,
      })),
      afterPreview: {
        status: mergedUpdate.status,
        checkIn: mergedUpdate.checkIn,
        checkOut: mergedUpdate.checkOut,
        verificationStatus: mergedUpdate.verificationStatus,
      },
    };

    if (args.apply) {
      await Attendance.updateOne({ _id: keeper._id }, { $set: mergedUpdate });
      if (duplicateIds.length > 0) {
        await Attendance.deleteMany({ _id: { $in: duplicateIds } });
      }
      report.mergedGroups += 1;
      report.deletedRecords += duplicateIds.length;
    }

    report.groups.push(groupReport);
  }

  console.log('\nSummary');
  console.log(`Mode: ${report.mode}`);
  console.log(`Groups processed: ${report.duplicateGroupsProcessed}`);
  console.log(`Groups merged: ${report.mergedGroups}`);
  console.log(`Duplicate records deleted: ${report.deletedRecords}`);

  if (!args.apply) {
    console.log('\nDry run only. No records were changed.');
    console.log('Run with --apply to persist changes.');
  }

  const sample = report.groups.slice(0, 10);
  console.log('\nSample groups (up to 10):');
  for (const g of sample) {
    console.log(`- ${g.key}: keep ${g.keeperId}, delete ${g.duplicateIds.length}`);
  }

  await mongoose.connection.close();
}

(async () => {
  try {
    await dedupeAttendance();
    process.exit(0);
  } catch (error) {
    console.error('ERROR running dedupe:', error);
    process.exit(1);
  }
})();
