const form = document.getElementById("report-form");
const resultBox = document.getElementById("result");
const followupBox = document.getElementById("followup");
const statusText = document.getElementById("status");
const submitBtn = document.getElementById("submit-btn");
const docxBtn = document.getElementById("docx-btn");

function splitLines(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseContacts(text) {
  return splitLines(text)
    .map((line) => {
      const [id, name, role] = line.split(",").map((v) => v.trim());
      if (!id || !name) return null;
      return { id, name, role: role || undefined };
    })
    .filter(Boolean);
}

function buildPayload() {
  const userId = document.getElementById("userId").value.trim();
  const sessionId = document.getElementById("sessionId").value.trim();
  const prompt = document.getElementById("prompt").value.trim();
  const industry = document.getElementById("industry").value.trim();
  const reportType = document.getElementById("reportType").value.trim();
  const extraContext = splitLines(document.getElementById("extraContext").value);
  const personalKnowledge = splitLines(
    document.getElementById("personalKnowledge").value,
  );
  const historyDocs = splitLines(document.getElementById("historyDocs").value);
  const imContacts = parseContacts(document.getElementById("imContacts").value);

  const payload = {
    userId,
    sessionId,
    prompt,
    outputTargets: ["feishu_doc", "bitable", "slides"],
  };
  if (industry) payload.industry = industry;
  if (reportType) payload.reportType = reportType;
  if (extraContext.length > 0) payload.extraContext = extraContext;
  if (personalKnowledge.length > 0) payload.personalKnowledge = personalKnowledge;
  if (historyDocs.length > 0) payload.historyDocs = historyDocs;
  if (imContacts.length > 0) payload.imContacts = imContacts;

  return payload;
}

async function submitReport(event) {
  event.preventDefault();
  submitBtn.disabled = true;
  statusText.textContent = "请求中...";
  resultBox.textContent = "正在调用 /generate-report ...";
  followupBox.textContent = "正在分析是否需要追问...";

  try {
    const payload = buildPayload();
    const response = await fetch("/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    resultBox.textContent = JSON.stringify(data, null, 2);
    followupBox.textContent =
      data.followUpQuestions?.length > 0
        ? data.followUpQuestions.map((v, i) => `${i + 1}. ${v}`).join("\n")
        : "暂无追问";
    statusText.textContent = response.ok
      ? "生成成功"
      : `请求失败（HTTP ${response.status}）`;
  } catch (error) {
    resultBox.textContent = `请求异常: ${error instanceof Error ? error.message : String(error)}`;
    statusText.textContent = "请求异常";
  } finally {
    submitBtn.disabled = false;
  }
}

async function exportWordReport() {
  docxBtn.disabled = true;
  statusText.textContent = "正在导出 Word...";
  try {
    const payload = buildPayload();
    const response = await fetch("/generate-report-docx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`导出失败: HTTP ${response.status} ${text}`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report-${payload.sessionId}.docx`;
    link.click();
    URL.revokeObjectURL(url);
    statusText.textContent = "Word 导出成功";
  } catch (error) {
    statusText.textContent = "Word 导出失败";
    resultBox.textContent =
      error instanceof Error ? error.message : String(error);
  } finally {
    docxBtn.disabled = false;
  }
}

form.addEventListener("submit", submitReport);
docxBtn.addEventListener("click", exportWordReport);
