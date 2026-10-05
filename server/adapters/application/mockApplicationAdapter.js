const ApplicationAdapter = require('./ApplicationAdapter');

class MockApplicationAdapter extends ApplicationAdapter {
  constructor() {
    super('mock');
    this.supportsPrepare = true;
    this.supportsFill = true;
    this.supportsSubmit = true;
    this.supportsGetStatus = true;
  }

  async prepare(job, user) {
    // Simulating fetching required form fields for a mock job board
    return {
      fields: [
        { name: 'firstName', type: 'string', required: true },
        { name: 'lastName', type: 'string', required: true },
        { name: 'email', type: 'string', required: true },
        { name: 'resumeId', type: 'string', required: true },
        { name: 'coverLetter', type: 'string', required: false }
      ],
      instructions: 'Please fill out the standard mock application form.'
    };
  }

  async fill(job, user, profile, cv) {
    // Simulating the agent filling out the form automatically based on user profile
    const filledData = {
      firstName: profile.firstName || user.name.split(' ')[0],
      lastName: profile.lastName || user.name.split(' ').slice(1).join(' '),
      email: user.email,
      resumeId: cv ? cv._id.toString() : 'NO_RESUME',
      coverLetter: `I am highly interested in the ${job.title} role. Please see my tailored resume.`
    };
    return filledData;
  }

  async submit(job, filledData) {
    // Simulating a network request to submit the application
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          externalId: `mock-app-${Date.now()}`,
          message: 'Application submitted successfully to Mock Platform.'
        });
      }, 1500);
    });
  }

  async getStatus(externalId) {
    // Randomly determine status for mock purposes
    const statuses = ['submitted', 'in_review', 'interview', 'rejected'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    return randomStatus;
  }
}

module.exports = new MockApplicationAdapter();
