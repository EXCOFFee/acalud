import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../modules/users/user.entity';

export async function seedUsers(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  // Check if users already exist
  const existingUsers = await userRepository.count();
  if (existingUsers > 0) {
    console.log('🔄 Users already exist, skipping seed...');
    return;
  }

  console.log('🌱 Seeding demo users...');

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash('password123', saltRounds);

  const demoUsers = [
    {
      email: 'teacher@demo.com',
      password: hashedPassword,
      firstName: 'María',
      lastName: 'González',
      name: 'María González',
      role: UserRole.TEACHER,
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
      coins: 1000,
      level: 5,
      experience: 2500,
    },
    {
      email: 'student@demo.com',
      password: hashedPassword,
      firstName: 'Juan',
      lastName: 'Pérez',
      name: 'Juan Pérez',
      role: UserRole.STUDENT,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      coins: 500,
      level: 3,
      experience: 1200,
    },
    {
      email: 'admin@demo.com',
      password: hashedPassword,
      firstName: 'Ana',
      lastName: 'Martínez',
      name: 'Ana Martínez',
      role: UserRole.ADMIN,
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      coins: 2000,
      level: 10,
      experience: 10000,
    },
    {
      email: 'teacher2@demo.com',
      password: hashedPassword,
      firstName: 'Carlos',
      lastName: 'López',
      name: 'Carlos López',
      role: UserRole.TEACHER,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      coins: 800,
      level: 4,
      experience: 1800,
    },
    {
      email: 'student2@demo.com',
      password: hashedPassword,
      firstName: 'Sofia',
      lastName: 'Herrera',
      name: 'Sofia Herrera',
      role: UserRole.STUDENT,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      coins: 300,
      level: 2,
      experience: 600,
    },
  ];

  const users = userRepository.create(demoUsers);
  await userRepository.save(users);

  console.log('✅ Demo users seeded successfully!');
  console.log('📋 Available demo accounts:');
  console.log('   👩‍🏫 Teacher: teacher@demo.com / password123');
  console.log('   👨‍🎓 Student: student@demo.com / password123');
  console.log('   👩‍💼 Admin: admin@demo.com / password123');
  console.log('   👨‍🏫 Teacher 2: teacher2@demo.com / password123');
  console.log('   👩‍🎓 Student 2: student2@demo.com / password123');
}
