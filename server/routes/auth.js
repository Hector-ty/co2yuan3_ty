const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth'); // Assuming you have this middleware

// Import controller
const { login, register, getAllUsers, updateUserRole, deleteUser } = require('../controllers/auth');

// Define routes
router.post('/login', login);
router.post('/register', register); // Optional: for creating accounts
router.get('/users', protect, getAllUsers);
router.put('/users/:id/role', protect, updateUserRole);
router.delete('/users/:id', protect, deleteUser);


module.exports = router;
