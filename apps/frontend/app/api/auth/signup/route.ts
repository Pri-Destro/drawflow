import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { HTTP_BACKEND } from "@/config";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();

		const res = await axios.post(`${HTTP_BACKEND}/signup`, body, {
			withCredentials: true,
		});

		const user = res.data.user ?? {
			email: res.data.email,
			name: res.data.name,
		};

		if (!user?.email || !user?.name) {
			throw new Error("Missing user info");
		}

		const response = NextResponse.json({ user }, { status: 201 });
		// response.cookies.set("token", token, {
		// 	httpOnly: true,
		// 	secure: process.env.NODE_ENV === "production",
		// 	sameSite: "strict",
		// 	maxAge: 7 * 24 * 60 * 60,
		// });

		return response;
	} catch (error: any) {
		console.log("Error while signing up", error);

		return NextResponse.json(
			{ message: error.response?.data?.message || "Signup failed" },
			{ status: error.response?.status || 500 }
		);
	}
}
