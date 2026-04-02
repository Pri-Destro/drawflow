import { redirect } from "next/navigation";
import DashboardClient from "../../components/DashboardClient";
import { cookies } from "next/headers"; 
import { HTTP_BACKEND } from "@/config";
import { getUser } from "../lib/getUser";
import type { Project, User } from "@repo/common/types"


export default async function Page() {
  const cookieStorage = cookies();
  const token = (await cookieStorage).get("token")?.value;

  if (!token) redirect("/auth/signin");

  let user : User | null = await getUser()
  if (!user) redirect("/auth/signin")
    
  let projects : Project[] 


  try {
    const res = await fetch(`${HTTP_BACKEND}/rooms`, {
      headers: { Authorization: token },
      cache: "no-store"
    });

    if (!res.ok) throw new Error("Failed fetching rooms");

    const data = await res.json();
    projects = data.rooms ?? [];
    
  } catch (error) {
    console.log(error)
    redirect("/auth/signin");
  }

  return (
    <DashboardClient 
      user={user} 
      projects={projects} 
    />
  );
}
