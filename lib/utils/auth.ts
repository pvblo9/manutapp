import bcrypt from "bcryptjs"
import type { User } from "@/types"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function getSession(): { user: User; token: string } | null {
  if (typeof window === "undefined") return null
  const session = localStorage.getItem("session")
  if (!session) return null
  try {
    return JSON.parse(session)
  } catch {
    return null
  }
}

export function setSession(user: User, token: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem("session", JSON.stringify({ user, token }))
}

export function clearSession(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("session")
}
