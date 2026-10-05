const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  phone: String,
  location: String,
  links: {
    linkedin: String,
    github: String,
    portfolio: String
  },
  education: [{
    degree: String,
    institution: String,
    startDate: String,
    endDate: String,
    gpa: String
  }],
  experience: [{
    company: String,
    position: String,
    startDate: String,
    endDate: String,
    responsibilities: String
  }],
  skills: [String],
  projects: [{
    name: String,
    description: String,
    technologies: [String]
  }],
  certifications: [String],
  languages: [String],
  preferences: {
    employmentTypes: [String],
    locations: [String],
    salary: {
      min: Number,
      max: Number
    },
    keywords: {
      include: [String],
      exclude: [String]
    },
    companies: {
      include: [String],
      exclude: [String]
    }
  }
}, { timestamps: true });

const Profile = mongoose.model('Profile', profileSchema);
module.exports = Profile;
