const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Account = require('./models/Account'); // Adjust path if necessary

// Ensure MONGODB_URI is available
if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined. Please ensure it is set in your environment or docker-compose.yml.');
  process.exit(1);
}

const createAdminUser = async (email, password, unitName, creditCode, region, address, buildingArea, personnelCount, contactPerson, contactPhone) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for admin creation.');

    // Check if user already exists
    const existingUser = await Account.findOne({ email });
    if (existingUser) {
      console.log(`User with email ${email} already exists.`);
      return;
    }

    // Generate a unique 8-digit account number
    let account;
    let isUnique = false;
    while (!isUnique) {
      account = Math.floor(10000000 + Math.random() * 90000000).toString();
      const existingAccount = await Account.findOne({ account });
      if (!existingAccount) {
        isUnique = true;
      }
    }

    const adminUser = await Account.create({
      email,
      password, // Pass plain text password, let pre('save') hook hash it
      unitName,
      creditCode: creditCode || '000000000000000000',
      region,
      address: address || '未填写',
      buildingArea: buildingArea ? parseFloat(buildingArea) : 0,
      personnelCount: personnelCount ? parseInt(personnelCount) : 0,
      contactPerson: contactPerson || '未填写',
      contactPhone: contactPhone || '00000000000',
      role: 'admin',
      account
    });

    console.log('Admin user created successfully:');
    console.log(`Email: ${adminUser.email}`);
    console.log(`Account Number: ${adminUser.account}`);
    console.log(`Role: ${adminUser.role}`);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

// Get arguments from command line
const args = process.argv.slice(2);
if (args.length < 4) {
  console.log('Usage: node createAdmin.js <email> <password> <unitName> <creditCode> <region> [address] [buildingArea] [personnelCount] [contactPerson] [contactPhone]');
  console.log('Minimum required: email, password, unitName, creditCode, region');
  process.exit(1);
}

const [email, password, unitName, creditCode, region, address, buildingArea, personnelCount, contactPerson, contactPhone] = args;
createAdminUser(email, password, unitName, creditCode, region, address, buildingArea, personnelCount, contactPerson, contactPhone);

