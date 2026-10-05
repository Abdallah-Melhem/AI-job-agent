/**
 * Base Application Adapter Interface
 * Defines the contract for applying to jobs on specific platforms.
 */
class ApplicationAdapter {
  constructor(name) {
    this.name = name;
    // Features supported by this specific adapter
    this.supportsPrepare = false;
    this.supportsFill = false;
    this.supportsSubmit = false;
    this.supportsGetStatus = false;
  }

  /**
   * Initialize or prepare an application (e.g. fetch required fields)
   * @param {Object} job - Job document
   * @param {Object} user - User document
   * @returns {Promise<Object>} Preparation details (e.g., required fields schema)
   */
  async prepare(job, user) {
    if (!this.supportsPrepare) throw new Error(`${this.name} does not support prepare()`);
    throw new Error('prepare() must be implemented');
  }

  /**
   * Fill application fields with data
   * @param {Object} job - Job document
   * @param {Object} user - User document
   * @param {Object} profile - Profile document
   * @param {Object} cv - CV or tailored resume data
   * @returns {Promise<Object>} Filled data
   */
  async fill(job, user, profile, cv) {
    if (!this.supportsFill) throw new Error(`${this.name} does not support fill()`);
    throw new Error('fill() must be implemented');
  }

  /**
   * Actually submit the application to the external system
   * @param {Object} job - Job document
   * @param {Object} filledData - Data returned from fill()
   * @returns {Promise<Object>} Submission result, including external ID or status
   */
  async submit(job, filledData) {
    if (!this.supportsSubmit) throw new Error(`${this.name} does not support submit()`);
    throw new Error('submit() must be implemented');
  }

  /**
   * Fetch current status from external system
   * @param {String} externalId 
   * @returns {Promise<String>} Status string
   */
  async getStatus(externalId) {
    if (!this.supportsGetStatus) throw new Error(`${this.name} does not support getStatus()`);
    throw new Error('getStatus() must be implemented');
  }
}

module.exports = ApplicationAdapter;
