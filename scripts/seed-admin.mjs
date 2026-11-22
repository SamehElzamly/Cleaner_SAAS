import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const uri = process.env.MONGODB_URI;
const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;

if (!uri || !email || !password || password.length < 8) {
  console.error('Set MONGODB_URI, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (min 8 chars) first.');
  process.exit(1);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const users = mongoose.connection.collection('users');

  const existing = await users.findOne({ role: 'admin', email });
  if (existing) {
    console.log(`Platform admin "${email}" already exists - nothing to do.`);
  } else {
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const now = new Date();
    await users.insertOne({
      email,
      password: await bcrypt.hash(password, saltRounds),
      firstName: 'Platform',
      lastName: 'Admin',
      fullName: 'Platform Admin',
      role: 'admin',
      isActive: true,
      isEmailVerified: false,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    });
    console.log(`Platform admin "${email}" created. You can now POST /auth/login with it.`);
  }
} catch (err) {
  console.error('Failed:', err.message ?? err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
