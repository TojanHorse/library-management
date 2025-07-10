import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User logs for audit trail
export const userLogs = pgTable("user_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  action: text("action").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  adminId: text("admin_id"),
});

// Main users table for seat management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  seatNumber: integer("seat_number").notNull(),
  slot: text("slot").notNull(),
  feeStatus: text("fee_status").notNull().default("due"), // 'paid' | 'due' | 'expired'
  registrationDate: timestamp("registration_date").notNull().defaultNow(),
  idType: text("id_type"),
  idNumber: text("id_number"),
  idUpload: text("id_upload"),
});

// Seats table
export const seats = pgTable("seats", {
  number: integer("number").primaryKey(),
  status: text("status").notNull().default("available"), // 'available' | 'paid' | 'due' | 'expired'
  userId: text("user_id"),
});

// Admin table
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Settings table
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  slotPricing: json("slot_pricing").notNull(),
  slotTimings: json("slot_timings").notNull(),
  gmail: text("gmail").notNull(),
  appPassword: text("app_password").notNull(),
  telegramChatIds: json("telegram_chat_ids").notNull(),
  welcomeEmailTemplate: text("welcome_email_template").notNull(),
  dueDateEmailTemplate: text("due_date_email_template").notNull(),
  sendgridApiKey: text("sendgrid_api_key"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  phone: true,
  address: true,
  seatNumber: true,
  slot: true,
  feeStatus: true,
  idType: true,
  idNumber: true,
  idUpload: true,
});

export const insertSeatSchema = createInsertSchema(seats).pick({
  number: true,
  status: true,
  userId: true,
});

export const insertAdminSchema = createInsertSchema(admins).pick({
  username: true,
  password: true,
});

export const insertSettingsSchema = createInsertSchema(settings).pick({
  slotPricing: true,
  slotTimings: true,
  gmail: true,
  appPassword: true,
  telegramChatIds: true,
  welcomeEmailTemplate: true,
  dueDateEmailTemplate: true,
  sendgridApiKey: true,
});

export const insertUserLogSchema = createInsertSchema(userLogs).pick({
  userId: true,
  action: true,
  adminId: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSeat = z.infer<typeof insertSeatSchema>;
export type Seat = typeof seats.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof admins.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertUserLog = z.infer<typeof insertUserLogSchema>;
export type UserLog = typeof userLogs.$inferSelect;
