import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { authenticateUser } from "@/lib/auth";

import User from "@/models/User";
import Habit from "@/models/Habit";
import CheckIn from "@/models/CheckIn";

import { getTodayInTimezone } from "@/lib/timezone";
import { calculateStreaks } from "@/lib/streak";

export async function GET() {
  try {
    /*
    |--------------------------------------------------------------------------
    | Connect to database
    |--------------------------------------------------------------------------
    */

    await connectDB();

    /*
    |--------------------------------------------------------------------------
    | Authenticate user
    |--------------------------------------------------------------------------
    */

    const auth = await authenticateUser();

    if (!auth.success) {
      return NextResponse.json(
        {
          success: false,
          message: auth.message || "Unauthorized",
        },
        {
          status: auth.status || 401,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Get authenticated user
    |--------------------------------------------------------------------------
    */

    const user = await User.findById(auth.userId)
      .select("_id name email timezone")
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        {
          status: 404,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Validate timezone
    |--------------------------------------------------------------------------
    */

    if (!user.timezone) {
      return NextResponse.json(
        {
          success: false,
          message: "User timezone is not configured",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Get today's date according to user's timezone
    |--------------------------------------------------------------------------
    */

    const today = getTodayInTimezone(
      user.timezone
    );

    /*
    |--------------------------------------------------------------------------
    | Get user's habits
    |--------------------------------------------------------------------------
    */

    const habits = await Habit.find({
      userId: user._id,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    /*
    |--------------------------------------------------------------------------
    | Get all check-ins for this user
    |--------------------------------------------------------------------------
    |
    | We fetch them in one query instead of querying the database
    | separately for every habit.
    |
    */

    const checkIns = await CheckIn.find({
      userId: user._id,
    })
      .select("_id habitId localDate createdAt")
      .sort({
        localDate: 1,
      })
      .lean();

    /*
    |--------------------------------------------------------------------------
    | Group check-ins by habit
    |--------------------------------------------------------------------------
    */

    const checkInsByHabit = new Map();

    for (const checkIn of checkIns) {
      const habitId = String(checkIn.habitId);

      if (!checkInsByHabit.has(habitId)) {
        checkInsByHabit.set(habitId, []);
      }

      checkInsByHabit
        .get(habitId)
        .push(checkIn.localDate);
    }

    /*
    |--------------------------------------------------------------------------
    | Build dashboard habits
    |--------------------------------------------------------------------------
    */

    const dashboardHabits = habits.map((habit) => {
      const habitId = String(habit._id);

      const dates =
        checkInsByHabit.get(habitId) || [];

      const streaks = calculateStreaks(
        dates,
        today
      );

      return {
        id: habit._id,
        name: habit.name,
        description: habit.description || "",

        checkedInToday:
          dates.includes(today),

        currentStreak:
          streaks.currentStreak,

        longestStreak:
          streaks.longestStreak,

        checkIns: dates,
      };
    });

    /*
    |--------------------------------------------------------------------------
    | Return dashboard
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
      },

      today,

      habits: dashboardHabits,
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Log actual error
    |--------------------------------------------------------------------------
    */

    console.error(
      "================================="
    );

    console.error("DASHBOARD API ERROR:");

    console.error(error);

    console.error(
      "================================="
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to load dashboard",
      },
      {
        status: 500,
      }
    );
  }
}