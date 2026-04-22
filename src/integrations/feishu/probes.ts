import { logger } from "../../shared/logger.js";
import type { FeishuMvpConfig } from "./feishuConfig.js";
import { getTenantAccessToken } from "./token.js";

const RAW_PREVIEW_MAX = 400;
const ERROR_BODY_MAX = 4000;

function safeJson(raw: string): { parsed: unknown; error?: string } {
  try {
    return { parsed: JSON.parse(raw) as unknown };
  } catch (e) {
    return { parsed: null, error: e instanceof Error ? e.message : String(e) };
  }
}

function pickContentFromRawResponse(parsed: unknown): string | undefined {
  if (!parsed || typeof parsed !== "object") return undefined;
  const o = parsed as Record<string, unknown>;
  if (o.code !== 0 && o.code !== undefined) return undefined;
  const data = o.data;
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (typeof d.content === "string") return d.content;
  if (d.content && typeof d.content === "object") {
    const c = d.content as Record<string, unknown>;
    if (typeof c.text === "string") return c.text;
  }
  return undefined;
}

export type SourceProbeResult = {
  sourceToken: string;
  sourceReadable: boolean;
  sourceReadError?: string;
  rawContent: {
    httpStatus: number;
    feishuCode?: number;
    feishuMsg?: string;
    /** 失败或异常时附完整原文（截断） */
    rawResponseBody: string;
    contentPreview?: string;
    contentLength?: number;
  };
  blocks: {
    httpStatus: number;
    feishuCode?: number;
    feishuMsg?: string;
    rawResponseBody: string;
    itemCount?: number;
    hasMore?: boolean;
  };
};

/**
 * 用 docx 读能力探测「模板 token / document_id」是否可读（raw_content + list blocks 首包）。
 * 不经过 drive copy。
 */
export async function sourceProbe(
  c: FeishuMvpConfig,
  sourceDocumentId: string,
): Promise<SourceProbeResult> {
  if (!sourceDocumentId.trim()) {
    return {
      sourceToken: sourceDocumentId,
      sourceReadable: false,
      sourceReadError: "source token 为空",
      rawContent: { httpStatus: 0, rawResponseBody: "" },
      blocks: { httpStatus: 0, rawResponseBody: "" },
    };
  }

  const access = await getTenantAccessToken(c);
  const id = encodeURIComponent(sourceDocumentId);

  const rawUrl = `${c.baseUrl}/open-apis/docx/v1/documents/${id}/raw_content`;
  const rawRes = await fetch(rawUrl, {
    headers: { Authorization: `Bearer ${access}` },
  });
  const rawText = await rawRes.text();
  const rawJson = safeJson(rawText);
  const rawParsed = rawJson.parsed as Record<string, unknown> | null;
  const rawFeishuCode =
    rawParsed && typeof rawParsed.code === "number" ? rawParsed.code : undefined;
  const rawFeishuMsg =
    rawParsed && typeof rawParsed.msg === "string" ? rawParsed.msg : undefined;
  const content = rawParsed ? pickContentFromRawResponse(rawParsed) : undefined;
  const rawOk =
    rawRes.ok && rawFeishuCode === 0 && typeof content === "string";

  const blockUrl = `${c.baseUrl}/open-apis/docx/v1/documents/${id}/blocks?page_size=50&document_revision_id=-1`;
  const bRes = await fetch(blockUrl, {
    headers: { Authorization: `Bearer ${access}` },
  });
  const bText = await bRes.text();
  const bJ = safeJson(bText);
  const bParsed = bJ.parsed as Record<string, unknown> | null;
  const bCode =
    bParsed && typeof bParsed.code === "number" ? bParsed.code : undefined;
  const bMsg =
    bParsed && typeof bParsed.msg === "string" ? bParsed.msg : undefined;
  const bData = bParsed?.data;
  const items =
    bData && typeof bData === "object" && "items" in bData
      ? (bData as { items?: unknown[] }).items
      : undefined;
  const itemCount = Array.isArray(items) ? items.length : undefined;
  const hasMore =
    bData && typeof bData === "object" && "has_more" in bData
      ? Boolean((bData as { has_more?: boolean }).has_more)
      : undefined;
  const blocksOk = bRes.ok && bCode === 0;

  const sourceReadable = Boolean(rawOk || blocksOk);

  let sourceReadError: string | undefined;
  if (!sourceReadable) {
    sourceReadError = [
      `raw_content: http=${rawRes.status} code=${rawFeishuCode ?? "n/a"} msg=${rawFeishuMsg ?? ""}`,
      `list blocks: http=${bRes.status} code=${bCode ?? "n/a"} msg=${bMsg ?? ""}`,
    ].join(" | ");
  }

  return {
    sourceToken: sourceDocumentId,
    sourceReadable,
    sourceReadError,
    rawContent: {
      httpStatus: rawRes.status,
      feishuCode: rawFeishuCode,
      feishuMsg: rawFeishuMsg,
      rawResponseBody: rawText.slice(0, ERROR_BODY_MAX),
      contentPreview: content?.slice(0, RAW_PREVIEW_MAX),
      contentLength: content?.length,
    },
    blocks: {
      httpStatus: bRes.status,
      feishuCode: bCode,
      feishuMsg: bMsg,
      rawResponseBody: bText.slice(0, ERROR_BODY_MAX),
      itemCount,
      hasMore,
    },
  };
}

