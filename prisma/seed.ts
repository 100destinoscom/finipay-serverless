import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Lista de bancos angolanos
const angolaBanks = [
  { name: 'Banco Angolano de Investimentos', code: 'BAI', country: 'AO' },
  { name: 'Banco de Fomento Angola', code: 'BFA', country: 'AO' },
  { name: 'Banco BIC', code: 'BIC', country: 'AO' },
  { name: 'Banco Millennium Atlântico', code: 'BMA', country: 'AO' },
  { name: 'Banco de Poupança e Crédito', code: 'BPC', country: 'AO' },
  { name: 'Banco Sol', code: 'SOL', country: 'AO' },
  { name: 'Banco Caixa Geral Angola', code: 'BCGA', country: 'AO' },
  { name: 'Banco de Comércio e Indústria', code: 'BCI', country: 'AO' },
  { name: 'Banco Keve', code: 'KEVE', country: 'AO' },
  { name: 'Banco Yetu', code: 'YETU', country: 'AO' },
  { name: 'Banco Económico', code: 'BE', country: 'AO' },
  { name: 'Banco de Negócios Internacional', code: 'BNI', country: 'AO' },
  { name: 'Standard Bank Angola', code: 'SBA', country: 'AO' },
  { name: 'Banco Prestígio', code: 'BPG', country: 'AO' },
  { name: 'Finibanco Angola', code: 'FNB', country: 'AO' },
  { name: 'Banco Valor', code: 'BVAL', country: 'AO' },
  { name: 'Banco Comercial do Huambo', code: 'BCH', country: 'AO' },
  { name: 'Banco de Investimento Rural', code: 'BIR', country: 'AO' },
  { name: 'Banco Kwanza Invest', code: 'BKI', country: 'AO' },
  { name: 'Banco Nacional de Angola', code: 'BNA', country: 'AO' },
];

async function seedBanks() {
  console.log('🏦 Seeding banks...');
  
  for (const bank of angolaBanks) {
    await prisma.bank.upsert({
      where: { code: bank.code },
      update: {
        name: bank.name,
        country: bank.country,
      },
      create: {
        name: bank.name,
        code: bank.code,
        country: bank.country,
        isActive: true,
      },
    });
  }
  
  console.log(`✅ Created/updated ${angolaBanks.length} banks`);
}

async function seedTestUser() {
  console.log('👤 Seeding test user...');
  
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'test@finpay.com' },
    update: {},
    create: {
      email: 'test@finpay.com',
      password: hashedPassword,
      companyName: 'FinPay Test Company',
      role: 'company',
    },
  });

  console.log('✅ Created user:', user.email);
  return user;
}

async function seedApiKey(userId: string) {
  console.log('🔑 Seeding API key...');
  
  // Verificar se já existe uma API key para este usuário
  const existingKey = await prisma.apiKey.findFirst({
    where: { companyId: userId },
  });
  
  if (existingKey) {
    console.log('✅ API key already exists:', existingKey.key);
    return existingKey;
  }

  const apiKey = await prisma.apiKey.create({
    data: {
      key: 'fp_live_test_' + Math.random().toString(36).substring(2, 15),
      name: 'Test API Key',
      companyId: userId,
      isActive: true,
    },
  });

  console.log('✅ Created API key:', apiKey.key);
  return apiKey;
}

async function main() {
  console.log('🌱 Starting seed...');
  console.log('');

  // 1. Seed banks first
  await seedBanks();
  console.log('');

  // 2. Seed test user
  const user = await seedTestUser();
  console.log('');

  // 3. Seed API key
  await seedApiKey(user.id);
  console.log('');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
