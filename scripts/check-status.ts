import { MONITORING_CONFIG } from "../config/monitoring";
import fetch from "node-fetch";

async function checkSites() {
  for (const site of MONITORING_CONFIG.sites) {
    try {
      const response = await fetch(site.url, {
        timeout: site.timeout,
      });

      const isAvailable = response.status === (site.expectedStatusCode || 200);

      // 这里添加将结果保存到 KV 存储的逻辑
      await saveResult(site.name, isAvailable);

      console.log(`${site.name}: ${isAvailable ? "Available" : "Unavailable"}`);
    } catch (error) {
      console.error(`Error checking ${site.name}:`, error);
      await saveResult(site.name, false);
    }
  }
}

async function saveResult(siteName: string, isAvailable: boolean) {
  // 实现保存结果到 KV 存储的逻辑
  const response = await fetch(process.env.KV_REST_API_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      site: siteName,
      status: isAvailable ? "available" : "unavailable",
      timestamp: Date.now(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save result: ${response.statusText}`);
  }
}

checkSites().catch(console.error);
