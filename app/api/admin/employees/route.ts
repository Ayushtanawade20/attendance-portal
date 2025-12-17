import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    /* ---------- AUTH ---------- */
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

    /* ---------- EMPLOYEES LIST ---------- */
    const result = await pool.query(`
      SELECT
        e.id,
        e.name,
        e.email,
        COALESCE(a.status, 'Absent') AS status,
        a.check_in,
        a.check_out
      FROM employees e
      LEFT JOIN attendance a
        ON e.id = a.employee_id
        AND a.date = CURRENT_DATE
      WHERE e.is_active = true
      ORDER BY e.name
    `);

    return NextResponse.json({
      employees: result.rows ?? [],
    });
  } catch (err) {
    console.error("Employees API Error:", err);
    return NextResponse.json({ employees: [] }, { status: 500 });
  }
}
