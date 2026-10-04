// Seeds all Permissions, the three baseline Roles, and baseline users.
// their default permissions, and one login-ready user per role.
//
// Run with: npm run seed  (after `npx prisma migrate dev`)
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");
const { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } = require("../src/config/permissions");

const prisma = new PrismaClient();

const SEED_PASSWORD = "ChangeMe123!"; // demo only — rotate before real use

async function main() {

  // Permissions
  for (const key of Object.values(PERMISSIONS)) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }

  // Roles + their permission wiring
  const roleIds = {};
  for (const [roleKey, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      update: {},
      create: { key: roleKey, name: roleKey.charAt(0) + roleKey.slice(1).toLowerCase() },
    });
    roleIds[roleKey] = role.id;

    const permissions = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });
  }

  const passwordHash = await argon2.hash(SEED_PASSWORD, { type: argon2.argon2id });

  const admin = await prisma.users.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      fullName: "Ava Admin",
      email: "admin@demo.com",
      passwordHash,
      roleId: roleIds.ADMIN,
    },
  });

  const manager = await prisma.users.upsert({
    where: { email: "manager@demo.com" },
    update: {},
    create: {
      fullName: "Mia Manager",
      email: "manager@demo.com",
      passwordHash,
      roleId: roleIds.MANAGER,
    },
  });

  await prisma.users.upsert({
    where: { email: "executive@demo.com" },
    update: {},
    create: {
      fullName: "Eli Executive",
      email: "executive@demo.com",
      passwordHash,
      roleId: roleIds.EXECUTIVE,
      managerId: manager.id,
    },
  });

  console.log("Seed complete. Demo logins (password: %s):", SEED_PASSWORD); // eslint-disable-line no-console
  console.log("  admin@demo.com / manager@demo.com / executive@demo.com"); // eslint-disable-line no-console
  void admin;
}

main()
  .catch((e) => {
    console.error(e); // eslint-disable-line no-console
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
