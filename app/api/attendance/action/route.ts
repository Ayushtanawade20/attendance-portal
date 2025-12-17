import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { pool } from "@/lib/db";

interface TokenPayload {
  id: string;
  role: string;
  name: string;
}

export async function POST(req: Request) {
  try {
    const token = cookies().get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;

    if (user.role !== "employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { action } = await req.json();
    const today = new Date().toISOString().split("T")[0];

    const { rows } = await pool.query(
      `SELECT * FROM attendance
       WHERE employee_id = $1 AND attendance_date = $2`,
      [user.id, today]
    );

    const record = rows[0];

    switch (action) {
      case "check_in":
        if (record) {
          return NextResponse.json(
            { error: "Already checked in" },
            { status: 400 }
          );
        }

        await pool.query(
          `INSERT INTO attendance (employee_id, attendance_date, check_in, status)
           VALUES ($1, $2, NOW(), 'Present')`,
          [user.id, today]
        );
        break;

      case "start_break":
        if (!record?.check_in || record?.break_start) {
          return NextResponse.json(
            { error: "Invalid break start" },
            { status: 400 }
          );
        }

        await pool.query(
          `UPDATE attendance
           SET break_start = NOW()
           WHERE employee_id = $1 AND attendance_date = $2`,
          [user.id, today]
        );
        break;

      case "end_break":
        if (!record?.break_start || record?.break_end) {
          return NextResponse.json(
            { error: "Invalid break end" },
            { status: 400 }
          );
        }

        await pool.query(
          `UPDATE attendance
           SET break_end = NOW(),
               break_minutes = EXTRACT(EPOCH FROM (NOW() - break_start)) / 60
           WHERE employee_id = $1 AND attendance_date = $2`,
          [user.id, today]
        );
        break;

      case "check_out":
        if (!record?.check_in || record?.check_out) {
          return NextResponse.json(
            { error: "Invalid check out" },
            { status: 400 }
          );
        }

        await pool.query(
          `UPDATE attendance
           SET check_out = NOW(),
               gross_hours = EXTRACT(EPOCH FROM (NOW() - check_in)) / 3600,
               net_hours =
                 EXTRACT(EPOCH FROM (NOW() - check_in)) / 3600
                 - COALESCE(break_minutes, 0) / 60,
               status = 'Completed'
           WHERE employee_id = $1 AND attendance_date = $2`,
          [user.id, today]
        );
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Attendance Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
