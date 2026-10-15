import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma/client';

async function main() {
  const connectionString = process.env['DATABASE_URL'];

  if (!connectionString) {
    throw new Error('DATABASE_URL tidak ditemukan');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const email = 'admin@nexus.local';
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.role === 'ADMIN') {
        console.log('Akun Admin sudah tersedia.');
        return;
      }

      throw new Error(
        'Email sudah digunakan oleh akun non-Admin. Tidak ada perubahan data.',
      );
    }

    const passwordHash = await bcrypt.hash(
      'NexusAdmin123!',
      10,
    );

    const admin = await prisma.user.create({
      data: {
        name: 'NEXUS Administrator',
        email,
        employeeId: 'ADM001',
        passwordHash,
        role: 'ADMIN',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.log('Akun Admin berhasil dibuat:');
    console.log(admin);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Gagal membuat akun Admin:', error);
  process.exitCode = 1;
});