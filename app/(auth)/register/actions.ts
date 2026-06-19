"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

interface RegisterResult {
  error?: string;
  success?: boolean;
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<RegisterResult> {
  if (!name || !email || !password) {
    return { error: "All fields are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: { name, email, hashedPassword },
  });

  return { success: true };
}
