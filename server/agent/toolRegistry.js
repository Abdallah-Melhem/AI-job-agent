/**
 * Tool Registry
 * Phase 8: AI Agent and Controlled Tools
 *
 * Manages all registered tools available to the AI agent.
 * Enforces controlled registration and parameter schema definitions.
 */

'use strict';

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
   * Return tools formatted for AI prompt system instructions
   */
  getDefinitionsForPrompt() {
    return this.listTools().map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
  }

  registerBuiltinTools() {
    // ── Candidate Tools ──────────────────────────────────────────────
    this.registerTool(require('./tools/getCandidateProfile'));
    this.registerTool(require('./tools/getCandidateSkills'));
    this.registerTool(require('./tools/getCandidatePreferences'));
    this.registerTool(require('./tools/getResume'));

    // ── Job Tools ────────────────────────────────────────────────────
    this.registerTool(require('./tools/searchJobs'));
    this.registerTool(require('./tools/filterJobs'));
    this.registerTool(require('./tools/getJob'));
    this.registerTool(require('./tools/getJobDetails'));
    this.registerTool(require('./tools/compareJobs'));

    // ── Matching Tools ───────────────────────────────────────────────
    this.registerTool(require('./tools/matchCandidateJob'));
    this.registerTool(require('./tools/calculateMatch'));
    this.registerTool(require('./tools/explainMatch'));

    // ── Resume Tools ─────────────────────────────────────────────────
    this.registerTool(require('./tools/analyzeCV'));
    this.registerTool(require('./tools/tailorResume'));
    this.registerTool(require('./tools/validateResume'));

    // ── Application Tools ────────────────────────────────────────────
    this.registerTool(require('./tools/prepareApplication'));
    this.registerTool(require('./tools/fillApplication'));
    this.registerTool(require('./tools/createApplicationDraft'));
    this.registerTool(require('./tools/updateApplicationStatus'));
  }
}

module.exports = new ToolRegistry();
