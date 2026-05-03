export function buildGeneratedDocCard(input: {
  title: string;
  docUrl: string;
  sessionId: string;
}): Record<string, unknown> {
  return {
    type: "template",
    data: {
      template_id: "AAqYfP3X8VJY6",
      template_version_name: "1.0.0",
      template_variable: {
        title: input.title,
        doc_url: input.docUrl,
        session_id: input.sessionId,
      },
    },
  };
}

export function buildFallbackGeneratedDocCard(input: {
  title: string;
  docUrl: string;
  sessionId: string;
}): Record<string, unknown> {
  return {
    schema: "2.0",
    config: {
      update_multi: true,
    },
    body: {
      direction: "vertical",
      elements: [
        {
          tag: "markdown",
          content: `**${input.title}**\n\n文档已生成，可点击查看。`,
        },
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: {
                tag: "plain_text",
                content: "查看文档",
              },
              type: "primary",
              multi_url: {
                url: input.docUrl,
              },
            },
            {
              tag: "button",
              text: {
                tag: "plain_text",
                content: "标记已处理",
              },
              type: "default",
              value: {
                action: "mark_done",
                session_id: input.sessionId,
              },
            },
          ],
        },
      ],
    },
  };
}

export function buildResolvedCard(): Record<string, unknown> {
  return {
    schema: "2.0",
    config: {
      update_multi: true,
    },
    body: {
      direction: "vertical",
      elements: [
        {
          tag: "markdown",
          content: "✅ 该任务已标记为处理完成。",
        },
      ],
    },
  };
}
