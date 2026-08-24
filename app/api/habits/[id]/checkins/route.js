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

import { createCheckInSchema } from "@/validations/checkin";

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
          message: auth.message,
        },
        {
          status: auth.status,
        }
      );
    }

    const { id } = await params;

    /*
    |--------------------------------------------------------------------------
    | Validate habit ID
    |--------------------------------------------------------------------------
    */

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
    | Get user
    |--------------------------------------------------------------------------
    */

    const user = await User.findById(auth.userId).select(
      "_id timezone"
    );

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
    | Make sure habit belongs to this user
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
    | Validate request body
    |--------------------------------------------------------------------------
    */

    const body = await request.json();

    const validation = createCheckInSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        },
        {
          status: 400,
        }
      );
    }

    const { date } = validation.data;

    /*
    |--------------------------------------------------------------------------
    | Validate that date is an actual calendar date
    |--------------------------------------------------------------------------
    */

    if (!isValidLocalDate(date, user.timezone)) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_DATE",
          message:
            "Invalid date. Please provide a valid local date in YYYY-MM-DD format.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Get today's date according to the user's timezone
    |--------------------------------------------------------------------------
    */

    const today = getTodayInTimezone(user.timezone);

    /*
    |--------------------------------------------------------------------------
    | Reject future dates
    |--------------------------------------------------------------------------
    */

    if (isFutureLocalDate(date, user.timezone)) {
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
    | Check whether this local date already exists
    |--------------------------------------------------------------------------
    */

    const existingCheckIn = await CheckIn.findOne({
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
      | Handle database unique-index race condition
      |--------------------------------------------------------------------------
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
    console.error("Create check-in error:", error);

    return NextResponse.json(
      {
        success: false,
        code: "CHECKIN_CREATE_FAILED",
        message: "Failed to create check-in",
      },
      {
        status: 500,
      }
    );
  }
}