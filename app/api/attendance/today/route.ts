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
      id: string;
    };

    const result = await pool.query(
      `
      SELECT
        check_in,
        check_out,
        break_start,
        status
      FROM attendance
      WHERE employee_id = $1
        AND date = CURRENT_DATE
      LIMIT 1
      `,
      [decoded.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        checkedIn: false,
        status: "absent",
      });
    }

    const row = result.rows[0];

    return NextResponse.json({
      checkedIn: !!row.check_in,
      checkedOut: !!row.check_out,
      onBreak: row.status === "on_break",
      status: row.status,
    });
  } catch (err) {
    console.error("Attendance status error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
