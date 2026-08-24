import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { authenticateUser } from "@/lib/auth";

import User from "@/models/User";
import Habit from "@/models/Habit";
import CheckIn from "@/models/CheckIn";

import {
  getTodayInTimezone,
  isFutureLocalDate,
  isValidLocalDate,
} from "@/lib/timezone";

/*
|--------------------------------------------------------------------------
| Validate MongoDB ObjectId
|--------------------------------------------------------------------------
*/

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/*
|--------------------------------------------------------------------------
| POST /api/habits/:id/checkins
|--------------------------------------------------------------------------
|
| Create a check-in for today or a previous local date.
|
*/

export async function POST(request, { params }) {
  try {
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
    | Get habit ID
    |--------------------------------------------------------------------------
    */

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_HABIT_ID",
          message: "Invalid habit ID",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Find user
    |--------------------------------------------------------------------------
    */

    const user = await User.findById(
      auth.userId
    ).select("_id timezone");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
        {
          status: 404,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | User timezone must exist
    |--------------------------------------------------------------------------
    */

    if (!user.timezone) {
      return NextResponse.json(
        {
          success: false,
          code: "TIMEZONE_NOT_CONFIGURED",
          message:
            "Your timezone is not configured",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Make sure habit belongs to logged-in user
    |--------------------------------------------------------------------------
    */

    const habit = await Habit.findOne({
      _id: id,
      userId: auth.userId,
    });

    if (!habit) {
      return NextResponse.json(
        {
          success: false,
          code: "HABIT_NOT_FOUND",
          message: "Habit not found",
        },
        {
          status: 404,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Read request body
    |--------------------------------------------------------------------------
    */

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_JSON",
          message: "Request body must contain valid JSON",
        },
        {
          status: 400,
        }
      );
    }

    const { date } = body;

    /*
    |--------------------------------------------------------------------------
    | Validate date format
    |--------------------------------------------------------------------------
    */

    if (!date) {
      return NextResponse.json(
        {
          success: false,
          code: "DATE_REQUIRED",
          message: "Date is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_DATE_FORMAT",
          message:
            "Date must be in YYYY-MM-DD format",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Validate actual calendar date
    |--------------------------------------------------------------------------
    */

    const validDate = isValidLocalDate(
      date,
      user.timezone
    );

    if (!validDate) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_DATE",
          message: "The provided date is invalid",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Get today's local date
    |--------------------------------------------------------------------------
    */

    const today = getTodayInTimezone(
      user.timezone
    );

    /*
    |--------------------------------------------------------------------------
    | Reject future date
    |--------------------------------------------------------------------------
    */

    if (
      isFutureLocalDate(
        date,
        user.timezone
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "FUTURE_DATE",
          message: `You cannot check in for a future date. Today is ${today}.`,
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent duplicate check-in
    |--------------------------------------------------------------------------
    */

    const existingCheckIn =
      await CheckIn.findOne({
        habitId: habit._id,
        userId: auth.userId,
        localDate: date,
      });

    if (existingCheckIn) {
      return NextResponse.json(
        {
          success: false,
          code: "DUPLICATE_CHECKIN",
          message: `This habit is already checked in for ${date}.`,
        },
        {
          status: 409,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Create check-in
    |--------------------------------------------------------------------------
    */

    try {
      const checkIn = await CheckIn.create({
        habitId: habit._id,
        userId: auth.userId,
        localDate: date,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Check-in recorded successfully",

          checkIn: {
            id: checkIn._id,
            habitId: checkIn.habitId,
            userId: checkIn.userId,
            localDate: checkIn.localDate,
          },
        },
        {
          status: 201,
        }
      );
    } catch (error) {
      /*
      |--------------------------------------------------------------------------
      | MongoDB duplicate-key protection
      |--------------------------------------------------------------------------
      |
      | Even if two requests arrive at exactly the same
      | time, the database unique index should prevent
      | duplicate local dates.
      |
      */

      if (error?.code === 11000) {
        return NextResponse.json(
          {
            success: false,
            code: "DUPLICATE_CHECKIN",
            message: `This habit is already checked in for ${date}.`,
          },
          {
            status: 409,
          }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error(
      "================================"
    );

    console.error("CREATE CHECK-IN ERROR:");
    console.error(error);

    console.error(
      "================================"
    );

    return NextResponse.json(
      {
        success: false,
        code: "CHECKIN_CREATE_FAILED",
        message:
          error?.message ||
          "Failed to create check-in",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| GET /api/habits/:id/checkins
|--------------------------------------------------------------------------
|
| Get all check-ins for a specific habit.
|
*/

export async function GET(request, { params }) {
  try {
    await connectDB();

    /*
    |--------------------------------------------------------------------------
    | Authenticate
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
    | Get habit ID
    |--------------------------------------------------------------------------
    */

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_HABIT_ID",
          message: "Invalid habit ID",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Make sure habit belongs to user
    |--------------------------------------------------------------------------
    */

    const habit = await Habit.findOne({
      _id: id,
      userId: auth.userId,
    });

    if (!habit) {
      return NextResponse.json(
        {
          success: false,
          code: "HABIT_NOT_FOUND",
          message: "Habit not found",
        },
        {
          status: 404,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Get check-ins
    |--------------------------------------------------------------------------
    */

    const checkIns = await CheckIn.find({
      habitId: habit._id,
      userId: auth.userId,
    })
      .select("_id habitId localDate createdAt")
      .sort({
        localDate: 1,
      })
      .lean();

    return NextResponse.json({
      success: true,
      checkIns,
    });
  } catch (error) {
    console.error(
      "================================"
    );

    console.error("GET CHECK-INS ERROR:");
    console.error(error);

    console.error(
      "================================"
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to fetch check-ins",
      },
      {
        status: 500,
      }
    );
  }
}