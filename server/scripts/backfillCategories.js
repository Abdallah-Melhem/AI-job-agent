const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const Job = require('../models/Job');
const { normalizeCategory } = require('../adapters/categoryNormalizer');

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not found in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const jobs = await Job.find({});
  console.log(`Found ${jobs.length} jobs to inspect`);

  let updated = 0;
  for (const job of jobs) {
    const rawTags = job.rawData?.tags || job.rawData?.jobIndustry || job.skills || [];
    const cat = normalizeCategory(rawTags, job.title, job.skills);

    if (!job.category || job.category !== cat) {
      await Job.updateOne({ _id: job._id }, { $set: { category: cat, subcategory: '' } });
      updated++;
    }
  }

  // Final check: any job still missing category gets 'Other'
  await Job.updateMany(
    { $or: [{ category: null }, { category: { $exists: false } }] },
    { $set: { category: 'Other', subcategory: '' } }
  );

  console.log(`Successfully backfilled/normalized ${updated} jobs with categories.`);
  const summary = await Job.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  console.log('Category distribution in DB:');
  console.table(summary);

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
