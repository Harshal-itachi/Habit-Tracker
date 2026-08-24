"use client";

import { useState } from "react";

export default function HabitCard({
  habit,
  today,
  onUpdated,
  onDeleted,
}) {
  const [showBackfill, setShowBackfill] =
    useState(false);

  const [date, setDate] = useState(today);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkIn(checkInDate) {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/habits/${habit.id}/checkins`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: checkInDate,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Check-in failed"
        );

        return;
      }

      if (onUpdated) {
        onUpdated();
      }
    } catch (error) {
      console.error(error);
      setError("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${habit.name}"? This will also delete its check-ins.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/habits/${habit.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Failed to delete habit"
        );

        return;
      }

      if (onDeleted) {
        onDeleted(habit.id);
      }
    } catch (error) {
      console.error(error);
      setError("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {habit.name}
          </h2>

          {habit.description && (
            <p className="mt-1 text-sm text-slate-500">
              {habit.description}
            </p>
          )}
        </div>

     <button
  onClick={handleDelete}
  disabled={loading}
  className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
>
  {loading ? "Deleting..." : "Delete"}
</button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Current streak
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {habit.currentStreak}
          </p>

          <p className="text-xs text-slate-400">
            days
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Longest streak
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {habit.longestStreak}
          </p>

          <p className="text-xs text-slate-400">
            days
          </p>
        </div>
      </div>

      <div className="mt-5">
        {habit.checkedInToday ? (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-700">
            ✓ Completed today
          </div>
        ) : (
          <button
            onClick={() => checkIn(today)}
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading
              ? "Checking in..."
              : "Check in today"}
          </button>
        )}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <button
          onClick={() =>
            setShowBackfill(!showBackfill)
          }
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          {showBackfill
            ? "Hide backfill"
            : "Missed a previous day?"}
        </button>

        {showBackfill && (
          <div className="mt-4 flex gap-2">
            <input
              type="date"
              value={date}
              max={today}
              onChange={(event) =>
                setDate(event.target.value)
              }
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <button
              onClick={() => checkIn(date)}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Backfill
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          Recent check-ins
        </p>

        <div className="flex flex-wrap gap-2">
          {habit.checkIns
            .slice(-7)
            .reverse()
            .map((checkInDate) => (
              <span
                key={checkInDate}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
              >
                {checkInDate}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}