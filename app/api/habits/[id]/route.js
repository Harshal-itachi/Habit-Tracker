import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { authenticateUser } from "@/lib/auth";

import Habit from "@/models/Habit";
import CheckIn from "@/models/CheckIn";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/*
|--------------------------------------------------------------------------
| GET /api/habits/:id
|--------------------------------------------------------------------------
*/

export async function GET(request, { params }) {
  try {
    await connectDB();

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

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid habit ID",
        },
        {
          status: 400,
        }
      );
    }

    const habit = await Habit.findOne({
      _id: id,
      userId: auth.userId,
    }).lean();

    if (!habit) {
      return NextResponse.json(
        {
          success: false,
          message: "Habit not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      habit,
    });
  } catch (error) {
    console.error("GET HABIT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch habit",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| PUT /api/habits/:id
|--------------------------------------------------------------------------
*/

export async function PUT(request, { params }) {
  try {
    await connectDB();

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

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid habit ID",
        },
        {
          status: 400,
        }
      );
    }

    const body = await request.json();

    const updateData = {};

    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updateData.description =
        body.description.trim();
    }

    if (
      !updateData.name &&
      updateData.description === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Nothing to update",
        },
        {
          status: 400,
        }
      );
    }

    const habit = await Habit.findOneAndUpdate(
      {
        _id: id,
        userId: auth.userId,
      },
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!habit) {
      return NextResponse.json(
        {
          success: false,
          message: "Habit not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Habit updated successfully",
      habit,
    });
  } catch (error) {
    console.error("PUT HABIT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Failed to update habit",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| DELETE /api/habits/:id
|--------------------------------------------------------------------------
*/

export async function DELETE(request, { params }) {
  try {
    console.log("DELETE HABIT API CALLED");

    await connectDB();

    console.log("Database connected");

    const auth = await authenticateUser();

    console.log("Authentication:", auth.success);

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

    const { id } = await params;

    console.log("Habit ID:", id);
    console.log("User ID:", auth.userId);

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid habit ID",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Find the habit belonging to the logged-in user
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
          message:
            "Habit not found or you do not have permission to delete it",
        },
        {
          status: 404,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Delete habit
    |--------------------------------------------------------------------------
    */

    await Habit.deleteOne({
      _id: habit._id,
      userId: auth.userId,
    });

    /*
    |--------------------------------------------------------------------------
    | Delete all check-ins belonging to this habit
    |--------------------------------------------------------------------------
    */

    const checkInDeleteResult =
      await CheckIn.deleteMany({
        habitId: habit._id,
        userId: auth.userId,
      });

    console.log(
      "Deleted check-ins:",
      checkInDeleteResult.deletedCount
    );

    return NextResponse.json({
      success: true,
      message: "Habit deleted successfully",
    });
  } catch (error) {
    console.error("================================");
    console.error("DELETE HABIT ERROR:");
    console.error(error);
    console.error("================================");

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Failed to delete habit",
      },
      {
        status: 500,
      }
    );
  }
}