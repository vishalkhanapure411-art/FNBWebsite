import {
  SubscriptionTier,
  TenantStatus,
  SiteType,
  SiteStatus,
  Role,
  UserStatus,
  TableStatus,
  MenuType,
  Station,
  MenuItemStatus,
  OrderType,
  OrderChannel,
  OrderStatus,
  OrderItemStatus,
  DiscountType,
  PaymentMethod,
  PaymentStatus,
  ShiftStatus,
} from '../enums';

// ══════════════════════════════════════════════════
// TENANT & SITE
// ══════════════════════════════════════════════════

export interface TenantAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface TenantThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  fontFamily?: string;
}

export interface TenantFeatureFlags {
  pos?: boolean;
  kds?: boolean;
  staffManagement?: boolean;
  maintenance?: boolean;
  qualityCompliance?: boolean;
  digitalSignage?: boolean;
  customerSurveys?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  legalName?: string;
  taxId?: string;
  email: string;
  phone?: string;
  address?: TenantAddress;
  logoUrl?: string;
  themeConfig?: TenantThemeConfig;
  subscriptionTier: SubscriptionTier;
  featureFlags?: TenantFeatureFlags;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SiteAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface BankingDetails {
  bankName: string;
  accountNumber: string;
  routingNumber: string;
}

export interface OpeningHoursDay {
  open: string;
  close: string;
}

export interface SiteConfig {
  openingHours?: Record<string, OpeningHoursDay>;
  capacity?: number;
  currency?: string;
  isDeliveryOnly?: boolean;
}

export interface Site {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  siteType: SiteType;
  cuisine: string[];
  legalEntity?: string;
  taxNumber?: string;
  bankingDetails?: BankingDetails;
  address?: SiteAddress;
  timezone: string;
  phone?: string;
  email?: string;
  siteConfig?: SiteConfig;
  status: SiteStatus;
  goLiveDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════
// USER & RBAC
// ══════════════════════════════════════════════════

export interface UserPermissions {
  all?: boolean;
  [key: string]: boolean | undefined;
}

export interface User {
  id: string;
  tenantId?: string | null;
  email: string;
  phone?: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: Role;
  permissions?: UserPermissions;
  siteId?: string | null;
  status: UserStatus;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════
// FLOOR PLAN & TABLES
// ══════════════════════════════════════════════════

export interface FloorPlanLayoutSection {
  name: string;
  color: string;
}

export interface FloorPlanLayout {
  gridWidth: number;
  gridHeight: number;
  sections: FloorPlanLayoutSection[];
}

export interface FloorPlan {
  id: string;
  siteId: string;
  name: string;
  description?: string;
  layout?: FloorPlanLayout;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TablePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Table {
  id: string;
  floorPlanId: string;
  siteId: string;
  number: string;
  section?: string;
  capacity: number;
  status: TableStatus;
  position?: TablePosition;
  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════
// MENU
// ══════════════════════════════════════════════════

export interface AvailabilitySchedule {
  [day: string]: Array<{ start: string; end: string }>;
}

export interface Menu {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  menuType: MenuType;
  isActive: boolean;
  availabilitySchedule?: AvailabilitySchedule;
  categories?: MenuCategory[];
  items?: MenuItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuCategory {
  id: string;
  menuId: string;
  name: string;
  description?: string;
  sortOrder: number;
  imageUrl?: string;
  items?: MenuItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  menuId: string;
  name: string;
  description?: string;
  shortCode?: string;
  imageUrl?: string;
  price: number;
  costPrice?: number;
  taxRate: number;
  prepTimeMinutes: number;
  station: Station;
  dietaryTags: string[];
  allergens: string[];
  status: MenuItemStatus;
  sortOrder: number;
  modifierGroups?: MenuItemModifierGroup[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItemModifierGroup {
  id: string;
  menuItemId: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  sortOrder: number;
  modifiers?: MenuItemModifier[];
}

export interface MenuItemModifier {
  id: string;
  modifierGroupId: string;
  name: string;
  priceAdjustment: number;
  isDefault: boolean;
  sortOrder: number;
}

// ══════════════════════════════════════════════════
// ORDERS
// ══════════════════════════════════════════════════

export interface Order {
  id: string;
  tenantId: string;
  siteId: string;
  userId?: string | null;
  customerId?: string | null;
  orderNumber: number;
  orderType: OrderType;
  channel: OrderChannel;
  status: OrderStatus;
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  tableId?: string | null;
  guestCount: number;
  notes?: string;
  aggregatorOrderId?: string;
  items?: OrderItem[];
  discounts?: Discount[];
  payments?: Payment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  station: Station;
  status: OrderItemStatus;
  notes?: string;
  firedAt?: Date;
  completedAt?: Date;
  modifiers?: OrderItemModifier[];
  createdAt: Date;
}

export interface OrderItemModifier {
  id: string;
  orderItemId: string;
  modifierName: string;
  priceAdjustment: number;
}

// ══════════════════════════════════════════════════
// DISCOUNTS & PAYMENTS
// ══════════════════════════════════════════════════

export interface Discount {
  id: string;
  orderId: string;
  type: DiscountType;
  value: number;
  reason?: string;
  approvedBy?: string | null;
  createdAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, unknown>;
  refundReason?: string;
  refundApprovedBy?: string | null;
  createdAt: Date;
}

// ══════════════════════════════════════════════════
// SHIFT & STAFF
// ══════════════════════════════════════════════════

export interface Shift {
  id: string;
  siteId: string;
  name: string;
  startTime: Date;
  endTime?: Date | null;
  openedById: string;
  closedById?: string | null;
  openingCash?: number;
  closingCash?: number;
  expectedCash?: number;
  cashVariance?: number;
  notes?: string;
  status: ShiftStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShiftStaff {
  shiftId: string;
  userId: string;
}

// ══════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════

export interface AuditLog {
  id: string;
  tenantId: string;
  siteId?: string | null;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}
