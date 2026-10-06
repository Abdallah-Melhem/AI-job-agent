const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function migrate() {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in environment.');
    process.exit(1);
  }

  console.log('[Migration] Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[Migration] Connected successfully.');

  const Job = require('../models/Job');
  const Application = require('../models/Application');
  const TailoredResume = require('../models/TailoredResume');

  // 1. Identify fake / mock jobs
  const fakeJobs = await Job.find({ source: 'mock' }).lean();
  console.log(`[Migration] Found ${fakeJobs.length} fake/mock job(s) in database.`);

  if (fakeJobs.length > 0) {
    const fakeJobIds = fakeJobs.map(j => j._id);

    // Verify relations to ensure safe deletion
    const appsReferencing = await Application.find({ job: { $in: fakeJobIds } }).countDocuments();
    const tailoredReferencing = await TailoredResume.find({ job: { $in: fakeJobIds } }).countDocuments();

    if (appsReferencing > 0 || tailoredReferencing > 0) {
      console.warn(`[Migration] Warning: Found ${appsReferencing} application(s) and ${tailoredReferencing} tailored resume(s) referencing mock jobs.`);
    }

    // Delete fake jobs
    const deleteResult = await Job.deleteMany({ source: 'mock' });
    console.log(`[Migration] Removed ${deleteResult.deletedCount} fake job(s) from database.`);
  } else {
    console.log('[Migration] No fake jobs found to remove.');
  }

  // 2. Backfill metadata and normalize types on existing real jobs
  const validTypes = ['full-time', 'part-time', 'contract', 'internship', 'freelance', 'other'];
  const allRealJobs = await Job.find({ source: { $ne: 'mock' } }).lean();

  console.log(`[Migration] Checking ${allRealJobs.length} existing job(s) for missing source metadata and enum standardization...`);
  let backfilledCount = 0;

  for (const job of allRealJobs) {
    const update = {};

    // Source URL synchronization
    const resolvedUrl = job.sourceUrl || job.url || '';
    if (!job.sourceUrl && resolvedUrl) update.sourceUrl = resolvedUrl;
    if (!job.url && resolvedUrl) update.url = resolvedUrl;

    // ImportedAt timestamp
    if (!job.importedAt) {
      update.importedAt = job.createdAt || new Date();
    }

    // Status
    if (!job.status) {
      update.status = 'active';
    }

    // Type normalization
    if (!validTypes.includes(job.type)) {
      const rawType = String(job.type || '').toLowerCase();
      if (rawType.includes('part') || rawType.includes('teilzeit')) {
        update.type = 'part-time';
      } else if (rawType.includes('intern') || rawType.includes('praktik') || rawType.includes('student') || rawType.includes('werkstudent')) {
        update.type = 'internship';
      } else if (rawType.includes('contract') || rawType.includes('befristet')) {
        update.type = 'contract';
      } else if (rawType.includes('freelance')) {
        update.type = 'freelance';
      } else if (rawType.includes('full') || rawType.includes('vollzeit') || rawType.includes('experienced') || rawType.includes('berufserfahren')) {
        update.type = 'full-time';
      } else {
        update.type = 'other';
      }
    }

    if (Object.keys(update).length > 0) {
      await Job.updateOne({ _id: job._id }, { $set: update });
      backfilledCount++;
    }
  }

  console.log(`[Migration] Backfilled metadata on ${backfilledCount} job(s).`);

  // 3. Final verification
  const remainingTotal = await Job.countDocuments();
  const remainingMock = await Job.countDocuments({ source: 'mock' });
  const bySource = await Job.aggregate([{ $group: { _id: '$source', count: { $sum: 1 } } }]);

  console.log('[Migration] Summary of remaining jobs in database:');
  console.log(`  - Total jobs: ${remainingTotal}`);
  console.log(`  - Mock jobs: ${remainingMock}`);
  console.log('  - Breakdown by source:', JSON.stringify(bySource));

  await mongoose.disconnect();
  console.log('[Migration] Completed successfully.');
}

migrate().catch((err) => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
