/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const categories = await p.category.count();
    console.log('categories:', categories);

    const products = await p.product.count();
    console.log('products:', products);

    const stores = await p.store.count();
    console.log('stores:', stores);

    const searchLogs = await p.searchLog.count();
    console.log('searchLogs:', searchLogs);

    const categoriesList = await p.category.findMany({ where: { isActive: true } });
    console.log('categoriesList:', JSON.stringify(categoriesList));

    const productsList = await p.product.findMany({ where: { isActive: true }, take: 5 });
    console.log('productsList:', JSON.stringify(productsList));

    const storesList = await p.store.findMany({ where: { isActive: true } });
    console.log('storesList:', JSON.stringify(storesList));
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await p.$disconnect();
  }
})();
