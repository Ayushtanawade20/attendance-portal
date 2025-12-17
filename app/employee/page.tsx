"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import jwt from "jsonwebtoken";

interface TokenPayload {
  id: string;
  role: string;
  name: string;
}

type AttendanceAction = "check_in" | "start_break" | "end_break" | "check_out";

interface TodayStatus {
  checkedIn: boolean;
  checkedOut: boolean;
  onBreak: boolean;
  breakTaken: boolean;
  status?: string;
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<TokenPayload | null>(null);
  const [today, setToday] = useState<TodayStatus | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const decoded = jwt.decode(token) as TokenPayload;

      if (!decoded || decoded.role !== "employee") {
        router.replace("/login");
        return;
      }

      setUser(decoded);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  /* ---------------- LOAD TODAY STATUS ---------------- */
  const loadTodayStatus = async () => {
    setLoadingToday(true);
    try {
      const res = await fetch("/api/attendance/today");
      const data = await res.json();
      setToday(data);
    } catch {
      setToday(null);
    } finally {
      setLoadingToday(false);
    }
  };

  useEffect(() => {
    loadTodayStatus();
  }, []);

  /* ---------------- LOGOUT ---------------- */
  const handleLogout = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    router.replace("/login");
  };

  if (!user || loadingToday) return null;

  /* ---------------- BUTTON RULES ---------------- */
  const canCheckIn = !today?.checkedIn;
  const canStartBreak =
    today?.checkedIn && !today?.onBreak && !today?.checkedOut;
  const canEndBreak = today?.onBreak;
  const canCheckOut = today?.checkedIn && !today?.checkedOut && !today?.onBreak;

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              Welcome, {user.name}
            </h1>
            <p className="text-sm text-gray-500">{new Date().toDateString()}</p>
          </div>

          <button
            onClick={handleLogout}
            className="text-sm px-4 py-2 rounded-md border text-gray-600 hover:bg-gray-100 transition"
          >
            Logout
          </button>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Today’s Actions
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ActionButton
              label="Check In"
              action="check_in"
              disabled={!canCheckIn}
              onSuccess={loadTodayStatus}
            />
            <ActionButton
              label="Start Break"
              action="start_break"
              disabled={!canStartBreak}
              onSuccess={loadTodayStatus}
            />
            <ActionButton
              label="End Break"
              action="end_break"
              disabled={!canEndBreak}
              onSuccess={loadTodayStatus}
            />
            <ActionButton
              label="Check Out"
              action="check_out"
              disabled={!canCheckOut}
              onSuccess={loadTodayStatus}
            />
          </div>
        </div>

        {/* -------- DAILY WORK NOTE -------- */}
        <DailyWorkNote />

        {/* -------- DOWNLOAD OWN ATTENDANCE -------- */}
        <div className="bg-white rounded-xl shadow p-6 max-w-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Download My Attendance
          </h2>

          <EmployeeAttendanceExport />
        </div>

        {/* Monthly Attendance (future) */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-800">
              Monthly Attendance
            </h2>
          </div>

          <div className="p-6 text-sm text-gray-500">
            Monthly data will appear here.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- ACTION BUTTON ---------------- */

function ActionButton({
  label,
  action,
  disabled,
  onSuccess,
}: {
  label: string;
  action: AttendanceAction;
  disabled: boolean;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/attendance/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Action failed");
      } else {
        setMessage(data.message || "Success");
        onSuccess();
      }
    } catch {
      setMessage("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className={`w-full rounded-lg py-3 text-sm font-medium transition
          ${
            disabled
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "border text-gray-700 hover:bg-gray-100"
          }`}
      >
        {loading ? "Processing..." : label}
      </button>

      {message && (
        <p className="text-xs text-center text-gray-500">{message}</p>
      )}
    </div>
  );
}

/* ---------------- DAILY WORK NOTE ---------------- */

function DailyWorkNote() {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const saveNote = async () => {
    if (!note.trim()) {
      setMessage("Please write something about your work");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/attendance/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to save note");
      } else {
        setMessage("Work note saved successfully ✅");
      }
    } catch {
      setMessage("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">
        Daily Work Note
      </h2>

      <textarea
        rows={5}
        placeholder="Briefly describe what you worked on today..."
        className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={saveNote}
          disabled={loading}
          className="bg-black text-white px-5 py-2 rounded hover:bg-gray-800 text-sm"
        >
          {loading ? "Saving..." : "Save Note"}
        </button>

        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
    </div>
  );
}

/* ---------------- EMPLOYEE CSV EXPORT ---------------- */

function EmployeeAttendanceExport() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const downloadCSV = () => {
    if (!startDate || !endDate) {
      alert("Please select date range");
      return;
    }

    const url = `/api/attendance/export?startDate=${startDate}&endDate=${endDate}`;
    window.location.href = url;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-1">From</label>
        <input
          type="date"
          className="w-full border rounded px-3 py-2"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">To</label>
        <input
          type="date"
          className="w-full border rounded px-3 py-2"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <button
        onClick={downloadCSV}
        className="bg-black text-white px-5 py-2 rounded hover:bg-gray-800"
      >
        Download CSV
      </button>
    </div>
  );
}
