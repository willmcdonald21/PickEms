import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLAYERS = ["Will", "Opponent"];

async function main() {
  for (const name of PLAYERS) {
    await prisma.player.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
