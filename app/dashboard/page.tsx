import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import AdminDashboardClient from "./AdminDashboardClient";

interface TokenPayload {
  role: string;
  name: string;
}

export default function DashboardPage() {
  const token = cookies().get("token")?.value;

  if (!token) {
    return unauthorized();
  }

  let user: TokenPayload;

  try {
    user = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  } catch {
    return unauthorized();
  }

  if (user.role !== "admin") {
    return unauthorized();
  }

  return <AdminDashboardClient adminName={user.name} />;
}

function unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="text-red-600 text-lg font-semibold">Unauthorized Access</p>
    </div>
  );
}
