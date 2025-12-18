import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { email } = await req.json();

  const result = await pool.query(
    "SELECT id, name, role FROM employees WHERE email=$1 AND is_active=true",
    [email]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const user = result.rows[0];

  const token = signToken({
    id: user.id,
    role: user.role,
  });

  return NextResponse.json({
    token,
    role: user.role,
    name: user.name,
  });
}
