import { runPhase1Mvp, type Phase1MvpResult } from "./pipeline.js";

/**
 * 机器人侧入口：从用户自然语言需求触发 Phase1 主流程。
 * 飞书事件订阅解析后应把 user_id / chat_id / 文本 抽出来，再调用本函数（当前仅封装 pipeline）。
 */
export async function handleBotMessageText(options: {
  userText: string;
  chatId?: string;
}): Promise<Phase1MvpResult> {
  return runPhase1Mvp({
    userText: options.userText,
    chatId: options.chatId,
  });
}
