import { NextResponse } from "next/server";
import { getUser } from "@/actions/user";

export async function GET() {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      industry: user.industry,
      skills: user.skills || [],
      experience: user.experience,
      bio: user.bio,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
} 