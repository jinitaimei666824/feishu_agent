import Fastify from "fastify";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { registerFeishuWebhookRoutes } from "./api/feishuWebhook.js";
import { env } from "./config/env.js";
import { logger } from "./shared/logger.js";

async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  /**
   * 飞书 url_verification 约 3s 超时：必须先注册、且勿在静态 import 中拉取 phase1/report（会间接加载大量依赖拖慢冷启动）。
   */
  await registerFeishuWebhookRoutes(app);
  app.get("/healthz", async () => ({ ok: true }));

  const webRoot = path.resolve(process.cwd(), "src", "web");
  app.get("/", async (_, reply) => {
    const html = await readFile(path.join(webRoot, "index.html"), "utf-8");
    reply.type("text/html; charset=utf-8");
    return reply.send(html);
  });
  app.get("/ui.css", async (_, reply) => {
    const css = await readFile(path.join(webRoot, "styles.css"), "utf-8");
    reply.type("text/css; charset=utf-8");
    return reply.send(css);
  });
  app.get("/ui.js", async (_, reply) => {
    const js = await readFile(path.join(webRoot, "app.js"), "utf-8");
    reply.type("application/javascript; charset=utf-8");
    return reply.send(js);
  });

  return app;
}

async function start(): Promise<void> {
  let app;
  try {
    app = await buildApp();
    await app.listen({ host: env.HOST, port: env.PORT });
    logger.info("server started", { host: env.HOST, port: env.PORT });
  } catch (error) {
    logger.error("server failed to start (webhook/UI 未监听)", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
    return;
  }

  /**
   * report / phase1 注册失败时绝不能 exit：否则进程退出后连已注册的 /api/feishu/webhook 也会挂掉，
   * 表现成「飞书保存无事件日志、Vercel 无请求」。
   */
  try {
    const { registerReportRoutes } = await import("./api/report.js");
    await registerReportRoutes(app);
    logger.info("report routes registered");
  } catch (error) {
    logger.error("registerReportRoutes 失败（webhook 仍可用）", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const { registerPhase1Routes } = await import("./api/phase1.js");
    await registerPhase1Routes(app);
    logger.info("phase1 routes registered");
  } catch (error) {
    logger.error("registerPhase1Routes 失败（webhook 仍可用）", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

start();
