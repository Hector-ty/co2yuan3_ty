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
  unitType: {
    type: String,
    default: '默认单位类型'
  },
  creditCode: {
    type: String,
    required: [true, 'Please provide a credit code']
  },
  region: {
    type: String,
    required: [true, 'Please provide a region']
  },
  address: {
    type: String,
    required: [true, 'Please provide an address']
  },
  buildingArea: {
    type: Number,
    required: [true, 'Please provide building area']
  },
  personnelCount: {
    type: Number,
    required: [true, 'Please provide personnel count']
  },
  contactPerson: {
    type: String,
    required: [true, 'Please provide contact person']
  },
  contactPhone: {
    type: String,
    required: [true, 'Please provide contact phone']
  },
  role: {
    type: String,
    enum: ['superadmin', 'province_admin', 'city_admin', 'district_admin', 'organization_user'],
    default: 'organization_user' // 新注册用户默认为机构用户，拥有填报数据和查看数据大屏的权限
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
