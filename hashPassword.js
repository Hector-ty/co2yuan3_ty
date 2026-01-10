const bcrypt = require('bcryptjs');

const password = 'your_password_here'; // Replace with your desired password

bcrypt.genSalt(10, (err, salt) => {
  bcrypt.hash(password, salt, (err, hash) => {
    if (err) throw err;
    console.log('Hashed password:', hash);
  });
});
