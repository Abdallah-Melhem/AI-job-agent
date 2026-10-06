const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const Job = require('../models/Job');
const { normalizeExperienceLevel, extractCountry } = require('../adapters/jobNormalizer');

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
    const rawLevel = job.rawData?.jobLevel || job.rawData?.level || '';
    const rawGeo = job.rawData?.jobGeo || job.location || '';

    const exp = normalizeExperienceLevel(rawLevel, job.title);
    const country = extractCountry(job.location, rawGeo);

    let needsUpdate = false;
    const updateFields = {};

    if (!job.experienceLevel || job.experienceLevel === 'not-specified') {
      if (exp !== 'not-specified') {
        updateFields.experienceLevel = exp;
        needsUpdate = true;
      } else if (!job.experienceLevel) {
        updateFields.experienceLevel = 'not-specified';
        needsUpdate = true;
      }
    }

    if (!job.country && country) {
      updateFields.country = country;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await Job.updateOne({ _id: job._id }, { $set: updateFields });
      updated++;
    }
  }

  // Ensure all remaining without country or experienceLevel get defaults
  await Job.updateMany(
    { $or: [{ experienceLevel: null }, { experienceLevel: { $exists: false } }] },
    { $set: { experienceLevel: 'not-specified' } }
  );
  await Job.updateMany(
    { $or: [{ country: null }, { country: { $exists: false } }] },
    { $set: { country: '' } }
  );

  console.log(`Updated ${updated} jobs with experienceLevel and country.`);

  const expSummary = await Job.aggregate([
    { $group: { _id: '$experienceLevel', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('Experience level distribution in DB:');
  console.table(expSummary);

  const countrySummary = await Job.aggregate([
    { $group: { _id: '$country', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('Country distribution in DB:');
  console.table(countrySummary);

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
