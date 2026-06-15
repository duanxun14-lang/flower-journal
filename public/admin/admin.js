const repo = "duanxun14-lang/flower-journal";
const branch = "main";
const bouquetsFolder = "src/content/bouquets";

const form = document.querySelector("#entryForm");
const statusEl = document.querySelector("#status");
const tokenInput = document.querySelector("#token");
const rememberInput = document.querySelector("#rememberToken");
const dateInput = form.elements.date;
const formTitle = document.querySelector("#formTitle");
const formHint = document.querySelector("#formHint");
const submitButton = document.querySelector("#submitButton");
const resetButton = document.querySelector("#resetButton");
const loadEntriesButton = document.querySelector("#loadEntriesButton");
const entryList = document.querySelector("#entryList");
const photoNote = document.querySelector("#photoNote");

let entries = [];

const savedToken = localStorage.getItem("flowerJournalToken");
if (savedToken) {
  tokenInput.value = savedToken;
  rememberInput.checked = true;
}

dateInput.value = formatDate(new Date());

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("正在保存，请不要关闭页面。");
  submitButton.disabled = true;

  try {
    const token = getToken();
    rememberToken(token);

    const data = new FormData(form);
    const title = cleanText(data.get("title"));
    const date = cleanText(data.get("date"));
    const editingPath = cleanText(data.get("editingPath"));
    const editingSha = cleanText(data.get("editingSha"));
    const existingPhotoPath = cleanText(data.get("existingPhotoPath"));
    const slug = editingPath ? fileBaseName(editingPath) : createSlug(title, date);
    const photo = data.get("photo");
    const photoPath = await uploadPhotoIfNeeded({
      token,
      slug,
      photo,
      fallbackPhotoPath: existingPhotoPath
    });
    const markdownPath = editingPath || `${bouquetsFolder}/${slug}.md`;
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
      sha: editingSha || undefined,
      message: editingPath ? `Update bouquet ${title}` : `Add bouquet ${title}`
    });

    resetForm({ keepToken: token });
    setStatus(editingPath ? "修改成功。GitHub Pages 通常 1-2 分钟后更新前台。" : "保存成功。GitHub Pages 通常 1-2 分钟后更新前台。");
    await loadEntries();
  } catch (error) {
    setStatus(`保存失败：${error.message}`);
  } finally {
    submitButton.disabled = false;
  }
});

resetButton.addEventListener("click", () => {
  resetForm({ keepToken: tokenInput.value });
  setStatus("已取消编辑。");
});

loadEntriesButton.addEventListener("click", async () => {
  try {
    await loadEntries();
  } catch (error) {
    renderEntryList([]);
    setStatus(`读取失败：${error.message}`);
  }
});

async function loadEntries() {
  const token = getToken();
  rememberToken(token);
  loadEntriesButton.disabled = true;
  entryList.innerHTML = `<p class="empty-state">正在读取花束列表...</p>`;

  try {
    const files = await listFiles({ token, path: bouquetsFolder });
    const markdownFiles = files.filter((file) => file.type === "file" && file.name.endsWith(".md"));
    entries = await Promise.all(markdownFiles.map((file) => loadEntry({ token, file })));
    entries.sort((a, b) => b.data.date.localeCompare(a.data.date, "zh-CN"));
    renderEntryList(entries);
    setStatus(`已读取 ${entries.length} 条花束记录。`);
  } finally {
    loadEntriesButton.disabled = false;
  }
}

async function loadEntry({ token, file }) {
  const payload = await getFile({ token, path: file.path });
  const markdown = decodeBase64Utf8(payload.content || "");
  const parsed = parseMarkdown(markdown);
  return {
    path: file.path,
    sha: payload.sha,
    markdown,
    data: parsed.data,
    body: parsed.body
  };
}

