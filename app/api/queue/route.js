import { NextResponse } from "next/server";
import {
  callNext,
  finishCurrent,
  getQueue,
  issueTicket,
  recallCurrent,
  resetQueue,
} from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getQueue());
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body?.action;

    if (action === "issue") {
      return NextResponse.json(issueTicket(body.number));
    }
    if (action === "next") {
      return NextResponse.json(callNext());
    }
    if (action === "recall") {
      return NextResponse.json(recallCurrent());
    }
    if (action === "finish") {
      return NextResponse.json(finishCurrent());
    }
    if (action === "reset") {
      return NextResponse.json(resetQueue());
    }

    return NextResponse.json({ error: "عملية غير معروفة" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "تعذر تنفيذ العملية" },
      { status: 400 },
    );
  }
}
