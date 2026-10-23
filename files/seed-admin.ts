import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import type { Model } from 'mongoose';
import { AppModule } from '../src/app.module.js';
import { User, UserDocument, UserRole } from '../src/auth/entities/user.entity.js';

// One-off bootstrap: creates the first platform ADMIN directly in the DB.
// No HTTP endpoint is allowed to create an ADMIN (that would be a
// privilege-escalation path), so the very first one has to come from here.
//
// Usage (credentials come from env, never hardcoded or committed):
//   SEED_ADMIN_EMAIL=you@company.com SEED_ADMIN_PASSWORD='a-strong-password' \
//   npx tsx scripts/seed-admin.ts
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password || password.length < 8) {
    throw new Error(
      'Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (min 8 chars) before running this script.',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));

    const existing = await userModel.findOne({ role: UserRole.ADMIN, email });
    if (existing) {
      console.log(`Platform admin "${email}" already exists — nothing to do.`);
      return;
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    await userModel.create({
      email,
      password: await bcrypt.hash(password, saltRounds),
      firstName: 'Platform',
      lastName: 'Admin',
      fullName: 'Platform Admin',
      role: UserRole.ADMIN, // no tenantId: the entity only requires it for non-admins
    });

    console.log(`Platform admin "${email}" created. You can now POST /auth/login with it.`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
