import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const token = cookies().get("token")?.value;
    if (!token) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      role: string;
    };

    if (decoded.role !== "admin") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const employeeId = searchParams.get("employeeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return new NextResponse("Missing date range", { status: 400 });
    }

    const params: any[] = [startDate, endDate];
    let employeeFilter = "";

    if (employeeId && employeeId !== "all") {
      params.push(employeeId);
      employeeFilter = `AND e.id = $3`;
    }

    const result = await pool.query(
      `
      SELECT
        e.name AS employee_name,
        a.attendance_date,
        a.check_in,
        a.check_out,
        a.break_minutes,
        a.net_hours,
        a.status
      FROM attendance a
      JOIN employees e ON e.id = a.employee_id
      WHERE a.attendance_date BETWEEN $1 AND $2
      ${employeeFilter}
      ORDER BY a.attendance_date ASC
      `,
      params
    );

    // ---- Convert to CSV ----
    const header = [
      "Employee",
      "Date",
      "Check In",
      "Check Out",
      "Break Minutes",
      "Net Hours",
      "Status",
    ];

    const rows = result.rows.map((r) => [
      r.employee_name,
      r.attendance_date,
      r.check_in ?? "",
      r.check_out ?? "",
      r.break_minutes ?? 0,
      r.net_hours ?? 0,
      r.status ?? "",
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=attendance-report.csv",
      },
    });
  } catch (err) {
    console.error("CSV Export Error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
