const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('=== USUÁRIOS NO BANCO ===');
  users.forEach(u => {
    console.log(`ID: ${u.id} | Email: ${u.email} | Nome: ${u.name}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
