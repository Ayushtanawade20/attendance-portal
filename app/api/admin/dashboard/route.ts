import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    /* ---------------- AUTH ---------------- */
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

    /* ---------------- TOTAL EMPLOYEES ---------------- */
    const totalEmployeesRes = await pool.query(
      `SELECT COUNT(*) 
       FROM employees 
       WHERE is_active = true`
    );

    /* ---------------- PRESENT TODAY ---------------- */
    const presentRes = await pool.query(
      `SELECT COUNT(DISTINCT employee_id)
       FROM attendance
       WHERE date = CURRENT_DATE`
    );

    /* ---------------- TODAY ATTENDANCE TABLE ---------------- */
    const todayAttendanceRes = await pool.query(
      `
      SELECT 
        e.name,
        a.check_in,
        a.check_out,
        a.status,
        a.work_note
      FROM employees e
      LEFT JOIN attendance a
        ON e.id = a.employee_id
        AND a.date = CURRENT_DATE
      WHERE e.is_active = true
      ORDER BY e.name
      `
    );

    const totalEmployees = Number(totalEmployeesRes.rows[0].count);
    const presentToday = Number(presentRes.rows[0].count);
    const absentToday = totalEmployees - presentToday;

    return NextResponse.json({
      stats: {
        totalEmployees,
        presentToday,
        absentToday,
      },
      todayAttendance: todayAttendanceRes.rows,
    });
  } catch (err) {
    console.error("Admin Dashboard Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
