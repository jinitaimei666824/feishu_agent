import { env } from "../../config/env.js";

export type FeishuMvpConfig = {
  baseUrl: string;
  appId: string;
  appSecret: string;
  templateFileToken: string;
  targetFolderToken: string;
  copyNamePrefix: string;
  imNotifyChatId: string;
};

export function getFeishuMvpConfig(): FeishuMvpConfig {
  return {
    baseUrl: env.FEISHU_BASE_URL,
    appId: env.FEISHU_APP_ID,
    appSecret: env.FEISHU_APP_SECRET,
    templateFileToken: env.FEISHU_TEMPLATE_FILE_TOKEN,
    targetFolderToken: env.FEISHU_TARGET_FOLDER_TOKEN,
    copyNamePrefix: env.FEISHU_COPY_NAME_PREFIX,
    imNotifyChatId: env.FEISHU_IM_NOTIFY_CHAT_ID,
  };
}

export function assertFeishuMvpConfig(): FeishuMvpConfig {
  const c = getFeishuMvpConfig();
  const miss: string[] = [];
  if (!c.appId) miss.push("FEISHU_APP_ID");
  if (!c.appSecret) miss.push("FEISHU_APP_SECRET");
  if (!c.templateFileToken) miss.push("FEISHU_TEMPLATE_FILE_TOKEN");
  if (!c.targetFolderToken) miss.push("FEISHU_TARGET_FOLDER_TOKEN");
  if (miss.length > 0) {
    throw new Error(
      `飞书 Phase1 配置缺失: ${miss.join(", ")}。请写入 .env 后重试。`,
    );
  }
  return c;
}
