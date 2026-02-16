const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const state = await prisma.state.upsert({
    where: { code: "RJ" },
    update: { name: "Rajasthan", isActive: true },
    create: { code: "RJ", name: "Rajasthan", isActive: true }
  });

  const product = await prisma.product.upsert({
    where: { code: "FMB" },
    update: { name: "Foundational Literacy and Numeracy", isActive: true },
    create: { code: "FMB", name: "Foundational Literacy and Numeracy", isActive: true }
  });

  await prisma.stateProduct.upsert({
    where: {
      stateId_productId: {
        stateId: state.id,
        productId: product.id
      }
    },
    update: {
      isEnabled: true
    },
    create: {
      stateId: state.id,
      productId: product.id,
      isEnabled: true
    }
  });

  await prisma.user.upsert({
    where: { cognitoSub: "seed-admin-sub" },
    update: {
      email: "admin@example.com",
      role: "admin",
      stateId: null,
      isActive: true
    },
    create: {
      cognitoSub: "seed-admin-sub",
      email: "admin@example.com",
      role: "admin",
      stateId: null,
      isActive: true
    }
  });

  await prisma.user.upsert({
    where: { cognitoSub: "seed-rj-user-sub" },
    update: {
      email: "state.user@example.com",
      role: "state_user",
      stateId: state.id,
      isActive: true
    },
    create: {
      cognitoSub: "seed-rj-user-sub",
      email: "state.user@example.com",
      role: "state_user",
      stateId: state.id,
      isActive: true
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
