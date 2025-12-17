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
  const { action } = await req.json();
  const token = cookies().get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;

  if (user.role !== "employee") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employeeId = user.id;

  // get today's attendance row
  const { rows } = await pool.query(
    `SELECT * FROM attendance
     WHERE employee_id = $1 AND attendance_date = CURRENT_DATE`,
    [employeeId]
  );

  const attendance = rows[0];

  /* ================= CHECK IN ================= */
  if (action === "check_in") {
    if (attendance) {
      return NextResponse.json(
        { error: "Already checked in" },
        { status: 400 }
      );
    }

    await pool.query(
      `INSERT INTO attendance (employee_id, check_in, status)
       VALUES ($1, NOW(), 'Present')`,
      [employeeId]
    );

    return NextResponse.json({ message: "Checked in" });
  }

  if (!attendance) {
    return NextResponse.json({ error: "Not checked in" }, { status: 400 });
  }

  /* ================= START BREAK ================= */
  if (action === "start_break") {
    if (attendance.break_start) {
      return NextResponse.json(
        { error: "Break already started" },
        { status: 400 }
      );
    }

    await pool.query(
      `UPDATE attendance SET break_start = NOW()
       WHERE id = $1`,
      [attendance.id]
    );

    return NextResponse.json({ message: "Break started" });
  }

  /* ================= END BREAK ================= */
  if (action === "end_break") {
    if (!attendance.break_start) {
      return NextResponse.json({ error: "Break not started" }, { status: 400 });
    }

    const result = await pool.query(
      `
      UPDATE attendance
      SET
        break_minutes = COALESCE(break_minutes,0)
          + EXTRACT(EPOCH FROM (NOW() - break_start))/60,
        break_start = NULL
      WHERE id = $1
      RETURNING break_minutes
      `,
      [attendance.id]
    );

    return NextResponse.json({
      message: "Break ended",
      break_minutes: Math.round(result.rows[0].break_minutes),
    });
  }

  /* ================= CHECK OUT ================= */
  if (action === "check_out") {
    if (attendance.check_out) {
      return NextResponse.json(
        { error: "Already checked out" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      UPDATE attendance
      SET
        check_out = NOW(),
        gross_hours = EXTRACT(EPOCH FROM (NOW() - check_in))/3600,
        net_hours = EXTRACT(EPOCH FROM (NOW() - check_in))/3600
          - COALESCE(break_minutes,0)/60
      WHERE id = $1
      RETURNING gross_hours, net_hours
      `,
      [attendance.id]
    );

    return NextResponse.json({
      message: "Checked out",
      gross_hours: Number(result.rows[0].gross_hours).toFixed(2),
      net_hours: Number(result.rows[0].net_hours).toFixed(2),
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
