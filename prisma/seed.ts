import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = Date.now();
  const hours = (n: number) => new Date(now + n * 60 * 60 * 1000);

  await prisma.game.createMany({
    data: [
      { week: 1, awayTeam: "Bills", homeTeam: "Jets", kickoff: hours(24) },
      { week: 1, awayTeam: "Cowboys", homeTeam: "Eagles", kickoff: hours(28) },
      { week: 1, awayTeam: "49ers", homeTeam: "Rams", kickoff: hours(30) },
    ],
  });
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
