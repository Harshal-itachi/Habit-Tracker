"use client";

import { useState } from "react";

export default function CreateHabitForm({ onCreated }) {
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/habits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        const firstError = data.errors
          ? Object.values(data.errors).flat()[0]
          : null;

        setError(
          firstError ||
            data.message ||
            "Failed to create habit"
        );

        return;
      }

      setForm({
        name: "",
        description: "",
      });

      setOpen(false);

      if (onCreated) {
        onCreated(data.habit);
      }
    } catch (error) {
      console.error(error);
      setError("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
      >
        + Create Habit
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">
          Create a new habit
        </h2>

        <button
          onClick={() => setOpen(false)}
          className="text-sm text-slate-400 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="habit-name"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Habit name
          </label>

          <input
            id="habit-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Exercise"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="habit-description"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Description
          </label>

          <textarea
            id="habit-description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Optional description"
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create Habit"}
        </button>
      </form>
    </div>
  );
}