export type TargetProbeResult = {
  targetFolderToken: string;
  targetWritable: boolean;
  targetWriteError?: string;
  create: {
    httpStatus: number;
    feishuCode?: number;
    feishuMsg?: string;
    rawResponseBody: string;
    newDocumentId?: string;
    newDocumentUrl?: string;
    title?: string;
  };
  /** 仅在 deleteProbeDoc 且创建成功时尝试 */
  deleteStep?: {
    attempted: boolean;
    httpStatus?: number;
    feishuCode?: number;
    rawResponseBody?: string;
  };
};

/**
 * 在目标文件夹下「创建」空白 docx（不 copy），用于验证 folder 可写。可选删除刚创建的探针文件。
 */
export async function targetProbe(
  c: FeishuMvpConfig,
  options: { folderToken: string; deleteAfter?: boolean },
): Promise<TargetProbeResult> {
  const folder = options.folderToken.trim();
  if (!folder) {
    return {
      targetFolderToken: folder,
      targetWritable: false,
      targetWriteError: "target folder token 为空",
      create: { httpStatus: 0, rawResponseBody: "" },
    };
  }

  const access = await getTenantAccessToken(c);
  const title = `agent-probe-${Date.now()}`;
  const createUrl = `${c.baseUrl}/open-apis/docx/v1/documents`;
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ folder_token: folder, title }),
  });
  const createText = await createRes.text();
  const cj = safeJson(createText);
  const cParsed = cj.parsed as Record<string, unknown> | null;
  const cCode =
    cParsed && typeof cParsed.code === "number" ? cParsed.code : undefined;
  const cMsg =
    cParsed && typeof cParsed.msg === "string" ? cParsed.msg : undefined;
  const data = cParsed?.data;
  let docId: string | undefined;
  if (data && typeof data === "object" && "document" in data) {
    const doc = (data as { document?: { document_id?: string } }).document;
    docId = doc?.document_id;
  }
  const targetWritable = createRes.ok && cCode === 0 && Boolean(docId);
  const newDocumentUrl = docId
    ? `https://www.feishu.cn/docx/${docId}`
    : undefined;

  let targetWriteError: string | undefined;
  if (!targetWritable) {
    targetWriteError = `create docx: http=${createRes.status} code=${cCode ?? "n/a"} msg=${cMsg ?? ""}`;
  }

  const out: TargetProbeResult = {
    targetFolderToken: folder,
    targetWritable,
    targetWriteError,
    create: {
      httpStatus: createRes.status,
      feishuCode: cCode,
      feishuMsg: cMsg,
      rawResponseBody: createText.slice(0, ERROR_BODY_MAX),
      newDocumentId: docId,
      newDocumentUrl,
      title,
    },
  };

  if (options.deleteAfter && docId) {
    const delUrl = `${c.baseUrl}/open-apis/drive/v1/files/${encodeURIComponent(
      docId,
    )}?type=docx`;
    const delRes = await fetch(delUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${access}` },
    });
    const delText = await delRes.text();
    const dj = safeJson(delText);
    const dParsed = dj.parsed as Record<string, unknown> | null;
    const dCode =
      dParsed && typeof dParsed.code === "number" ? dParsed.code : undefined;
    out.deleteStep = {
      attempted: true,
      httpStatus: delRes.status,
      feishuCode: dCode,
      rawResponseBody: delText.slice(0, ERROR_BODY_MAX),
    };
    if (!delRes.ok && dCode !== 0) {
      logger.warn("[targetProbe] 探针文档删除未完全成功，可 manual 删除", {
        docId,
        delText: delText.slice(0, 500),
      });
    }
  } else if (options.deleteAfter && !docId) {
    out.deleteStep = { attempted: false };
  }

  return out;
}

export type ResourceDebugCheckResult = {
  sourceToken: string;
  targetFolderToken: string;
  copyType: "docx";
  sourceProbe: SourceProbeResult;
  targetProbe: TargetProbeResult;
  /** 面向人的结论（不替代自行核对飞书控制台权限） */
  conclusion: {
    label: string;
    /** 与需求文档一致的分支说明 */
    hints: string[];
  };
};

export async function runResourceDebugCheck(
  c: FeishuMvpConfig,
  options: { deleteProbeDoc: boolean },
): Promise<ResourceDebugCheckResult> {
  const [src, tgt] = await Promise.all([
    sourceProbe(c, c.templateFileToken),
    targetProbe(c, {
      folderToken: c.targetFolderToken,
      deleteAfter: options.deleteProbeDoc,
    }),
  ]);

  const hints: string[] = [];
  if (!src.sourceReadable) {
    hints.push(
      "sourceReadable=false → 模板 token 错或该云文档对应用无读权限（或 doc 已删除/ID 非新版 docx）",
    );
  }
  if (src.sourceReadable && !tgt.targetWritable) {
    hints.push(
      "sourceReadable=true 且 targetWritable=false → 目标 folder_token 错或无在文件夹下「创建云文档」的权限；tenant 场景下官方说明 `folder_token` 常需为应用有权限的文件夹",
    );
  }
  if (src.sourceReadable && tgt.targetWritable) {
    hints.push(
      "source 与 target 探针均通过。若 copy 仍 404(1061003)，极大概率是：当前 `FEISHU_TEMPLATE_FILE_TOKEN` 在 docx 读 API 上可用，但不是 drive `POST .../files/:file_token/copy` 所要求的**云盘 file_token**；请对照云盘「文件元数据」与文档 URL 中的 id，勿将快捷方式/模板中心专用 ID 与 drive 文件 token 混用。",
    );
  }

  let label: string;
  if (!src.sourceReadable) {
    label = "先解决源文档可读性（token 与读权限）";
  } else if (!tgt.targetWritable) {
    label = "源可读，但目标文件夹不可写或 token 错误";
  } else {
    label = "源与目标探针通过；若 copy 仍失败请核对 drive file_token 与 document_id 是否同一云空间文件";
  }

  return {
    sourceToken: c.templateFileToken,
    targetFolderToken: c.targetFolderToken,
    copyType: "docx",
    sourceProbe: src,
    targetProbe: tgt,
    conclusion: { label, hints },
  };
}
