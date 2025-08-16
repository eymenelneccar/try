
import dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();

import { hashPassword } from "./auth";
import { storage } from "./storage";

async function setupDefaultUser() {
  try {
    // Check if admin user already exists
    const existingUser = await storage.getUserByUsername('admin');
    if (existingUser) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Create default admin user
    const hashedPassword = await hashPassword('admin123');
    const adminUser = await storage.createManualUser({
      username: 'admin',
      password: hashedPassword,
      role: 'admin'
    });

    console.log('✅ Default admin user created successfully');
    console.log('👤 Username: admin');
    console.log('🔑 Password: admin123');
    
  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
  }
}

setupDefaultUser();
