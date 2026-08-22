import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding OmniOps database...');

  // ─── 0. Hash passwords for seeded demo users ───
  // Staff users share one password ('Staff123!') so demo logins are predictable.
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  console.log('  🔐 SUPER_ADMIN password hashed');
  const staffPasswordHash = await bcrypt.hash('Staff123!', 10);
  console.log('  🔐 Staff accounts password hashed (Staff123!)');

  // ─── 1. Create Demo Tenant (Brand) ───
  const tenant = await prisma.tenant.create({
    data: {
      id: 't-demo-brand',
      name: 'Demo Kitchen Co.',
      slug: 'demo-kitchen-co',
      legalName: 'Demo Kitchen Co. LLC',
      taxId: 'GSTIN29ABCDE1234F1Z5',
      email: 'hello@demokitchen.co',
      phone: '+1-555-0100',
      address: {
        line1: '123 Foodie Lane',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
        country: 'US',
      },
      logoUrl: 'https://cdn.omniops.io/logos/demo-kitchen-co.png',
      themeConfig: {
        primaryColor: '#E63946',
        secondaryColor: '#F4A261',
        fontFamily: 'Inter',
      },
      subscriptionTier: 'PROFESSIONAL',
      featureFlags: {
        pos: true,
        kds: true,
        staffManagement: true,
        maintenance: true,
        qualityCompliance: true,
        digitalSignage: false,
        customerSurveys: true,
      },
      status: 'ACTIVE',
    },
  });
  console.log(`  ✅ Tenant: ${tenant.name} (${tenant.slug})`);

  // ─── 2. Create Sites ───
  const restaurant = await prisma.site.create({
    data: {
      id: 's-demo-restaurant',
      tenantId: tenant.id,
      name: 'Demo Kitchen - Downtown',
      slug: 'downtown',
      siteType: 'RESTAURANT',
      cuisine: ['Italian', 'Mediterranean'],
      legalEntity: 'Demo Kitchen Co. LLC',
      taxNumber: 'TAX-DT-001',
      bankingDetails: {
        bankName: 'Chase',
        accountNumber: '****1234',
        routingNumber: '****5678',
      },
      address: {
        line1: '456 Market Street',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
        country: 'US',
      },
      timezone: 'America/Los_Angeles',
      phone: '+1-555-0200',
      email: 'downtown@demokitchen.co',
      siteConfig: {
        openingHours: {
          monday: { open: '09:00', close: '22:00' },
          tuesday: { open: '09:00', close: '22:00' },
          wednesday: { open: '09:00', close: '22:00' },
          thursday: { open: '09:00', close: '23:00' },
          friday: { open: '09:00', close: '00:00' },
          saturday: { open: '10:00', close: '00:00' },
          sunday: { open: '10:00', close: '21:00' },
        },
        capacity: 120,
        currency: 'USD',
      },
      status: 'LIVE',
      goLiveDate: new Date('2026-06-01'),
    },
  });
  console.log(`  ✅ Site: ${restaurant.name}`);

  const cloudKitchen = await prisma.site.create({
    data: {
      id: 's-demo-cloud',
      tenantId: tenant.id,
      name: 'Demo Kitchen - Cloud Hub',
      slug: 'cloud-hub',
      siteType: 'CLOUD_KITCHEN',
      cuisine: ['Burgers', 'Asian', 'Mexican'],
      legalEntity: 'Demo Kitchen Co. LLC',
      taxNumber: 'TAX-CK-002',
      bankingDetails: {
        bankName: 'Chase',
        accountNumber: '****5678',
        routingNumber: '****5678',
      },
      address: {
        line1: '789 Industrial Blvd',
        city: 'Oakland',
        state: 'CA',
        zip: '94607',
        country: 'US',
      },
      timezone: 'America/Los_Angeles',
      phone: '+1-555-0300',
      email: 'cloudhub@demokitchen.co',
      siteConfig: {
        openingHours: {
          monday: { open: '08:00', close: '02:00' },
          tuesday: { open: '08:00', close: '02:00' },
          wednesday: { open: '08:00', close: '02:00' },
          thursday: { open: '08:00', close: '02:00' },
          friday: { open: '08:00', close: '04:00' },
          saturday: { open: '08:00', close: '04:00' },
          sunday: { open: '08:00', close: '00:00' },
        },
        capacity: 0,
        currency: 'USD',
        isDeliveryOnly: true,
      },
      status: 'LIVE',
      goLiveDate: new Date('2026-07-01'),
    },
  });
  console.log(`  ✅ Site: ${cloudKitchen.name}`);

  // ─── 3. Create Users ───
  const superAdmin = await prisma.user.create({
    data: {
      id: 'u-super-admin',
      email: 'admin@omniops.dev',
      phone: '+1-555-0001',
      passwordHash: adminPasswordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'SUPER_ADMIN',
      permissions: { all: true },
      status: 'ACTIVE',
      lastLoginAt: new Date(),
    },
  });
  console.log(`  ✅ User: ${superAdmin.firstName} ${superAdmin.lastName} (SUPER_ADMIN)`);

  const siteLead1 = await prisma.user.create({
    data: {
      id: 'u-site-lead-dt',
      tenantId: tenant.id,
      email: 'maria@demokitchen.co',
      phone: '+1-555-1001',
      passwordHash: staffPasswordHash,
      firstName: 'Maria',
      lastName: 'Rodriguez',
      role: 'SITE_LEAD',
      siteId: restaurant.id,
      status: 'ACTIVE',
      lastLoginAt: new Date(),
    },
  });
  console.log(`  ✅ User: ${siteLead1.firstName} ${siteLead1.lastName} (SITE_LEAD - Downtown)`);

  const siteLead2 = await prisma.user.create({
    data: {
      id: 'u-site-lead-ck',
      tenantId: tenant.id,
      email: 'james@demokitchen.co',
      phone: '+1-555-1002',
      passwordHash: staffPasswordHash,
      firstName: 'James',
      lastName: 'Chen',
      role: 'SITE_LEAD',
      siteId: cloudKitchen.id,
      status: 'ACTIVE',
      lastLoginAt: new Date(),
    },
  });
  console.log(`  ✅ User: ${siteLead2.firstName} ${siteLead2.lastName} (SITE_LEAD - Cloud Hub)`);

  const kitchenStaff1 = await prisma.user.create({
    data: {
      id: 'u-kitchen-dt-1',
      tenantId: tenant.id,
      email: 'carlos@demokitchen.co',
      passwordHash: staffPasswordHash,
      firstName: 'Carlos',
      lastName: 'Garcia',
      role: 'KITCHEN_STAFF',
      siteId: restaurant.id,
      status: 'ACTIVE',
    },
  });
  console.log(`  ✅ User: ${kitchenStaff1.firstName} ${kitchenStaff1.lastName} (KITCHEN_STAFF)`);

  const kitchenStaff2 = await prisma.user.create({
    data: {
      id: 'u-kitchen-ck-1',
      tenantId: tenant.id,
      email: 'aisha@demokitchen.co',
      passwordHash: staffPasswordHash,
      firstName: 'Aisha',
      lastName: 'Patel',
      role: 'KITCHEN_STAFF',
      siteId: cloudKitchen.id,
      status: 'ACTIVE',
    },
  });
  console.log(`  ✅ User: ${kitchenStaff2.firstName} ${kitchenStaff2.lastName} (KITCHEN_STAFF)`);

  const brandManager = await prisma.user.create({
    data: {
      id: 'u-brand-mgr',
      tenantId: tenant.id,
      email: 'brand@demokitchen.co',
      phone: '+1-555-1005',
      passwordHash: staffPasswordHash,
      firstName: 'Dana',
      lastName: 'Lee',
      role: 'BRAND_MANAGER',
      status: 'ACTIVE',
      lastLoginAt: new Date(),
    },
  });
  console.log(`  ✅ User: ${brandManager.firstName} ${brandManager.lastName} (BRAND_MANAGER)`);

  // ─── 4. Create Sample Menu ───
  const menu = await prisma.menu.create({
    data: {
      id: 'm-main-menu',
      tenantId: tenant.id,
      name: 'Main Menu',
      description: 'Core dine-in and takeaway menu for all locations',
      menuType: 'DINE_IN',
      isActive: true,
      availabilitySchedule: {
        monday: [{ start: '09:00', end: '22:00' }],
        tuesday: [{ start: '09:00', end: '22:00' }],
        wednesday: [{ start: '09:00', end: '22:00' }],
        thursday: [{ start: '09:00', end: '23:00' }],
        friday: [{ start: '09:00', end: '00:00' }],
        saturday: [{ start: '10:00', end: '00:00' }],
        sunday: [{ start: '10:00', end: '21:00' }],
      },
    },
  });
  console.log(`  ✅ Menu: ${menu.name}`);

  // Assign menu to both sites
  await prisma.siteMenu.createMany({
    data: [
      { siteId: restaurant.id, menuId: menu.id },
      { siteId: cloudKitchen.id, menuId: menu.id },
    ],
  });
  console.log('  ✅ Menu assigned to both sites');

  // Categories
  const appetizers = await prisma.menuCategory.create({
    data: {
      id: 'cat-appetizers',
      menuId: menu.id,
      name: 'Appetizers',
      description: 'Starters and small plates',
      sortOrder: 1,
    },
  });

  const mains = await prisma.menuCategory.create({
    data: {
      id: 'cat-mains',
      menuId: menu.id,
      name: 'Main Course',
      description: 'Signature entrees',
      sortOrder: 2,
    },
  });

  const beverages = await prisma.menuCategory.create({
    data: {
      id: 'cat-beverages',
      menuId: menu.id,
      name: 'Beverages',
      description: 'Drinks and refreshments',
      sortOrder: 3,
    },
  });
  console.log('  ✅ Menu Categories: Appetizers, Main Course, Beverages');

  // Menu Items — 8 items
  const bruschetta = await prisma.menuItem.create({
    data: {
      id: 'mi-bruschetta',
      categoryId: appetizers.id,
      menuId: menu.id,
      name: 'Classic Bruschetta',
      description: 'Toasted ciabatta with fresh tomatoes, basil, and balsamic glaze',
      shortCode: 'BRUSCH',
      price: 9.50,
      costPrice: 3.20,
      taxRate: 8.5,
      prepTimeMinutes: 7,
      station: 'COLD',
      dietaryTags: ['VEG', 'VEGAN'],
      allergens: ['GLUTEN'],
      status: 'AVAILABLE',
      sortOrder: 1,
    },
  });

  const calamari = await prisma.menuItem.create({
    data: {
      id: 'mi-calamari',
      categoryId: appetizers.id,
      menuId: menu.id,
      name: 'Crispy Calamari',
      description: 'Golden fried squid with lemon aioli and marinara',
      shortCode: 'CALAM',
      price: 12.00,
      costPrice: 4.50,
      taxRate: 8.5,
      prepTimeMinutes: 8,
      station: 'FRY',
      dietaryTags: ['NON_VEG'],
      allergens: ['GLUTEN', 'SHELLFISH'],
      status: 'AVAILABLE',
      sortOrder: 2,
    },
  });

  const caesar = await prisma.menuItem.create({
    data: {
      id: 'mi-caesar',
      categoryId: appetizers.id,
      menuId: menu.id,
      name: 'Caesar Salad',
      description: 'Romaine, parmesan, croutons, house-made dressing',
      shortCode: 'CAESAR',
      price: 11.00,
      costPrice: 3.80,
      taxRate: 8.5,
      prepTimeMinutes: 5,
      station: 'COLD',
      dietaryTags: ['VEG'],
      allergens: ['GLUTEN', 'DAIRY'],
      status: 'AVAILABLE',
      sortOrder: 3,
    },
  });

  const steak = await prisma.menuItem.create({
    data: {
      id: 'mi-steak',
      categoryId: mains.id,
      menuId: menu.id,
      name: 'Grilled Ribeye Steak',
      description: '12oz prime ribeye with truffle mashed potatoes and seasonal vegetables',
      shortCode: 'STEAK',
      price: 34.00,
      costPrice: 14.50,
      taxRate: 8.5,
      prepTimeMinutes: 20,
      station: 'GRILL',
      dietaryTags: ['NON_VEG'],
      allergens: ['DAIRY'],
      status: 'AVAILABLE',
      sortOrder: 1,
    },
  });

  const salmon = await prisma.menuItem.create({
    data: {
      id: 'mi-salmon',
      categoryId: mains.id,
      menuId: menu.id,
      name: 'Pan-Seared Salmon',
      description: 'Atlantic salmon with dill cream sauce, wild rice, and asparagus',
      shortCode: 'SALMON',
      price: 28.00,
      costPrice: 11.00,
      taxRate: 8.5,
      prepTimeMinutes: 18,
      station: 'GRILL',
      dietaryTags: ['NON_VEG', 'GLUTEN_FREE'],
      allergens: ['FISH', 'DAIRY'],
      status: 'AVAILABLE',
      sortOrder: 2,
    },
  });

  const pasta = await prisma.menuItem.create({
    data: {
      id: 'mi-pasta',
      categoryId: mains.id,
      menuId: menu.id,
      name: 'Truffle Mushroom Pasta',
      description: 'Handmade fettuccine with wild mushrooms, truffle oil, and parmesan',
      shortCode: 'PASTA',
      price: 22.00,
      costPrice: 7.50,
      taxRate: 8.5,
      prepTimeMinutes: 15,
      station: 'GRILL',
      dietaryTags: ['VEG'],
      allergens: ['GLUTEN', 'DAIRY'],
      status: 'AVAILABLE',
      sortOrder: 3,
    },
  });

  const lemonade = await prisma.menuItem.create({
    data: {
      id: 'mi-lemonade',
      categoryId: beverages.id,
      menuId: menu.id,
      name: 'Fresh Lemonade',
      description: 'House-squeezed lemonade with a hint of mint',
      shortCode: 'LEM',
      price: 5.00,
      costPrice: 1.00,
      taxRate: 8.5,
      prepTimeMinutes: 2,
      station: 'DRINKS',
      dietaryTags: ['VEG', 'VEGAN', 'GLUTEN_FREE'],
      allergens: [],
      status: 'AVAILABLE',
      sortOrder: 1,
    },
  });

  const espresso = await prisma.menuItem.create({
    data: {
      id: 'mi-espresso',
      categoryId: beverages.id,
      menuId: menu.id,
      name: 'Double Espresso',
      description: 'Double shot of our signature dark roast',
      shortCode: 'ESPR',
      price: 4.00,
      costPrice: 0.80,
      taxRate: 8.5,
      prepTimeMinutes: 2,
      station: 'DRINKS',
      dietaryTags: ['VEG', 'VEGAN', 'GLUTEN_FREE'],
      allergens: [],
      status: 'AVAILABLE',
      sortOrder: 2,
    },
  });
  console.log(
    `  ✅ Menu Items: Bruschetta, Calamari, Caesar Salad, Ribeye Steak, Salmon, Pasta, Lemonade, Espresso`,
  );

  // Add modifier groups to the steak (size options)
  const steakSizeGroup = await prisma.menuItemModifierGroup.create({
    data: {
      id: 'mg-steak-size',
      menuItemId: steak.id,
      name: 'Steak Temperature',
      minSelect: 1,
      maxSelect: 1,
      required: true,
      sortOrder: 1,
    },
  });

  await prisma.menuItemModifier.createMany({
    data: [
      {
        modifierGroupId: steakSizeGroup.id,
        name: 'Rare',
        priceAdjustment: 0,
        isDefault: false,
        sortOrder: 1,
      },
      {
        modifierGroupId: steakSizeGroup.id,
        name: 'Medium Rare',
        priceAdjustment: 0,
        isDefault: true,
        sortOrder: 2,
      },
      {
        modifierGroupId: steakSizeGroup.id,
        name: 'Medium',
        priceAdjustment: 0,
        isDefault: false,
        sortOrder: 3,
      },
      {
        modifierGroupId: steakSizeGroup.id,
        name: 'Medium Well',
        priceAdjustment: 0,
        isDefault: false,
        sortOrder: 4,
      },
      {
        modifierGroupId: steakSizeGroup.id,
        name: 'Well Done',
        priceAdjustment: 0,
        isDefault: false,
        sortOrder: 5,
      },
    ],
  });

  const steakAddons = await prisma.menuItemModifierGroup.create({
    data: {
      id: 'mg-steak-addons',
      menuItemId: steak.id,
      name: 'Add-ons',
      minSelect: 0,
      maxSelect: 3,
      required: false,
      sortOrder: 2,
    },
  });

  await prisma.menuItemModifier.createMany({
    data: [
      {
        modifierGroupId: steakAddons.id,
        name: 'Grilled Shrimp',
        priceAdjustment: 8.00,
        sortOrder: 1,
      },
      {
        modifierGroupId: steakAddons.id,
        name: 'Sautéed Mushrooms',
        priceAdjustment: 4.00,
        sortOrder: 2,
      },
      {
        modifierGroupId: steakAddons.id,
        name: 'Blue Cheese Crust',
        priceAdjustment: 3.00,
        sortOrder: 3,
      },
    ],
  });
  console.log('  ✅ Modifier Groups: Steak Temperature, Add-ons');

  // ─── 5. Create Floor Plan for the Restaurant ───
  const floorPlan = await prisma.floorPlan.create({
    data: {
      id: 'fp-main-floor',
      siteId: restaurant.id,
      name: 'Main Dining Floor',
      description: 'Primary dining area with bar seating',
      isActive: true,
      layout: {
        gridWidth: 800,
        gridHeight: 600,
        sections: [
          { name: 'Main', color: '#4CAF50' },
          { name: 'Patio', color: '#2196F3' },
          { name: 'Bar', color: '#FF9800' },
        ],
      },
    },
  });
  console.log(`  ✅ Floor Plan: ${floorPlan.name}`);

  // 6 tables
  const tablesData = [
    { id: 'tbl-a1', number: 'A1', section: 'Main', capacity: 4, position: { x: 50, y: 80, width: 120, height: 100 } },
    { id: 'tbl-a2', number: 'A2', section: 'Main', capacity: 2, position: { x: 200, y: 80, width: 100, height: 100 } },
    { id: 'tbl-a3', number: 'A3', section: 'Main', capacity: 6, position: { x: 350, y: 80, width: 140, height: 100 } },
    { id: 'tbl-pat1', number: 'Patio-1', section: 'Patio', capacity: 4, position: { x: 550, y: 80, width: 120, height: 100 } },
    { id: 'tbl-pat2', number: 'Patio-2', section: 'Patio', capacity: 4, position: { x: 700, y: 80, width: 120, height: 100 } },
    { id: 'tbl-bar1', number: 'Bar-1', section: 'Bar', capacity: 2, position: { x: 50, y: 350, width: 80, height: 80 } },
  ];

  for (const t of tablesData) {
    await prisma.table.create({
      data: {
        id: t.id,
        floorPlanId: floorPlan.id,
        siteId: restaurant.id,
        number: t.number,
        section: t.section,
        capacity: t.capacity,
        status: 'AVAILABLE',
        position: t.position,
      },
    });
  }
  console.log(`  ✅ Tables: ${tablesData.map((t) => t.number).join(', ')}`);

  // ─── 6. Revenue Assurance Demo Data (orders + payments) ───
  // Demo orders with deliberate revenue-leak patterns so the Revenue Assurance
  // dashboard has real anomalies to surface: missing payment, heavy discount,
  // void/refund spike (3 voids same day), payment mismatch, no-sale, comped order.
  const daysAgo = (days: number, hour = 12, minute = 30) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(hour, minute, 0, 0);
    return d;
  };
  const TAX = 0.085;

  interface DemoItem {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }
  interface DemoOrder {
    id: string;
    siteId: string;
    orderNumber: number;
    status: string;
    daysAgo: number;
    items: DemoItem[];
    discount?: { type: string; value: number; reason?: string };
    payment?: { method: string; status: string; amount: number; gatewayTransactionId?: string; refundReason?: string };
    notes?: string;
  }

  const demoOrders: DemoOrder[] = [
    // ── Clean orders (no anomalies) ──
    {
      id: 'ord-clean-1', siteId: 's-demo-restaurant', orderNumber: 1001, status: 'COMPLETED', daysAgo: 3,
      items: [
        { menuItemId: 'mi-steak', name: 'Ribeye Steak', quantity: 1, unitPrice: 34 },
        { menuItemId: 'mi-pasta', name: 'Truffle Pasta', quantity: 1, unitPrice: 22 },
      ],
      payment: { method: 'CARD', status: 'CAPTURED', amount: 60.76, gatewayTransactionId: 'gtx-1001' },
    },
    {
      id: 'ord-clean-2', siteId: 's-demo-restaurant', orderNumber: 1002, status: 'COMPLETED', daysAgo: 2,
      items: [
        { menuItemId: 'mi-salmon', name: 'Herb Salmon', quantity: 1, unitPrice: 28 },
        { menuItemId: 'mi-caesar', name: 'Caesar Salad', quantity: 1, unitPrice: 11 },
      ],
      payment: { method: 'CARD', status: 'CAPTURED', amount: 42.32, gatewayTransactionId: 'gtx-1002' },
    },
    {
      id: 'ord-clean-3', siteId: 's-demo-restaurant', orderNumber: 1003, status: 'COMPLETED', daysAgo: 0,
      items: [
        { menuItemId: 'mi-bruschetta', name: 'Classic Bruschetta', quantity: 1, unitPrice: 9.5 },
        { menuItemId: 'mi-calamari', name: 'Crispy Calamari', quantity: 1, unitPrice: 12 },
        { menuItemId: 'mi-lemonade', name: 'Fresh Lemonade', quantity: 1, unitPrice: 5 },
      ],
      payment: { method: 'CASH', status: 'CAPTURED', amount: 28.75 },
    },
    {
      id: 'ord-clean-4', siteId: 's-demo-cloud', orderNumber: 2001, status: 'COMPLETED', daysAgo: 4,
      items: [
        { menuItemId: 'mi-pasta', name: 'Truffle Pasta', quantity: 2, unitPrice: 22 },
        { menuItemId: 'mi-espresso', name: 'Double Espresso', quantity: 1, unitPrice: 4 },
      ],
      payment: { method: 'CARD', status: 'CAPTURED', amount: 52.08, gatewayTransactionId: 'gtx-2001' },
    },
    {
      id: 'ord-clean-5', siteId: 's-demo-cloud', orderNumber: 2002, status: 'COMPLETED', daysAgo: 3,
      items: [
        { menuItemId: 'mi-steak', name: 'Ribeye Steak', quantity: 1, unitPrice: 34 },
        { menuItemId: 'mi-lemonade', name: 'Fresh Lemonade', quantity: 1, unitPrice: 5 },
      ],
      payment: { method: 'DIGITAL_WALLET', status: 'CAPTURED', amount: 42.32, gatewayTransactionId: 'gtx-2002' },
    },
    {
      id: 'ord-clean-6', siteId: 's-demo-cloud', orderNumber: 2003, status: 'COMPLETED', daysAgo: 3,
      items: [
        { menuItemId: 'mi-calamari', name: 'Crispy Calamari', quantity: 1, unitPrice: 12 },
        { menuItemId: 'mi-caesar', name: 'Caesar Salad', quantity: 1, unitPrice: 11 },
        { menuItemId: 'mi-bruschetta', name: 'Classic Bruschetta', quantity: 1, unitPrice: 9.5 },
      ],
      payment: { method: 'CARD', status: 'CAPTURED', amount: 35.26, gatewayTransactionId: 'gtx-2003' },
    },
    // ── Anomaly orders ──
    // 1) COMPLETED order with NO payment record → MISSING_PAYMENT (HIGH: > $100)
    {
      id: 'ord-missing-payment', siteId: 's-demo-restaurant', orderNumber: 1004, status: 'COMPLETED', daysAgo: 2,
      items: [
        { menuItemId: 'mi-steak', name: 'Ribeye Steak', quantity: 2, unitPrice: 34 },
        { menuItemId: 'mi-salmon', name: 'Herb Salmon', quantity: 1, unitPrice: 28 },
        { menuItemId: 'mi-pasta', name: 'Truffle Pasta', quantity: 1, unitPrice: 22 },
      ],
      notes: 'Waiter closed tab without processing payment',
    },
    // 2) 55% discount on a $100 subtotal → DISCOUNT_OUTLIER (HIGH: > 50%)
    {
      id: 'ord-heavy-discount', siteId: 's-demo-restaurant', orderNumber: 1005, status: 'COMPLETED', daysAgo: 1,
      items: [
        { menuItemId: 'mi-steak', name: 'Ribeye Steak', quantity: 1, unitPrice: 34 },
        { menuItemId: 'mi-salmon', name: 'Herb Salmon', quantity: 1, unitPrice: 28 },
        { menuItemId: 'mi-pasta', name: 'Truffle Pasta', quantity: 1, unitPrice: 22 },
        { menuItemId: 'mi-caesar', name: 'Caesar Salad', quantity: 1, unitPrice: 11 },
        { menuItemId: 'mi-lemonade', name: 'Fresh Lemonade', quantity: 1, unitPrice: 5 },
      ],
      discount: { type: 'PERCENTAGE', value: 55, reason: 'Friends & family' },
      payment: { method: 'CARD', status: 'CAPTURED', amount: 48.83, gatewayTransactionId: 'gtx-1005' },
    },
    // 3a-c) 3 voided/refunded orders on the SAME day at cloud hub → VOID_REFUND_SPIKE (HIGH)
    {
      id: 'ord-void-1', siteId: 's-demo-cloud', orderNumber: 2004, status: 'CANCELLED', daysAgo: 3,
      items: [
        { menuItemId: 'mi-steak', name: 'Ribeye Steak', quantity: 1, unitPrice: 34 },
        { menuItemId: 'mi-calamari', name: 'Crispy Calamari', quantity: 1, unitPrice: 12 },
        { menuItemId: 'mi-lemonade', name: 'Fresh Lemonade', quantity: 1, unitPrice: 5 },
      ],
      payment: { method: 'CARD', status: 'VOIDED', amount: 55.34, gatewayTransactionId: 'gtx-2004' },
      notes: 'Customer walked out',
    },
    {
      id: 'ord-void-2', siteId: 's-demo-cloud', orderNumber: 2005, status: 'REFUNDED', daysAgo: 3,
      items: [
        { menuItemId: 'mi-pasta', name: 'Truffle Pasta', quantity: 1, unitPrice: 22 },
        { menuItemId: 'mi-salmon', name: 'Herb Salmon', quantity: 1, unitPrice: 28 },
      ],
      payment: { method: 'CARD', status: 'REFUNDED', amount: 54.25, gatewayTransactionId: 'gtx-2005', refundReason: 'Customer changed mind' },
      notes: 'Full refund after delivery dispute',
    },
    {
      id: 'ord-void-3', siteId: 's-demo-cloud', orderNumber: 2006, status: 'CANCELLED', daysAgo: 3,
      items: [
        { menuItemId: 'mi-steak', name: 'Ribeye Steak', quantity: 4, unitPrice: 34 },
        { menuItemId: 'mi-salmon', name: 'Herb Salmon', quantity: 3, unitPrice: 28 },
      ],
      payment: { method: 'CARD', status: 'VOIDED', amount: 238.7, gatewayTransactionId: 'gtx-2006' },
      notes: 'Large order voided at closing time',
    },
    // 4) Paid $61.19 but grand total is $66.19 → PAYMENT_MISMATCH (MEDIUM: diff $5 < 10%)
    {
      id: 'ord-payment-mismatch', siteId: 's-demo-cloud', orderNumber: 2007, status: 'COMPLETED', daysAgo: 4,
      items: [
        { menuItemId: 'mi-steak', name: 'Ribeye Steak', quantity: 1, unitPrice: 34 },
        { menuItemId: 'mi-pasta', name: 'Truffle Pasta', quantity: 1, unitPrice: 22 },
        { menuItemId: 'mi-lemonade', name: 'Fresh Lemonade', quantity: 1, unitPrice: 5 },
      ],
      payment: { method: 'CARD', status: 'CAPTURED', amount: 61.19, gatewayTransactionId: 'gtx-2007' },
      notes: 'Partial capture by terminal',
    },
    // 5) Zero-value COMPLETED order with no items → NO_SALE (LOW)
    {
      id: 'ord-no-sale', siteId: 's-demo-restaurant', orderNumber: 1006, status: 'COMPLETED', daysAgo: 2,
      items: [],
      notes: 'Test order opened and closed without items',
    },
    // 6) Fully comped order (discount = subtotal) → DISCOUNT_OUTLIER (HIGH: discount-only)
    {
      id: 'ord-discount-only', siteId: 's-demo-cloud', orderNumber: 2008, status: 'COMPLETED', daysAgo: 2,
      items: [
        { menuItemId: 'mi-caesar', name: 'Caesar Salad', quantity: 1, unitPrice: 11 },
        { menuItemId: 'mi-lemonade', name: 'Fresh Lemonade', quantity: 1, unitPrice: 5 },
      ],
      discount: { type: 'COMP', value: 16, reason: 'Quality complaint comp' },
      notes: 'Fully comped order',
    },
  ];

  for (const o of demoOrders) {
    const subTotal = o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const discountTotal = o.discount ? o.discount.value : 0;
    const taxTotal = subTotal > 0 ? Math.round((subTotal - discountTotal) * TAX * 100) / 100 : 0;
    const grandTotal = Math.max(0, Math.round((subTotal - discountTotal + taxTotal) * 100) / 100);
    const createdAt = daysAgo(o.daysAgo, 10 + (o.orderNumber % 10), 15);
    const created = await prisma.order.create({
      data: {
        id: o.id,
        tenantId: tenant.id,
        siteId: o.siteId,
        userId: o.siteId === 's-demo-restaurant' ? siteLead1.id : siteLead2.id,
        orderNumber: o.orderNumber,
        orderType: o.siteId === 's-demo-cloud' ? 'DELIVERY' : 'DINE_IN',
        channel: 'POS',
        status: o.status as never,
        subTotal,
        taxTotal,
        discountTotal,
        grandTotal,
        notes: o.notes,
        createdAt,
        updatedAt: createdAt,
      },
    });
    for (const item of o.items) {
      await prisma.orderItem.create({
        data: {
          orderId: o.id,
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: Math.round(item.unitPrice * item.quantity * 100) / 100,
          taxRate: 8.5,
          station: 'EXPO',
          status: o.status === 'CANCELLED' || o.status === 'REFUNDED' ? 'CANCELLED' : 'SERVED',
          createdAt,
        },
      });
    }
    if (o.discount) {
      await prisma.discount.create({
        data: {
          orderId: o.id,
          type: o.discount.type as never,
          value: o.discount.value,
          reason: o.discount.reason,
          approvedBy: o.siteId === 's-demo-restaurant' ? siteLead1.id : siteLead2.id,
          createdAt,
        },
      });
    }
    if (o.payment) {
      await prisma.payment.create({
        data: {
          id: `pay-${o.id}`,
          orderId: o.id,
          amount: o.payment.amount,
          method: o.payment.method as never,
          status: o.payment.status as never,
          gatewayTransactionId: o.payment.gatewayTransactionId,
          refundReason: o.payment.refundReason,
          refundApprovedBy: o.payment.status === 'REFUNDED' ? siteLead2.id : undefined,
          createdAt,
        },
      });
    }
  }
  console.log(`  ✅ Revenue Assurance demo: ${demoOrders.length} orders (${demoOrders.length - 8} clean, 8 with anomalies)`);

  // ══════════════════════════════════════════════════════════════════
  // 7. VISHAL MULTICUISINE — second demo tenant (11-branch Indian chain)
  // Pitch tenant: 11 Tier-1 cities, 4-station KDS (one per menu category),
  // central + site roles, quality templates + completed HACCP audit with CAPA,
  // and revenue-assurance anomalies mirroring the Demo Kitchen Co. patterns.
  // ══════════════════════════════════════════════════════════════════

  // ─── 7.1 Vishal tenant ───
  const vmTenant = await prisma.tenant.create({
    data: {
      id: 't-vishal-mc',
      name: 'Vishal Multicuisine',
      slug: 'vishal-multicusine',
      legalName: 'Vishal Multicuisine Restaurants Pvt. Ltd.',
      taxId: 'GSTIN27AAFCV1234F1Z9',
      email: 'hello@vishalmc.in',
      phone: '+91-22-5550-0100',
      address: {
        line1: 'Level 6, Trade World, Kamala Mills',
        city: 'Mumbai',
        state: 'MH',
        zip: '400013',
        country: 'IN',
      },
      logoUrl: 'https://cdn.omniops.io/logos/vishal-multicusine.png',
      themeConfig: {
        primaryColor: '#D4A017',
        secondaryColor: '#8B0000',
        fontFamily: 'Inter',
      },
      subscriptionTier: 'PROFESSIONAL',
      featureFlags: {
        pos: true,
        kds: true,
        staffManagement: true,
        maintenance: true,
        qualityCompliance: true,
        digitalSignage: true,
        customerSurveys: true,
      },
      status: 'ACTIVE',
    },
  });
  console.log(`  ✅ Tenant: ${vmTenant.name} (${vmTenant.slug})`);

  // ─── 7.2 Vishal sites (11 branches, one per Tier-1 city) ───
  const vmCities = [
    { city: 'Mumbai', slug: 'mumbai', state: 'MH', zip: '400050', line1: '14 Linking Road, Bandra West', phone: '+91-22-5550-0101' },
    { city: 'Delhi NCR', slug: 'delhi', state: 'DL', zip: '110001', line1: 'C-21 Connaught Place', phone: '+91-11-5550-0102' },
    { city: 'Bengaluru', slug: 'bengaluru', state: 'KA', zip: '560001', line1: '72 MG Road, Ashok Nagar', phone: '+91-80-5550-0103' },
    { city: 'Hyderabad', slug: 'hyderabad', state: 'TS', zip: '500033', line1: '8-2-293 Jubilee Hills, Road No 36', phone: '+91-40-5550-0104' },
    { city: 'Chennai', slug: 'chennai', state: 'TN', zip: '600018', line1: '27 Anna Salai, Teynampet', phone: '+91-44-5550-0105' },
    { city: 'Kolkata', slug: 'kolkata', state: 'WB', zip: '700016', line1: '18 Park Street', phone: '+91-33-5550-0106' },
    { city: 'Pune', slug: 'pune', state: 'MH', zip: '411005', line1: '96 FC Road, Shivajinagar', phone: '+91-20-5550-0107' },
    { city: 'Ahmedabad', slug: 'ahmedabad', state: 'GJ', zip: '380009', line1: '4 CG Road, Navrangpura', phone: '+91-79-5550-0108' },
    { city: 'Jaipur', slug: 'jaipur', state: 'RJ', zip: '302001', line1: '31 MI Road', phone: '+91-141-5550-0109' },
    { city: 'Surat', slug: 'surat', state: 'GJ', zip: '395009', line1: '11 Ring Road, Adajan', phone: '+91-261-5550-0110' },
    { city: 'Lucknow', slug: 'lucknow', state: 'UP', zip: '226001', line1: '9 Hazratganj, Mahatma Gandhi Marg', phone: '+91-522-5550-0111' },
  ] as const;

  const vmSites = new Map<string, { id: string; name: string }>();
  for (const c of vmCities) {
    const site = await prisma.site.create({
      data: {
        id: `s-vm-${c.slug}`,
        tenantId: vmTenant.id,
        name: `Vishal Multicuisine – ${c.city}`,
        slug: c.slug,
        siteType: 'RESTAURANT',
        cuisine: ['South Indian', 'North Indian', 'Desserts', 'Beverages'],
        legalEntity: 'Vishal Multicuisine Restaurants Pvt. Ltd.',
        taxNumber: `GST-${c.state.toUpperCase()}-VM-${c.zip}`,
        bankingDetails: {
          bankName: 'HDFC Bank',
          accountNumber: `****${c.zip.slice(-4)}`,
          ifsc: 'HDFC0000XXX',
        },
        address: {
          line1: c.line1,
          city: c.city,
          state: c.state,
          zip: c.zip,
          country: 'IN',
        },
        timezone: 'Asia/Kolkata',
        phone: c.phone,
        email: `${c.slug}@vishalmc.in`,
        siteConfig: {
          openingHours: {
            monday: { open: '11:00', close: '23:00' },
            tuesday: { open: '11:00', close: '23:00' },
            wednesday: { open: '11:00', close: '23:00' },
            thursday: { open: '11:00', close: '23:00' },
            friday: { open: '11:00', close: '23:30' },
            saturday: { open: '11:00', close: '23:30' },
            sunday: { open: '11:00', close: '23:00' },
          },
          capacity: 80,
          currency: 'INR',
        },
        status: 'LIVE',
        goLiveDate: new Date('2026-05-01'),
      },
    });
    vmSites.set(c.slug, { id: site.id, name: site.name });
    console.log(`  ✅ Site: ${site.name} (${site.id})`);
  }

  // ─── 7.3 Vishal users (5 central + 66 site-level) ───
  const vmCentralUsers = [
    { id: 'u-vm-owner', email: 'vishal.owner@vishalmc.in', firstName: 'Vishal', lastName: 'Owner', role: 'FRANCHISE_OWNER', phone: '+91-98200-00001' },
    { id: 'u-vm-ops', email: 'vishal.ops@vishalmc.in', firstName: 'Ops', lastName: 'Central Ops', role: 'OPERATIONS_MANAGER', phone: '+91-98200-00002' },
    { id: 'u-vm-quality', email: 'vishal.quality@vishalmc.in', firstName: 'Quality', lastName: 'Central QA', role: 'QUALITY_AUDITOR', phone: '+91-98200-00003' },
    { id: 'u-vm-finance', email: 'vishal.finance@vishalmc.in', firstName: 'Finance', lastName: 'Central Finance', role: 'FINANCE_MANAGER', phone: '+91-98200-00004' },
    { id: 'u-vm-ra', email: 'vishal.ra@vishalmc.in', firstName: 'RA', lastName: 'Central', role: 'REVENUE_ASSURANCE', phone: '+91-98200-00005' },
  ] as const;

  const vmCentralIds: Record<string, string> = {};
  for (const u of vmCentralUsers) {
    const user = await prisma.user.create({
      data: {
        id: u.id,
        tenantId: vmTenant.id,
        email: u.email,
        phone: u.phone,
        passwordHash: staffPasswordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role as never,
        status: 'ACTIVE',
        lastLoginAt: new Date(),
      },
    });
    vmCentralIds[u.id] = user.id;
    console.log(`  ✅ User: ${user.firstName} ${user.lastName} (${user.role}) — ${u.email}`);
  }

  // Site-level: <city>.manager (SITE_LEAD), <city>.kds.south / <city>.kds.north (KITCHEN_STAFF), <city>.foh (FOH), <city>.quality (QUALITY_AUDITOR), <city>.ra (REVENUE_ASSURANCE)
  const vmSiteUsers = new Map<string, { manager: string; kdsSouth: string; kdsNorth: string; foh: string; quality: string; ra: string }>();
  const vmSiteUserRoles = [
    { suffix: 'kds.south', role: 'KITCHEN_STAFF', lastName: 'KDS South' },
    { suffix: 'kds.north', role: 'KITCHEN_STAFF', lastName: 'KDS North' },
    { suffix: 'manager', role: 'SITE_LEAD', lastName: 'Manager' },
    { suffix: 'foh', role: 'FOH', lastName: 'FOH' },
    { suffix: 'quality', role: 'QUALITY_AUDITOR', lastName: 'Quality' },
    { suffix: 'ra', role: 'REVENUE_ASSURANCE', lastName: 'RA' },
  ] as const;
  const vmSuffixKey = (suffix: string): string => {
    if (suffix === 'kds.south') return 'kdsSouth';
    if (suffix === 'kds.north') return 'kdsNorth';
    return suffix;
  };
  let vmSiteUserCount = 0;
  for (const c of vmCities) {
    const ids: { manager: string; kdsSouth: string; kdsNorth: string; foh: string; quality: string; ra: string } = {
      manager: '', kdsSouth: '', kdsNorth: '', foh: '', quality: '', ra: '',
    };
    for (const r of vmSiteUserRoles) {
      const key = vmSuffixKey(r.suffix);
      const user = await prisma.user.create({
        data: {
          id: `u-vm-${c.slug}-${key}`,
          tenantId: vmTenant.id,
          siteId: vmSites.get(c.slug)!.id,
          email: `${c.slug}.${r.suffix}@vishalmc.in`,
          passwordHash: staffPasswordHash,
          firstName: c.city,
          lastName: r.lastName,
          role: r.role as never,
          status: 'ACTIVE',
          lastLoginAt: new Date(),
        },
      });
      (ids as Record<string, string>)[key] = user.id;
      vmSiteUserCount += 1;
    }
    vmSiteUsers.set(c.slug, ids);
  }
  console.log(`  ✅ Users: ${vmCentralUsers.length} central + ${vmSiteUserCount} site-level (${vmCities.length} branches × 4)`);

  // ─── 7.3b Vishal marketing users (MARKETING_ADMIN — media managers for the advertising screens) ───
  // One central marketing lead (tenant-level, global content) + one per branch (site-scoped).
  const vmMarketingCentral = await prisma.user.create({
    data: {
      id: 'u-vm-marketing',
      tenantId: vmTenant.id,
      email: 'vishal.marketing@vishalmc.in',
      passwordHash: staffPasswordHash,
      firstName: 'Marketing',
      lastName: 'Central',
      role: 'MARKETING_ADMIN' as never,
      status: 'ACTIVE',
      lastLoginAt: new Date(),
    },
  });
  console.log(
    `  ✅ User: ${vmMarketingCentral.firstName} ${vmMarketingCentral.lastName} (MARKETING_ADMIN, central) — ${vmMarketingCentral.email}`,
  );

  let vmMarketingSiteCount = 0;
  for (const c of vmCities) {
    const marketing = await prisma.user.create({
      data: {
        id: `u-vm-${c.slug}-marketing`,
        tenantId: vmTenant.id,
        siteId: vmSites.get(c.slug)!.id,
        email: `${c.slug}.marketing@vishalmc.in`,
        passwordHash: staffPasswordHash,
        firstName: c.city,
        lastName: 'Marketing',
        role: 'MARKETING_ADMIN' as never,
        status: 'ACTIVE',
        lastLoginAt: new Date(),
      },
    });
    vmMarketingSiteCount += 1;
    console.log(`  ✅ User: ${marketing.firstName} ${marketing.lastName} (MARKETING_ADMIN — ${vmSites.get(c.slug)!.id}) — ${marketing.email}`);
  }
  console.log(`  ✅ Users: 1 central MARKETING_ADMIN + ${vmMarketingSiteCount} site MARKETING_ADMINs (${vmCities.length} branches)`);

  // ─── 7.4 Vishal menu (40 items, 4 categories → 4 KDS stations) ───
  const vmMenu = await prisma.menu.create({
    data: {
      id: 'm-vishal-menu',
      tenantId: vmTenant.id,
      name: 'Vishal Multicuisine Menu',
      description: 'Unified menu across all 10 branches — South Indian, North Indian, Desserts & Beverages',
      menuType: 'ALL_DAY',
      isActive: true,
      availabilitySchedule: {
        monday: [{ start: '11:00', end: '23:00' }],
        tuesday: [{ start: '11:00', end: '23:00' }],
        wednesday: [{ start: '11:00', end: '23:00' }],
        thursday: [{ start: '11:00', end: '23:00' }],
        friday: [{ start: '11:00', end: '23:30' }],
        saturday: [{ start: '11:00', end: '23:30' }],
        sunday: [{ start: '11:00', end: '23:00' }],
      },
    },
  });
  console.log(`  ✅ Menu: ${vmMenu.name}`);

  // Assign menu to all 10 Vishal sites
  await prisma.siteMenu.createMany({
    data: [...vmSites.values()].map((s) => ({ siteId: s.id, menuId: vmMenu.id })),
  });
  console.log(`  ✅ Menu assigned to all ${vmSites.size} sites`);

  const vmCategories = [
    { id: 'cat-vm-south', name: 'South Indian Food', station: 'GRILL', sortOrder: 1 },
    { id: 'cat-vm-north', name: 'North Indian Food', station: 'FRY', sortOrder: 2 },
    { id: 'cat-vm-desserts', name: 'Desserts', station: 'DESSERT', sortOrder: 3 },
    { id: 'cat-vm-beverages', name: 'Beverages', station: 'DRINKS', sortOrder: 4 },
  ] as const;

  const vmCategoryIds: Record<string, string> = {};
  for (const cat of vmCategories) {
    const created = await prisma.menuCategory.create({
      data: {
        id: cat.id,
        menuId: vmMenu.id,
        name: cat.name,
        description: `${cat.name} — kitchen station ${cat.station}`,
        sortOrder: cat.sortOrder,
      },
    });
    vmCategoryIds[cat.name] = created.id;
  }
  console.log('  ✅ Menu Categories: South Indian Food (GRILL), North Indian Food (FRY), Desserts (DESSERT), Beverages (DRINKS)');

  interface VmMenuItem {
    id: string;
    name: string;
    shortCode: string;
    price: number;
    costPrice: number;
    prepTimeMinutes: number;
    dietaryTags: string[];
    allergens: string[];
    description: string;
  }
  const vmMenuItems: Record<string, VmMenuItem[]> = {
    'South Indian Food': [
      { id: 'mi-vm-masala-dosa', name: 'Masala Dosa', shortCode: 'MASDOSA', price: 149, costPrice: 52, prepTimeMinutes: 12, dietaryTags: ['VEG'], allergens: ['GLUTEN'], description: 'Crisp golden dosa with spiced potato masala, served with sambar and chutneys' },
      { id: 'mi-vm-idli-sambar', name: 'Idli Sambar', shortCode: 'IDLISAM', price: 99, costPrice: 34, prepTimeMinutes: 8, dietaryTags: ['VEG'], allergens: [], description: 'Steamed rice cakes with lentil sambar and coconut chutney' },
      { id: 'mi-vm-medu-vada', name: 'Medu Vada', shortCode: 'MEDUVAD', price: 89, costPrice: 30, prepTimeMinutes: 8, dietaryTags: ['VEG'], allergens: [], description: 'Crispy urad dal fritters, soft inside, with sambar and chutney' },
      { id: 'mi-vm-uttapam', name: 'Uttapam', shortCode: 'UTTAPAM', price: 129, costPrice: 44, prepTimeMinutes: 12, dietaryTags: ['VEG'], allergens: ['GLUTEN'], description: 'Thick savoury pancake topped with onion, tomato and coriander' },
      { id: 'mi-vm-rava-dosa', name: 'Rava Dosa', shortCode: 'RAVDOSA', price: 159, costPrice: 54, prepTimeMinutes: 12, dietaryTags: ['VEG'], allergens: ['GLUTEN'], description: 'Lacy semolina dosa, paper-thin and crispy, with ghee roast flavour' },
      { id: 'mi-vm-pongal', name: 'Pongal', shortCode: 'PONGAL', price: 109, costPrice: 38, prepTimeMinutes: 10, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Comforting rice and moong dal khichdi tempered with pepper, cumin and ghee' },
      { id: 'mi-vm-upma', name: 'Upma', shortCode: 'UPMA', price: 79, costPrice: 26, prepTimeMinutes: 7, dietaryTags: ['VEG'], allergens: ['GLUTEN'], description: 'Roasted semolina tempered with mustard, curry leaves and vegetables' },
      { id: 'mi-vm-curd-rice', name: 'Curd Rice', shortCode: 'CURDRIC', price: 119, costPrice: 40, prepTimeMinutes: 5, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Cool yoghurt rice tempered with ginger, curry leaves and pomegranate' },
      { id: 'mi-vm-paper-dosa', name: 'Paper Dosa', shortCode: 'PAPDOSA', price: 139, costPrice: 46, prepTimeMinutes: 12, dietaryTags: ['VEG'], allergens: ['GLUTEN'], description: 'Extra-thin, extra-crisp dosa, a foot long, with sambar and chutneys' },
      { id: 'mi-vm-ghee-roast-dosa', name: 'Ghee Roast Dosa', shortCode: 'GHEDOSA', price: 169, costPrice: 58, prepTimeMinutes: 14, dietaryTags: ['VEG'], allergens: ['GLUTEN', 'DAIRY'], description: 'Signature dosa roasted in pure ghee, dark, crisp and aromatic' },
    ],
    'North Indian Food': [
      { id: 'mi-vm-butter-chicken', name: 'Butter Chicken', shortCode: 'BTCHICK', price: 349, costPrice: 122, prepTimeMinutes: 18, dietaryTags: ['NON_VEG'], allergens: ['DAIRY'], description: 'Tandoori chicken in silky tomato-butter gravy with kasuri methi' },
      { id: 'mi-vm-paneer-tikka', name: 'Paneer Tikka', shortCode: 'PANTIKK', price: 279, costPrice: 96, prepTimeMinutes: 15, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Char-grilled cottage cheese marinated in spiced yoghurt' },
      { id: 'mi-vm-dal-makhani', name: 'Dal Makhani', shortCode: 'DALMAKH', price: 229, costPrice: 78, prepTimeMinutes: 15, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Black lentils simmered overnight with butter and cream' },
      { id: 'mi-vm-naan', name: 'Naan', shortCode: 'NAAN', price: 49, costPrice: 15, prepTimeMinutes: 6, dietaryTags: ['VEG'], allergens: ['GLUTEN'], description: 'Tandoor-baked leavened flatbread' },
      { id: 'mi-vm-butter-naan', name: 'Butter Naan', shortCode: 'BUTNAAN', price: 59, costPrice: 18, prepTimeMinutes: 6, dietaryTags: ['VEG'], allergens: ['GLUTEN', 'DAIRY'], description: 'Tandoor-baked naan brushed with melted butter' },
      { id: 'mi-vm-chole-bhature', name: 'Chole Bhature', shortCode: 'CHOLBHA', price: 179, costPrice: 60, prepTimeMinutes: 12, dietaryTags: ['VEG'], allergens: ['GLUTEN'], description: 'Puffy fried bread with spicy chickpea curry and pickled onions' },
      { id: 'mi-vm-biryani', name: 'Biryani', shortCode: 'BIRYANI', price: 259, costPrice: 88, prepTimeMinutes: 20, dietaryTags: ['NON_VEG'], allergens: ['DAIRY'], description: 'Fragrant basmati layered with chicken, saffron and fried onions (dum) ' },
      { id: 'mi-vm-tandoori-roti', name: 'Tandoori Roti', shortCode: 'TANDROT', price: 39, costPrice: 11, prepTimeMinutes: 5, dietaryTags: ['VEG'], allergens: ['GLUTEN'], description: 'Whole-wheat flatbread baked in the tandoor' },
      { id: 'mi-vm-palak-paneer', name: 'Palak Paneer', shortCode: 'PALPANE', price: 249, costPrice: 86, prepTimeMinutes: 15, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Cottage cheese cubes in creamy puréed spinach with garlic' },
      { id: 'mi-vm-rogan-josh', name: 'Rogan Josh', shortCode: 'ROGJOSH', price: 329, costPrice: 115, prepTimeMinutes: 22, dietaryTags: ['NON_VEG'], allergens: ['DAIRY'], description: 'Kashmiri-style lamb curry with fennel, ginger and dried red chillies' },
    ],
    'Desserts': [
      { id: 'mi-vm-gulab-jamun', name: 'Gulab Jamun', shortCode: 'GULJAM', price: 89, costPrice: 28, prepTimeMinutes: 8, dietaryTags: ['VEG'], allergens: ['DAIRY', 'GLUTEN'], description: 'Warm khoya dumplings soaked in rose-scented sugar syrup' },
      { id: 'mi-vm-rasgulla', name: 'Rasgulla', shortCode: 'RASGUL', price: 79, costPrice: 24, prepTimeMinutes: 5, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Spongy chhena balls in light sugar syrup' },
      { id: 'mi-vm-jalebi', name: 'Jalebi', shortCode: 'JALEBI', price: 69, costPrice: 20, prepTimeMinutes: 8, dietaryTags: ['VEG'], allergens: ['GLUTEN'], description: 'Crispy orange spirals soaked in saffron syrup' },
      { id: 'mi-vm-kulfi', name: 'Kulfi', shortCode: 'KULFI', price: 99, costPrice: 32, prepTimeMinutes: 5, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Dense slow-simmered Indian ice cream with pistachio' },
      { id: 'mi-vm-gajar-halwa', name: 'Gajar Halwa', shortCode: 'GAJHAL', price: 119, costPrice: 40, prepTimeMinutes: 8, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Slow-cooked carrot pudding with ghee, khoya and cashews' },
      { id: 'mi-vm-rasmalai', name: 'Rasmalai', shortCode: 'RASMAL', price: 109, costPrice: 36, prepTimeMinutes: 5, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Soft chhena discs in saffron-cardamom milk, chilled' },
      { id: 'mi-vm-ice-cream-sundae', name: 'Ice Cream Sundae', shortCode: 'ICESUND', price: 149, costPrice: 50, prepTimeMinutes: 4, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Vanilla and chocolate scoops with hot fudge, nuts and cherry' },
      { id: 'mi-vm-brownie', name: 'Brownie', shortCode: 'BROWNIE', price: 129, costPrice: 44, prepTimeMinutes: 7, dietaryTags: ['VEG'], allergens: ['GLUTEN', 'DAIRY'], description: 'Fudgy walnut brownie, warmed, with chocolate sauce' },
      { id: 'mi-vm-kheer', name: 'Kheer', shortCode: 'KHEER', price: 99, costPrice: 32, prepTimeMinutes: 5, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Rice pudding simmered in milk with cardamom and almonds' },
      { id: 'mi-vm-ladoo', name: 'Ladoo', shortCode: 'LADOO', price: 59, costPrice: 18, prepTimeMinutes: 4, dietaryTags: ['VEG'], allergens: ['GLUTEN', 'DAIRY'], description: 'Besan ladoo, ghee-roasted gram flour balls with cardamom' },
    ],
    'Beverages': [
      { id: 'mi-vm-masala-chai', name: 'Masala Chai', shortCode: 'MCHAI', price: 49, costPrice: 14, prepTimeMinutes: 4, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Spiced milk tea brewed with ginger, cardamom and clove' },
      { id: 'mi-vm-filter-coffee', name: 'Filter Coffee', shortCode: 'FILCOF', price: 59, costPrice: 17, prepTimeMinutes: 4, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'South Indian filter kaapi, frothy, served in a davara tumbler' },
      { id: 'mi-vm-mango-lassi', name: 'Mango Lassi', shortCode: 'MANLASS', price: 99, costPrice: 30, prepTimeMinutes: 4, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Thick alphonso mango yoghurt shake, chilled' },
      { id: 'mi-vm-sweet-lassi', name: 'Sweet Lassi', shortCode: 'SWTLASS', price: 89, costPrice: 26, prepTimeMinutes: 4, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Classic sweet yoghurt drink with a hint of cardamom' },
      { id: 'mi-vm-cold-coffee', name: 'Cold Coffee', shortCode: 'COLDCOF', price: 129, costPrice: 40, prepTimeMinutes: 4, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Frothy blended coffee with ice cream and chocolate dust' },
      { id: 'mi-vm-fresh-lime-soda', name: 'Fresh Lime Soda', shortCode: 'LIMSODA', price: 79, costPrice: 20, prepTimeMinutes: 3, dietaryTags: ['VEG', 'VEGAN'], allergens: [], description: 'Fresh lime with soda, sweet or salted, over ice' },
      { id: 'mi-vm-buttermilk', name: 'Buttermilk', shortCode: 'BUTMILK', price: 49, costPrice: 13, prepTimeMinutes: 3, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Spiced chaas with roasted cumin, ginger and coriander' },
      { id: 'mi-vm-kokum-sherbet', name: 'Kokum Sherbet', shortCode: 'KOKUM', price: 69, costPrice: 18, prepTimeMinutes: 3, dietaryTags: ['VEG', 'VEGAN'], allergens: [], description: 'Refreshing Konkan kokum cooler, tangy and sweet' },
      { id: 'mi-vm-fruit-juice', name: 'Fruit Juice', shortCode: 'FRUJUI', price: 119, costPrice: 38, prepTimeMinutes: 5, dietaryTags: ['VEG', 'VEGAN'], allergens: [], description: 'Fresh seasonal fruit juice — orange, watermelon or pomegranate' },
      { id: 'mi-vm-thandai', name: 'Thandai', shortCode: 'THANDAI', price: 99, costPrice: 30, prepTimeMinutes: 5, dietaryTags: ['VEG'], allergens: ['DAIRY'], description: 'Chilled milk drink with saffron, almonds and fennel seeds' },
    ],
  };

  const vmCategoryNames = ['South Indian Food', 'North Indian Food', 'Desserts', 'Beverages'] as const;
  const vmItemLookup: Record<string, { id: string; price: number; station: string }> = {};
  for (const catName of vmCategoryNames) {
    const items = vmMenuItems[catName]!;
    const station = vmCategories.find((c) => c.name === catName)!.station as never;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i]!;
      const created = await prisma.menuItem.create({
        data: {
          id: item.id,
          categoryId: vmCategoryIds[catName]!,
          menuId: vmMenu.id,
          name: item.name,
          description: item.description,
          shortCode: item.shortCode,
          price: item.price,
          costPrice: item.costPrice,
          taxRate: 5,
          prepTimeMinutes: item.prepTimeMinutes,
          station,
          dietaryTags: item.dietaryTags,
          allergens: item.allergens,
          status: 'AVAILABLE',
          sortOrder: i + 1,
        },
      });
      vmItemLookup[item.name] = { id: created.id, price: item.price, station: String(station) };
    }
  }
  console.log(
    `  ✅ Menu Items: 40 across 4 categories (${Object.values(vmMenuItems).map((v) => v.length).join('+')}) with per-category stations`,
  );

  // ─── 7.5 Vishal floor plans + tables (10 sites, 8 tables each) ───
  for (const c of vmCities) {
    const fp = await prisma.floorPlan.create({
      data: {
        id: `fp-vm-${c.slug}`,
        siteId: vmSites.get(c.slug)!.id,
        name: `Main Dining – ${c.city}`,
        description: 'Primary dining area with family booths',
        isActive: true,
        layout: {
          gridWidth: 800,
          gridHeight: 600,
          sections: [
            { name: 'Main', color: '#4CAF50' },
            { name: 'Family', color: '#2196F3' },
          ],
        },
      },
    });
    const tableRows: { id: string; number: string; section: string; capacity: number; position: object }[] = [];
    for (let i = 0; i < 8; i += 1) {
      tableRows.push({
        id: `tbl-vm-${c.slug}-t${i + 1}`,
        number: `T${i + 1}`,
        section: i < 6 ? 'Main' : 'Family',
        capacity: i % 2 === 0 ? 4 : 6,
        position: { x: 50 + (i % 4) * 170, y: 80 + Math.floor(i / 4) * 160, width: 130, height: 110 },
      });
    }
    for (const t of tableRows) {
      await prisma.table.create({
        data: {
          id: t.id,
          floorPlanId: fp.id,
          siteId: vmSites.get(c.slug)!.id,
          number: t.number,
          section: t.section,
          capacity: t.capacity,
          status: 'AVAILABLE',
          position: t.position,
        },
      });
    }
    console.log(`  ✅ Floor Plan: ${fp.name} (8 tables T1–T8)`);
  }

  // ─── 7.6 Vishal demo orders + revenue anomalies ───
  // Mirrors the Demo Kitchen Co. anomaly patterns in INR (5% GST):
  // missing payment, heavy discount, 3-void same-day spike, payment mismatch,
  // no-sale, fully comped. Plus 2 live KDS orders in Mumbai spanning all 4
  // stations so the kitchen-queue groups by GRILL/FRY/DESSERT/DRINKS.
  const VM_TAX = 0.05;
  const vmUserId = (slug: string, key: 'manager' | 'kdsSouth' | 'kdsNorth' | 'foh' | 'quality' | 'ra') => vmSiteUsers.get(slug)![key];

  interface VmOrderItem {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    station: string;
  }
  interface VmOrder {
    id: string;
    siteSlug: string;
    orderNumber: number;
    status: string;
    daysAgo: number;
    hour: number;
    minute: number;
    orderType: string;
    channel: string;
    itemStatus: string; // orderItem status
    items: VmOrderItem[];
    discount?: { type: string; value: number; reason?: string };
    payment?: { method: string; status: string; amount: number; gatewayTransactionId?: string; refundReason?: string };
    notes?: string;
  }
  const vmItem = (name: string, quantity = 1): VmOrderItem => {
    const meta = vmItemLookup[name];
    if (!meta) {
      throw new Error(`Vishal menu item not found in lookup: ${name}`);
    }
    return {
      menuItemId: meta.id,
      name,
      quantity,
      unitPrice: meta.price,
      station: meta.station,
    };
  };

  const vmOrders: VmOrder[] = [
    // ── Clean orders ──
    {
      id: 'ord-vm-mumbai-c1', siteSlug: 'mumbai', orderNumber: 3001, status: 'COMPLETED', daysAgo: 2, hour: 12, minute: 40, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'SERVED',
      items: [vmItem('Masala Dosa'), vmItem('Filter Coffee'), vmItem('Gulab Jamun')],
      payment: { method: 'UPI', status: 'CAPTURED', amount: 311.85, gatewayTransactionId: 'gtx-vm-3001' },
    },
    {
      id: 'ord-vm-mumbai-c2', siteSlug: 'mumbai', orderNumber: 3002, status: 'COMPLETED', daysAgo: 5, hour: 13, minute: 10, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'SERVED',
      items: [vmItem('Butter Chicken'), vmItem('Naan'), vmItem('Mango Lassi')],
      payment: { method: 'CARD', status: 'CAPTURED', amount: 521.85, gatewayTransactionId: 'gtx-vm-3002' },
    },
    {
      id: 'ord-vm-bengaluru-c1', siteSlug: 'bengaluru', orderNumber: 4001, status: 'COMPLETED', daysAgo: 1, hour: 11, minute: 20, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'SERVED',
      items: [vmItem('Idli Sambar'), vmItem('Medu Vada'), vmItem('Filter Coffee')],
      payment: { method: 'UPI', status: 'CAPTURED', amount: 259.35, gatewayTransactionId: 'gtx-vm-4001' },
    },
    {
      id: 'ord-vm-delhi-c1', siteSlug: 'delhi', orderNumber: 5001, status: 'COMPLETED', daysAgo: 4, hour: 13, minute: 30, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'SERVED',
      items: [vmItem('Paneer Tikka'), vmItem('Dal Makhani'), vmItem('Butter Naan'), vmItem('Gulab Jamun')],
      payment: { method: 'CARD', status: 'CAPTURED', amount: 688.8, gatewayTransactionId: 'gtx-vm-5001' },
    },
    // ── Anomaly 1: COMPLETED order with NO payment → MISSING_PAYMENT (HIGH, ₹709.80) ──
    {
      id: 'ord-vm-missing-payment', siteSlug: 'mumbai', orderNumber: 3003, status: 'COMPLETED', daysAgo: 3, hour: 13, minute: 5, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'SERVED',
      items: [vmItem('Butter Chicken'), vmItem('Dal Makhani'), vmItem('Naan'), vmItem('Masala Chai')],
      notes: 'Waiter closed tab without processing UPI payment',
    },
    // ── Anomaly 2: 55% discount → DISCOUNT_OUTLIER (HIGH) ──
    {
      id: 'ord-vm-heavy-discount', siteSlug: 'mumbai', orderNumber: 3004, status: 'COMPLETED', daysAgo: 1, hour: 12, minute: 55, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'SERVED',
      items: [vmItem('Paneer Tikka'), vmItem('Biryani'), vmItem('Gulab Jamun'), vmItem('Mango Lassi')],
      discount: { type: 'FIXED_AMOUNT', value: 400, reason: 'Friends & family' },
      payment: { method: 'CARD', status: 'CAPTURED', amount: 342.3, gatewayTransactionId: 'gtx-vm-3004' },
    },
    // ── Anomaly 3a-c: 3 voided/refunded orders SAME UTC day at Bengaluru → VOID_REFUND_SPIKE (HIGH) ──
    {
      id: 'ord-vm-void-1', siteSlug: 'bengaluru', orderNumber: 4002, status: 'CANCELLED', daysAgo: 3, hour: 10, minute: 15, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'CANCELLED',
      items: [vmItem('Butter Chicken'), vmItem('Naan'), vmItem('Masala Chai')],
      payment: { method: 'CARD', status: 'VOIDED', amount: 469.35, gatewayTransactionId: 'gtx-vm-4002' },
      notes: 'Customer walked out before food was served',
    },
    {
      id: 'ord-vm-void-2', siteSlug: 'bengaluru', orderNumber: 4003, status: 'REFUNDED', daysAgo: 3, hour: 11, minute: 30, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'CANCELLED',
      items: [vmItem('Biryani'), vmItem('Sweet Lassi')],
      payment: { method: 'CARD', status: 'REFUNDED', amount: 365.4, gatewayTransactionId: 'gtx-vm-4003', refundReason: 'Customer changed mind after order fired' },
      notes: 'Full refund after delivery dispute',
    },
    {
      id: 'ord-vm-void-3', siteSlug: 'bengaluru', orderNumber: 4004, status: 'CANCELLED', daysAgo: 3, hour: 12, minute: 45, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'CANCELLED',
      items: [vmItem('Rogan Josh', 2), vmItem('Dal Makhani')],
      payment: { method: 'CARD', status: 'VOIDED', amount: 931.35, gatewayTransactionId: 'gtx-vm-4004' },
      notes: 'Large table order voided at closing time',
    },
    // ── Anomaly 4: paid ₹652.30 vs grand total ₹657.30 → PAYMENT_MISMATCH (MEDIUM, diff ₹5) ──
    {
      id: 'ord-vm-mismatch', siteSlug: 'delhi', orderNumber: 5002, status: 'COMPLETED', daysAgo: 6, hour: 14, minute: 10, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'SERVED',
      items: [vmItem('Butter Chicken'), vmItem('Butter Naan'), vmItem('Cold Coffee'), vmItem('Gulab Jamun')],
      payment: { method: 'CARD', status: 'CAPTURED', amount: 652.3, gatewayTransactionId: 'gtx-vm-5002' },
      notes: 'Terminal partially captured the amount',
    },
    // ── Anomaly 5: zero-value COMPLETED order, no items → NO_SALE (LOW) ──
    {
      id: 'ord-vm-no-sale', siteSlug: 'mumbai', orderNumber: 3005, status: 'COMPLETED', daysAgo: 2, hour: 16, minute: 0, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'SERVED',
      items: [],
      notes: 'Test order opened and closed without items',
    },
    // ── Anomaly 6: fully comped order (discount = subtotal) → DISCOUNT_OUTLIER (HIGH, comped) ──
    {
      id: 'ord-vm-comped', siteSlug: 'delhi', orderNumber: 5003, status: 'COMPLETED', daysAgo: 2, hour: 12, minute: 20, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'SERVED',
      items: [vmItem('Paneer Tikka'), vmItem('Naan'), vmItem('Buttermilk')],
      discount: { type: 'COMP', value: 377, reason: 'Quality complaint comp' },
      notes: 'Fully comped order after customer complaint',
    },
    // ── Live KDS orders (Mumbai): PREPARING/CONFIRMED with PENDING items across all 4 stations ──
    {
      id: 'ord-vm-kds-1', siteSlug: 'mumbai', orderNumber: 3006, status: 'PREPARING', daysAgo: 0, hour: 15, minute: 20, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'PENDING',
      items: [vmItem('Masala Dosa'), vmItem('Idli Sambar'), vmItem('Butter Chicken'), vmItem('Naan'), vmItem('Gulab Jamun'), vmItem('Masala Chai')],
      payment: { method: 'UPI', status: 'CAPTURED', amount: 823.2, gatewayTransactionId: 'gtx-vm-3006' },
      notes: 'Table T3 — fire all stations',
    },
    {
      id: 'ord-vm-kds-2', siteSlug: 'mumbai', orderNumber: 3007, status: 'CONFIRMED', daysAgo: 0, hour: 15, minute: 35, orderType: 'DELIVERY', channel: 'AGGREGATOR', itemStatus: 'PENDING',
      items: [vmItem('Paneer Tikka'), vmItem('Rava Dosa'), vmItem('Kulfi'), vmItem('Mango Lassi')],
      payment: { method: 'UPI', status: 'CAPTURED', amount: 667.8, gatewayTransactionId: 'gtx-vm-3007' },
      notes: 'Swiggy #8841 — packaging at EXPO',
    },
    // ── Lucknow (11th branch): 2 clean + 3 anomalies + 1 live KDS order (order numbers 6001–6006) ──
    {
      id: 'ord-vm-lucknow-c1', siteSlug: 'lucknow', orderNumber: 6001, status: 'COMPLETED', daysAgo: 2, hour: 12, minute: 30, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'SERVED',
      items: [vmItem('Masala Dosa'), vmItem('Filter Coffee'), vmItem('Gulab Jamun')],
      payment: { method: 'UPI', status: 'CAPTURED', amount: 311.85, gatewayTransactionId: 'gtx-vm-6001' },
    },
    {
      id: 'ord-vm-lucknow-c2', siteSlug: 'lucknow', orderNumber: 6002, status: 'COMPLETED', daysAgo: 4, hour: 13, minute: 15, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'SERVED',
      items: [vmItem('Butter Chicken'), vmItem('Naan'), vmItem('Mango Lassi')],
      payment: { method: 'CARD', status: 'CAPTURED', amount: 521.85, gatewayTransactionId: 'gtx-vm-6002' },
    },
    // ── Anomaly: COMPLETED order with NO payment → MISSING_PAYMENT (HIGH, ₹720.30) ──
    {
      id: 'ord-vm-lucknow-missing-payment', siteSlug: 'lucknow', orderNumber: 6003, status: 'COMPLETED', daysAgo: 1, hour: 12, minute: 45, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'SERVED',
      items: [vmItem('Butter Chicken'), vmItem('Dal Makhani'), vmItem('Butter Naan'), vmItem('Masala Chai')],
      notes: 'Server closed bill without taking payment at table T4',
    },
    // ── Anomaly: fully comped order (discount = subtotal) → DISCOUNT_OUTLIER (HIGH, comped) ──
    {
      id: 'ord-vm-lucknow-comped', siteSlug: 'lucknow', orderNumber: 6004, status: 'COMPLETED', daysAgo: 2, hour: 14, minute: 10, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'SERVED',
      items: [vmItem('Paneer Tikka'), vmItem('Naan'), vmItem('Sweet Lassi')],
      discount: { type: 'COMP', value: 417, reason: 'Quality complaint comp' },
      notes: 'Fully comped order after guest complaint',
    },
    // ── Anomaly: paid ₹495.85 vs grand total ₹500.85 → PAYMENT_MISMATCH (MEDIUM, diff ₹5) ──
    {
      id: 'ord-vm-lucknow-mismatch', siteSlug: 'lucknow', orderNumber: 6005, status: 'COMPLETED', daysAgo: 5, hour: 14, minute: 30, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'SERVED',
      items: [vmItem('Biryani'), vmItem('Cold Coffee'), vmItem('Gulab Jamun')],
      payment: { method: 'CARD', status: 'CAPTURED', amount: 495.85, gatewayTransactionId: 'gtx-vm-6005' },
      notes: 'Card terminal captured short amount',
    },
    // ── Live KDS order (Lucknow): CONFIRMED, PENDING items across all 4 stations, payment captured ──
    {
      id: 'ord-vm-lucknow-kds-1', siteSlug: 'lucknow', orderNumber: 6006, status: 'CONFIRMED', daysAgo: 0, hour: 16, minute: 5, orderType: 'DINE_IN', channel: 'POS', itemStatus: 'PENDING',
      items: [vmItem('Masala Dosa'), vmItem('Butter Chicken'), vmItem('Naan'), vmItem('Gulab Jamun'), vmItem('Mango Lassi')],
      payment: { method: 'UPI', status: 'CAPTURED', amount: 771.75, gatewayTransactionId: 'gtx-vm-6006' },
      notes: 'Table T2 — fire all stations',
    },
  ];

  for (const o of vmOrders) {
    const subTotal = o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const discountTotal = o.discount ? o.discount.value : 0;
    const taxTotal = subTotal > 0 ? Math.round((subTotal - discountTotal) * VM_TAX * 100) / 100 : 0;
    const grandTotal = Math.max(0, Math.round((subTotal - discountTotal + taxTotal) * 100) / 100);
    const createdAt = daysAgo(o.daysAgo, o.hour, o.minute);
    const siteId = vmSites.get(o.siteSlug)!.id;
    const userKey = o.status === 'COMPLETED' && !o.discount && !o.notes ? 'foh' : o.status === 'CANCELLED' || o.status === 'REFUNDED' ? 'manager' : 'foh';
    const order = await prisma.order.create({
      data: {
        id: o.id,
        tenantId: vmTenant.id,
        siteId,
        userId: vmUserId(o.siteSlug, userKey as 'foh' | 'manager'),
        orderNumber: o.orderNumber,
        orderType: o.orderType as never,
        channel: o.channel as never,
        status: o.status as never,
        subTotal,
        taxTotal,
        discountTotal,
        grandTotal,
        notes: o.notes,
        createdAt,
        updatedAt: createdAt,
      },
    });
    for (const item of o.items) {
      await prisma.orderItem.create({
        data: {
          orderId: o.id,
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: Math.round(item.unitPrice * item.quantity * 100) / 100,
          taxRate: 5,
          station: item.station as never,
          status: o.itemStatus as never,
          firedAt: o.itemStatus === 'PENDING' ? createdAt : undefined,
          createdAt,
        },
      });
    }
    if (o.discount) {
      await prisma.discount.create({
        data: {
          orderId: o.id,
          type: o.discount.type as never,
          value: o.discount.value,
          reason: o.discount.reason,
          approvedBy: vmUserId(o.siteSlug, 'manager'),
          createdAt,
        },
      });
    }
    if (o.payment) {
      await prisma.payment.create({
        data: {
          id: `pay-${o.id}`,
          orderId: o.id,
          amount: o.payment.amount,
          method: o.payment.method as never,
          status: o.payment.status as never,
          gatewayTransactionId: o.payment.gatewayTransactionId,
          refundReason: o.payment.refundReason,
          refundApprovedBy: o.payment.status === 'REFUNDED' ? vmUserId(o.siteSlug, 'manager') : undefined,
          createdAt,
        },
      });
    }
  }
  console.log(
    `  ✅ Vishal Revenue Assurance demo: ${vmOrders.length} orders (6 clean, 11 with anomalies, 3 live KDS) across Mumbai/Bengaluru/Delhi/Lucknow`,
  );

  // ─── 7.7 Vishal quality demo (templates + completed HACCP audit + CAPA) ───
  const vmHaccpTemplate = await prisma.auditTemplate.create({
    data: {
      id: 'aqt-vm-haccp',
      tenantId: vmTenant.id,
      name: 'Food Safety – Daily HACCP',
      description: 'Daily food-safety checklist covering chiller temps, hand hygiene and food handling across all branches',
      category: 'Food Safety',
      isActive: true,
    },
  });
  const vmHaccpSections = [
    {
      id: 'aqs-vm-haccp-1', title: 'Chiller & Freezer Temperatures', description: 'Verify cold storage is within safe range', sortOrder: 1,
      items: [
        { id: 'aqi-vm-haccp-1', question: 'Walk-in chiller temperature between 0–4°C', itemType: 'TEMPERATURE', required: true, sortOrder: 1 },
        { id: 'aqi-vm-haccp-2', question: 'Freezer temperature at -18°C or below', itemType: 'TEMPERATURE', required: true, sortOrder: 2 },
        { id: 'aqi-vm-haccp-3', question: 'Cold storage temperature logs signed and current', itemType: 'PASS_FAIL', required: true, sortOrder: 3 },
      ],
    },
    {
      id: 'aqs-vm-haccp-2', title: 'Hand Hygiene & Sanitation', description: 'Staff hygiene and surface sanitisation', sortOrder: 2,
      items: [
        { id: 'aqi-vm-haccp-4', question: 'Handwash sinks stocked (soap, sanitiser, towels)', itemType: 'PASS_FAIL', required: true, sortOrder: 1 },
        { id: 'aqi-vm-haccp-5', question: 'Staff wash hands between tasks', itemType: 'YES_NO', required: true, sortOrder: 2 },
        { id: 'aqi-vm-haccp-6', question: 'Food-prep surfaces sanitised before service', itemType: 'SCORE_1_5', required: true, sortOrder: 3 },
      ],
    },
    {
      id: 'aqs-vm-haccp-3', title: 'Food Handling', description: 'Storage segregation and cooking temperatures', sortOrder: 3,
      items: [
        { id: 'aqi-vm-haccp-7', question: 'Raw and cooked items stored separately', itemType: 'PASS_FAIL', required: true, sortOrder: 1 },
        { id: 'aqi-vm-haccp-8', question: 'Cooking temperature logged for high-risk items (min 74°C)', itemType: 'TEMPERATURE', required: true, sortOrder: 2 },
        { id: 'aqi-vm-haccp-9', question: 'Prep-area cleanliness rating', itemType: 'SCORE_1_5', required: true, sortOrder: 3 },
      ],
    },
  ] as const;
  for (const s of vmHaccpSections) {
    const section = await prisma.auditSection.create({
      data: { id: s.id, templateId: vmHaccpTemplate.id, title: s.title, description: s.description, sortOrder: s.sortOrder },
    });
    for (const it of s.items) {
      await prisma.auditItem.create({
        data: { id: it.id, sectionId: section.id, question: it.question, itemType: it.itemType as never, required: it.required, sortOrder: it.sortOrder },
      });
    }
  }

  const vmServiceTemplate = await prisma.auditTemplate.create({
    data: {
      id: 'aqt-vm-service',
      tenantId: vmTenant.id,
      name: 'Service & Hospitality Standards',
      description: 'Front-of-house service quality and order accuracy checklist',
      category: 'Service',
      isActive: true,
    },
  });
  const vmServiceSections = [
    {
      id: 'aqs-vm-svc-1', title: 'Front-of-House', description: 'Guest greeting and table setup', sortOrder: 1,
      items: [
        { id: 'aqi-vm-svc-1', question: 'Guests greeted within 60 seconds of seating', itemType: 'PASS_FAIL', required: true, sortOrder: 1 },
        { id: 'aqi-vm-svc-2', question: 'Table hygiene and setup rating', itemType: 'SCORE_1_5', required: true, sortOrder: 2 },
      ],
    },
    {
      id: 'aqs-vm-svc-2', title: 'Order Accuracy', description: 'Kitchen-to-table accuracy checks', sortOrder: 2,
      items: [
        { id: 'aqi-vm-svc-3', question: 'No missed or incorrect items on the table', itemType: 'PASS_FAIL', required: true, sortOrder: 1 },
        { id: 'aqi-vm-svc-4', question: 'Bill matches the items served', itemType: 'PASS_FAIL', required: true, sortOrder: 2 },
      ],
    },
  ] as const;
  for (const s of vmServiceSections) {
    const section = await prisma.auditSection.create({
      data: { id: s.id, templateId: vmServiceTemplate.id, title: s.title, description: s.description, sortOrder: s.sortOrder },
    });
    for (const it of s.items) {
      await prisma.auditItem.create({
        data: { id: it.id, sectionId: section.id, question: it.question, itemType: it.itemType as never, required: it.required, sortOrder: it.sortOrder },
      });
    }
  }
  console.log('  ✅ Quality Templates: Food Safety – Daily HACCP (3 sections / 9 items), Service & Hospitality Standards (2 sections / 4 items)');

  // Completed HACCP audit at Mumbai with one failed item → open CAPA
  const vmAuditStarted = daysAgo(1, 9, 0);
  const vmAuditCompleted = daysAgo(1, 9, 40);
  const vmAudit = await prisma.audit.create({
    data: {
      id: 'aud-vm-mumbai-haccp',
      tenantId: vmTenant.id,
      siteId: vmSites.get('mumbai')!.id,
      templateId: vmHaccpTemplate.id,
      title: 'Mumbai – Daily HACCP Audit',
      auditorId: vmCentralIds['u-vm-quality']!,
      status: 'COMPLETED',
      score: 73.3,
      maxScore: 6,
      startedAt: vmAuditStarted,
      completedAt: vmAuditCompleted,
      createdAt: vmAuditStarted,
      updatedAt: vmAuditCompleted,
    },
  });
  const vmAuditResponses: { itemId: string; value: string; notes?: string }[] = [
    { itemId: 'aqi-vm-haccp-1', value: '2.5°C', notes: 'Walk-in chiller logged at 2.5°C' },
    { itemId: 'aqi-vm-haccp-2', value: '-19°C', notes: 'Freezer at -19°C' },
    { itemId: 'aqi-vm-haccp-3', value: 'pass', notes: 'Logs signed by morning shift' },
    { itemId: 'aqi-vm-haccp-4', value: 'pass', notes: 'Sink stocked at both stations' },
    { itemId: 'aqi-vm-haccp-5', value: 'yes' },
    { itemId: 'aqi-vm-haccp-6', value: '4', notes: 'Grill station wiped down' },
    { itemId: 'aqi-vm-haccp-7', value: 'fail', notes: 'Raw chicken tray above cooked paneer in walk-in' },
    { itemId: 'aqi-vm-haccp-8', value: '74°C', notes: 'Butter chicken core temp logged' },
    { itemId: 'aqi-vm-haccp-9', value: '3', notes: 'Some debris under prep bench' },
  ];
  for (const r of vmAuditResponses) {
    await prisma.auditResponse.create({
      data: { auditId: vmAudit.id, itemId: r.itemId, value: r.value, notes: r.notes, createdAt: vmAuditCompleted },
    });
  }
  await prisma.cAPA.create({
    data: {
      id: 'capa-vm-1',
      auditId: vmAudit.id,
      title: 'Raw/cooked storage separation – Mumbai',
      description: 'Raw chicken was stored above cooked paneer in the walk-in chiller. Re-train kitchen team on segregation rules and resegregate shelves with colour-coded trays.',
      assignedToId: vmUserId('mumbai', 'manager'),
      priority: 'HIGH',
      status: 'OPEN',
      dueDate: daysAgo(-3, 12, 0), // 3 days after the audit
      createdAt: vmAuditCompleted,
      updatedAt: vmAuditCompleted,
    },
  });
  console.log('  ✅ Completed Audit: Mumbai – Daily HACCP (score 73.3 / 6) with 9 responses + 1 OPEN CAPA (storage segregation)');

  // Completed HACCP audit at Lucknow (11th branch) with one low-scored item → MEDIUM CAPA
  const vmLucknowAuditStarted = daysAgo(2, 9, 0);
  const vmLucknowAuditCompleted = daysAgo(2, 9, 35);
  const vmLucknowAudit = await prisma.audit.create({
    data: {
      id: 'aud-vm-lucknow-haccp',
      tenantId: vmTenant.id,
      siteId: vmSites.get('lucknow')!.id,
      templateId: vmHaccpTemplate.id,
      title: 'Lucknow – Daily HACCP Audit',
      auditorId: vmCentralIds['u-vm-quality']!,
      status: 'COMPLETED',
      score: 86.7,
      maxScore: 6,
      startedAt: vmLucknowAuditStarted,
      completedAt: vmLucknowAuditCompleted,
      createdAt: vmLucknowAuditStarted,
      updatedAt: vmLucknowAuditCompleted,
    },
  });
  const vmLucknowAuditResponses: { itemId: string; value: string; notes?: string }[] = [
    { itemId: 'aqi-vm-haccp-1', value: '3.1°C', notes: 'Walk-in chiller logged at 3.1°C — within range' },
    { itemId: 'aqi-vm-haccp-2', value: '-18°C', notes: 'Freezer at -18°C' },
    { itemId: 'aqi-vm-haccp-3', value: 'pass', notes: 'Logs signed by kitchen lead' },
    { itemId: 'aqi-vm-haccp-4', value: 'pass', notes: 'Sinks stocked at all stations' },
    { itemId: 'aqi-vm-haccp-5', value: 'yes' },
    { itemId: 'aqi-vm-haccp-6', value: '4', notes: 'Grill station clean at pre-service check' },
    { itemId: 'aqi-vm-haccp-7', value: 'pass', notes: 'Segregation verified — colour-coded trays in use' },
    { itemId: 'aqi-vm-haccp-8', value: '76°C', notes: 'Butter chicken core temp logged' },
    { itemId: 'aqi-vm-haccp-9', value: '2', notes: 'Debris under prep bench near the pass' },
  ];
  for (const r of vmLucknowAuditResponses) {
    await prisma.auditResponse.create({
      data: { auditId: vmLucknowAudit.id, itemId: r.itemId, value: r.value, notes: r.notes, createdAt: vmLucknowAuditCompleted },
    });
  }
  await prisma.cAPA.create({
    data: {
      id: 'capa-vm-lucknow-1',
      auditId: vmLucknowAudit.id,
      title: 'Prep-area cleanliness – Lucknow',
      description: 'Debris found under the prep bench near the pass. Add end-of-shift wipe-down to the closing checklist and re-inspect within 48 hours.',
      assignedToId: vmUserId('lucknow', 'manager'),
      priority: 'MEDIUM',
      status: 'OPEN',
      dueDate: daysAgo(-1, 12, 0), // 1 day after the audit
      createdAt: vmLucknowAuditCompleted,
      updatedAt: vmLucknowAuditCompleted,
    },
  });
  console.log('  ✅ Completed Audit: Lucknow – Daily HACCP (score 86.7 / 6) with 9 responses + 1 OPEN CAPA (prep-area cleanliness)');

  // ═══════════════════════════════════════════
  // 7.6 Unified Incident Taxonomy (QA / RA / Maintenance / Controls)
  // ═══════════════════════════════════════════
  type CategorySeed = { name: string; children: CategorySeed[] };
  // QA
  const qaTaxonomy: CategorySeed[] = [
    {
      name: 'Food Safety',
      children: [
        { name: 'Receiving & Storage', children: ['Cold receiving temps', 'FIFO rotation', 'Dry store checks', 'Stock age monitoring'].map((n) => ({ name: n, children: [] })) },
        { name: 'Labelling & Allergens', children: ['Allergen labels', 'Date labels', 'Cross-contact risk', 'Menu allergen info'].map((n) => ({ name: n, children: [] })) },
        { name: 'Hygiene & Sanitation', children: ['Hand hygiene', 'Surface sanitation', 'Pest control', 'Waste handling'].map((n) => ({ name: n, children: [] })) },
        { name: 'Cooking & Holding Temps', children: ['Core cooking temps', 'Hot holding', 'Cold holding', 'Reheating protocol'].map((n) => ({ name: n, children: [] })) },
      ],
    },
    {
      name: 'QA Audit',
      children: [
        { name: 'Scheduled Audits', children: ['Daily HACCP', 'Weekly walkthrough', 'Monthly deep-clean', 'Surprise audit'].map((n) => ({ name: n, children: [] })) },
        { name: 'Follow-ups', children: ['CAPA closure', 'Re-audit', 'Evidence upload', 'Escalation review'].map((n) => ({ name: n, children: [] })) },
        { name: 'Team & Training', children: ['Training records', 'Certification expiry', 'Induction checks', 'Refresher schedule'].map((n) => ({ name: n, children: [] })) },
      ],
    },
    {
      name: 'Customer Feedback',
      children: [
        { name: 'Complaints', children: ['Food quality', 'Service', 'Hygiene', 'Ambience'].map((n) => ({ name: n, children: [] })) },
        { name: 'Survey Signals', children: ['Low NPS', 'Allergy concerns', 'Repeat complaint', 'Praise follow-up'].map((n) => ({ name: n, children: [] })) },
      ],
    },
  ];
  // RA
  const raTaxonomy: CategorySeed[] = [
    {
      name: 'Payments',
      children: [
        { name: 'Refund Anomalies', children: ['Excess refund', 'Duplicate refund', 'Unapproved refund', 'Refund without receipt'].map((n) => ({ name: n, children: [] })) },
        { name: 'No-Sale Events', children: ['Excess no-sale', 'No-sale without void', 'Till variance', 'Manager override'].map((n) => ({ name: n, children: [] })) },
        { name: 'Mismatches', children: ['Settlement mismatch', 'Payment vs order', 'End-of-day variance', 'Mode mismatch'].map((n) => ({ name: n, children: [] })) },
      ],
    },
    {
      name: 'Revenue Leakage',
      children: [
        { name: 'Orders', children: ['Discount outliers', 'Missing payment', 'Zero-total order', 'Manual price override'].map((n) => ({ name: n, children: [] })) },
        { name: 'Void Spikes', children: ['High void rate', 'Prep-side voids', 'Late voids', 'Bulk item void'].map((n) => ({ name: n, children: [] })) },
      ],
    },
    {
      name: 'Compliance',
      children: [
        { name: 'Taxation', children: ['Missing taxes', 'Wrong GST', 'Rounding errors', 'Tax rate mismatch'].map((n) => ({ name: n, children: [] })) },
        { name: 'Audit Trail', children: ['Deleted orders', 'Override events', 'User anomalies', 'Timestamp gaps'].map((n) => ({ name: n, children: [] })) },
      ],
    },
    {
      name: 'Reporting',
      children: [
        { name: 'Daily', children: ['Sales report', 'Anomaly summary', 'Deposit check', 'Exception log'].map((n) => ({ name: n, children: [] })) },
        { name: 'Weekly', children: ['Revenue trends', 'Leakage follow-up', 'Top risk sites', 'Action tracker'].map((n) => ({ name: n, children: [] })) },
      ],
    },
  ];
  // MAINTENANCE
  const mntTaxonomy: CategorySeed[] = [
    {
      name: 'Equipment',
      children: [
        { name: 'Kitchen Assets', children: ['Walk-in cooler', 'Fryer', 'Grill', 'Refrigeration'].map((n) => ({ name: n, children: [] })) },
        { name: 'Bakery & Beverage', children: ['Oven', 'Coffee machine', 'Blender', 'Dishwasher'].map((n) => ({ name: n, children: [] })) },
        { name: 'HVAC', children: ['AC units', 'Exhaust hood', 'Ventilation', 'Thermostat'].map((n) => ({ name: n, children: [] })) },
      ],
    },
    {
      name: 'Electrical / Plumbing',
      children: [
        { name: 'Electrical', children: ['Power trip', 'Lighting', 'Wiring', 'Sockets'].map((n) => ({ name: n, children: [] })) },
        { name: 'Plumbing', children: ['Leak', 'Drainage', 'Water supply', 'Water heater'].map((n) => ({ name: n, children: [] })) },
      ],
    },
    {
      name: 'Safety & Compliance',
      children: [
        { name: 'Fire Safety', children: ['Extinguishers', 'Fire alarms', 'Emergency exits', 'Gas isolator'].map((n) => ({ name: n, children: [] })) },
        { name: 'Health & Safety', children: ['Slip hazard', 'Guarding', 'Signage', 'PPE availability'].map((n) => ({ name: n, children: [] })) },
      ],
    },
    {
      name: 'IT',
      children: [
        { name: 'POS', children: ['Till down', 'Printer', 'Barcode scanner', 'Card terminal'].map((n) => ({ name: n, children: [] })) },
        { name: 'KDS / Signage', children: ['KDS down', 'Display', 'Network', 'Screen health'].map((n) => ({ name: n, children: [] })) },
        { name: 'Back Office', children: ['Server', 'Router', 'CCTV', 'UPS'].map((n) => ({ name: n, children: [] })) },
      ],
    },
  ];
  // CONTROLS
  const ctlTaxonomy: CategorySeed[] = [
    {
      name: 'Menu & Pricing',
      children: [
        { name: 'Pricing Errors', children: ['Wrong price', 'Missing modifier charge', 'Incorrect discount', 'Price list mismatch'].map((n) => ({ name: n, children: [] })) },
        { name: 'Recipes', children: ['Recipe mismatch', 'Yield variance', 'Standardisation', 'Costing error'].map((n) => ({ name: n, children: [] })) },
      ],
    },
    {
      name: 'Inventory / COGS',
      children: [
        { name: 'Variance', children: ['Stock variance', 'Wastage', 'Shrinkage', 'Damaged stock'].map((n) => ({ name: n, children: [] })) },
        { name: 'Counting', children: ['Variance in count', 'Ghost stock', 'Cycle count issues', 'Counting error'].map((n) => ({ name: n, children: [] })) },
      ],
    },
    {
      name: 'Finance',
      children: [
        { name: 'Month-End', children: ['Reconciliation issues', 'Accruals', 'Cut-off breaches', 'GL mismatch'].map((n) => ({ name: n, children: [] })) },
        { name: 'Taxation', children: ['GST mismatch', 'TDS', 'Invoice errors', 'Input credit'].map((n) => ({ name: n, children: [] })) },
      ],
    },
    {
      name: 'Supplier',
      children: [
        { name: 'Invoicing', children: ['Invoice mismatch', 'Duplicate invoice', 'Overbilling', 'Late invoice'].map((n) => ({ name: n, children: [] })) },
        { name: 'Quality', children: ['Delivery quality', 'Short delivery', 'Pricing disputes', 'Contract terms'].map((n) => ({ name: n, children: [] })) },
      ],
    },
  ];

  const seedCategoryTree = async (department: string, nodes: CategorySeed[]) => {
    const createNode = async (node: CategorySeed, level: number, parentId: string | null): Promise<void> => {
      const cat = await prisma.incidentCategory.create({
        data: {
          department: department as never,
          level,
          name: node.name,
          parentId,
          tenantId: vmTenant.id,
          siteId: null,
        },
      });
      for (const child of node.children) {
        await createNode(child, level + 1, cat.id);
      }
    };
    for (const n of nodes) {
      await createNode(n, 1, null);
    }
  };

  const taxonomies: { dept: string; tree: CategorySeed[] }[] = [
    { dept: 'QA', tree: qaTaxonomy },
    { dept: 'RA', tree: raTaxonomy },
    { dept: 'MAINTENANCE', tree: mntTaxonomy },
    { dept: 'CONTROLS', tree: ctlTaxonomy },
  ];
  for (const { dept, tree } of taxonomies) {
    await seedCategoryTree(dept, tree);
    console.log(`  ✅ Incident taxonomy: ${dept} (3-level)`);
  }

  // ═══════════════════════════════════════════
  // 7.7 MAINTENANCE_ASSURANCE + CONTROLS users
  // ═══════════════════════════════════════════
  const vmAssuranceCentral = [
    { id: 'u-vm-maintenance', email: 'vishal.maintenance@vishalmc.in', firstName: 'Maintenance', lastName: 'Central MNT', role: 'MAINTENANCE_ASSURANCE' },
    { id: 'u-vm-controls', email: 'vishal.controls@vishalmc.in', firstName: 'Controls', lastName: 'Central CTL', role: 'CONTROLS' },
  ] as const;
  for (const u of vmAssuranceCentral) {
    await prisma.user.create({
      data: {
        id: u.id,
        tenantId: vmTenant.id,
        email: u.email,
        passwordHash: staffPasswordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role as never,
        status: 'ACTIVE',
        lastLoginAt: new Date(),
      },
    });
    console.log(`  ✅ User: ${u.firstName} ${u.lastName} (${u.role}, central) — ${u.email}`);
  }

  const vmAssuranceSiteRoles = [
    { suffix: 'maintenance', role: 'MAINTENANCE_ASSURANCE', lastName: 'Maintenance' },
    { suffix: 'controls', role: 'CONTROLS', lastName: 'Controls' },
  ] as const;
  let vmAssuranceSiteCount = 0;
  for (const c of vmCities) {
    for (const r of vmAssuranceSiteRoles) {
      await prisma.user.create({
        data: {
          id: `u-vm-${c.slug}-${r.suffix}`,
          tenantId: vmTenant.id,
          siteId: vmSites.get(c.slug)!.id,
          email: `${c.slug}.${r.suffix}@vishalmc.in`,
          passwordHash: staffPasswordHash,
          firstName: c.city,
          lastName: r.lastName,
          role: r.role as never,
          status: 'ACTIVE',
          lastLoginAt: new Date(),
        },
      });
      vmAssuranceSiteCount += 1;
    }
  }
  console.log(`  ✅ Users: 2 central MAINTENANCE_ASSURANCE/CONTROLS + ${vmAssuranceSiteCount} site-level (${vmCities.length} branches × 2)`);

  console.log('\n🎉 Seed complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
