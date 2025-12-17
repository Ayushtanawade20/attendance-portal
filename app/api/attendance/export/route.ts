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
      id: string;
      role: string;
    };

    if (decoded.role !== "employee") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return new NextResponse("Missing date range", { status: 400 });
    }

    const result = await pool.query(
      `
      SELECT
        attendance_date,
        check_in,
        check_out,
        break_minutes,
        net_hours,
        status
      FROM attendance
      WHERE employee_id = $1
        AND attendance_date BETWEEN $2 AND $3
      ORDER BY attendance_date ASC
      `,
      [decoded.id, startDate, endDate]
    );

    // ---- CSV BUILD ----
    const header = [
      "Date",
      "Check In",
      "Check Out",
      "Break Minutes",
      "Net Hours",
      "Status",
    ];

    const rows = result.rows.map((r) => [
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
        "Content-Disposition": "attachment; filename=my-attendance.csv",
      },
    });
  } catch (err) {
    console.error("Employee CSV Export Error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
