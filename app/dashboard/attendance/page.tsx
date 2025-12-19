"use client";

import { useEffect, useState } from "react";

/* ---------- TYPES ---------- */

interface AttendanceRecord {
  employee_id: string;
  employee_name: string;
  date: string | null;
  check_in: string | null;
  check_out: string | null;
  break_start: string | null;
  status: string | null;
}

/* ---------- HELPERS ---------- */

function formatDate(value?: string | null) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString();
}

function formatTime(value?: string | null) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString();
}

function calculateNetHours(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return "--";

  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();

  if (isNaN(start) || isNaN(end)) return "--";

  const hours = (end - start) / (1000 * 60 * 60);
  return hours.toFixed(2);
}

/* ---------- PAGE ---------- */

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAttendance = async () => {
    try {
      const res = await fetch("/api/admin/attendance", {
        cache: "no-store",
      });

      const data = await res.json();
      setRecords(Array.isArray(data.attendance) ? data.attendance : []);
    } catch (err) {
      console.error("Attendance fetch error", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
    const interval = setInterval(loadAttendance, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Attendance Records</h1>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-6 py-3 text-left">Employee</th>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Check In</th>
              <th className="px-6 py-3 text-left">Check Out</th>
              <th className="px-6 py-3 text-left">Break (min)</th>
              <th className="px-6 py-3 text-left">Net Hours</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-gray-500">
                  No attendance records found
                </td>
              </tr>
            )}

            {records.map((r, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4">{r.employee_name ?? "--"}</td>

                <td className="px-6 py-4">{formatDate(r.date)}</td>

                <td className="px-6 py-4">{formatTime(r.check_in)}</td>

                <td className="px-6 py-4">{formatTime(r.check_out)}</td>

                <td className="px-6 py-4">
                  {r.status === "on_break" ? "In break" : 0}
                </td>

                <td className="px-6 py-4">
                  {calculateNetHours(r.check_in, r.check_out)}
                </td>

                <td className="px-6 py-4">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- STATUS BADGE ---------- */

function StatusBadge({ status }: { status: string | null }) {
  const colors: Record<string, string> = {
    working: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    on_break: "bg-yellow-100 text-yellow-700",
    Absent: "bg-gray-200 text-gray-700",
  };

  const label = status ?? "Absent";

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs ${
        colors[label] ?? colors.Absent
      }`}
    >
      {label}
    </span>
  );
}
