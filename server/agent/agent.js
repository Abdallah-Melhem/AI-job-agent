/**
 * AIAgent — Autonomous Multi-Step Job Discovery Agent
 * Phase 8: AI Agent and Controlled Tools
 *
 * Coordinates:
 *  - Guardrails (injection defense, loop bounds, code execution prevention)
 *  - State manager (task status, logs, plan steps)
 *  - Planner (multi-step plan formulation)
 *  - Tool executor (controlled, permission-checked execution)
 *  - Response validator (anti-fabrication, genuine database jobs check)
 */

'use strict';

const guardrails = require('./guardrails');
const stateManager = require('./stateManager');
const planner = require('./planner');
const toolExecutor = require('./toolExecutor');
const responseValidator = require('./responseValidator');
const logger = require('../utils/logger');

class AIAgent {
  /**
   * Run the AI Agent to accomplish a user goal
   * @param {object} user - Authenticated user object
   * @param {string} goal - High level goal description
   */
  async run(user, goal) {
    // 1. Guardrail Input Sanitization
    const sanitizedGoal = guardrails.sanitizeInput(goal);

    // 2. Initialize State
    const task = await stateManager.createTask(user._id, sanitizedGoal);
    const taskId = task._id;
    const context = { user };

    logger.agent(taskId, 'task_started', { userId: user._id, goal: sanitizedGoal });

    try {
      await stateManager.addLog(taskId, 'Generating autonomous execution plan...');

      // 3. Plan Generation
      const generatedPlan = await planner.createPlan(sanitizedGoal);
      const planSteps = generatedPlan.steps.map(s => ({
        step: s.step,
        action: s.action,
        tool: s.tool,
        status: 'pending'
      }));

      await stateManager.setPlan(taskId, planSteps);
      await stateManager.addLog(taskId, `Plan formulated with ${planSteps.length} steps.`, generatedPlan.searchCriteria);

      // Runtime State
      let candidateProfile = null;
      let candidatePreferences = null;
      let candidateJobs = [];
      const matchedJobs = [];
      const explanations = [];

      // 4. Execution Loop
      for (const step of planSteps) {
        guardrails.checkStepLimit(step.step);
        await stateManager.updateStep(taskId, step.step, 'running');
        await stateManager.addLog(taskId, `Executing Step ${step.step}: ${step.action}`);

        guardrails.validateToolCall(step.tool, {}, context);

        switch (step.tool) {
          case 'getCandidateProfile': {
            const res = await toolExecutor.execute('getCandidateProfile', {}, context);
            if (res.success && res.data.profile) {
              candidateProfile = res.data.profile;
              await stateManager.updateStep(taskId, step.step, 'completed', 'Loaded candidate profile successfully.');
              await stateManager.addLog(taskId, `Profile loaded with ${(candidateProfile.skills || []).length} skills.`);
            } else {
              await stateManager.updateStep(taskId, step.step, 'completed', 'Profile retrieved (empty or basic).');
              await stateManager.addLog(taskId, 'Candidate profile is empty or uncompleted.');
            }
            break;
          }

          case 'getCandidatePreferences': {
            const res = await toolExecutor.execute('getCandidatePreferences', {}, context);
            if (res.success) {
              candidatePreferences = res.data.preferences;
              await stateManager.updateStep(taskId, step.step, 'completed', 'Retrieved candidate search preferences.');
              await stateManager.addLog(taskId, 'Candidate preferences loaded.', candidatePreferences);
            } else {
              await stateManager.updateStep(taskId, step.step, 'completed', 'Preferences defaulted.');
            }
            break;
          }

          case 'getCandidateSkills': {
            const res = await toolExecutor.execute('getCandidateSkills', {}, context);
            const skillsCount = res.success ? res.data.skills.length : 0;
            await stateManager.updateStep(taskId, step.step, 'completed', `Extracted ${skillsCount} verified skills.`);
            await stateManager.addLog(taskId, `Extracted ${skillsCount} candidate skills.`);
            break;
          }

          case 'searchJobs': {
            const searchParams = {
              keyword: generatedPlan.searchCriteria?.keyword || '',
              type: generatedPlan.searchCriteria?.type || '',
              remote: generatedPlan.searchCriteria?.remote || '',
              location: generatedPlan.searchCriteria?.location || '',
              experienceLevel: generatedPlan.searchCriteria?.experienceLevel || '',
              minSalary: generatedPlan.searchCriteria?.minSalary || undefined,
              limit: 10
            };

            // Merge candidate preferences if present and not overridden by goal
            if (candidatePreferences) {
              if (!searchParams.type && candidatePreferences.employmentTypes?.length > 0) {
                searchParams.type = candidatePreferences.employmentTypes[0];
              }
              if (!searchParams.location && candidatePreferences.locations?.length > 0) {
                searchParams.location = candidatePreferences.locations[0];
              }
            }

            const res = await toolExecutor.execute('searchJobs', searchParams, context);
            if (res.success) {
              candidateJobs = res.data.jobs || [];
              await stateManager.updateStep(
                taskId,
                step.step,
                'completed',
                `Found ${candidateJobs.length} candidate jobs matching search criteria.`
              );
              await stateManager.addLog(taskId, `Discovered ${candidateJobs.length} candidate jobs.`, { count: candidateJobs.length });
            } else {
              throw new Error(`Failed to search jobs: ${res.error}`);
            }
            break;
          }

          case 'filterJobs': {
            if (candidateJobs.length === 0) {
              await stateManager.updateStep(taskId, step.step, 'skipped', 'No jobs to filter.');
              break;
            }
            const filterRes = await toolExecutor.execute('filterJobs', {
              jobs: candidateJobs,
              location: generatedPlan.searchCriteria?.location,
              remote: generatedPlan.searchCriteria?.remote,
              type: generatedPlan.searchCriteria?.type
            }, context);

            if (filterRes.success) {
              candidateJobs = filterRes.data.filteredJobs;
              await stateManager.updateStep(taskId, step.step, 'completed', `Filtered to ${candidateJobs.length} jobs.`);
              await stateManager.addLog(taskId, `Filtered candidate jobs to ${candidateJobs.length} postings.`);
            }
            break;
          }

          case 'calculateMatch':
          case 'matchCandidateJob': {
            if (candidateJobs.length === 0) {
              await stateManager.updateStep(taskId, step.step, 'skipped', 'No jobs found to match against.');
              break;
            }

            // Match top candidate jobs
            for (const job of candidateJobs.slice(0, 5)) {
              const matchRes = await toolExecutor.execute('calculateMatch', { jobId: job.id }, context);
              if (matchRes.success) {
                matchedJobs.push({
                  jobId: job.id,
                  title: job.title,
                  company: job.company,
                  score: matchRes.data.score || 0,
                  matchingSkills: matchRes.data.matchingSkills || [],
                  missingSkills: matchRes.data.missingSkills || [],
                  confidence: matchRes.data.confidence,
                  experienceAssessment: matchRes.data.experienceAssessment,
                  explanation: matchRes.data.explanation || ''
                });
              }
            }

            // Sort by match score descending
            matchedJobs.sort((a, b) => b.score - a.score);

            const topScore = matchedJobs[0]?.score || 0;
            await stateManager.updateStep(
              taskId,
              step.step,
              'completed',
              `Evaluated fit for ${matchedJobs.length} jobs. Highest score: ${topScore}%.`
            );
            await stateManager.addLog(taskId, `Match analysis complete. Best fit: ${matchedJobs[0]?.title} at ${matchedJobs[0]?.company}`);
            break;
          }

          case 'explainMatch': {
            const topJob = matchedJobs[0];
            if (topJob) {
              const explainRes = await toolExecutor.execute('explainMatch', { jobId: topJob.jobId }, context);
              if (explainRes.success) {
                explanations.push(explainRes.data);
                await stateManager.updateStep(taskId, step.step, 'completed', `Generated match explanation for ${topJob.company}.`);
                await stateManager.addLog(taskId, `Recommendation explanation ready for ${topJob.title}.`);
              }
            } else {
              await stateManager.updateStep(taskId, step.step, 'skipped', 'No matched jobs to explain.');
            }
            break;
          }

          case 'analyzeCV': {
            const cvRes = await toolExecutor.execute('analyzeCV', {}, context);
            if (cvRes.success) {
              await stateManager.updateStep(taskId, step.step, 'completed', `CV completeness: ${cvRes.data.completenessScore}%.`);
              await stateManager.addLog(taskId, `CV analyzed: completeness ${cvRes.data.completenessScore}%.`);
            }
            break;
          }

          case 'tailorResume': {
            const topJob = matchedJobs[0];
            if (topJob && topJob.score >= 40) {
              await stateManager.addLog(taskId, `Tailoring resume for highest match: ${topJob.title} at ${topJob.company}`);
              const tailorRes = await toolExecutor.execute('tailorResume', { jobId: topJob.jobId }, context);
              if (tailorRes.success) {
                topJob.tailoredResumeId = tailorRes.data.tailoredResumeId;
                topJob.pdfPath = tailorRes.data.pdfPath;
                topJob.docxPath = tailorRes.data.docxPath;
                await stateManager.updateStep(
                  taskId,
                  step.step,
                  'completed',
                  `Tailored resume generated for ${topJob.company}.`
                );
              } else {
                await stateManager.updateStep(taskId, step.step, 'failed', tailorRes.error);
              }
            } else {
              await stateManager.updateStep(
                taskId,
                step.step,
                'skipped',
                'No job met match threshold for automatic resume tailoring.'
              );
            }
            break;
          }

          case 'prepareApplication':
          case 'createApplicationDraft': {
            const topJob = matchedJobs[0];
            if (topJob && topJob.score >= 40) {
              const prepRes = await toolExecutor.execute('prepareApplication', { jobId: topJob.jobId }, context);
              if (prepRes.success) {
                topJob.applicationReady = true;
                await stateManager.updateStep(taskId, step.step, 'completed', `Application draft created for ${topJob.company}.`);
                await stateManager.addLog(taskId, `Application prepared for ${topJob.company}.`);
              } else {
                await stateManager.updateStep(taskId, step.step, 'failed', prepRes.error);
              }
            } else {
              await stateManager.updateStep(taskId, step.step, 'skipped', 'No high-match job available for application draft.');
            }
            break;
          }

          default: {
            // General tool execution
            if (toolExecutor.toolRegistry?.hasTool(step.tool)) {
              const genericRes = await toolExecutor.execute(step.tool, {}, context);
              await stateManager.updateStep(
                taskId,
                step.step,
                genericRes.success ? 'completed' : 'failed',
                genericRes.error || 'Executed.'
              );
            } else {
              await stateManager.updateStep(taskId, step.step, 'completed', `Completed step: ${step.tool}`);
            }
            break;
          }
        }
      }

      // 5. Final Summary and Validation
      const topJob = matchedJobs[0];
      const summary = topJob
        ? `Agent discovered ${candidateJobs.length} jobs and matched top opportunity: ${topJob.title} at ${topJob.company} with a ${topJob.score}% match score. ${topJob.pdfPath ? 'ATS Tailored resume is ready for download.' : ''}`
        : `Agent search completed. Found ${candidateJobs.length} jobs.`;

      const rawResults = {
        matchedJobs,
        explanations,
        summary
      };

      // 6. Response Validation: Verify genuine jobs & produce traceable audit trail
      const validation = await responseValidator.validateAgentOutput(rawResults, context);
      const finalResults = validation.sanitizedResult;

      const completedTask = await stateManager.completeTask(taskId, finalResults);
      logger.agent(taskId, 'task_completed', {
        matchedCount: finalResults.matchedJobs.length,
        jobsFound: candidateJobs.length,
        hasTopJob: !!topJob,
        trace: finalResults.trace
      });

      return completedTask;
    } catch (error) {
      logger.error(`[AGENT] task_failed task=${taskId} error="${error.message}"`, { stack: error.stack });
      const failedTask = await stateManager.failTask(taskId, error);
      return failedTask;
    }
  }
}

module.exports = new AIAgent();
