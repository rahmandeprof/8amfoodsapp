import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const menuItems = [
  {
    name: 'Akara (5 pcs)',
    priceKobo: 30000, // ₦300
    prepTimeSec: 240, // 4 minutes
    dailyQuantity: 50,
    availableToday: 50,
    isAvailable: true,
  },
  {
    name: 'Bread & Egg',
    priceKobo: 40000, // ₦400
    prepTimeSec: 360, // 6 minutes
    dailyQuantity: 40,
    availableToday: 40,
    isAvailable: true,
  },
  {
    name: 'Pap (cup)',
    priceKobo: 15000, // ₦150
    prepTimeSec: 60, // 1 minute
    dailyQuantity: 60,
    availableToday: 60,
    isAvailable: true,
  },
  {
    name: 'Moi Moi (wrap)',
    priceKobo: 25000, // ₦250
    prepTimeSec: 120, // 2 minutes (pre-made, just serving)
    dailyQuantity: 30,
    availableToday: 30,
    isAvailable: true,
  },
  {
    name: 'Fried Yam (6 pcs)',
    priceKobo: 35000, // ₦350
    prepTimeSec: 300, // 5 minutes
    dailyQuantity: 35,
    availableToday: 35,
    isAvailable: true,
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing items
  await prisma.item.deleteMany();

  // Insert menu items
  for (const item of menuItems) {
    await prisma.item.create({
      data: item,
    });
  }

  console.log(`✅ Seeded ${menuItems.length} menu items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
