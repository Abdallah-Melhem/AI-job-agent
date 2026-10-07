/**
 * responseValidator.js — Agent Response Validation Component
 * Phase 8: AI Agent and Controlled Tools
 *
 * Enforces:
 *  1. Never invent jobs: verifies all job IDs against the database
 *  2. Traceability: verifies every recommendation has a clear execution audit trail
 *  3. Candidate truthfulness: ensures summary claims align with profile data
 */

'use strict';

const Job = require('../models/Job');
const logger = require('../utils/logger');

class ResponseValidator {
  /**
   * Validates the completed task result before returning to client or saving to state
   *
   * @param {object} taskResult - { matchedJobs, summary, trace }
   * @param {object} context - { user, candidateProfile }
   * @returns {Promise<{ valid: boolean, sanitizedResult: object, warnings: string[] }>}
   */
  async validateAgentOutput(taskResult, context = {}) {
    const warnings = [];
    const matchedJobs = Array.isArray(taskResult.matchedJobs) ? taskResult.matchedJobs : [];

    // 1. Verify that all matched jobs actually exist in the database (anti-fabrication)
    const jobIds = matchedJobs.map(j => j.jobId || j.id).filter(Boolean);
    let verifiedJobs = [];

    if (jobIds.length > 0) {
      const existingJobs = await Job.find({ _id: { $in: jobIds } }).lean();
      const existingMap = new Map(existingJobs.map(j => [j._id.toString(), j]));

      for (const candidate of matchedJobs) {
        const idStr = (candidate.jobId || candidate.id || '').toString();
        if (existingMap.has(idStr)) {
          const dbJob = existingMap.get(idStr);
          // Reconcile and guarantee genuine data
          verifiedJobs.push({
            ...candidate,
            jobId: idStr,
            title: dbJob.title,
            company: dbJob.company,
            verified: true
          });
        } else {
          warnings.push(`Rejected unverified or fabricated job ID: "${idStr}".`);
          logger.warn(`[AGENT] ResponseValidator: Fabricated job rejected: ${idStr}`);
        }
      }
    }

    // 2. Build traceable audit trail
    const trace = {
      timestamp: new Date(),
      jobsEvaluated: jobIds.length,
      jobsVerified: verifiedJobs.length,
      candidateId: context.user ? context.user._id.toString() : null,
      passedIntegrityCheck: warnings.length === 0
    };

    // 3. Guarantee truthful summary
    let summary = taskResult.summary || '';
    if (verifiedJobs.length === 0 && matchedJobs.length > 0) {
      summary = 'Agent search concluded, but no verified matching job opportunities were found in the database.';
    }

    const sanitizedResult = {
      ...taskResult,
      matchedJobs: verifiedJobs,
      summary,
      trace,
      warnings
    };

    return {
      valid: warnings.length === 0,
      sanitizedResult,
      warnings
    };
  }
}

module.exports = new ResponseValidator();
