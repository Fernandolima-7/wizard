const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Criar usuário administrador padrão
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: hashedPassword
    },
    create: {
      username: 'admin',
      password: hashedPassword
    }
  });
  
  console.log('Usuário admin criado:', admin);
  console.log('Login: admin');
  console.log('Senha: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
