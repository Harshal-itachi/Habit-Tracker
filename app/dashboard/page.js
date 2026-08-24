"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import CreateHabitForm from "@/components/habits/CreateHabitForm";
import HabitCard from "@/components/habits/HabitCard";

export default function DashboardPage() {
  const router = useRouter();

  const [dashboard, setDashboard] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setError("");

    try {
      const response = await fetch(
        "/api/dashboard",
        {
          cache: "no-store",
        }
      );

     const text = await response.text();

console.log("Dashboard status:", response.status);
console.log("Dashboard response:", text);

let data = {};

try {
  data = text ? JSON.parse(text) : {};
} catch (error) {
  console.error("Invalid JSON from dashboard:", error);
  throw new Error(
    `Dashboard API returned invalid response (${response.status})`
  );
}

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }

        setError(
          data.message ||
            "Failed to load dashboard"
        );

        return;
      }

      setDashboard(data);
    } catch (error) {
      console.error(error);
      setError("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error(error);
    }
  }

  function handleHabitCreated() {
    loadDashboard();
  }

  function handleHabitDeleted() {
    loadDashboard();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <p className="text-sm text-slate-500">
            Loading dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (error && !dashboard) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Habit Tracker
            </h1>

            <p className="text-xs text-slate-400">
              {dashboard.user.timezone}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">
              Welcome back, {dashboard.user.name}
            </p>

            <h2 className="mt-1 text-3xl font-bold text-slate-900">
              {dashboard.today}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your local day
            </p>
          </div>

          <CreateHabitForm
            onCreated={handleHabitCreated}
          />
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {dashboard.habits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h3 className="font-semibold text-slate-900">
              No habits yet
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Create your first habit to start tracking.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {dashboard.habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                today={dashboard.today}
                onUpdated={loadDashboard}
                onDeleted={handleHabitDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}