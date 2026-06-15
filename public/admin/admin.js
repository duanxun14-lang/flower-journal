const repo = "duanxun14-lang/flower-journal";
const branch = "main";
const form = document.querySelector("#entryForm");
const statusEl = document.querySelector("#status");
const tokenInput = document.querySelector("#token");
const rememberInput = document.querySelector("#rememberToken");
const dateInput = form.elements.date;

const savedToken = localStorage.getItem("flowerJournalToken");
if (savedToken) {
  tokenInput.value = savedToken;
  rememberInput.checked = true;
}

dateInput.value = formatDate(new Date());

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("正在保存，请不要关闭页面。");

  const submitButton = form.querySelector("button");
  submitButton.disabled = true;

  try {
    const data = new FormData(form);
    const token = String(data.get("token") || "").trim();
    if (!token) throw new Error("请先填写 GitHub Token。");

    if (rememberInput.checked) {
      localStorage.setItem("flowerJournalToken", token);
    } else {
      localStorage.removeItem("flowerJournalToken");
    }

    const title = cleanText(data.get("title"));
    const date = cleanText(data.get("date"));
    const slug = createSlug(title, date);
    const photo = data.get("photo");
    const photoPath = await uploadPhotoIfNeeded({ token, slug, photo });
    const markdownPath = `src/content/bouquets/${slug}.md`;
    const markdown = createMarkdown({
      title,
      date,
      feeling: cleanText(data.get("feeling")),
      flowers: parseFlowers(data.get("flowers")),
      body: cleanText(data.get("body")),
      photoPath,
      draft: data.get("draft") === "on"
    });

    await putFile({
      token,
      path: markdownPath,
      content: markdown,
      message: `Add bouquet ${title}`
    });

    form.reset();
    dateInput.value = formatDate(new Date());
    if (rememberInput.checked) tokenInput.value = token;

    setStatus("保存成功。GitHub Pages 通常 1-2 分钟后更新前台。");
  } catch (error) {
    setStatus(`保存失败：${error.message}`);
  } finally {
    submitButton.disabled = false;
  }
});

async function uploadPhotoIfNeeded({ token, slug, photo }) {
  if (!(photo instanceof File) || !photo.name) return "";

  const extension = getExtension(photo.name);
  const path = `public/uploads/bouquets/${slug}${extension}`;
  const content = await fileToBase64(photo);

  await putFile({
    token,
    path,
    content,
    message: `Upload bouquet photo ${slug}`
  });

  return `/flower-journal/uploads/bouquets/${slug}${extension}`;
}

async function putFile({ token, path, content, message }) {
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponentPath(path)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      content: toBase64Utf8(content),
      branch
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Token 不正确或已过期。");
    if (response.status === 403) throw new Error("Token 权限不够，请确认它有 Contents 读写权限。");
    if (response.status === 422) throw new Error("文件路径或内容不符合 GitHub 要求，可能是同名记录已存在。");
    throw new Error(payload.message || `GitHub 返回 ${response.status}`);
  }

  return response.json();
}

function createMarkdown({ title, date, feeling, flowers, body, photoPath, draft }) {
  const flowerLines = flowers.length
    ? flowers.map((flower) => `  - ${yamlString(flower)}`).join("\n")
    : "  - 待确认花材";

  const photoLine = photoPath ? `photo: ${photoPath}\n` : "";
  const finalBody = body || "这条记录来自后台新增。";

  return `---\ntitle: ${yamlString(title)}\ndate: ${yamlString(date)}\nfeeling: ${yamlString(feeling)}\nflowers:\n${flowerLines}\npalette:\n  - \"#8f3f50\"\n  - \"#f3f1ec\"\n  - \"#2f252d\"\n  - \"#cfd8cf\"\n${photoLine}draft: ${draft ? "true" : "false"}\n---\n\n${finalBody}\n`;
}

function parseFlowers(value) {
  return String(value || "")
    .split(/\n|,|，/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function createSlug(title, date) {
  const datePart = date.replace(/[^\d]/g, "").slice(0, 8) || formatDate(new Date()).replaceAll(".", "");
  const titlePart = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 36);
  const suffix = Date.now().toString(36).slice(-5);
  return [datePart, titlePart || "bouquet", suffix].join("-");
}

function cleanText(value) {
  return String(value || "").trim();
}

function yamlString(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function getExtension(filename) {
  const match = filename.toLowerCase().match(/\.(jpe?g|png|webp|gif)$/);
  return match ? match[0] : ".jpg";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("照片读取失败。"));
    reader.readAsDataURL(file);
  });
}

function toBase64Utf8(content) {
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(content) && content.length % 4 === 0) return content;
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(binary);
}

function encodeURIComponentPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function setStatus(message) {
  statusEl.textContent = message;
}
