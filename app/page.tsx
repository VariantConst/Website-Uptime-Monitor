"use client";
import { useState, useEffect, useCallback } from "react";
import { MONITORING_CONFIG } from "@/config/monitoring";

interface StatusRecord {
  timestamp: number;
  status: "available" | "partial" | "unavailable" | null;
}

interface ApiResponse {
  data: StatusRecord[];
  mode: string;
}

// 添加一个格式化时间的辅助函数
function formatTimeRange(timestamp: number, mode: "hour" | "day"): string {
  const date = new Date(timestamp);
  const endDate = new Date(timestamp + (mode === "hour" ? 3600000 : 86400000));

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (mode === "hour") {
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
      date.getHours()
    )}:${pad(date.getMinutes())} - ${pad(endDate.getHours())}:${pad(
      endDate.getMinutes()
    )}`;
  } else {
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} 00:00 - 23:59`;
  }
}

// 状态颜色映射函数
function getStatusColor(
  status: "available" | "partial" | "unavailable" | null,
  isDark: boolean = false
) {
  switch (status) {
    case "available":
      return isDark ? "bg-green-500" : "bg-green-500/80 hover:bg-green-500";
    case "partial":
      return isDark ? "bg-orange-500" : "bg-orange-500/80 hover:bg-orange-500";
    case "unavailable":
      return isDark ? "bg-red-500" : "bg-red-500/80 hover:bg-red-500";
    default:
      return isDark ? "bg-gray-400" : "bg-gray-200 dark:bg-gray-700";
  }
}

function getStatusText(status: "available" | "partial" | "unavailable" | null) {
  switch (status) {
    case "available":
      return { text: "Available", color: "text-green-400" };
    case "partial":
      return { text: "Partially Available", color: "text-orange-400" };
    case "unavailable":
      return { text: "Unavailable", color: "text-red-400" };
    default:
      return { text: "No Data", color: "text-gray-400" };
  }
}

// 在文件顶部添加新的组件
const TimeRangeSelector = ({
  mode,
  setMode,
}: {
  mode: "hour" | "day";
  setMode: (mode: "hour" | "day") => void;
}) => {
  return (
    <div className="relative flex items-center gap-4 p-1.5">
      <div className="absolute inset-0 bg-[#023047]/20 backdrop-blur-xl rounded-2xl border border-white/[0.08]" />
      {["hour", "day"].map((value) => (
        <button
          key={value}
          onClick={() => setMode(value as "hour" | "day")}
          className={`relative px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
            mode === value
              ? "text-white bg-[#219ebc]/80 shadow-lg shadow-[#219ebc]/20 hover:shadow-[#219ebc]/30 hover:bg-[#219ebc]"
              : "text-gray-300 hover:bg-white/5"
          }`}
        >
          Last 90 {value === "hour" ? "Hours" : "Days"}
        </button>
      ))}
    </div>
  );
};

export default function Home() {
  const [history, setHistory] = useState<{ [key: string]: StatusRecord[] }>({});
  const [mode, setMode] = useState<"hour" | "day">("hour");

  const fetchHistory = useCallback(async () => {
    const newHistory: { [key: string]: StatusRecord[] } = {};
    for (const site of MONITORING_CONFIG.sites) {
      try {
        const response = await fetch(
          `/api/check?url=${encodeURIComponent(site.url)}&mode=${mode}`
        );
        const data = (await response.json()) as ApiResponse;
        newHistory[site.name] = data.data;
      } catch (error) {
        console.error(`Error fetching history for ${site.name}:`, error);
      }
    }
    setHistory(newHistory);
  }, [mode]);

  useEffect(() => {
    fetchHistory();
    // 每5分钟刷新一次历史数据
    const interval = setInterval(fetchHistory, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#023047] via-gray-900 to-black">
      <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:30px_30px]" />
      <div className="relative max-w-6xl mx-auto p-6 md:p-12">
        <div className="flex flex-col items-center mb-12">
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-[#8ecae6] via-[#219ebc] to-[#8ecae6] bg-clip-text text-transparent">
            Website Availability
          </h1>
          <TimeRangeSelector mode={mode} setMode={setMode} />
        </div>

        <div className="grid grid-cols-1 gap-6">
          {MONITORING_CONFIG.sites.map((site) => {
            // 获取最新的记录（数组中的最后一个非空值）
            const records = history[site.name] || Array(90).fill(null);
            const latestRecord = records
              .slice()
              .reverse()
              .find((record) => record !== null);
            const latestStatus =
              typeof latestRecord === "object"
                ? latestRecord?.status
                : latestRecord;

            return (
              <div
                key={site.name}
                className="p-6 rounded-2xl border border-[#219ebc]/10 bg-[#023047]/10 backdrop-blur-2xl shadow-xl hover:shadow-2xl hover:border-[#219ebc]/20 transition-all duration-300"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1 text-[#8ecae6]">
                      {site.name}
                    </h2>
                    <p className="text-sm text-gray-400">{site.url}</p>
                  </div>
                  <div className="flex items-center bg-[#023047]/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#219ebc]/20">
                    <div
                      className={`w-2.5 h-2.5 rounded-full mr-2 ${
                        latestStatus === "available"
                          ? "bg-[#a7c957]"
                          : latestStatus === "partial"
                          ? "bg-[#ffb703]"
                          : latestStatus === "unavailable"
                          ? "bg-[#bc4749]"
                          : "bg-gray-400"
                      }`}
                    />
                    <span className="text-sm text-gray-300">
                      {getStatusText(latestStatus || null).text}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <div className="flex flex-row justify-between w-full h-16 items-center">
                    {(history[site.name] || Array(90).fill(null)).map(
                      (record, index) => {
                        const statusValue =
                          typeof record === "object" ? record?.status : record;

                        return (
                          <div key={index} className="group relative flex-1">
                            <div
                              className={`h-8 mx-0.5 rounded-sm transition-all duration-200 group-hover:h-12 ${
                                statusValue === "available"
                                  ? "bg-[#a7c957]/80 hover:bg-[#a7c957]"
                                  : statusValue === "partial"
                                  ? "bg-[#ffb703]/80 hover:bg-[#ffb703]"
                                  : statusValue === "unavailable"
                                  ? "bg-[#bc4749]/80 hover:bg-[#bc4749]"
                                  : "bg-gray-700"
                              }`}
                            />
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-10">
                              <div className="bg-[#023047]/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-[#219ebc]/20">
                                <div className="flex flex-col gap-1.5">
                                  <div className="text-[#8ecae6] font-medium whitespace-nowrap">
                                    {formatTimeRange(
                                      Date.now() -
                                        (90 - index) *
                                          (mode === "hour"
                                            ? 3600000
                                            : 86400000),
                                      mode
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-2 h-2 rounded-full ${
                                        statusValue === "available"
                                          ? "bg-[#a7c957]"
                                          : statusValue === "partial"
                                          ? "bg-[#ffb703]"
                                          : statusValue === "unavailable"
                                          ? "bg-[#bc4749]"
                                          : "bg-gray-400"
                                      }`}
                                    />
                                    <span
                                      className={`text-sm ${
                                        getStatusText(statusValue).color
                                      }`}
                                    >
                                      {getStatusText(statusValue).text}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5">
                                <div className="border-8 border-transparent border-t-[#023047]/95"></div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                  <div className="flex justify-between mt-1 px-1 text-xs text-gray-500">
                    <span>90 {mode === "hour" ? "Hours" : "Days"} Ago</span>
                    <span>Now</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
