import { TableStatus, UserRole } from "@prisma/client";
import { db } from "../src";

async function main() {
  console.log("🌱 Seeding...");

  // ── Tenant ────────────────────────────────────────────
  const tenant = await db.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo Restaurant",
      slug: "demo",
      plan: "starter",
      settings: {
        loyalty: {
          enabled: true,
          earnRate: 1, // 1 แต้มต่อทุก earnPer บาท
          earnPer: 100,
          redeemRate: 1, // 1 แต้ม = 1 บาท
          minRedeemPoints: 50,
          pointExpireMonths: 12,
        },
      },
    },
  });

  // ── Loyalty Tiers ─────────────────────────────────────
  await db.loyaltyTierConfig.createMany({
    skipDuplicates: true,
    data: [
      {
        tenantId: tenant.id,
        name: "Bronze",
        minPoints: 0,
        multiplier: 1.0,
        color: "#CD7F32",
        sortOrder: 1,
      },
      {
        tenantId: tenant.id,
        name: "Silver",
        minPoints: 500,
        multiplier: 1.5,
        color: "#C0C0C0",
        sortOrder: 2,
      },
      {
        tenantId: tenant.id,
        name: "Gold",
        minPoints: 2000,
        multiplier: 2.0,
        color: "#FFD700",
        sortOrder: 3,
      },
      {
        tenantId: tenant.id,
        name: "Platinum",
        minPoints: 8000,
        multiplier: 3.0,
        color: "#E5E4E2",
        sortOrder: 4,
      },
    ],
  });

  // ── Branch ────────────────────────────────────────────
  const branch = await db.branch.upsert({
    where: { id: "branch-main" },
    update: {},
    create: {
      id: "branch-main",
      tenantId: tenant.id,
      name: "สาขาหลัก",
      address: "123 ถนนสีลม กรุงเทพฯ",
      phone: "02-xxx-xxxx",
      queueEnabled: false,
    },
  });

  // ── Users ─────────────────────────────────────────────
  await db.user.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "user-owner",
        tenantId: tenant.id,
        branchId: branch.id,
        name: "Admin",
        email: "admin@demo.com",
        role: UserRole.OWNER,
        pinCode: "1234",
      },
      {
        id: "user-cashier",
        tenantId: tenant.id,
        branchId: branch.id,
        name: "นภา",
        email: "napa@demo.com",
        role: UserRole.CASHIER,
        pinCode: "5678",
      },
      {
        id: "user-kitchen",
        tenantId: tenant.id,
        branchId: branch.id,
        name: "ครัวหลัก",
        email: "kitchen@demo.com",
        role: UserRole.KITCHEN,
        pinCode: "9999",
      },
    ],
  });

  // ── Categories ────────────────────────────────────────
  const [food, drink, dessert] = await Promise.all([
    db.category.upsert({
      where: { id: "cat-food" },
      update: {},
      create: {
        id: "cat-food",
        tenantId: tenant.id,
        name: "อาหาร",
        sortOrder: 1,
      },
    }),
    db.category.upsert({
      where: { id: "cat-drink" },
      update: {},
      create: {
        id: "cat-drink",
        tenantId: tenant.id,
        name: "เครื่องดื่ม",
        sortOrder: 2,
      },
    }),
    db.category.upsert({
      where: { id: "cat-dessert" },
      update: {},
      create: {
        id: "cat-dessert",
        tenantId: tenant.id,
        name: "ของหวาน",
        sortOrder: 3,
      },
    }),
  ]);

  // ── Menu Items ────────────────────────────────────────
  const krapao = await db.menuItem.upsert({
    where: { id: "menu-krapao" },
    update: {},
    create: {
      id: "menu-krapao",
      tenantId: tenant.id,
      categoryId: food.id,
      name: "ผัดกะเพราหมูสับ",
      price: 90,
      stockQty: null, // ไม่ track stock
      tags: ["bestseller"],
    },
  });

  await db.menuItem.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "menu-fried-rice",
        tenantId: tenant.id,
        categoryId: food.id,
        name: "ข้าวผัดกุ้ง",
        price: 120,
        stockQty: 20,
        tags: ["bestseller"],
      },
      {
        id: "menu-tomyum",
        tenantId: tenant.id,
        categoryId: food.id,
        name: "ต้มยำกุ้ง",
        price: 150,
        stockQty: 15,
        tags: [],
      },
      {
        id: "menu-green-curry",
        tenantId: tenant.id,
        categoryId: food.id,
        name: "แกงเขียวหวาน",
        price: 100,
        stockQty: 12,
        tags: [],
      },
      {
        id: "menu-thai-tea",
        tenantId: tenant.id,
        categoryId: drink.id,
        name: "ชาเย็น",
        price: 60,
        stockQty: null,
        tags: [],
      },
      {
        id: "menu-coffee",
        tenantId: tenant.id,
        categoryId: drink.id,
        name: "กาแฟเย็น",
        price: 65,
        stockQty: null,
        tags: ["bestseller"],
      },
      {
        id: "menu-water",
        tenantId: tenant.id,
        categoryId: drink.id,
        name: "น้ำเปล่า",
        price: 20,
        stockQty: null,
        tags: [],
      },
      {
        id: "menu-icecream",
        tenantId: tenant.id,
        categoryId: dessert.id,
        name: "ไอศกรีมกะทิ",
        price: 55,
        stockQty: 10,
        tags: [],
      },
      {
        id: "menu-buakloi",
        tenantId: tenant.id,
        categoryId: dessert.id,
        name: "บัวลอย",
        price: 60,
        stockQty: 8,
        tags: [],
      },
    ],
  });

  // ── Modifiers (ตัวอย่าง กะเพรา) ──────────────────────
  await db.modifier.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "mod-spicy",
        tenantId: tenant.id,
        menuItemId: krapao.id,
        name: "ความเผ็ด",
        type: "SINGLE_SELECT",
        isRequired: true,
        options: [
          { name: "ไม่เผ็ด", priceAdd: 0 },
          { name: "เผ็ดน้อย", priceAdd: 0 },
          { name: "เผ็ด", priceAdd: 0 },
          { name: "เผ็ดมาก", priceAdd: 0 },
        ],
        sortOrder: 1,
      },
      {
        id: "mod-egg",
        tenantId: tenant.id,
        menuItemId: krapao.id,
        name: "ไข่",
        type: "SINGLE_SELECT",
        isRequired: false,
        options: [
          { name: "ไม่ใส่", priceAdd: 0 },
          { name: "ไข่ดาว", priceAdd: 15 },
          { name: "ไข่เจียว", priceAdd: 15 },
        ],
        sortOrder: 2,
      },
    ],
  });

  // ── Tables ────────────────────────────────────────────
  const tableData = [
    { id: "table-a1", name: "A1", zone: "Indoor", capacity: 2 },
    { id: "table-a2", name: "A2", zone: "Indoor", capacity: 4 },
    { id: "table-a3", name: "A3", zone: "Indoor", capacity: 4 },
    { id: "table-b1", name: "B1", zone: "Outdoor", capacity: 4 },
    { id: "table-b2", name: "B2", zone: "Outdoor", capacity: 6 },
    { id: "table-vip", name: "VIP", zone: "Private", capacity: 8 },
  ];

  for (const t of tableData) {
    await db.table.upsert({
      where: { id: t.id },
      update: {},
      create: {
        ...t,
        branchId: branch.id,
        status: TableStatus.AVAILABLE,
        qrToken: `${t.id}-${Math.random().toString(36).slice(2, 8)}`,
      },
    });
  }

  console.log("✅ Seed complete");
  console.log(`   Tenant : ${tenant.slug}`);
  console.log(`   Branch : ${branch.name}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