function renderEntryList(items) {
  if (!items.length) {
    entryList.innerHTML = `<p class="empty-state">还没有读取到花束记录。</p>`;
    return;
  }

  entryList.innerHTML = "";
  for (const entry of items) {
    const item = document.createElement("article");
    item.className = "entry-item";

    const photo = entry.data.photo;
    const preview = photo
      ? `<img class="entry-thumb" src="${photo}" alt="${escapeHtml(entry.data.title)}" loading="lazy" />`
      : `<div class="entry-thumb" aria-hidden="true"></div>`;

    item.innerHTML = `
      ${preview}
      <div class="entry-summary">
        <h3>${escapeHtml(entry.data.title || "未命名花束")}</h3>
        <p>${escapeHtml(entry.data.date || "日期待补")} · ${entry.data.draft ? "草稿" : "已发布"}</p>
        <p>${escapeHtml(entry.data.feeling || "")}</p>
      </div>
      <div class="entry-actions">
        <button class="secondary-button" type="button" data-action="edit">编辑</button>
        <button class="danger-button" type="button" data-action="delete">删除</button>
      </div>
    `;

    item.querySelector('[data-action="edit"]').addEventListener("click", () => startEdit(entry));
    item.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      try {
        await deleteEntry(entry);
      } catch (error) {
        setStatus(`删除失败：${error.message}`);
      }
    });
    entryList.appendChild(item);
  }
}

function startEdit(entry) {
  form.elements.editingPath.value = entry.path;
  form.elements.editingSha.value = entry.sha;
  form.elements.existingPhotoPath.value = entry.data.photo || "";
  form.elements.title.value = entry.data.title || "";
  form.elements.date.value = entry.data.date || formatDate(new Date());
  form.elements.feeling.value = entry.data.feeling || "";
  form.elements.flowers.value = (entry.data.flowers || []).join("\n");
  form.elements.body.value = entry.body || "";
  form.elements.draft.checked = !!entry.data.draft;
  form.elements.photo.value = "";

  formTitle.textContent = "编辑花束记录";
  formHint.textContent = "保存后会更新原来的 GitHub 记录文件。";
  submitButton.textContent = "保存修改";
  resetButton.hidden = false;
  photoNote.textContent = entry.data.photo ? `当前照片：${entry.data.photo}。不选新照片会保留它。` : "这条记录还没有照片，可以在这里补一张。";
  setStatus(`正在编辑：${entry.data.title || entry.path}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteEntry(entry) {
  const token = getToken();
  rememberToken(token);
  const deletePhoto = entry.data.photo && confirm(`要删除「${entry.data.title}」的记录文件吗？\n\n点“确定”后会继续询问是否同时删除照片。`);
  if (!deletePhoto && !entry.data.photo) {
    if (!confirm(`确定删除「${entry.data.title}」这条记录吗？`)) return;
  } else if (entry.data.photo && !deletePhoto) {
    return;
  }

  const shouldDeletePhoto = entry.data.photo
    ? confirm("是否同时删除这条记录引用的照片？\n\n建议：如果这张照片只属于这一束，就删除；如果以后还可能用到，就取消。")
    : false;

  setStatus("正在删除，请不要关闭页面。");

  await deleteFile({
    token,
    path: entry.path,
    sha: entry.sha,
    message: `Delete bouquet ${entry.data.title || entry.path}`
  });

  if (shouldDeletePhoto) {
    const photoPath = publicPhotoToRepoPath(entry.data.photo);
    if (photoPath) {
      const photoFile = await getFileIfExists({ token, path: photoPath });
      if (photoFile) {
        await deleteFile({
          token,
          path: photoPath,
          sha: photoFile.sha,
          message: `Delete bouquet photo ${entry.data.title || entry.path}`
        });
      }
    }
  }

  resetForm({ keepToken: tokenInput.value });
  setStatus("删除成功。GitHub Pages 通常 1-2 分钟后更新前台。");
  await loadEntries();
}

async function uploadPhotoIfNeeded({ token, slug, photo, fallbackPhotoPath }) {
  if (!(photo instanceof File) || !photo.name) return fallbackPhotoPath || "";

  const extension = getExtension(photo.name);
  const path = `public/uploads/bouquets/${slug}${extension}`;
  const content = await fileToBase64(photo);
  const existing = await getFileIfExists({ token, path });

  await putFile({
    token,
    path,
    content,
    sha: existing?.sha,
    message: `Upload bouquet photo ${slug}`
  });

  return `/flower-journal/uploads/bouquets/${slug}${extension}`;
}

async function listFiles({ token, path }) {
  const response = await githubFetch({ token, path });
  return response.json();
}

async function getFile({ token, path }) {
  const response = await githubFetch({ token, path });
  return response.json();
}

async function getFileIfExists({ token, path }) {
  const response = await githubFetch({ token, path, allowNotFound: true });
  if (response.status === 404) return null;
  return response.json();
}

async function githubFetch({ token, path, allowNotFound = false }) {
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponentPath(path)}?ref=${branch}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json"
    }
  });

  if (!response.ok && !(allowNotFound && response.status === 404)) {
    await throwGithubError(response);
  }

  return response;
}

async function putFile({ token, path, content, sha, message }) {
  const body = {
    message,
    content: isBase64(content) ? content : toBase64Utf8(content),
    branch
  };
  if (sha) body.sha = sha;

  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponentPath(path)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) await throwGithubError(response);
  return response.json();
}

async function deleteFile({ token, path, sha, message }) {
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponentPath(path)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message, sha, branch })
  });

  if (!response.ok) await throwGithubError(response);
  return response.json();
}

async function throwGithubError(response) {
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error("Token 不正确或已过期。");
  if (response.status === 403) throw new Error("Token 权限不够，请确认它有 Contents 读写权限。");
  if (response.status === 404) throw new Error("没有找到对应文件，请先刷新列表。");
  if (response.status === 409) throw new Error("GitHub 上有新改动，请先刷新列表后再试。");
  if (response.status === 422) throw new Error("文件路径或内容不符合 GitHub 要求，可能是同名记录已存在。");
  throw new Error(payload.message || `GitHub 返回 ${response.status}`);
}

function createMarkdown({ title, date, feeling, flowers, body, photoPath, draft }) {
  const flowerLines = flowers.length
    ? flowers.map((flower) => `  - ${yamlString(flower)}`).join("\n")
    : "  - 待确认花材";

  const photoLine = photoPath ? `photo: ${photoPath}\n` : "";
  const finalBody = body || "这条记录来自后台新增。";

  return `---\ntitle: ${yamlString(title)}\ndate: ${yamlString(date)}\nfeeling: ${yamlString(feeling)}\nflowers:\n${flowerLines}\npalette:\n  - \"#8f3f50\"\n  - \"#f3f1ec\"\n  - \"#2f252d\"\n  - \"#cfd8cf\"\n${photoLine}draft: ${draft ? "true" : "false"}\n---\n\n${finalBody}\n`;
}

function parseMarkdown(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: markdown };

  const data = {};
  const lines = match[1].split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValue) continue;

    const [, key, rawValue] = keyValue;
    if (rawValue === "") {
      const values = [];
      while (lines[index + 1]?.startsWith("  - ")) {
        index += 1;
        values.push(unquoteYaml(lines[index].slice(4)));
      }
      data[key] = values;
      continue;
    }

    if (rawValue === "true" || rawValue === "false") {
      data[key] = rawValue === "true";
    } else {
      data[key] = unquoteYaml(rawValue);
    }
  }

  return { data, body: match[2].trim() };
}

