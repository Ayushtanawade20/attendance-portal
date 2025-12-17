export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { pool } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const client = await pool.connect();

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

    /* ---------- INPUT ---------- */
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    /* ---------- DUPLICATE CHECK ---------- */
    const existing = await client.query(
      `SELECT 1 FROM employees WHERE email = $1`,
      [normalizedEmail]
    );

    if (existing.rowCount > 0) {
      return NextResponse.json(
        { error: "Employee with this email already exists" },
        { status: 400 }
      );
    }

    /* ---------- CREATE EMPLOYEE ---------- */
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    await client.query("BEGIN");

    await client.query(
      `
      INSERT INTO employees (
        id,
        name,
        email,
        password_hash,
        role,
        is_active
      )
      VALUES ($1, $2, $3, $4, 'employee', true)
      `,
      [id, name, normalizedEmail, passwordHash]
    );

    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create Employee Error:", err);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    client.release();
  }
}
