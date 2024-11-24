export interface SiteConfig {
  name: string;
  url: string;
  description?: string;
  expectedStatusCode?: number;
  timeout?: number; // 超时时间（毫秒）
}

export const MONITORING_CONFIG = {
  sites: [
    {
      name: "Camera",
      url: "https://camera.pku.edu.cn",
      description: "PKU Camera System",
      expectedStatusCode: 200,
      timeout: 5000,
    },
    {
      name: "CI.IDM",
      url: "https://ci.idm.pku.edu.cn",
      description: "PKU CI IDM System",
      expectedStatusCode: 200,
      timeout: 5000,
    },
    {
      name: "AIIC",
      url: "https://aiic.pku.edu.cn",
      description: "PKU AIIC Website",
      expectedStatusCode: 200,
      timeout: 5000,
    },
    {
      name: "MLIC",
      url: "https://mlic.pku.edu.cn",
      description: "PKU MLIC Website",
      expectedStatusCode: 200,
      timeout: 5000,
    },
  ],
  checkInterval: 60000, // 前端检查间隔（毫秒）
  historyLength: 90, // 历史记录长度
} as const;

export type SiteNames = (typeof MONITORING_CONFIG.sites)[number]["name"];
