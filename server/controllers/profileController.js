const Profile = require('../models/Profile');

// @desc    Get user profile
// @route   GET /api/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id });
    if (profile) {
      res.json(profile);
    } else {
      res.status(404).json({ message: 'Profile not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create or update user profile
// @route   POST /api/profile
// @access  Private
const upsertProfile = async (req, res) => {
  try {
    const profileData = { ...req.body, user: req.user._id };

    let profile = await Profile.findOne({ user: req.user._id });

    if (profile) {
      // Update
      profile = await Profile.findOneAndUpdate(
        { user: req.user._id },
        { $set: profileData },
        { new: true }
      );
    } else {
      // Create
      profile = await Profile.create(profileData);
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProfile,
  upsertProfile
};
