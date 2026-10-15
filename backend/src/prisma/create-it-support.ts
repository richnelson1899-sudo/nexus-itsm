
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '../generated/prisma/client';


async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL tidak ditemukan di file .env');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const email = 'itsupport@nexus.local';
    const password = 'ITSupport123!';

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('Akun IT Support sudah tersedia.');
      console.log('Email:', email);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: 'IT Support Test',
        email,
        passwordHash,
        employeeId: 'IT001',
        role: UserRole.IT_SUPPORT,
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        role: true,
      },
    });

    console.log('Akun IT Support berhasil dibuat:');
    console.log(user);
    console.log('Password testing:', password);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Gagal membuat akun IT Support:', error);
  process.exitCode = 1;
});
