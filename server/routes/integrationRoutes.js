const express = require('express');
const router = express.Router();
const {
  listProviders,
  getIntegrations,
  getAuthUrl,
  connect,
  disconnect,
  execute
} = require('../controllers/integrationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/providers', protect, listProviders);
router.get('/', protect, getIntegrations);
router.get('/:provider/auth', protect, getAuthUrl);
router.post('/:provider/connect', protect, connect);
router.post('/:provider/disconnect', protect, disconnect);
router.post('/:provider/execute', protect, execute);

module.exports = router;
