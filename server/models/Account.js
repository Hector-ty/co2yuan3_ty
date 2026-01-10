const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AccountSchema = new mongoose.Schema({
  account: {
    type: String,
    unique: true,
    sparse: true // Allows multiple documents to have a null value for account
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false // Do not return password by default
  },
  unitName: {
    type: String,
    required: [true, 'Please provide a unit name']
  },
  region: {
    type: String,
    required: [true, 'Please provide a region']
  },
  role: {
    type: String,
    enum: ['admin', 'editor', 'viewer'],
    default: 'viewer'
  }
});

// Encrypt password using bcrypt
AccountSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
AccountSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Account', AccountSchema);
