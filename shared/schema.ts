import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  date
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: varchar("username").unique(), // for manual user creation
  password: varchar("password"), // hashed password for manual user creation
  role: varchar("role").default('viewer'), // viewer, editor, admin
  isManualUser: boolean("is_manual_user").default(false), // distinguish between Replit Auth users and manual users
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  menuUrl: text("menu_url"),
  joinDate: date("join_date").notNull(),
  subscriptionType: varchar("subscription_type").notNull(), // annual, semi-annual, quarterly
  expiryDate: date("expiry_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Income entries table
export const incomeEntries = pgTable("income_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => customers.id),
  type: varchar("type").notNull(), // prints, subscription, deposit
  printType: text("print_type"), // only if type is prints
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  isDeposit: boolean("is_deposit").default(false), // هل هذا عربون؟
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }), // المبلغ الكامل (للعربون فقط)
  receiptUrl: text("receipt_url"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Receivables table - المستحقات المالية
export const receivables = pgTable("receivables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => customers.id),
  incomeEntryId: varchar("income_entry_id").references(() => incomeEntries.id), // العربون الأصلي
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(), // المبلغ الكامل
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).notNull(), // المبلغ المدفوع
  remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }).notNull(), // المبلغ المتبقي
  status: varchar("status").notNull().default('pending'), // pending, partial, paid
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Receivable payments table - دفعات المستحقات
export const receivablePayments = pgTable("receivable_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  receivableId: varchar("receivable_id").references(() => receivables.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  receiptUrl: text("receipt_url"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expense entries table
export const expenseEntries = pgTable("expense_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employees table
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  position: text("position"),
  salary: decimal("salary", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activities log table for recent activities
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(), // customer_added, payment_received, warning_sent, etc.
  description: text("description").notNull(),
  relatedId: varchar("related_id"), // ID of related entity
  createdAt: timestamp("created_at").defaultNow(),
});

// Create insert schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  expiryDate: true, // calculated automatically
});

export const insertIncomeEntrySchema = createInsertSchema(incomeEntries).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseEntrySchema = createInsertSchema(expenseEntries).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertManualUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  email: true, // not required for manual users
  firstName: true, // not required for manual users
  lastName: true, // not required for manual users
  profileImageUrl: true, // not required for manual users
}).extend({
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  role: z.enum(["viewer", "editor", "admin"]).default("viewer"),
});

export const insertReceivableSchema = createInsertSchema(receivables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReceivablePaymentSchema = createInsertSchema(receivablePayments).omit({
  id: true,
  createdAt: true,
});

// Export types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertManualUser = z.infer<typeof insertManualUserSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type IncomeEntry = typeof incomeEntries.$inferSelect;
export type InsertIncomeEntry = z.infer<typeof insertIncomeEntrySchema>;
export type ExpenseEntry = typeof expenseEntries.$inferSelect;
export type InsertExpenseEntry = z.infer<typeof insertExpenseEntrySchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Receivable = typeof receivables.$inferSelect;
export type InsertReceivable = z.infer<typeof insertReceivableSchema>;
export type ReceivablePayment = typeof receivablePayments.$inferSelect;
export type InsertReceivablePayment = z.infer<typeof insertReceivablePaymentSchema>;
