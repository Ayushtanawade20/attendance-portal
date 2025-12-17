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

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const today = new Date().toISOString().split("T")[0];

    const result = await pool.query(
      `
      SELECT
        check_in,
        check_out,
        break_start,
        break_end,
        break_minutes,
        status
      FROM attendance
      WHERE employee_id = $1
        AND attendance_date = $2
      `,
      [decoded.id, today]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ checkedIn: false });
    }

    const row = result.rows[0];

    return NextResponse.json({
      checkedIn: !!row.check_in,
      checkedOut: !!row.check_out,
      onBreak: !!row.break_start && !row.break_end,
      breakTaken: row.break_minutes > 0,
      status: row.status,
    });
  } catch (err) {
    console.error("Attendance status error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
