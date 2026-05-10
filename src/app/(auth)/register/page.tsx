import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import RegisterForm from "./register-form";

export default async function RegisterPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");
  return <RegisterForm />;
}
