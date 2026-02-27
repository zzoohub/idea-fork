import { NextResponse } from "next/server";

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(status: number, title: string, detail: string) {
  return NextResponse.json({ title, detail }, { status });
}
