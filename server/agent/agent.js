const guardrails = require('./guardrails');
const stateManager = require('./stateManager');
const planner = require('./planner');
const toolExecutor = require('./toolExecutor');
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
      let candidateJobs = [];
      const matchedJobs = [];

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
              await stateManager.addLog(taskId, 'Warning: Candidate profile is empty. Using basic candidate context.');
            }
            break;
          }

          case 'searchJobs': {
            const searchParams = {
              keyword: generatedPlan.searchCriteria?.keyword || '',
              type: generatedPlan.searchCriteria?.type || '',
              remote: generatedPlan.searchCriteria?.remote || '',
              limit: 10
            };
            const res = await toolExecutor.execute('searchJobs', searchParams, context);
            if (res.success) {
              candidateJobs = res.data.jobs || [];
              await stateManager.updateStep(
                taskId, 
                step.step, 
                'completed', 
                `Found ${candidateJobs.length} candidate jobs matching search criteria.`
              );
              await stateManager.addLog(taskId, `Found ${candidateJobs.length} jobs.`, { count: candidateJobs.length });
            } else {
              throw new Error(`Failed to search jobs: ${res.error}`);
            }
            break;
          }

          case 'matchCandidateJob': {
            if (candidateJobs.length === 0) {
              await stateManager.updateStep(taskId, step.step, 'skipped', 'No jobs found to match against.');
              break;
            }

            // Match top jobs
            for (const job of candidateJobs.slice(0, 5)) {
              const matchRes = await toolExecutor.execute('matchCandidateJob', { jobId: job.id }, context);
              if (matchRes.success) {
                matchedJobs.push({
                  jobId: job.id,
                  title: job.title,
                  company: job.company,
                  score: matchRes.data.score || 0,
                  matchingSkills: matchRes.data.matchingSkills || [],
                  missingSkills: matchRes.data.missingSkills || [],
                  explanation: matchRes.data.explanation || ''
                });
              }
            }

            // Sort by match score descending
            matchedJobs.sort((a, b) => b.score - a.score);

            await stateManager.updateStep(
              taskId, 
              step.step, 
              'completed', 
              `Analyzed fit for ${matchedJobs.length} jobs. Top score: ${matchedJobs[0]?.score || 0}%.`
            );
            await stateManager.addLog(taskId, `Match analysis complete. Best fit: ${matchedJobs[0]?.title} at ${matchedJobs[0]?.company}`);
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

          case 'prepareApplication': {
            const topJob = matchedJobs[0];
            if (topJob && topJob.score >= 40) {
              const prepRes = await toolExecutor.execute('prepareApplication', { jobId: topJob.jobId }, context);
              if (prepRes.success) {
                await stateManager.addLog(taskId, `Application prepared for ${topJob.company}.`);
                const fillRes = await toolExecutor.execute('fillApplication', { jobId: topJob.jobId }, context);
                if (fillRes.success) {
                  topJob.applicationReady = true;
                  await stateManager.updateStep(
                    taskId, 
                    step.step, 
                    'completed', 
                    `Application prepared and fields autofilled. Awaiting user approval to submit.`
                  );
                } else {
                  await stateManager.updateStep(taskId, step.step, 'failed', fillRes.error);
                }
              } else {
                await stateManager.updateStep(taskId, step.step, 'failed', prepRes.error);
              }
            } else {
              await stateManager.updateStep(
                taskId, 
                step.step, 
                'skipped', 
                'No highly matched job available to prepare an application for.'
              );
            }
            break;
          }

          default: {
            await stateManager.updateStep(
              taskId, 
              step.step, 
              'completed', 
              `Unknown tool: ${step.tool} executed successfully.`
            );
            break;
          }
        }
      }

      // 5. Final Summary and Completion
      const topJob = matchedJobs[0];
      const summary = topJob 
        ? `Agent discovered ${candidateJobs.length} jobs and matched top opportunity: ${topJob.title} at ${topJob.company} with a ${topJob.score}% match score. ${topJob.pdfPath ? 'ATS Tailored resume is ready for download.' : ''}`
        : `Agent search completed. Found ${candidateJobs.length} jobs.`;

      const finalResults = {
        matchedJobs,
        summary
      };

      const completedTask = await stateManager.completeTask(taskId, finalResults);
      logger.agent(taskId, 'task_completed', { 
        matchedCount: matchedJobs.length,
        jobsFound: candidateJobs.length,
        hasTopJob: !!topJob 
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
