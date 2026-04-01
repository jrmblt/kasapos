/// <reference types="node" />

/**
 * Kasa POS — Dev Seed
 * ร้านอาหารไทยสมมติ "ครัวคุณแม่" มี 2 สาขา
 * รันด้วย: bun run db:seed
 */

import type { ModifierType, UserRole } from "@prisma/client";
import { createDb } from "../src";
import { BASE_ROLE_PERMISSIONS } from "../src/permissions";

const prisma = createDb();

// ─── Helpers ────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number) {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding Kasa POS...\n");

  // ── 1. TENANT ────────────────────────────────────────────
  console.log("📦  Creating tenant...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "krua-khun-mae" },
    update: {},
    create: {
      name: "ครัวคุณแม่",
      slug: "krua-khun-mae",
      plan: "pro",
      settings: {
        loyalty: {
          enabled: true,
          earnRate: 1,
          earnPer: 100,
          redeemRate: 1,
          minRedeemPoints: 50,
          pointExpireMonths: 12,
        },
        coupon: {
          enabled: true,
          maxPerOrder: 1,
          stackWithPoints: false,
          stackBetweenCoupons: false,
        },
      },
    },
  });

  // ── 2. LOYALTY TIERS ─────────────────────────────────────
  console.log("🏆  Creating loyalty tiers...");

  const [tierBronze, tierSilver, tierGold, tierPlatinum] = await Promise.all([
    prisma.loyaltyTierConfig.upsert({
      where: { id: "tier-bronze" },
      update: {},
      create: {
        id: "tier-bronze",
        tenantId: tenant.id,
        name: "Bronze",
        minPoints: 0,
        multiplier: 1.0,
        color: "#CD7F32",
        sortOrder: 1,
      },
    }),
    prisma.loyaltyTierConfig.upsert({
      where: { id: "tier-silver" },
      update: {},
      create: {
        id: "tier-silver",
        tenantId: tenant.id,
        name: "Silver",
        minPoints: 500,
        multiplier: 1.5,
        color: "#C0C0C0",
        sortOrder: 2,
      },
    }),
    prisma.loyaltyTierConfig.upsert({
      where: { id: "tier-gold" },
      update: {},
      create: {
        id: "tier-gold",
        tenantId: tenant.id,
        name: "Gold",
        minPoints: 2000,
        multiplier: 2.0,
        color: "#FFD700",
        sortOrder: 3,
      },
    }),
    prisma.loyaltyTierConfig.upsert({
      where: { id: "tier-platinum" },
      update: {},
      create: {
        id: "tier-platinum",
        tenantId: tenant.id,
        name: "Platinum",
        minPoints: 8000,
        multiplier: 3.0,
        color: "#E5E4E2",
        sortOrder: 4,
      },
    }),
  ]);

  // ── 3. BRANCHES ──────────────────────────────────────────
  console.log("🏪  Creating branches...");

  const [branchMain, branchLad] = await Promise.all([
    prisma.branch.upsert({
      where: { id: "branch-silom" },
      update: {},
      create: {
        id: "branch-silom",
        tenantId: tenant.id,
        name: "สาขาสีลม",
        address: "123 ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพฯ",
        phone: "02-234-5678",
        timezone: "Asia/Bangkok",
        currency: "THB",
        taxRate: 0.07,
        isActive: true,
        selfOrderEnabled: true,
        payLaterEnabled: true,
        payAtCounterEnabled: true,
        payOnlineEnabled: true,
        queueEnabled: true,
        queueDisplayName: false,
        loyaltyEnabled: true,
        currentQueue: 0,
      },
    }),
    prisma.branch.upsert({
      where: { id: "branch-ladprao" },
      update: {},
      create: {
        id: "branch-ladprao",
        tenantId: tenant.id,
        name: "สาขาลาดพร้าว",
        address: "456 ถนนลาดพร้าว แขวงจตุจักร เขตจตุจักร กรุงเทพฯ",
        phone: "02-345-6789",
        timezone: "Asia/Bangkok",
        currency: "THB",
        taxRate: 0.07,
        isActive: true,
        selfOrderEnabled: true,
        payLaterEnabled: false,
        payAtCounterEnabled: true,
        payOnlineEnabled: true,
        queueEnabled: false,
        queueDisplayName: true, // สาขานี้เรียกชื่อ
        loyaltyEnabled: true,
        currentQueue: 0,
      },
    }),
  ]);

  // ── 4. ROLES ─────────────────────────────────────────────
  console.log("🔐  Creating roles...");

  const roleData = [
    {
      id: "role-owner",
      name: "OWNER",
      baseRole: "OWNER" as UserRole,
      isSystem: true,
    },
    {
      id: "role-manager",
      name: "MANAGER",
      baseRole: "MANAGER" as UserRole,
      isSystem: true,
    },
    {
      id: "role-cashier",
      name: "CASHIER",
      baseRole: "CASHIER" as UserRole,
      isSystem: true,
    },
    {
      id: "role-kitchen",
      name: "KITCHEN",
      baseRole: "KITCHEN" as UserRole,
      isSystem: true,
    },
    {
      id: "role-headcashier",
      name: "หัวหน้าแคชเชียร์",
      baseRole: "MANAGER" as UserRole,
      isSystem: false,
    },
  ];

  const roles: Record<string, { id: string }> = {};
  for (const r of roleData) {
    roles[r.id] = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: r.name } },
      update: {
        baseRole: r.baseRole,
        permissions: BASE_ROLE_PERMISSIONS[r.baseRole] ?? [],
      },
      create: {
        id: r.id,
        tenantId: tenant.id,
        name: r.name,
        baseRole: r.baseRole,
        permissions: BASE_ROLE_PERMISSIONS[r.baseRole] ?? [],
        isSystem: r.isSystem,
      },
    });
  }

  // ── 5. USERS ─────────────────────────────────────────────
  console.log("👤  Creating users...");

  const usersData = [
    // สาขาสีลม
    {
      id: "user-owner",
      tenantId: tenant.id,
      branchId: branchMain.id,
      name: "คุณแม่สมศรี",
      email: "owner@krua.com",
      pinCode: "1234",
      roleId: roles["role-owner"].id,
    },
    {
      id: "user-mgr-s",
      tenantId: tenant.id,
      branchId: branchMain.id,
      name: "คุณสมชาย",
      email: "manager.s@krua.com",
      pinCode: "2345",
      roleId: roles["role-manager"].id,
    },
    {
      id: "user-cash-s1",
      tenantId: tenant.id,
      branchId: branchMain.id,
      name: "นภา",
      email: "napa@krua.com",
      pinCode: "3456",
      roleId: roles["role-cashier"].id,
    },
    {
      id: "user-cash-s2",
      tenantId: tenant.id,
      branchId: branchMain.id,
      name: "ต้อม",
      email: "tom@krua.com",
      pinCode: "4567",
      roleId: roles["role-cashier"].id,
    },
    {
      id: "user-kds-s1",
      tenantId: tenant.id,
      branchId: branchMain.id,
      name: "ครัวหลัก",
      email: "kitchen1@krua.com",
      pinCode: "5678",
      roleId: roles["role-kitchen"].id,
    },
    {
      id: "user-kds-s2",
      tenantId: tenant.id,
      branchId: branchMain.id,
      name: "ครัวเสริม",
      email: "kitchen2@krua.com",
      pinCode: "6789",
      roleId: roles["role-kitchen"].id,
    },
    // สาขาลาดพร้าว
    {
      id: "user-mgr-l",
      tenantId: tenant.id,
      branchId: branchLad.id,
      name: "คุณมานี",
      email: "manager.l@krua.com",
      pinCode: "7890",
      roleId: roles["role-manager"].id,
    },
    {
      id: "user-cash-l1",
      tenantId: tenant.id,
      branchId: branchLad.id,
      name: "บิ๊ก",
      email: "big@krua.com",
      pinCode: "8901",
      roleId: roles["role-cashier"].id,
    },
    {
      id: "user-kds-l1",
      tenantId: tenant.id,
      branchId: branchLad.id,
      name: "ครัวลาดพร้าว",
      email: "kitchen.l@krua.com",
      pinCode: "9012",
      roleId: roles["role-kitchen"].id,
    },
  ];

  for (const u of usersData) {
    const { id, ...data } = u;
    await prisma.user.upsert({
      where: { id },
      update: data,
      create: u,
    });
  }

  // ── 6. CATEGORIES ────────────────────────────────────────
  console.log("📋  Creating menu categories...");

  const [
    catYam,
    catTomYam,
    catFried,
    catNoodle,
    catRice,
    catAppetizer,
    catDessert,
    catDrink,
  ] = await Promise.all(
    [
      { id: "cat-yam", name: "ยำ & สลัด", nameEn: "Salads", sortOrder: 1 },
      {
        id: "cat-tomyam",
        name: "ต้ม & แกง",
        nameEn: "Soups & Curry",
        sortOrder: 2,
      },
      { id: "cat-fried", name: "ผัด & ทอด", nameEn: "Stir-fry", sortOrder: 3 },
      { id: "cat-noodle", name: "ก๋วยเตี๋ยว", nameEn: "Noodles", sortOrder: 4 },
      { id: "cat-rice", name: "ข้าว", nameEn: "Rice", sortOrder: 5 },
      {
        id: "cat-appetizer",
        name: "ของทานเล่น",
        nameEn: "Appetizers",
        sortOrder: 6,
      },
      { id: "cat-dessert", name: "ของหวาน", nameEn: "Desserts", sortOrder: 7 },
      { id: "cat-drink", name: "เครื่องดื่ม", nameEn: "Drinks", sortOrder: 8 },
    ].map((c) =>
      prisma.category.upsert({
        where: { id: c.id },
        update: { tenantId: tenant.id, name: c.name, sortOrder: c.sortOrder, isActive: true },
        create: { ...c, tenantId: tenant.id, isActive: true },
      }),
    ),
  );

  // ── 7. MENU ITEMS ────────────────────────────────────────
  console.log("🍜  Creating menu items...");

  const menuItemsData = [
    // ยำ
    {
      id: "mi-yamwunsen",
      name: "ยำวุ้นเส้น",
      categoryId: catYam.id,
      price: 90,
      stockQty: null,
      tags: ["bestseller", "spicy"],
    },
    {
      id: "mi-yammamuang",
      name: "ยำมะม่วง",
      categoryId: catYam.id,
      price: 80,
      stockQty: null,
      tags: [],
    },
    {
      id: "mi-yamthalay",
      name: "ยำทะเล",
      categoryId: catYam.id,
      price: 150,
      stockQty: null,
      tags: ["spicy"],
    },
    {
      id: "mi-somtam",
      name: "ส้มตำไทย",
      categoryId: catYam.id,
      price: 70,
      stockQty: null,
      tags: ["bestseller", "spicy"],
    },
    // ต้ม & แกง
    {
      id: "mi-tomyumgoong",
      name: "ต้มยำกุ้ง",
      categoryId: catTomYam.id,
      price: 160,
      stockQty: 15,
      tags: ["bestseller", "spicy"],
    },
    {
      id: "mi-tomkha",
      name: "ต้มข่าไก่",
      categoryId: catTomYam.id,
      price: 130,
      stockQty: null,
      tags: [],
    },
    {
      id: "mi-kaengkeaw",
      name: "แกงเขียวหวานไก่",
      categoryId: catTomYam.id,
      price: 120,
      stockQty: 10,
      tags: [],
    },
    {
      id: "mi-kaengped",
      name: "แกงเผ็ดเป็ด",
      categoryId: catTomYam.id,
      price: 180,
      stockQty: 8,
      tags: [],
    },
    // ผัด & ทอด
    {
      id: "mi-krapao",
      name: "ผัดกะเพราหมูสับ",
      categoryId: catFried.id,
      price: 90,
      stockQty: null,
      tags: ["bestseller"],
    },
    {
      id: "mi-padfak",
      name: "ผัดผักรวม",
      categoryId: catFried.id,
      price: 80,
      stockQty: null,
      tags: ["vegan"],
    },
    {
      id: "mi-padprik",
      name: "หมูผัดพริกแกง",
      categoryId: catFried.id,
      price: 100,
      stockQty: null,
      tags: [],
    },
    {
      id: "mi-gaithod",
      name: "ไก่ทอดกระเทียม",
      categoryId: catFried.id,
      price: 120,
      stockQty: null,
      tags: [],
    },
    {
      id: "mi-pladook",
      name: "ปลาดุกผัดเผ็ด",
      categoryId: catFried.id,
      price: 140,
      stockQty: 5,
      tags: ["spicy"],
    },
    // ก๋วยเตี๋ยว
    {
      id: "mi-padt",
      name: "ผัดไทยกุ้งสด",
      categoryId: catNoodle.id,
      price: 120,
      stockQty: null,
      tags: ["bestseller"],
    },
    {
      id: "mi-kwayteaw",
      name: "ก๋วยเตี๋ยวเรือ",
      categoryId: catNoodle.id,
      price: 80,
      stockQty: null,
      tags: [],
    },
    {
      id: "mi-bamee",
      name: "บะหมี่แห้งหมูแดง",
      categoryId: catNoodle.id,
      price: 75,
      stockQty: null,
      tags: [],
    },
    // ข้าว
    {
      id: "mi-khaopadt",
      name: "ข้าวผัดกุ้ง",
      categoryId: catRice.id,
      price: 110,
      stockQty: 20,
      tags: ["bestseller"],
    },
    {
      id: "mi-khaoman",
      name: "ข้าวมันไก่",
      categoryId: catRice.id,
      price: 65,
      stockQty: null,
      tags: [],
    },
    {
      id: "mi-khaona",
      name: "ข้าวหน้าเป็ด",
      categoryId: catRice.id,
      price: 80,
      stockQty: null,
      tags: [],
    },
    // ของทานเล่น
    {
      id: "mi-tordman",
      name: "ทอดมันปลากราย",
      categoryId: catAppetizer.id,
      price: 100,
      stockQty: null,
      tags: ["bestseller"],
    },
    {
      id: "mi-popiah",
      name: "ปอเปี๊ยะทอด",
      categoryId: catAppetizer.id,
      price: 70,
      stockQty: null,
      tags: [],
    },
    {
      id: "mi-satay",
      name: "สเต๊ะหมู",
      categoryId: catAppetizer.id,
      price: 90,
      stockQty: null,
      tags: [],
    },
    {
      id: "mi-kangkung",
      name: "ผักบุ้งทอดกรอบ",
      categoryId: catAppetizer.id,
      price: 80,
      stockQty: null,
      tags: ["vegan"],
    },
    // ของหวาน
    {
      id: "mi-buakloi",
      name: "บัวลอยไข่หวาน",
      categoryId: catDessert.id,
      price: 60,
      stockQty: 8,
      tags: [],
    },
    {
      id: "mi-taptim",
      name: "ทับทิมกรอบ",
      categoryId: catDessert.id,
      price: 65,
      stockQty: 10,
      tags: [],
    },
    {
      id: "mi-icecream",
      name: "ไอศกรีมกะทิ",
      categoryId: catDessert.id,
      price: 55,
      stockQty: 12,
      tags: [],
    },
    {
      id: "mi-mango",
      name: "ข้าวเหนียวมะม่วง",
      categoryId: catDessert.id,
      price: 90,
      stockQty: 6,
      tags: ["seasonal"],
    },
    // เครื่องดื่ม
    {
      id: "mi-chayen",
      name: "ชาเย็น",
      categoryId: catDrink.id,
      price: 60,
      stockQty: null,
      tags: ["bestseller"],
    },
    {
      id: "mi-coffee",
      name: "กาแฟเย็น",
      categoryId: catDrink.id,
      price: 65,
      stockQty: null,
      tags: [],
    },
    {
      id: "mi-namsom",
      name: "น้ำส้มคั้น",
      categoryId: catDrink.id,
      price: 70,
      stockQty: null,
      tags: [],
    },
    {
      id: "mi-water",
      name: "น้ำเปล่า",
      categoryId: catDrink.id,
      price: 20,
      stockQty: null,
      tags: [],
    },
    {
      id: "mi-somaolin",
      name: "โซดาไลม์",
      categoryId: catDrink.id,
      price: 55,
      stockQty: null,
      tags: [],
    },
    {
      id: "mi-leo",
      name: "เบียร์ลีโอ",
      categoryId: catDrink.id,
      price: 80,
      stockQty: 24,
      tags: [],
    },
    {
      id: "mi-chang",
      name: "เบียร์ช้าง",
      categoryId: catDrink.id,
      price: 80,
      stockQty: 24,
      tags: [],
    },
  ];

  for (const m of menuItemsData) {
    await prisma.menuItem.upsert({
      where: { id: m.id },
      update: { ...m, tenantId: tenant.id },
      create: { ...m, tenantId: tenant.id, isAvailable: true },
    });
  }

  // ── 8. MODIFIERS ─────────────────────────────────────────
  console.log("⚙️   Creating modifiers...");

  const SINGLE_SELECT: ModifierType = "SINGLE_SELECT";
  const modifierData = [
    // กะเพรา
    {
      id: "mod-krapao-spicy",
      menuItemId: "mi-krapao",
      tenantId: tenant.id,
      name: "ความเผ็ด",
      type: SINGLE_SELECT,
      isRequired: true,
      sortOrder: 1,
      options: [
        { name: "ไม่เผ็ด", priceAdd: 0 },
        { name: "เผ็ดน้อย", priceAdd: 0 },
        { name: "เผ็ด", priceAdd: 0 },
        { name: "เผ็ดมาก", priceAdd: 0 },
      ],
    },
    {
      id: "mod-krapao-egg",
      menuItemId: "mi-krapao",
      tenantId: tenant.id,
      name: "ไข่",
      type: SINGLE_SELECT,
      isRequired: false,
      sortOrder: 2,
      options: [
        { name: "ไม่ใส่", priceAdd: 0 },
        { name: "ไข่ดาว", priceAdd: 15 },
        { name: "ไข่เจียว", priceAdd: 15 },
      ],
    },
    {
      id: "mod-krapao-meat",
      menuItemId: "mi-krapao",
      tenantId: tenant.id,
      name: "เนื้อสัตว์",
      type: SINGLE_SELECT,
      isRequired: false,
      sortOrder: 3,
      options: [
        { name: "หมูสับ", priceAdd: 0 },
        { name: "ไก่สับ", priceAdd: 0 },
        { name: "กุ้ง", priceAdd: 20 },
        { name: "ทะเลรวม", priceAdd: 30 },
      ],
    },
    // ต้มยำ
    {
      id: "mod-tomyum-type",
      menuItemId: "mi-tomyumgoong",
      tenantId: tenant.id,
      name: "แบบ",
      type: SINGLE_SELECT,
      isRequired: true,
      sortOrder: 1,
      options: [
        { name: "น้ำใส", priceAdd: 0 },
        { name: "น้ำข้น", priceAdd: 0 },
      ],
    },
    {
      id: "mod-tomyum-spicy",
      menuItemId: "mi-tomyumgoong",
      tenantId: tenant.id,
      name: "ความเผ็ด",
      type: SINGLE_SELECT,
      isRequired: true,
      sortOrder: 2,
      options: [
        { name: "ไม่เผ็ด", priceAdd: 0 },
        { name: "เผ็ดน้อย", priceAdd: 0 },
        { name: "เผ็ด", priceAdd: 0 },
        { name: "เผ็ดมาก", priceAdd: 0 },
      ],
    },
    // ชาเย็น
    {
      id: "mod-cha-sweet",
      menuItemId: "mi-chayen",
      tenantId: tenant.id,
      name: "ความหวาน",
      type: SINGLE_SELECT,
      isRequired: true,
      sortOrder: 1,
      options: [
        { name: "หวานน้อย", priceAdd: 0 },
        { name: "หวานปกติ", priceAdd: 0 },
        { name: "หวานมาก", priceAdd: 0 },
      ],
    },
    {
      id: "mod-cha-size",
      menuItemId: "mi-chayen",
      tenantId: tenant.id,
      name: "ขนาด",
      type: SINGLE_SELECT,
      isRequired: false,
      sortOrder: 2,
      options: [
        { name: "แก้วปกติ", priceAdd: 0 },
        { name: "แก้วใหญ่", priceAdd: 15 },
      ],
    },
    // กาแฟ
    {
      id: "mod-coffee-sweet",
      menuItemId: "mi-coffee",
      tenantId: tenant.id,
      name: "ความหวาน",
      type: SINGLE_SELECT,
      isRequired: true,
      sortOrder: 1,
      options: [
        { name: "ไม่หวาน", priceAdd: 0 },
        { name: "หวานน้อย", priceAdd: 0 },
        { name: "หวานปกติ", priceAdd: 0 },
      ],
    },
    // ผัดไทย
    {
      id: "mod-padt-shrimp",
      menuItemId: "mi-padt",
      tenantId: tenant.id,
      name: "กุ้ง",
      type: SINGLE_SELECT,
      isRequired: false,
      sortOrder: 1,
      options: [
        { name: "กุ้งสด", priceAdd: 0 },
        { name: "กุ้งแห้ง", priceAdd: -20 },
      ],
    },
    {
      id: "mod-padt-egg",
      menuItemId: "mi-padt",
      tenantId: tenant.id,
      name: "ไข่",
      type: SINGLE_SELECT,
      isRequired: false,
      sortOrder: 2,
      options: [
        { name: "ใส่ไข่", priceAdd: 0 },
        { name: "ไม่ใส่ไข่", priceAdd: 0 },
      ],
    },
    // ส้มตำ
    {
      id: "mod-somtam-spicy",
      menuItemId: "mi-somtam",
      tenantId: tenant.id,
      name: "ความเผ็ด",
      type: SINGLE_SELECT,
      isRequired: true,
      sortOrder: 1,
      options: [
        { name: "ไม่เผ็ด", priceAdd: 0 },
        { name: "เผ็ดน้อย", priceAdd: 0 },
        { name: "เผ็ด", priceAdd: 0 },
        { name: "เผ็ดมาก", priceAdd: 0 },
      ],
    },
    {
      id: "mod-somtam-type",
      menuItemId: "mi-somtam",
      tenantId: tenant.id,
      name: "แบบ",
      type: SINGLE_SELECT,
      isRequired: false,
      sortOrder: 2,
      options: [
        { name: "ส้มตำไทย", priceAdd: 0 },
        { name: "ส้มตำปูปลาร้า", priceAdd: 10 },
      ],
    },
    // ข้าวผัด
    {
      id: "mod-khaopadt-prot",
      menuItemId: "mi-khaopadt",
      tenantId: tenant.id,
      name: "โปรตีน",
      type: SINGLE_SELECT,
      isRequired: false,
      sortOrder: 1,
      options: [
        { name: "กุ้ง", priceAdd: 0 },
        { name: "หมู", priceAdd: -10 },
        { name: "ทะเลรวม", priceAdd: 30 },
      ],
    },
    {
      id: "mod-khaopadt-egg",
      menuItemId: "mi-khaopadt",
      tenantId: tenant.id,
      name: "ไข่",
      type: SINGLE_SELECT,
      isRequired: false,
      sortOrder: 2,
      options: [
        { name: "ไข่เจียว", priceAdd: 0 },
        { name: "ไข่ดาว", priceAdd: 0 },
      ],
    },
  ];

  for (const m of modifierData) {
    await prisma.modifier.upsert({
      where: { id: m.id },
      update: {},
      create: m,
    });
  }

  // ── 9. TABLES ────────────────────────────────────────────
  console.log("🪑  Creating tables...");

  const tablesMain = [
    // Indoor
    {
      id: "tbl-s-a1",
      name: "A1",
      zone: "Indoor",
      capacity: 2,
      qrToken: "qr-silom-a1",
    },
    {
      id: "tbl-s-a2",
      name: "A2",
      zone: "Indoor",
      capacity: 4,
      qrToken: "qr-silom-a2",
    },
    {
      id: "tbl-s-a3",
      name: "A3",
      zone: "Indoor",
      capacity: 4,
      qrToken: "qr-silom-a3",
    },
    {
      id: "tbl-s-a4",
      name: "A4",
      zone: "Indoor",
      capacity: 6,
      qrToken: "qr-silom-a4",
    },
    {
      id: "tbl-s-b1",
      name: "B1",
      zone: "Indoor",
      capacity: 4,
      qrToken: "qr-silom-b1",
    },
    {
      id: "tbl-s-b2",
      name: "B2",
      zone: "Indoor",
      capacity: 4,
      qrToken: "qr-silom-b2",
    },
    // Outdoor
    {
      id: "tbl-s-c1",
      name: "C1",
      zone: "Outdoor",
      capacity: 4,
      qrToken: "qr-silom-c1",
    },
    {
      id: "tbl-s-c2",
      name: "C2",
      zone: "Outdoor",
      capacity: 4,
      qrToken: "qr-silom-c2",
    },
    {
      id: "tbl-s-c3",
      name: "C3",
      zone: "Outdoor",
      capacity: 6,
      qrToken: "qr-silom-c3",
    },
    // VIP
    {
      id: "tbl-s-v1",
      name: "VIP 1",
      zone: "VIP",
      capacity: 8,
      qrToken: "qr-silom-v1",
    },
    {
      id: "tbl-s-v2",
      name: "VIP 2",
      zone: "VIP",
      capacity: 10,
      qrToken: "qr-silom-v2",
    },
  ];

  const tablesLad = [
    {
      id: "tbl-l-a1",
      name: "A1",
      zone: "ชั้น 1",
      capacity: 4,
      qrToken: "qr-ladprao-a1",
    },
    {
      id: "tbl-l-a2",
      name: "A2",
      zone: "ชั้น 1",
      capacity: 4,
      qrToken: "qr-ladprao-a2",
    },
    {
      id: "tbl-l-a3",
      name: "A3",
      zone: "ชั้น 1",
      capacity: 6,
      qrToken: "qr-ladprao-a3",
    },
    {
      id: "tbl-l-b1",
      name: "B1",
      zone: "ชั้น 2",
      capacity: 4,
      qrToken: "qr-ladprao-b1",
    },
    {
      id: "tbl-l-b2",
      name: "B2",
      zone: "ชั้น 2",
      capacity: 4,
      qrToken: "qr-ladprao-b2",
    },
    {
      id: "tbl-l-b3",
      name: "B3",
      zone: "ชั้น 2",
      capacity: 8,
      qrToken: "qr-ladprao-b3",
    },
  ];

  for (const t of [...tablesMain, ...tablesLad]) {
    await prisma.table.upsert({
      where: { id: t.id },
      update: {},
      create: {
        ...t,
        branchId: tablesMain.find((m) => m.id === t.id)
          ? branchMain.id
          : branchLad.id,
        status: "AVAILABLE",
      },
    });
  }

  // ── 10. COUPONS ──────────────────────────────────────────
  console.log("🎟️   Creating coupons...");

  const couponsData = [
    {
      id: "coupon-welcome",
      code: "WELCOME10",
      name: "ยินดีต้อนรับสมาชิกใหม่ 10%",
      type: "PERCENT_DISCOUNT" as const,
      targetType: "MEMBER_NEW" as const,
      value: 10,
      maxDiscountAmt: 50,
      usagePerMember: 1,
    },
    {
      id: "coupon-first",
      code: "FIRSTORDER",
      name: "ส่วนลด ฿30 สำหรับ order แรก",
      type: "FIXED_DISCOUNT" as const,
      targetType: "MEMBER_FIRST_ORDER" as const,
      value: 30,
      minOrderAmt: 150,
      usagePerMember: 1,
    },
    {
      id: "coupon-gold",
      code: "GOLDMEMBER",
      name: "Gold member ลด 15%",
      type: "PERCENT_DISCOUNT" as const,
      targetType: "MEMBER_TIER" as const,
      value: 15,
      maxDiscountAmt: 100,
      tierId: tierGold.id,
      usagePerMember: null,
    },
    {
      id: "coupon-public",
      code: "KRUA50",
      name: "ส่วนลด ฿50 ทุกคน (แจกในงาน)",
      type: "FIXED_DISCOUNT" as const,
      targetType: "PUBLIC" as const,
      value: 50,
      minOrderAmt: 200,
      usageLimit: 100,
      usagePerMember: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const c of couponsData) {
    await prisma.coupon.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, tenantId: tenant.id, isActive: true },
    });
  }

  // ── 11. LOYALTY ACCOUNTS (ตัวอย่างลูกค้า) ───────────────
  console.log("👥  Creating sample customers...");

  const customers = [
    {
      phone: "0812345678",
      name: "คุณสมหญิง",
      tierId: tierGold.id,
      points: 2450,
      totalEarned: 3200,
      totalSpend: 12800,
      visitCount: 18,
    },
    {
      phone: "0823456789",
      name: "คุณวิชัย",
      tierId: tierSilver.id,
      points: 820,
      totalEarned: 1100,
      totalSpend: 4400,
      visitCount: 8,
    },
    {
      phone: "0834567890",
      name: "คุณนุ่น",
      tierId: tierBronze.id,
      points: 120,
      totalEarned: 200,
      totalSpend: 800,
      visitCount: 3,
    },
    {
      phone: "0845678901",
      name: "คุณแดง",
      tierId: tierPlatinum.id,
      points: 9200,
      totalEarned: 12000,
      totalSpend: 48000,
      visitCount: 45,
    },
    {
      phone: "0856789012",
      name: "คุณเขียว",
      tierId: tierBronze.id,
      points: 50,
      totalEarned: 50,
      totalSpend: 200,
      visitCount: 1,
    },
  ];

  for (const c of customers) {
    await prisma.loyaltyAccount.upsert({
      where: { tenantId_phone: { tenantId: tenant.id, phone: c.phone } },
      update: {},
      create: {
        tenantId: tenant.id,
        phone: c.phone,
        name: c.name,
        tierId: c.tierId,
        points: c.points,
        totalEarned: c.totalEarned,
        totalSpend: c.totalSpend,
        visitCount: c.visitCount,
        lastVisitAt: daysAgo(randomBetween(0, 7)),
      },
    });
  }

  // ── 12. SAMPLE ORDERS (active) ───────────────────────────
  console.log("🧾  Creating sample active orders...");

  // โต๊ะ A2 กำลังกินอยู่ — status PREPARING
  const session1 = await prisma.tableSession.upsert({
    where: { id: "sess-demo-1" },
    update: {},
    create: {
      id: "sess-demo-1",
      tableId: "tbl-s-a2",
      status: "OPEN",
      guestCount: 3,
    },
  });

  await prisma.table.update({
    where: { id: "tbl-s-a2" },
    data: { status: "OCCUPIED" },
  });

  await prisma.order.upsert({
    where: { id: "order-demo-1" },
    update: {},
    create: {
      id: "order-demo-1",
      branchId: branchMain.id,
      tableId: "tbl-s-a2",
      sessionId: session1.id,
      cashierId: "user-cash-s1",
      type: "DINE_IN",
      status: "PREPARING",
      subtotal: 420,
      total: 420,
      receiptToken: "receipt-demo-1",
      createdAt: hoursAgo(0.25),
      items: {
        create: [
          {
            menuItemId: "mi-krapao",
            name: "ผัดกะเพราหมูสับ",
            unitPrice: 90,
            qty: 2,
            modifiers: { ความเผ็ด: "เผ็ด", ไข่: "ไข่ดาว" },
            status: "DONE",
          },
          {
            menuItemId: "mi-tomyumgoong",
            name: "ต้มยำกุ้ง",
            unitPrice: 160,
            qty: 1,
            modifiers: { แบบ: "น้ำข้น", ความเผ็ด: "เผ็ดมาก" },
            status: "PREPARING",
          },
          {
            menuItemId: "mi-chayen",
            name: "ชาเย็น",
            unitPrice: 60,
            qty: 3,
            modifiers: { ความหวาน: "หวานน้อย" },
            status: "DONE",
          },
        ],
      },
    },
  });

  // โต๊ะ B1 — รอส่งครัว (PENDING)
  const session2 = await prisma.tableSession.upsert({
    where: { id: "sess-demo-2" },
    update: {},
    create: {
      id: "sess-demo-2",
      tableId: "tbl-s-b1",
      status: "OPEN",
      guestCount: 2,
    },
  });

  await prisma.table.update({
    where: { id: "tbl-s-b1" },
    data: { status: "OCCUPIED" },
  });

  await prisma.order.upsert({
    where: { id: "order-demo-2" },
    update: {},
    create: {
      id: "order-demo-2",
      branchId: branchMain.id,
      tableId: "tbl-s-b1",
      sessionId: session2.id,
      type: "SELF_ORDER",
      status: "PENDING",
      subtotal: 230,
      total: 230,
      receiptToken: "receipt-demo-2",
      guestName: "คุณต้อม",
      createdAt: hoursAgo(0.08),
      items: {
        create: [
          {
            menuItemId: "mi-padt",
            name: "ผัดไทยกุ้งสด",
            unitPrice: 120,
            qty: 1,
            modifiers: { กุ้ง: "กุ้งสด", ไข่: "ใส่ไข่" },
            status: "PENDING",
          },
          {
            menuItemId: "mi-somtam",
            name: "ส้มตำไทย",
            unitPrice: 70,
            qty: 1,
            modifiers: { ความเผ็ด: "เผ็ดมาก" },
            status: "PENDING",
          },
          {
            menuItemId: "mi-water",
            name: "น้ำเปล่า",
            unitPrice: 20,
            qty: 2,
            modifiers: {},
            status: "PENDING",
          },
        ],
      },
    },
  });

  // โต๊ะ C1 — READY รอเสิร์ฟ
  const session3 = await prisma.tableSession.upsert({
    where: { id: "sess-demo-3" },
    update: {},
    create: {
      id: "sess-demo-3",
      tableId: "tbl-s-c1",
      status: "OPEN",
      guestCount: 4,
    },
  });

  await prisma.table.update({
    where: { id: "tbl-s-c1" },
    data: { status: "OCCUPIED" },
  });

  await prisma.order.upsert({
    where: { id: "order-demo-3" },
    update: {},
    create: {
      id: "order-demo-3",
      branchId: branchMain.id,
      tableId: "tbl-s-c1",
      sessionId: session3.id,
      cashierId: "user-cash-s2",
      type: "DINE_IN",
      status: "READY",
      subtotal: 650,
      total: 650,
      receiptToken: "receipt-demo-3",
      createdAt: hoursAgo(0.5),
      items: {
        create: [
          {
            menuItemId: "mi-kaengkeaw",
            name: "แกงเขียวหวานไก่",
            unitPrice: 120,
            qty: 1,
            modifiers: {},
            status: "DONE",
          },
          {
            menuItemId: "mi-khaopadt",
            name: "ข้าวผัดกุ้ง",
            unitPrice: 110,
            qty: 2,
            modifiers: { โปรตีน: "กุ้ง" },
            status: "DONE",
          },
          {
            menuItemId: "mi-tordman",
            name: "ทอดมันปลากราย",
            unitPrice: 100,
            qty: 1,
            modifiers: {},
            status: "DONE",
          },
          {
            menuItemId: "mi-chayen",
            name: "ชาเย็น",
            unitPrice: 60,
            qty: 2,
            modifiers: {},
            status: "DONE",
          },
          {
            menuItemId: "mi-leo",
            name: "เบียร์ลีโอ",
            unitPrice: 80,
            qty: 2,
            modifiers: {},
            status: "DONE",
          },
        ],
      },
    },
  });

  // ── 13. COMPLETED ORDERS + PAYMENTS (yesterday) ─────────
  console.log("💰  Creating completed orders with payments...");

  // Order เมื่อวาน — ชำระเงินสดแล้ว
  await prisma.order.upsert({
    where: { id: "order-hist-1" },
    update: {},
    create: {
      id: "order-hist-1",
      branchId: branchMain.id,
      tableId: "tbl-s-a1",
      cashierId: "user-cash-s1",
      type: "DINE_IN",
      status: "COMPLETED",
      subtotal: 310,
      total: 310,
      receiptToken: "receipt-hist-1",
      createdAt: daysAgo(1),
      completedAt: daysAgo(1),
      items: {
        create: [
          {
            menuItemId: "mi-krapao",
            name: "ผัดกะเพราหมูสับ",
            unitPrice: 90,
            qty: 2,
            modifiers: { ความเผ็ด: "เผ็ด", ไข่: "ไข่ดาว" },
            status: "DONE",
          },
          {
            menuItemId: "mi-chayen",
            name: "ชาเย็น",
            unitPrice: 60,
            qty: 2,
            modifiers: { ความหวาน: "หวานน้อย" },
            status: "DONE",
          },
          {
            menuItemId: "mi-tordman",
            name: "ทอดมันปลากราย",
            unitPrice: 100,
            qty: 1,
            modifiers: {},
            status: "VOIDED",
            voidReason: "หมด stock",
          },
        ],
      },
      payments: {
        create: [
          {
            method: "CASH",
            amount: 310,
            cashReceived: 500,
            changeAmt: 190,
            status: "CONFIRMED",
            confirmedAt: daysAgo(1),
          },
        ],
      },
    },
  });

  // Order เมื่อวาน — PromptPay
  await prisma.order.upsert({
    where: { id: "order-hist-2" },
    update: {},
    create: {
      id: "order-hist-2",
      branchId: branchMain.id,
      tableId: "tbl-s-c2",
      cashierId: "user-cash-s2",
      type: "DINE_IN",
      status: "COMPLETED",
      subtotal: 480,
      total: 480,
      receiptToken: "receipt-hist-2",
      customerPhone: "0812345678",
      createdAt: daysAgo(1),
      completedAt: daysAgo(1),
      items: {
        create: [
          {
            menuItemId: "mi-tomyumgoong",
            name: "ต้มยำกุ้ง",
            unitPrice: 160,
            qty: 1,
            modifiers: { แบบ: "น้ำข้น", ความเผ็ด: "เผ็ด" },
            status: "DONE",
          },
          {
            menuItemId: "mi-padt",
            name: "ผัดไทยกุ้งสด",
            unitPrice: 120,
            qty: 1,
            modifiers: {},
            status: "DONE",
          },
          {
            menuItemId: "mi-kaengkeaw",
            name: "แกงเขียวหวานไก่",
            unitPrice: 120,
            qty: 1,
            modifiers: {},
            status: "DONE",
          },
          {
            menuItemId: "mi-leo",
            name: "เบียร์ลีโอ",
            unitPrice: 80,
            qty: 1,
            modifiers: {},
            status: "DONE",
          },
        ],
      },
      payments: {
        create: [
          {
            method: "PROMPTPAY",
            amount: 480,
            status: "CONFIRMED",
            confirmedAt: daysAgo(1),
            gatewayRef: "mock-pp-hist-2",
          },
        ],
      },
    },
  });

  // Order วันนี้ — เงินสด (2 ชม.ก่อน)
  await prisma.order.upsert({
    where: { id: "order-hist-3" },
    update: {},
    create: {
      id: "order-hist-3",
      branchId: branchMain.id,
      tableId: "tbl-s-a3",
      cashierId: "user-cash-s1",
      type: "DINE_IN",
      status: "COMPLETED",
      subtotal: 235,
      total: 235,
      receiptToken: "receipt-hist-3",
      createdAt: hoursAgo(2),
      completedAt: hoursAgo(1.8),
      items: {
        create: [
          {
            menuItemId: "mi-khaoman",
            name: "ข้าวมันไก่",
            unitPrice: 65,
            qty: 2,
            modifiers: {},
            status: "DONE",
          },
          {
            menuItemId: "mi-somtam",
            name: "ส้มตำไทย",
            unitPrice: 70,
            qty: 1,
            modifiers: { ความเผ็ด: "เผ็ดน้อย" },
            status: "DONE",
          },
          {
            menuItemId: "mi-water",
            name: "น้ำเปล่า",
            unitPrice: 20,
            qty: 2,
            modifiers: {},
            status: "DONE",
          },
          {
            menuItemId: "mi-mango",
            name: "ข้าวเหนียวมะม่วง",
            unitPrice: 90,
            qty: 1,
            modifiers: {},
            status: "DONE",
          },
        ],
      },
      payments: {
        create: [
          {
            method: "CASH",
            amount: 235,
            cashReceived: 300,
            changeAmt: 65,
            status: "CONFIRMED",
            confirmedAt: hoursAgo(1.8),
          },
        ],
      },
    },
  });

  // Order วันนี้ — เงินสด (1 ชม.ก่อน)
  await prisma.order.upsert({
    where: { id: "order-hist-4" },
    update: {},
    create: {
      id: "order-hist-4",
      branchId: branchMain.id,
      tableId: "tbl-s-b2",
      cashierId: "user-cash-s1",
      type: "DINE_IN",
      status: "COMPLETED",
      subtotal: 370,
      total: 370,
      receiptToken: "receipt-hist-4",
      createdAt: hoursAgo(1),
      completedAt: hoursAgo(0.8),
      items: {
        create: [
          {
            menuItemId: "mi-yamwunsen",
            name: "ยำวุ้นเส้น",
            unitPrice: 90,
            qty: 1,
            modifiers: {},
            status: "DONE",
          },
          {
            menuItemId: "mi-gaithod",
            name: "ไก่ทอดกระเทียม",
            unitPrice: 120,
            qty: 1,
            modifiers: {},
            status: "DONE",
          },
          {
            menuItemId: "mi-khaopadt",
            name: "ข้าวผัดกุ้ง",
            unitPrice: 110,
            qty: 1,
            modifiers: { โปรตีน: "ทะเลรวม" },
            status: "DONE",
          },
          {
            menuItemId: "mi-coffee",
            name: "กาแฟเย็น",
            unitPrice: 65,
            qty: 1,
            modifiers: { ความหวาน: "หวานน้อย" },
            status: "DONE",
          },
        ],
      },
      payments: {
        create: [
          {
            method: "CASH",
            amount: 370,
            cashReceived: 400,
            changeAmt: 30,
            status: "CONFIRMED",
            confirmedAt: hoursAgo(0.8),
          },
        ],
      },
    },
  });

  // ── 14. SHIFT (open) ──────────────────────────────────────
  console.log("⏰  Creating open shift...");

  await prisma.shift.upsert({
    where: { id: "shift-demo-1" },
    update: {},
    create: {
      id: "shift-demo-1",
      branchId: branchMain.id,
      userId: "user-cash-s1",
      openCash: 2000,
      openedAt: hoursAgo(4),
    },
  });

  // Shift เมื่อวาน (ปิดแล้ว)
  await prisma.shift.upsert({
    where: { id: "shift-demo-yesterday" },
    update: {},
    create: {
      id: "shift-demo-yesterday",
      branchId: branchMain.id,
      userId: "user-cash-s1",
      openCash: 2000,
      closeCash: 3100,
      expectedCash: 3090,
      difference: 10,
      openedAt: daysAgo(1),
      closedAt: daysAgo(1),
    },
  });

  // ── 15. QUEUE TICKETS ─────────────────────────────────────
  console.log("🎫  Creating queue tickets...");

  await prisma.branch.update({
    where: { id: branchMain.id },
    data: { currentQueue: 3 },
  });

  await prisma.queueTicket.upsert({
    where: { id: "qt-demo-1" },
    update: {},
    create: {
      id: "qt-demo-1",
      branchId: branchMain.id,
      orderId: "order-demo-2",
      ticketNo: 1,
      displayCode: "001",
      status: "WAITING",
    },
  });

  await prisma.queueTicket.upsert({
    where: { id: "qt-demo-2" },
    update: {},
    create: {
      id: "qt-demo-2",
      branchId: branchMain.id,
      orderId: "order-demo-3",
      ticketNo: 2,
      displayCode: "002",
      status: "CALLED",
      calledAt: hoursAgo(0.1),
    },
  });

  // ── 16. OTP CODE ตัวอย่าง ────────────────────────────────
  console.log("🔑  Creating OTP codes...");

  await prisma.otpCode.deleteMany({
    where: { phone: "0812345678", tenantId: tenant.id },
  });
  await prisma.otpCode.create({
    data: {
      phone: "0812345678",
      tenantId: tenant.id,
      code: "123456",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      verified: false,
      attempts: 0,
    },
  });

  // ═══════════════════════════════════════════════════════════
  // ██  TENANT 2 — ร้านกาแฟ "Baan Brew"  ██
  // ═══════════════════════════════════════════════════════════
  console.log("\n☕  Seeding Baan Brew (coffee shop)...\n");

  // ── C1. TENANT ──────────────────────────────────────────
  const cafe = await prisma.tenant.upsert({
    where: { slug: "baan-brew" },
    update: {},
    create: {
      name: "Baan Brew",
      slug: "baan-brew",
      plan: "starter",
      settings: {
        loyalty: {
          enabled: true,
          earnRate: 1,
          earnPer: 50,
          redeemRate: 1,
          minRedeemPoints: 30,
          pointExpireMonths: 6,
        },
        coupon: {
          enabled: true,
          maxPerOrder: 1,
          stackWithPoints: false,
          stackBetweenCoupons: false,
        },
      },
    },
  });

  // ── C2. LOYALTY TIERS ────────────────────────────────────
  const [cafeTierRegular, cafeTierGold] = await Promise.all([
    prisma.loyaltyTierConfig.upsert({
      where: { id: "cafe-tier-regular" },
      update: {},
      create: {
        id: "cafe-tier-regular",
        tenantId: cafe.id,
        name: "Regular",
        minPoints: 0,
        multiplier: 1.0,
        color: "#8B6F47",
        sortOrder: 1,
      },
    }),
    prisma.loyaltyTierConfig.upsert({
      where: { id: "cafe-tier-gold" },
      update: {},
      create: {
        id: "cafe-tier-gold",
        tenantId: cafe.id,
        name: "Gold Bean",
        minPoints: 500,
        multiplier: 2.0,
        color: "#FFD700",
        sortOrder: 2,
      },
    }),
  ]);

  // ── C3. BRANCH ──────────────────────────────────────────
  const cafeBranch = await prisma.branch.upsert({
    where: { id: "branch-cafe-ari" },
    update: {},
    create: {
      id: "branch-cafe-ari",
      tenantId: cafe.id,
      name: "สาขาอารีย์",
      address: "55 ซอยอารีย์ 1 แขวงสามเสนใน เขตพญาไท กรุงเทพฯ",
      phone: "02-111-2233",
      timezone: "Asia/Bangkok",
      currency: "THB",
      taxRate: 0.07,
      isActive: true,
      selfOrderEnabled: true,
      payLaterEnabled: false,
      payAtCounterEnabled: true,
      payOnlineEnabled: true,
      queueEnabled: true,
      queueDisplayName: true,
      loyaltyEnabled: true,
      currentQueue: 0,
    },
  });

  // ── C4. ROLES ───────────────────────────────────────────
  const cafeRoles: Record<string, { id: string }> = {};
  for (const r of [
    { id: "cafe-role-owner", name: "OWNER", baseRole: "OWNER" as UserRole, isSystem: true },
    { id: "cafe-role-manager", name: "MANAGER", baseRole: "MANAGER" as UserRole, isSystem: true },
    { id: "cafe-role-barista", name: "CASHIER", baseRole: "CASHIER" as UserRole, isSystem: true },
    { id: "cafe-role-kitchen", name: "KITCHEN", baseRole: "KITCHEN" as UserRole, isSystem: true },
  ]) {
    cafeRoles[r.id] = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: cafe.id, name: r.name } },
      update: {
        baseRole: r.baseRole,
        permissions: BASE_ROLE_PERMISSIONS[r.baseRole] ?? [],
      },
      create: {
        id: r.id,
        tenantId: cafe.id,
        name: r.name,
        baseRole: r.baseRole,
        permissions: BASE_ROLE_PERMISSIONS[r.baseRole] ?? [],
        isSystem: r.isSystem,
      },
    });
  }

  // ── C5. USERS ───────────────────────────────────────────
  console.log("👤  Creating cafe users...");

  for (const u of [
    {
      id: "cafe-owner",
      tenantId: cafe.id,
      branchId: cafeBranch.id,
      name: "คุณบีม",
      email: "beam@baanbrew.com",
      pinCode: "1111",
      roleId: cafeRoles["cafe-role-owner"].id,
    },
    {
      id: "cafe-mgr",
      tenantId: cafe.id,
      branchId: cafeBranch.id,
      name: "คุณมิ้นท์",
      email: "mint@baanbrew.com",
      pinCode: "2222",
      roleId: cafeRoles["cafe-role-manager"].id,
    },
    {
      id: "cafe-barista-1",
      tenantId: cafe.id,
      branchId: cafeBranch.id,
      name: "แบงค์",
      email: "bank@baanbrew.com",
      pinCode: "3333",
      roleId: cafeRoles["cafe-role-barista"].id,
    },
    {
      id: "cafe-barista-2",
      tenantId: cafe.id,
      branchId: cafeBranch.id,
      name: "เฟิร์น",
      email: "fern@baanbrew.com",
      pinCode: "4444",
      roleId: cafeRoles["cafe-role-barista"].id,
    },
    {
      id: "cafe-kitchen",
      tenantId: cafe.id,
      branchId: cafeBranch.id,
      name: "ครัว Baan Brew",
      email: "kitchen@baanbrew.com",
      pinCode: "5555",
      roleId: cafeRoles["cafe-role-kitchen"].id,
    },
  ]) {
    const { id, ...data } = u;
    await prisma.user.upsert({ where: { id }, update: data, create: u });
  }

  // ── C6. CATEGORIES ──────────────────────────────────────
  console.log("📋  Creating cafe categories...");

  const [
    cafeCatEspresso,
    cafeCatNonCoffee,
    cafeCatBlended,
    cafeCatTea,
    cafeCatBakery,
    cafeCatAllDay,
  ] = await Promise.all(
    [
      { id: "cafe-cat-espresso", name: "กาแฟ Espresso", nameEn: "Espresso", sortOrder: 1 },
      { id: "cafe-cat-noncoffee", name: "เครื่องดื่มไม่มีกาแฟ", nameEn: "Non-Coffee", sortOrder: 2 },
      { id: "cafe-cat-blended", name: "ปั่น & Frappe", nameEn: "Blended", sortOrder: 3 },
      { id: "cafe-cat-tea", name: "ชา", nameEn: "Tea", sortOrder: 4 },
      { id: "cafe-cat-bakery", name: "เบเกอรี่", nameEn: "Bakery", sortOrder: 5 },
      { id: "cafe-cat-allday", name: "อาหาร All Day", nameEn: "All Day Brunch", sortOrder: 6 },
    ].map((c) =>
      prisma.category.upsert({
        where: { id: c.id },
        update: {},
        create: { ...c, tenantId: cafe.id, isActive: true },
      }),
    ),
  );

  // ── C7. MENU ITEMS ──────────────────────────────────────
  console.log("☕  Creating cafe menu items...");

  const cafeMenuData = [
    // Espresso
    { id: "cafe-mi-americano", name: "Americano", categoryId: cafeCatEspresso.id, price: 60, stockQty: null, tags: ["bestseller"] },
    { id: "cafe-mi-latte", name: "Caffè Latte", categoryId: cafeCatEspresso.id, price: 75, stockQty: null, tags: ["bestseller"] },
    { id: "cafe-mi-cappuccino", name: "Cappuccino", categoryId: cafeCatEspresso.id, price: 75, stockQty: null, tags: [] },
    { id: "cafe-mi-mocha", name: "Caffè Mocha", categoryId: cafeCatEspresso.id, price: 85, stockQty: null, tags: [] },
    { id: "cafe-mi-espresso", name: "Espresso", categoryId: cafeCatEspresso.id, price: 50, stockQty: null, tags: [] },
    { id: "cafe-mi-macchiato", name: "Caramel Macchiato", categoryId: cafeCatEspresso.id, price: 90, stockQty: null, tags: ["bestseller"] },
    { id: "cafe-mi-dirty", name: "Dirty Coffee", categoryId: cafeCatEspresso.id, price: 85, stockQty: null, tags: [] },
    { id: "cafe-mi-affogato", name: "Affogato", categoryId: cafeCatEspresso.id, price: 95, stockQty: null, tags: [] },
    // Non-Coffee
    { id: "cafe-mi-choc", name: "ช็อกโกแลตเย็น", categoryId: cafeCatNonCoffee.id, price: 80, stockQty: null, tags: [] },
    { id: "cafe-mi-matcha-latte", name: "Matcha Latte", categoryId: cafeCatNonCoffee.id, price: 85, stockQty: null, tags: ["bestseller"] },
    { id: "cafe-mi-hojicha", name: "Hojicha Latte", categoryId: cafeCatNonCoffee.id, price: 85, stockQty: null, tags: [] },
    { id: "cafe-mi-strawberry", name: "Strawberry Milk", categoryId: cafeCatNonCoffee.id, price: 80, stockQty: null, tags: [] },
    { id: "cafe-mi-milk", name: "นมสด", categoryId: cafeCatNonCoffee.id, price: 55, stockQty: null, tags: [] },
    // Blended
    { id: "cafe-mi-mocha-frappe", name: "Mocha Frappe", categoryId: cafeCatBlended.id, price: 95, stockQty: null, tags: [] },
    { id: "cafe-mi-matcha-frappe", name: "Matcha Frappe", categoryId: cafeCatBlended.id, price: 95, stockQty: null, tags: [] },
    { id: "cafe-mi-caramel-frappe", name: "Caramel Frappe", categoryId: cafeCatBlended.id, price: 95, stockQty: null, tags: [] },
    { id: "cafe-mi-oreo-frappe", name: "Oreo Frappe", categoryId: cafeCatBlended.id, price: 100, stockQty: null, tags: ["bestseller"] },
    // Tea
    { id: "cafe-mi-earlgrey", name: "Earl Grey", categoryId: cafeCatTea.id, price: 60, stockQty: null, tags: [] },
    { id: "cafe-mi-chamomile", name: "Chamomile", categoryId: cafeCatTea.id, price: 65, stockQty: null, tags: [] },
    { id: "cafe-mi-thaitea", name: "ชาไทย", categoryId: cafeCatTea.id, price: 65, stockQty: null, tags: ["bestseller"] },
    { id: "cafe-mi-peach-tea", name: "Peach Tea", categoryId: cafeCatTea.id, price: 70, stockQty: null, tags: [] },
    // Bakery
    { id: "cafe-mi-croissant", name: "Butter Croissant", categoryId: cafeCatBakery.id, price: 65, stockQty: 15, tags: ["bestseller"] },
    { id: "cafe-mi-almond-croi", name: "Almond Croissant", categoryId: cafeCatBakery.id, price: 85, stockQty: 10, tags: [] },
    { id: "cafe-mi-banana-cake", name: "Banana Cake", categoryId: cafeCatBakery.id, price: 75, stockQty: 8, tags: [] },
    { id: "cafe-mi-brownie", name: "Chocolate Brownie", categoryId: cafeCatBakery.id, price: 80, stockQty: 12, tags: [] },
    { id: "cafe-mi-cookie", name: "Cookie (ชิ้น)", categoryId: cafeCatBakery.id, price: 45, stockQty: 20, tags: [] },
    { id: "cafe-mi-cheesecake", name: "Basque Cheesecake", categoryId: cafeCatBakery.id, price: 120, stockQty: 6, tags: ["bestseller"] },
    // All Day Brunch
    { id: "cafe-mi-toast-egg", name: "Toast & Scrambled Egg", categoryId: cafeCatAllDay.id, price: 120, stockQty: null, tags: [] },
    { id: "cafe-mi-sandwich", name: "Club Sandwich", categoryId: cafeCatAllDay.id, price: 140, stockQty: null, tags: [] },
    { id: "cafe-mi-pasta", name: "Aglio Olio", categoryId: cafeCatAllDay.id, price: 150, stockQty: null, tags: [] },
    { id: "cafe-mi-granola", name: "Granola Bowl", categoryId: cafeCatAllDay.id, price: 130, stockQty: null, tags: [] },
  ];

  for (const m of cafeMenuData) {
    await prisma.menuItem.upsert({
      where: { id: m.id },
      update: { ...m, tenantId: cafe.id },
      create: { ...m, tenantId: cafe.id, isAvailable: true },
    });
  }

  // ── C8. MODIFIERS ───────────────────────────────────────
  console.log("⚙️   Creating cafe modifiers...");

  const cafeModData = [
    // Americano — ร้อน/เย็น + ขนาด + shot
    { id: "cafe-mod-amer-temp", menuItemId: "cafe-mi-americano", tenantId: cafe.id, name: "ร้อน/เย็น", type: SINGLE_SELECT, isRequired: true, sortOrder: 1,
      options: [{ name: "ร้อน", priceAdd: 0 }, { name: "เย็น", priceAdd: 10 }] },
    { id: "cafe-mod-amer-size", menuItemId: "cafe-mi-americano", tenantId: cafe.id, name: "ขนาด", type: SINGLE_SELECT, isRequired: false, sortOrder: 2,
      options: [{ name: "ปกติ", priceAdd: 0 }, { name: "L (16oz)", priceAdd: 20 }] },
    { id: "cafe-mod-amer-shot", menuItemId: "cafe-mi-americano", tenantId: cafe.id, name: "เพิ่ม Shot", type: SINGLE_SELECT, isRequired: false, sortOrder: 3,
      options: [{ name: "ไม่เพิ่ม", priceAdd: 0 }, { name: "+1 Shot", priceAdd: 20 }, { name: "+2 Shot", priceAdd: 40 }] },
    // Latte — ร้อน/เย็น + นม + ขนาด + ความหวาน
    { id: "cafe-mod-latte-temp", menuItemId: "cafe-mi-latte", tenantId: cafe.id, name: "ร้อน/เย็น", type: SINGLE_SELECT, isRequired: true, sortOrder: 1,
      options: [{ name: "ร้อน", priceAdd: 0 }, { name: "เย็น", priceAdd: 10 }] },
    { id: "cafe-mod-latte-milk", menuItemId: "cafe-mi-latte", tenantId: cafe.id, name: "นม", type: SINGLE_SELECT, isRequired: false, sortOrder: 2,
      options: [{ name: "นมสด", priceAdd: 0 }, { name: "Oat Milk", priceAdd: 20 }, { name: "Almond Milk", priceAdd: 20 }, { name: "Soy Milk", priceAdd: 15 }] },
    { id: "cafe-mod-latte-sweet", menuItemId: "cafe-mi-latte", tenantId: cafe.id, name: "ความหวาน", type: SINGLE_SELECT, isRequired: true, sortOrder: 3,
      options: [{ name: "ไม่หวาน", priceAdd: 0 }, { name: "หวานน้อย", priceAdd: 0 }, { name: "หวานปกติ", priceAdd: 0 }] },
    { id: "cafe-mod-latte-size", menuItemId: "cafe-mi-latte", tenantId: cafe.id, name: "ขนาด", type: SINGLE_SELECT, isRequired: false, sortOrder: 4,
      options: [{ name: "ปกติ", priceAdd: 0 }, { name: "L (16oz)", priceAdd: 20 }] },
    // Cappuccino
    { id: "cafe-mod-cappu-temp", menuItemId: "cafe-mi-cappuccino", tenantId: cafe.id, name: "ร้อน/เย็น", type: SINGLE_SELECT, isRequired: true, sortOrder: 1,
      options: [{ name: "ร้อน", priceAdd: 0 }, { name: "เย็น", priceAdd: 10 }] },
    { id: "cafe-mod-cappu-sweet", menuItemId: "cafe-mi-cappuccino", tenantId: cafe.id, name: "ความหวาน", type: SINGLE_SELECT, isRequired: true, sortOrder: 2,
      options: [{ name: "ไม่หวาน", priceAdd: 0 }, { name: "หวานน้อย", priceAdd: 0 }, { name: "หวานปกติ", priceAdd: 0 }] },
    // Mocha
    { id: "cafe-mod-mocha-temp", menuItemId: "cafe-mi-mocha", tenantId: cafe.id, name: "ร้อน/เย็น", type: SINGLE_SELECT, isRequired: true, sortOrder: 1,
      options: [{ name: "ร้อน", priceAdd: 0 }, { name: "เย็น", priceAdd: 10 }] },
    // Caramel Macchiato
    { id: "cafe-mod-macch-temp", menuItemId: "cafe-mi-macchiato", tenantId: cafe.id, name: "ร้อน/เย็น", type: SINGLE_SELECT, isRequired: true, sortOrder: 1,
      options: [{ name: "ร้อน", priceAdd: 0 }, { name: "เย็น", priceAdd: 10 }] },
    { id: "cafe-mod-macch-milk", menuItemId: "cafe-mi-macchiato", tenantId: cafe.id, name: "นม", type: SINGLE_SELECT, isRequired: false, sortOrder: 2,
      options: [{ name: "นมสด", priceAdd: 0 }, { name: "Oat Milk", priceAdd: 20 }] },
    // Matcha Latte
    { id: "cafe-mod-matcha-temp", menuItemId: "cafe-mi-matcha-latte", tenantId: cafe.id, name: "ร้อน/เย็น", type: SINGLE_SELECT, isRequired: true, sortOrder: 1,
      options: [{ name: "ร้อน", priceAdd: 0 }, { name: "เย็น", priceAdd: 10 }] },
    { id: "cafe-mod-matcha-sweet", menuItemId: "cafe-mi-matcha-latte", tenantId: cafe.id, name: "ความหวาน", type: SINGLE_SELECT, isRequired: true, sortOrder: 2,
      options: [{ name: "ไม่หวาน", priceAdd: 0 }, { name: "หวานน้อย", priceAdd: 0 }, { name: "หวานปกติ", priceAdd: 0 }] },
    // ชาไทย
    { id: "cafe-mod-thaitea-sweet", menuItemId: "cafe-mi-thaitea", tenantId: cafe.id, name: "ความหวาน", type: SINGLE_SELECT, isRequired: true, sortOrder: 1,
      options: [{ name: "หวานน้อย", priceAdd: 0 }, { name: "หวานปกติ", priceAdd: 0 }, { name: "หวานมาก", priceAdd: 0 }] },
    { id: "cafe-mod-thaitea-size", menuItemId: "cafe-mi-thaitea", tenantId: cafe.id, name: "ขนาด", type: SINGLE_SELECT, isRequired: false, sortOrder: 2,
      options: [{ name: "ปกติ", priceAdd: 0 }, { name: "L (16oz)", priceAdd: 15 }] },
    // Toast & Egg
    { id: "cafe-mod-toast-bread", menuItemId: "cafe-mi-toast-egg", tenantId: cafe.id, name: "ขนมปัง", type: SINGLE_SELECT, isRequired: false, sortOrder: 1,
      options: [{ name: "ขนมปังขาว", priceAdd: 0 }, { name: "ข้าวไรย์", priceAdd: 10 }, { name: "ซาวร์โดว์", priceAdd: 15 }] },
    { id: "cafe-mod-toast-egg", menuItemId: "cafe-mi-toast-egg", tenantId: cafe.id, name: "ไข่", type: SINGLE_SELECT, isRequired: false, sortOrder: 2,
      options: [{ name: "Scrambled", priceAdd: 0 }, { name: "Sunny Side Up", priceAdd: 0 }, { name: "Poached", priceAdd: 10 }] },
  ];

  for (const m of cafeModData) {
    await prisma.modifier.upsert({
      where: { id: m.id },
      update: {},
      create: m,
    });
  }

  // ── C9. TABLES ──────────────────────────────────────────
  console.log("🪑  Creating cafe tables...");

  const cafeTables = [
    { id: "cafe-tbl-1", name: "1", zone: "Indoor", capacity: 2, qrToken: "qr-brew-1" },
    { id: "cafe-tbl-2", name: "2", zone: "Indoor", capacity: 2, qrToken: "qr-brew-2" },
    { id: "cafe-tbl-3", name: "3", zone: "Indoor", capacity: 4, qrToken: "qr-brew-3" },
    { id: "cafe-tbl-4", name: "4", zone: "Indoor", capacity: 4, qrToken: "qr-brew-4" },
    { id: "cafe-tbl-5", name: "5", zone: "Bar", capacity: 1, qrToken: "qr-brew-5" },
    { id: "cafe-tbl-6", name: "6", zone: "Bar", capacity: 1, qrToken: "qr-brew-6" },
    { id: "cafe-tbl-7", name: "7", zone: "Bar", capacity: 1, qrToken: "qr-brew-7" },
    { id: "cafe-tbl-g1", name: "G1", zone: "สวน", capacity: 4, qrToken: "qr-brew-g1" },
    { id: "cafe-tbl-g2", name: "G2", zone: "สวน", capacity: 4, qrToken: "qr-brew-g2" },
  ];

  for (const t of cafeTables) {
    await prisma.table.upsert({
      where: { id: t.id },
      update: {},
      create: { ...t, branchId: cafeBranch.id, status: "AVAILABLE" },
    });
  }

  // ── C10. SAMPLE ORDERS ──────────────────────────────────
  console.log("🧾  Creating cafe sample orders...");

  // โต๊ะ 3 — กำลังเตรียม
  const cafeSession1 = await prisma.tableSession.upsert({
    where: { id: "cafe-sess-1" },
    update: {},
    create: { id: "cafe-sess-1", tableId: "cafe-tbl-3", status: "OPEN", guestCount: 2 },
  });

  await prisma.table.update({ where: { id: "cafe-tbl-3" }, data: { status: "OCCUPIED" } });

  await prisma.order.upsert({
    where: { id: "cafe-order-1" },
    update: {},
    create: {
      id: "cafe-order-1",
      branchId: cafeBranch.id,
      tableId: "cafe-tbl-3",
      sessionId: cafeSession1.id,
      cashierId: "cafe-barista-1",
      type: "DINE_IN",
      status: "PREPARING",
      subtotal: 310,
      total: 310,
      receiptToken: "cafe-receipt-1",
      createdAt: hoursAgo(0.15),
      items: {
        create: [
          { menuItemId: "cafe-mi-latte", name: "Caffè Latte", unitPrice: 85, qty: 1, modifiers: { "ร้อน/เย็น": "เย็น", นม: "Oat Milk", ความหวาน: "หวานน้อย" }, status: "PREPARING" },
          { menuItemId: "cafe-mi-macchiato", name: "Caramel Macchiato", unitPrice: 100, qty: 1, modifiers: { "ร้อน/เย็น": "เย็น" }, status: "PREPARING" },
          { menuItemId: "cafe-mi-croissant", name: "Butter Croissant", unitPrice: 65, qty: 2, modifiers: {}, status: "DONE" },
          { menuItemId: "cafe-mi-cheesecake", name: "Basque Cheesecake", unitPrice: 120, qty: 1, modifiers: {}, status: "DONE" },
        ],
      },
    },
  });

  // โต๊ะ G1 — PENDING (self-order)
  const cafeSession2 = await prisma.tableSession.upsert({
    where: { id: "cafe-sess-2" },
    update: {},
    create: { id: "cafe-sess-2", tableId: "cafe-tbl-g1", status: "OPEN", guestCount: 1 },
  });

  await prisma.table.update({ where: { id: "cafe-tbl-g1" }, data: { status: "OCCUPIED" } });

  await prisma.order.upsert({
    where: { id: "cafe-order-2" },
    update: {},
    create: {
      id: "cafe-order-2",
      branchId: cafeBranch.id,
      tableId: "cafe-tbl-g1",
      sessionId: cafeSession2.id,
      type: "SELF_ORDER",
      status: "PENDING",
      subtotal: 215,
      total: 215,
      receiptToken: "cafe-receipt-2",
      guestName: "คุณแอน",
      createdAt: hoursAgo(0.05),
      items: {
        create: [
          { menuItemId: "cafe-mi-matcha-latte", name: "Matcha Latte", unitPrice: 95, qty: 1, modifiers: { "ร้อน/เย็น": "เย็น", ความหวาน: "หวานน้อย" }, status: "PENDING" },
          { menuItemId: "cafe-mi-toast-egg", name: "Toast & Scrambled Egg", unitPrice: 120, qty: 1, modifiers: { ขนมปัง: "ซาวร์โดว์", ไข่: "Poached" }, status: "PENDING" },
        ],
      },
    },
  });

  // Completed order (วันนี้ เงินสด)
  await prisma.order.upsert({
    where: { id: "cafe-order-hist-1" },
    update: {},
    create: {
      id: "cafe-order-hist-1",
      branchId: cafeBranch.id,
      tableId: "cafe-tbl-1",
      cashierId: "cafe-barista-1",
      type: "DINE_IN",
      status: "COMPLETED",
      subtotal: 205,
      total: 205,
      receiptToken: "cafe-receipt-h1",
      createdAt: hoursAgo(2),
      completedAt: hoursAgo(1.5),
      items: {
        create: [
          { menuItemId: "cafe-mi-americano", name: "Americano", unitPrice: 70, qty: 1, modifiers: { "ร้อน/เย็น": "เย็น" }, status: "DONE" },
          { menuItemId: "cafe-mi-oreo-frappe", name: "Oreo Frappe", unitPrice: 100, qty: 1, modifiers: {}, status: "DONE" },
          { menuItemId: "cafe-mi-cookie", name: "Cookie (ชิ้น)", unitPrice: 45, qty: 1, modifiers: {}, status: "DONE" },
        ],
      },
      payments: {
        create: [{ method: "CASH", amount: 205, cashReceived: 300, changeAmt: 95, status: "CONFIRMED", confirmedAt: hoursAgo(1.5) }],
      },
    },
  });

  // ── C11. SHIFT ──────────────────────────────────────────
  await prisma.shift.upsert({
    where: { id: "cafe-shift-1" },
    update: {},
    create: {
      id: "cafe-shift-1",
      branchId: cafeBranch.id,
      userId: "cafe-barista-1",
      openCash: 1000,
      openedAt: hoursAgo(3),
    },
  });

  // ── C12. LOYALTY ACCOUNTS ────────────────────────────────
  for (const c of [
    { phone: "0891112233", name: "คุณจูน", tierId: cafeTierGold.id, points: 680, totalEarned: 900, totalSpend: 4500, visitCount: 22 },
    { phone: "0892223344", name: "คุณเปา", tierId: cafeTierRegular.id, points: 120, totalEarned: 120, totalSpend: 600, visitCount: 4 },
  ]) {
    await prisma.loyaltyAccount.upsert({
      where: { tenantId_phone: { tenantId: cafe.id, phone: c.phone } },
      update: {},
      create: { tenantId: cafe.id, phone: c.phone, name: c.name, tierId: c.tierId, points: c.points, totalEarned: c.totalEarned, totalSpend: c.totalSpend, visitCount: c.visitCount, lastVisitAt: daysAgo(randomBetween(0, 3)) },
    });
  }

  // ── C13. COUPON ─────────────────────────────────────────
  await prisma.coupon.upsert({
    where: { id: "cafe-coupon-free" },
    update: {},
    create: {
      id: "cafe-coupon-free",
      tenantId: cafe.id,
      code: "BREWFIRST",
      name: "แก้วแรกลด ฿20",
      type: "FIXED_DISCOUNT",
      targetType: "PUBLIC",
      value: 20,
      minOrderAmt: 60,
      isActive: true,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  // ── DONE ─────────────────────────────────────────────────
  console.log("\n✅  Seed เสร็จแล้ว!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌  Login credentials (POS / Backoffice)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  เจ้าของ  : owner@krua.com    PIN: 1234");
  console.log("  ผจก.สีลม : manager.s@krua.com PIN: 2345");
  console.log("  แคชเชียร์: napa@krua.com     PIN: 3456");
  console.log("  ครัว     : kitchen1@krua.com  PIN: 5678");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌  Self-order QR URLs (สาขาสีลม)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  โต๊ะ A1 : http://localhost:3001/qr-silom-a1");
  console.log("  โต๊ะ A3 : http://localhost:3001/qr-silom-a3  (ว่าง)");
  console.log("  โต๊ะ VIP: http://localhost:3001/qr-silom-v1");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌  Member login (self-order)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  เบอร์ : 0812345678  (Gold member, 2450 แต้ม)");
  console.log("  OTP   : 123456      (ใช้ได้ 1 ชั่วโมง)");
  console.log("  เบอร์ : 0823456789  (Silver, 820 แต้ม)");
  console.log("  เบอร์ : 0856789012  (ใหม่, 50 แต้ม — ใช้ WELCOME10 ได้)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌  Coupons");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  WELCOME10  - สมาชิกใหม่ลด 10% (max ฿50)");
  console.log("  FIRSTORDER - order แรกลด ฿30 (ขั้นต่ำ ฿150)");
  console.log("  GOLDMEMBER - Gold ลด 15% (max ฿100)");
  console.log("  KRUA50     - ทุกคนลด ฿50 (ขั้นต่ำ ฿200)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌  Active orders (KDS จะเห็นทันที)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  โต๊ะ A2: PREPARING (ต้มยำยังอยู่ในครัว)");
  console.log("  โต๊ะ B1: PENDING   (self-order รอส่งครัว)");
  console.log("  โต๊ะ C1: READY     (รอเสิร์ฟ)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌  Completed orders (สำหรับทดสอบ reports / shift)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  hist-1: เมื่อวาน ฿310 (CASH)  — มี voided item");
  console.log("  hist-2: เมื่อวาน ฿480 (PROMPTPAY)");
  console.log("  hist-3: วันนี้   ฿235 (CASH)");
  console.log("  hist-4: วันนี้   ฿370 (CASH)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌  Shifts");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  นภา (สีลม): เปิดกะอยู่ (เงินเปิด ฿2,000)");
  console.log("  เมื่อวาน  : ปิดแล้ว (expected ฿3,090 / นับ ฿3,100 / +฿10)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("  ☕  Baan Brew (ร้านกาแฟ) — Tenant 2");
  console.log("═══════════════════════════════════════════════════");
  console.log("📌  Login credentials");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  เจ้าของ  : beam@baanbrew.com  PIN: 1111");
  console.log("  ผจก.     : mint@baanbrew.com  PIN: 2222");
  console.log("  บาริสต้า : bank@baanbrew.com  PIN: 3333");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌  Branch: สาขาอารีย์ (branch-cafe-ari)");
  console.log("📌  Tables: 9 โต๊ะ (Indoor 4 / Bar 3 / สวน 2)");
  console.log("📌  Menu: 31 รายการ (Espresso, Non-Coffee, ปั่น, ชา, เบเกอรี่, All Day)");
  console.log("📌  Coupon: BREWFIRST — แก้วแรกลด ฿20 (ขั้นต่ำ ฿60)");
  console.log("📌  Active: โต๊ะ 3 PREPARING / โต๊ะ G1 PENDING (self-order)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
