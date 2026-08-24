import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in .env.local");
}

const COOKIE_NAME = "habit_tracker_token";

export function createToken(userId) {
  return jwt.sign(
    {
      userId: userId.toString(),
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

export async function setAuthCookie(token) {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function getAuthToken() {
  const cookieStore = await cookies();

  return cookieStore.get(COOKIE_NAME)?.value || null;
}

export async function authenticateUser() {
  try {
    const token = await getAuthToken();

    if (!token) {
      return {
        success: false,
        message: "Authentication required",
        status: 401,
      };
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    return {
      success: true,
      userId: decoded.userId,
    };
  } catch (error) {
    return {
      success: false,
      message: "Invalid or expired authentication token",
      status: 401,
    };
  }
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}