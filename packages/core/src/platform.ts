import { prisma } from "@cg-dump/db";
import type { CreateProductInput, CreateStateInput, CreateStateUserInput, SetStateProductInput } from "@cg-dump/shared";

export async function createState(input: CreateStateInput) {
  return prisma.state.create({
    data: {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim()
    }
  });
}

export async function createProduct(input: CreateProductInput) {
  return prisma.product.upsert({
    where: {
      code: input.code.trim().toUpperCase()
    },
    update: {
      name: input.name.trim(),
      isActive: true
    },
    create: {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      isActive: true
    }
  });
}

export async function createStateUser(input: CreateStateUserInput) {
  const stateCode = input.stateCode.trim().toUpperCase();
  const state = await prisma.state.findUnique({
    where: { code: stateCode }
  });
  if (!state) {
    throw new Error(`State "${stateCode}" does not exist`);
  }
  return prisma.user.upsert({
    where: { cognitoSub: input.cognitoSub },
    update: {
      email: input.email || null,
      fullName: input.fullName || null,
      role: "state_user",
      stateId: state.id
    },
    create: {
      cognitoSub: input.cognitoSub,
      email: input.email || null,
      fullName: input.fullName || null,
      role: "state_user",
      stateId: state.id
    }
  });
}

export async function setStateProductEnablement(input: SetStateProductInput) {
  const stateCode = input.stateCode.trim().toUpperCase();
  const productCode = input.productCode.trim().toUpperCase();
  const state = await prisma.state.findUnique({
    where: { code: stateCode }
  });
  if (!state) {
    throw new Error(`State "${stateCode}" does not exist`);
  }

  const product = await prisma.product.upsert({
    where: { code: productCode },
    update: {
      name: input.productName || productCode
    },
    create: {
      code: productCode,
      name: input.productName || productCode
    }
  });

  return prisma.stateProduct.upsert({
    where: {
      stateId_productId: {
        stateId: state.id,
        productId: product.id
      }
    },
    update: {
      isEnabled: input.isEnabled
    },
    create: {
      stateId: state.id,
      productId: product.id,
      isEnabled: input.isEnabled
    },
    include: {
      state: true,
      product: true
    }
  });
}

export async function listEnabledProductsForState(stateId: string) {
  return prisma.stateProduct.findMany({
    where: {
      stateId,
      isEnabled: true,
      product: {
        isActive: true
      }
    },
    include: {
      product: true
    },
    orderBy: {
      product: {
        code: "asc"
      }
    }
  });
}
