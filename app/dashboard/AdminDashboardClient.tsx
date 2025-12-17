"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ---------------- Types ---------------- */

interface Stats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
}

interface AttendanceRow {
  name: string;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
  work_note: string | null;
}

/* ---------------- Main Component ---------------- */

export default function AdminDashboardClient({
  adminName,
}: {
  adminName: string;
}) {
  const router = useRouter();

  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
  });

  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- Load Dashboard ---------------- */

  const loadDashboard = async () => {
    try {
      const res = await fetch("/api/admin/dashboard", {
        cache: "no-store",
      });

      const data = await res.json();

      setStats(data.stats);
      setRows(data.todayAttendance);
    } catch (err) {
      console.error("Dashboard fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  /* ---------------- Logout ---------------- */

  const handleLogout = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    router.replace("/login");
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-black text-white hidden md:flex flex-col">
        <div className="px-6 py-5 text-xl font-bold border-b border-gray-700">
          Attendance
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 text-sm">
          <SidebarLink href="/dashboard" label="Dashboard" active />
          <SidebarLink href="/dashboard/employees" label="Employees" />
          <SidebarLink href="/dashboard/attendance" label="Attendance" />
          <SidebarLink href="/dashboard/reports" label="Reports" />
        </nav>

        <div className="px-6 py-4 border-t border-gray-700 text-sm">
          Logged in as <br />
          <span className="font-semibold">{adminName}</span>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>

          <button
            onClick={handleLogout}
            className="text-sm px-4 py-2 rounded-md border text-gray-600 hover:bg-gray-100 transition"
          >
            Logout
          </button>
        </header>

        <main className="p-8 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Total Employees" value={stats.totalEmployees} />
            <StatCard title="Present Today" value={stats.presentToday} />
            <StatCard title="Absent Today" value={stats.absentToday} />
          </div>

          {/* -------- CREATE EMPLOYEE -------- */}
          <CreateEmployeeCard onCreated={loadDashboard} />

          {/* Attendance Table */}
          <div className="bg-white rounded-xl shadow">
            <div className="p-5 border-b">
              <h2 className="text-lg font-semibold">Today’s Attendance</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left">Employee</th>
                    <th className="px-6 py-3 text-left">Check In</th>
                    <th className="px-6 py-3 text-left">Check Out</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Work Note</th>
                  </tr>
                </thead>

                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center">
                        Loading...
                      </td>
                    </tr>
                  )}

                  {!loading && rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-6 text-center text-gray-500"
                      >
                        No attendance yet
                      </td>
                    </tr>
                  )}

                  {rows.map((row, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50 align-top">
                      <td className="px-6 py-4">{row.name}</td>
                      <td className="px-6 py-4">
                        {row.check_in
                          ? new Date(row.check_in).toLocaleTimeString()
                          : "--"}
                      </td>
                      <td className="px-6 py-4">
                        {row.check_out
                          ? new Date(row.check_out).toLocaleTimeString()
                          : "--"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        {row.work_note ? (
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {row.work_note}
                          </p>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            No note
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------------- Create Employee ---------------- */

function CreateEmployeeCard({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleCreate = async () => {
    setMessage(null);

    if (!name || !email || !password) {
      setMessage("All fields are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/employees/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to create employee");
      } else {
        setMessage("Employee created successfully ✅");
        setName("");
        setEmail("");
        setPassword("");
        onCreated();
      }
    } catch {
      setMessage("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 max-w-md">
      <h2 className="text-lg font-semibold mb-4">Create New Employee</h2>

      <div className="space-y-3">
        <input
          placeholder="Employee Name"
          className="w-full border rounded px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Email"
          type="email"
          className="w-full border rounded px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          type="text"
          className="w-full border rounded px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleCreate}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 w-full"
        >
          {loading ? "Creating..." : "Create Employee"}
        </button>

        {message && (
          <p className="text-sm text-center text-gray-600">{message}</p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Shared UI Components ---------------- */

function SidebarLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block px-4 py-2 rounded transition ${
        active
          ? "bg-gray-800 text-white"
          : "text-gray-400 hover:bg-gray-800 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="px-3 py-1 rounded-full text-xs bg-gray-200 text-gray-700">
        Absent
      </span>
    );
  }

  const colors: Record<string, string> = {
    Present: "bg-blue-100 text-blue-700",
    "On Break": "bg-yellow-100 text-yellow-700",
    Completed: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs ${
        colors[status] || "bg-gray-200 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}
