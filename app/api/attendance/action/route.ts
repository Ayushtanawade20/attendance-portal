import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { pool } from "@/lib/db";

interface TokenPayload {
  id: string;
  role: string;
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

    const { rows } = await pool.query(
      `
      SELECT *
      FROM attendance
      WHERE employee_id = $1
        AND date = CURRENT_DATE
      LIMIT 1
      `,
      [user.id]
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
          `
          INSERT INTO attendance (employee_id, date, check_in, status)
          VALUES ($1, CURRENT_DATE, NOW(), 'working')
          `,
          [user.id]
        );
        break;

      case "start_break":
        if (!record?.check_in || record?.status === "on_break") {
          return NextResponse.json(
            { error: "Invalid break start" },
            { status: 400 }
          );
        }

        await pool.query(
          `
          UPDATE attendance
          SET break_start = NOW(),
              break_end = NULL,
              status = 'on_break'
          WHERE employee_id = $1
            AND date = CURRENT_DATE
          `,
          [user.id]
        );
        break;

      case "end_break":
        if (record?.status !== "on_break") {
          return NextResponse.json(
            { error: "Invalid break end" },
            { status: 400 }
          );
        }

        await pool.query(
          `
          UPDATE attendance
          SET break_end = NOW(),
              status = 'working'
          WHERE employee_id = $1
            AND date = CURRENT_DATE
          `,
          [user.id]
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
          `
          UPDATE attendance
          SET check_out = NOW(),
              status = 'completed'
          WHERE employee_id = $1
            AND date = CURRENT_DATE
          `,
          [user.id]
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
