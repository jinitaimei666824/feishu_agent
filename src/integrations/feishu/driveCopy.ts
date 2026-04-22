import { logger } from "../../shared/logger.js";
import type { FeishuMvpConfig } from "./feishuConfig.js";
import { getTenantAccessToken } from "./token.js";

type CopyFileResponse = {
  code?: number;
  msg?: string;
  data?: {
    file?: {
      token?: string;
      name?: string;
      url?: string;
      type?: string;
    };
  };
};

export type CopiedFile = {
  documentId: string;
  name: string;
  url: string;
};

/**
 * 复制云空间中的云文档（新版 docx）到目标文件夹。
 * @see https://open.feishu.cn/document/server-docs/docs/drive-v1/file/copy
 */
export async function copyTemplateDocx(
  c: FeishuMvpConfig,
  options: { sourceFileToken: string; targetFolderToken: string; name: string },
): Promise<CopiedFile> {
  const token = await getTenantAccessToken(c);
  const fileToken = encodeURIComponent(options.sourceFileToken);
  const url = `${c.baseUrl}/open-apis/drive/v1/files/${fileToken}/copy`;

  const requestBody = {
    name: options.name,
    type: "docx" as const,
    folder_token: options.targetFolderToken,
  };

  // 调试用：确认 copy 阶段 source / target / type，便于区分 1061003 是源不存在还是目标 folder 问题
  logger.info("[feishu copy] 请求前", {
    sourceFileToken: options.sourceFileToken,
    sourceTokenLength: options.sourceFileToken.length,
    targetFolderToken: options.targetFolderToken,
    targetFolderTokenLength: options.targetFolderToken.length,
    requestBody,
    typeField: requestBody.type,
    note:
      "path 中应使用云空间 file 的 file_token；浏览器 docx/ 后多为 docx 文档 id，一般与 file_token 一致。若用模板中心/错误片段会导致 not found。",
    requestUrl: url,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(requestBody),
  });

  const rawText = await res.text();
  let data: CopyFileResponse;
  try {
    data = JSON.parse(rawText) as CopyFileResponse;
  } catch {
    logger.error("[feishu copy] 响应非 JSON", {
      httpStatus: res.status,
      rawResponseBody: rawText,
    });
    throw new Error(`飞书 copy 失败: 响应非 JSON (http=${res.status})`);
  }

  if (!res.ok || data.code !== 0 || !data.data?.file?.token) {
    logger.error("[feishu copy] 飞书原始错误（整段响应保留便于排查）", {
      httpStatus: res.status,
      rawResponseBody: rawText,
      parsed: data,
      sourceFileToken: options.sourceFileToken,
      targetFolderToken: options.targetFolderToken,
      requestBody,
    });
    throw new Error(
      `飞书 copy 失败: ${data.msg ?? res.status} (code=${data.code})`,
    );
  }
  const f = data.data.file;
  return {
    documentId: f.token!,
    name: f.name ?? options.name,
    url: f.url ?? "",
  };
}
