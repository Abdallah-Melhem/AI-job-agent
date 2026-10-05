/**
 * Tool Registry
 * Manages all registered tools available to the AI agent.
 */

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.registerBuiltinTools();
  }

  registerTool(tool) {
    if (!tool.name || typeof tool.execute !== 'function') {
      throw new Error(`Invalid tool definition for: ${tool.name || 'unnamed'}`);
    }
    this.tools.set(tool.name, tool);
  }

  getTool(name) {
    return this.tools.get(name) || null;
  }

  hasTool(name) {
    return this.tools.has(name);
  }

  listTools() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
      permission: t.permission || 'authenticated_user'
    }));
  }

  /**
   * Return tools formatted for AI prompt system instructions or function calling
   */
  getDefinitionsForPrompt() {
    return this.listTools().map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
  }

  registerBuiltinTools() {
    const getCandidateProfile = require('./tools/getCandidateProfile');
    const getResume = require('./tools/getResume');
    const searchJobs = require('./tools/searchJobs');
    const getJob = require('./tools/getJob');
    const matchCandidateJob = require('./tools/matchCandidateJob');
    const tailorResume = require('./tools/tailorResume');
    const prepareApplication = require('./tools/prepareApplication');
    const fillApplication = require('./tools/fillApplication');

    this.registerTool(getCandidateProfile);
    this.registerTool(getResume);
    this.registerTool(searchJobs);
    this.registerTool(getJob);
    this.registerTool(matchCandidateJob);
    this.registerTool(tailorResume);
    this.registerTool(prepareApplication);
    this.registerTool(fillApplication);
  }
}

module.exports = new ToolRegistry();
