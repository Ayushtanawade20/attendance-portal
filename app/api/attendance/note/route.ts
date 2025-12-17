export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const token = cookies().get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      role: string;
    };

    if (decoded.role !== "employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { note } = await req.json();

    if (!note || note.trim().length === 0) {
      return NextResponse.json(
        { error: "Note cannot be empty" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const result = await pool.query(
      `
      UPDATE attendance
      SET work_note = $1
      WHERE employee_id = $2
        AND attendance_date = $3
      RETURNING id
      `,
      [note.trim(), decoded.id, today]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "No attendance record found for today" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Save Work Note Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
