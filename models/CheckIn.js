import mongoose from "mongoose";

const checkInSchema = new mongoose.Schema(
  {
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Habit",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    localDate: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * A habit can only have one check-in
 * for a particular local calendar day.
 *
 * Example:
 *
 * habitId + 2026-08-25
 *
 * can exist only once.
 */
checkInSchema.index(
  {
    habitId: 1,
    localDate: 1,
  },
  {
    unique: true,
  }
);

const CheckIn =
  mongoose.models.CheckIn ||
  mongoose.model("CheckIn", checkInSchema);

export default CheckIn;