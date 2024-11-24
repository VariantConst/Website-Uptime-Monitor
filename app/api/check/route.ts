import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface StatusRecord {
  timestamp: number;
  status: "available" | "partial" | "unavailable" | null;
}

interface CheckRequest {
  url: string;
}

// 获取指定时间段内的状态统计
function getTimeSlotStats(
  records: StatusRecord[],
  mode: "hour" | "day",
  slotIndex: number
): "available" | "partial" | "unavailable" | null {
  const now = Date.now();
  const slotDuration = mode === "hour" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const slotStart = now - (slotIndex + 1) * slotDuration;
  const slotEnd = now - slotIndex * slotDuration;

  const slotRecords = records.filter(
    (record) => record.timestamp > slotStart && record.timestamp <= slotEnd
  );

  if (slotRecords.length === 0) {
    return null;
  }

  const availableCount = slotRecords.filter((record) => record.status).length;
  const unavailableCount = slotRecords.filter(
    (record) => !record.status
  ).length;

  if (unavailableCount === 0) return "available";
  if (availableCount === 0) return "unavailable";
  return "partial";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckRequest;
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const ctx = getRequestContext();
    const kv = ctx?.env?.CILAB_WEB_STATUS;

    if (!kv) {
      console.error("KV binding not found");
      return NextResponse.json({ isAvailable: false });
    }

    // 检查网站状态
    const response = await fetch(url, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-cache",
    });

    const status = response.ok ? "available" : "unavailable";
    const timestamp = Date.now();

    // 获取现有记录
    const key = `status:${url}`;
    let existingData: StatusRecord[] = [];
    try {
      const existing = await kv.get(key);
      if (existing) {
        existingData = JSON.parse(existing) as StatusRecord[];
      }
    } catch (error) {
      console.error("Error reading from KV:", error);
    }

    // 添加新记录
    const newData = [{ timestamp, status }, ...existingData];

    // 清理超过90天的旧数据
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const filteredData = newData.filter(
      (record) => record.timestamp > ninetyDaysAgo
    );

    // 存储更新后的记录
    try {
      await kv.put(key, JSON.stringify(filteredData));
    } catch (error) {
      console.error("Error writing to KV:", error);
    }

    return NextResponse.json({ isAvailable: status });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.json({ isAvailable: false });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const mode = (searchParams.get("mode") || "hour") as "hour" | "day";

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const ctx = getRequestContext();
    const kv = ctx?.env?.CILAB_WEB_STATUS;

    if (!kv) {
      console.error("KV binding not found");
      return NextResponse.json({
        data: Array(90).fill(null),
        mode,
      });
    }

    const key = `status:${url}`;
    let records: StatusRecord[] = [];
    try {
      const existing = await kv.get(key);
      if (existing) {
        records = JSON.parse(existing) as StatusRecord[];
      }
    } catch (error) {
      console.error("Error reading from KV:", error);
    }

    // 生成90个时间段的状态统计
    const timeSlotStats = Array.from({ length: 90 }, (_, i) => {
      const stats = getTimeSlotStats(records, mode, i);
      return stats; // 直接返回布尔值或 null
    }).reverse();

    console.log(`Returning ${timeSlotStats.length} stats for ${url}`); // 添加日志
    return NextResponse.json({
      data: timeSlotStats,
      mode,
    });
  } catch (error) {
    console.error("Error in GET handler:", error);
    return NextResponse.json({
      data: Array(90).fill(null),
      mode: "hour",
    });
  }
}
