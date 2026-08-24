import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/db";
import { createToken, setAuthCookie } from "@/lib/auth";
import { registerSchema } from "@/validations/auth";
import User from "@/models/User";

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();

    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        },
        {
          status: 400,
        }
      );
    }

    const {
      name,
      email,
      password,
      timezone,
    } = validation.data;

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists",
        },
        {
          status: 409,
        }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
      timezone,
    });

    const token = createToken(user._id);

    await setAuthCookie(token);

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          timezone: user.timezone,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Registration error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while creating your account",
      },
      {
        status: 500,
      }
    );
  }
}