import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const token = cookies().get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      role: string;
    };

    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await pool.query(
      `
      SELECT
        e.id AS employee_id,
        e.name AS employee_name,
        a.date,
        a.check_in,
        a.check_out,
        a.break_start,
        COALESCE(a.status, 'Absent') AS status
      FROM employees e
      LEFT JOIN attendance a
        ON e.id = a.employee_id
      WHERE e.is_active = true
      ORDER BY a.date DESC NULLS LAST, e.name
      `
    );

    return NextResponse.json({
      attendance: result.rows,
    });
  } catch (err) {
    console.error("Admin Attendance API Error:", err);
    return NextResponse.json({ attendance: [] }, { status: 500 });
  }
}