function parseFlowers(value) {
  return String(value || "")
    .split(/\n|,|，/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resetForm({ keepToken }) {
  form.reset();
  tokenInput.value = keepToken || "";
  rememberInput.checked = !!localStorage.getItem("flowerJournalToken");
  dateInput.value = formatDate(new Date());
  form.elements.editingPath.value = "";
  form.elements.editingSha.value = "";
  form.elements.existingPhotoPath.value = "";
  formTitle.textContent = "新增花束记录";
  formHint.textContent = "提交后会自动上传照片，并在 GitHub 仓库里生成一篇花束记录。";
  submitButton.textContent = "保存到 GitHub";
  resetButton.hidden = true;
  photoNote.textContent = "新增记录时可以上传照片；编辑时不选新照片，会保留原照片。";
}

function getToken() {
  const token = tokenInput.value.trim();
  if (!token) throw new Error("请先填写 GitHub Token。");
  return token;
}

function rememberToken(token) {
  if (rememberInput.checked) {
    localStorage.setItem("flowerJournalToken", token);
  } else {
    localStorage.removeItem("flowerJournalToken");
  }
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

function unquoteYaml(value) {
  const trimmed = String(value || "").trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replaceAll('\\"', '"').replaceAll("\\\\", "\\");
  }
  return trimmed;
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

function fileBaseName(path) {
  return path.split("/").pop().replace(/\.md$/, "");
}

function publicPhotoToRepoPath(photoPath) {
  if (!photoPath.startsWith("/flower-journal/uploads/")) return "";
  return photoPath.replace("/flower-journal/uploads/", "public/uploads/");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("照片读取失败。"));
    reader.readAsDataURL(file);
  });
}

function isBase64(content) {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(content) && content.length % 4 === 0;
}

function toBase64Utf8(content) {
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(binary);
}

function decodeBase64Utf8(content) {
  const binary = atob(content.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeURIComponentPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setStatus(message) {
  statusEl.textContent = message;
}
