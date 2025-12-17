"use client";

import { useEffect, useState } from "react";

interface AttendanceRecord {
  name: string;
  attendance_date?: string;
  check_in: string | null;
  check_out: string | null;
  break_minutes: number | string | null;
  net_hours: number | string | null;
  status: string | null;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAttendance = async () => {
    try {
      const res = await fetch("/api/admin/attendance", {
        cache: "no-store",
      });

      const data = await res.json();

      // ✅ Correct response key
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
                <td className="px-6 py-4">{r.name}</td>

                <td className="px-6 py-4">
                  {r.attendance_date
                    ? new Date(r.attendance_date).toLocaleDateString()
                    : "--"}
                </td>

                <td className="px-6 py-4">
                  {r.check_in
                    ? new Date(r.check_in).toLocaleTimeString()
                    : "--"}
                </td>

                <td className="px-6 py-4">
                  {r.check_out
                    ? new Date(r.check_out).toLocaleTimeString()
                    : "--"}
                </td>

                <td className="px-6 py-4">{r.break_minutes ?? 0}</td>

                {/* ✅ FIXED: handles string or number safely */}
                <td className="px-6 py-4">
                  {r.net_hours !== null ? Number(r.net_hours).toFixed(2) : "--"}
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

/* -------- STATUS BADGE -------- */

function StatusBadge({ status }: { status: string | null }) {
  const colors: Record<string, string> = {
    Present: "bg-blue-100 text-blue-700",
    Completed: "bg-green-100 text-green-700",
    Absent: "bg-gray-200 text-gray-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs ${colors[status ?? "Absent"]}`}
    >
      {status ?? "Absent"}
    </span>
  );
}
