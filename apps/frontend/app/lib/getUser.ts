import {JWT_SECRET}  from "@repo/backend-common/config"; 
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type {User} from "@repo/common/types"

export async function getUser() : Promise<User | null> {
  try {
    
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;


    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      email: string;
      name: string;
    };

    const user = decoded;

    return user

  } catch (error) {
      console.error("Token verification failed:", error);
      return null
        
  }
}