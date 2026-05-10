import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");
  return <LoginForm />;
}
