import { NextResponse } from "next/server";
import prisma from "../../../backend/lib/prisma.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    const quizzes = await prisma.quiz.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        domain: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ quizzes });
  } catch (e) {
    return NextResponse.json(
      { error: "Erreur serveur", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
