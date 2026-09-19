import * as bcrypt from 'bcryptjs';
import { runtimeDataSource } from '../data-source/runtime.datasource';
import { Admin } from '../admin/entities/admin.entity';
import { AvailabilityRule } from '../availability/entities/availability-rule.entity';
import { SessionType } from '../session-type/entities/session-type.entity';

export async function runSeed() {
  console.log('🌱 Starting database seed against runtimeDataSource (Supavisor)...');
  await runtimeDataSource.initialize();

  const adminRepo = runtimeDataSource.getRepository(Admin);
  const sessionTypeRepo = runtimeDataSource.getRepository(SessionType);
  const availabilityRuleRepo = runtimeDataSource.getRepository(AvailabilityRule);

  const phoneNumber = '+9779801234567';
  let admin = await adminRepo.findOne({ where: { phoneNumber } });

  if (!admin) {
    const passwordHash = await bcrypt.hash('AdminPassword123!', 10);
    admin = adminRepo.create({
      name: 'Acharya Shastri',
      businessName: 'Vedic Chart Astrology',
      phoneNumber,
      timezone: 'Asia/Kathmandu',
      passwordHash,
    });
    admin = await adminRepo.save(admin);
    console.log(`✅ Seeded Admin: ${admin.name} (${admin.phoneNumber})`);
  } else {
    console.log(`ℹ️ Admin ${admin.phoneNumber} already exists.`);
  }

  // 2 SessionTypes
  const existingSessionTypes = await sessionTypeRepo.find({ where: { admin: { id: admin.id } } });
  if (existingSessionTypes.length === 0) {
    const sessionTypes = sessionTypeRepo.create([
      {
        admin,
        name: 'Quick Question',
        durationMinutes: 30,
        bufferMinutes: 10,
        description: 'Focused consultation on a specific query or immediate transit.',
        isActive: true,
      },
      {
        admin,
        name: 'Full Birth Chart Reading',
        durationMinutes: 60,
        bufferMinutes: 15,
        description: 'In-depth Janam Kundali analysis, planetary periods, and remedy suggestions.',
        isActive: true,
      },
    ]);
    await sessionTypeRepo.save(sessionTypes);
    console.log('✅ Seeded 2 SessionTypes: "Quick Question" and "Full Birth Chart Reading"');
  } else {
    console.log(`ℹ️ Session types already seeded (${existingSessionTypes.length} found).`);
  }

  // AvailabilityRules: Monday with two blocks (10:00-13:00 and 17:00-19:00), Wednesday with 1 block (11:00-16:00), Tuesday/Sunday none
  const existingRules = await availabilityRuleRepo.find({ where: { admin: { id: admin.id } } });
  if (existingRules.length === 0) {
    const rules = availabilityRuleRepo.create([
      // Monday (dayOfWeek: 1) - Block 1
      {
        admin,
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '13:00',
        isActive: true,
      },
      // Monday (dayOfWeek: 1) - Block 2
      {
        admin,
        dayOfWeek: 1,
        startTime: '17:00',
        endTime: '19:00',
        isActive: true,
      },
      // Wednesday (dayOfWeek: 3) - Single block
      {
        admin,
        dayOfWeek: 3,
        startTime: '11:00',
        endTime: '16:00',
        isActive: true,
      },
      // Friday (dayOfWeek: 5) - Single block
      {
        admin,
        dayOfWeek: 5,
        startTime: '09:00',
        endTime: '12:00',
        isActive: true,
      },
    ]);
    await availabilityRuleRepo.save(rules);
    console.log('✅ Seeded Availability Rules: Monday (2 blocks), Wednesday (1 block), Friday (1 block), others none.');
  } else {
    console.log(`ℹ️ Availability rules already seeded (${existingRules.length} found).`);
  }

  await runtimeDataSource.destroy();
  console.log('🌿 Database seed finished successfully.');
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error('❌ Error during seed:', err);
    process.exit(1);
  });
}
