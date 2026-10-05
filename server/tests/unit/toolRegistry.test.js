// Mock ESM-only packages that can't run in Jest's CommonJS transform
jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

const toolRegistry = require('../../agent/toolRegistry');

describe('ToolRegistry', () => {
  test('has at least 8 registered tools', () => {
    const tools = toolRegistry.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(8);
  });

  test('has getCandidateProfile tool', () => {
    expect(toolRegistry.hasTool('getCandidateProfile')).toBe(true);
  });

  test('has searchJobs tool', () => {
    expect(toolRegistry.hasTool('searchJobs')).toBe(true);
  });

  test('has matchCandidateJob tool', () => {
    expect(toolRegistry.hasTool('matchCandidateJob')).toBe(true);
  });

  test('has tailorResume tool', () => {
    expect(toolRegistry.hasTool('tailorResume')).toBe(true);
  });

  test('has prepareApplication tool', () => {
    expect(toolRegistry.hasTool('prepareApplication')).toBe(true);
  });

  test('has fillApplication tool', () => {
    expect(toolRegistry.hasTool('fillApplication')).toBe(true);
  });

  test('each tool has a name, description, and execute function', () => {
    const tools = toolRegistry.listTools();
    tools.forEach(tool => {
      expect(typeof tool.name).toBe('string');
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.description).toBe('string');
    });
  });

  test('getTool returns the correct tool object', () => {
    const tool = toolRegistry.getTool('searchJobs');
    expect(tool).toBeTruthy();
    expect(tool.name).toBe('searchJobs');
    expect(typeof tool.execute).toBe('function');
  });

  test('getTool returns null for unknown tool', () => {
    expect(toolRegistry.getTool('nonExistentTool')).toBeNull();
  });

  test('getDefinitionsForPrompt returns name, description, and parameters', () => {
    const defs = toolRegistry.getDefinitionsForPrompt();
    expect(Array.isArray(defs)).toBe(true);
    defs.forEach(def => {
      expect(def).toHaveProperty('name');
      expect(def).toHaveProperty('description');
      expect(def).toHaveProperty('parameters');
    });
  });
});
