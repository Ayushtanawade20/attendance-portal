"use client";

import { useEffect, useState } from "react";

interface Employee {
  id: string;
  name: string;
  email: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]); // ✅ always array
  const [loading, setLoading] = useState(true);

  const loadEmployees = async () => {
    try {
      const res = await fetch("/api/admin/employees", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch employees");
      }

      const data = await res.json();

      // ✅ SAFE fallback
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
    } catch (err) {
      console.error("Employees fetch error:", err);
      setEmployees([]); // ✅ prevent crash
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    const interval = setInterval(loadEmployees, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Employees</h1>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Check In</th>
              <th className="px-6 py-3 text-left">Check Out</th>
              <th className="px-6 py-3 text-left">Status</th>
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

            {!loading && employees.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                  No employees found
                </td>
              </tr>
            )}

            {employees.map((emp) => (
              <tr key={emp.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4">{emp.name}</td>
                <td className="px-6 py-4">{emp.email}</td>
                <td className="px-6 py-4">
                  {emp.check_in
                    ? new Date(emp.check_in).toLocaleTimeString()
                    : "--"}
                </td>
                <td className="px-6 py-4">
                  {emp.check_out
                    ? new Date(emp.check_out).toLocaleTimeString()
                    : "--"}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={emp.status || "Absent"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Status Badge ---------------- */

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Present: "bg-blue-100 text-blue-700",
    "On Break": "bg-yellow-100 text-yellow-700",
    Completed: "bg-green-100 text-green-700",
    Absent: "bg-gray-200 text-gray-700",
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
