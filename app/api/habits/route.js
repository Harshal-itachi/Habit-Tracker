import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { authenticateUser } from "@/lib/auth";

import Habit from "@/models/Habit";

import { createHabitSchema } from "@/validations/habits";

/*
|--------------------------------------------------------------------------
| GET /api/habits
|--------------------------------------------------------------------------
| Get all habits belonging to the authenticated user.
|--------------------------------------------------------------------------
*/

export async function GET() {
  try {
    await connectDB();

    const auth = await authenticateUser();

    if (!auth.success) {
      return NextResponse.json(
        {
          success: false,
          message: auth.message,
        },
        {
          status: auth.status,
        }
      );
    }

    const habits = await Habit.find({
      userId: auth.userId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    return NextResponse.json({
      success: true,
      habits,
    });
  } catch (error) {
    console.error("Get habits error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch habits",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST /api/habits
|--------------------------------------------------------------------------
| Create a new habit for the authenticated user.
|--------------------------------------------------------------------------
*/

export async function POST(request) {
  try {
    await connectDB();

    const auth = await authenticateUser();

    if (!auth.success) {
      return NextResponse.json(
        {
          success: false,
          message: auth.message,
        },
        {
          status: auth.status,
        }
      );
    }

    const body = await request.json();

    const validation = createHabitSchema.safeParse(body);

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
      description,
    } = validation.data;

    const habit = await Habit.create({
      userId: auth.userId,
      name,
      description,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Habit created successfully",
        habit,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Create habit error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create habit",
      },
      {
        status: 500,
      }
    );
  }
}