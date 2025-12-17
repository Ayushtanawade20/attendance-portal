"use client";

import { useEffect, useState } from "react";

interface Employee {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetch("/api/admin/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(data.employees ?? []));
  }, []);

  const exportCSV = () => {
    if (!startDate || !endDate) {
      alert("Please select date range");
      return;
    }

    const url = `/api/admin/reports/attendance?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`;
    window.location.href = url;
  };

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Attendance Reports</h1>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <label className="block text-sm mb-1">Employee</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="all">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <button
          onClick={exportCSV}
          className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
