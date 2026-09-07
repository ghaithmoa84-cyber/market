/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const logs = await p.searchLog.findMany({
      orderBy: { createdAt: 'asc' }
    });
    console.log(JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await p.$disconnect();
  }
})();
