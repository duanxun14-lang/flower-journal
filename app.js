const framework = [
  {
    title: "花束档案",
    count: "每束花一篇",
    description: "记录买花时间、场景、照片、主色、第一眼感觉、已认识和待确认花材。",
    fields: ["名字", "日期", "送给谁", "主色", "情绪", "花材"]
  },
  {
    title: "花材卡片",
    count: "每种花一张",
    description: "只收录真实见过的花材，不追求完整百科，重点是你怎么记住它。",
    fields: ["名称", "特征", "颜色", "搭配", "意义", "出现记录"]
  },
  {
    title: "待识别清单",
    count: "不认识也入柜",
    description: "先用临时名字保存观察，之后通过拍照识别、花店确认或资料比对补全。",
    fields: ["临时名", "照片", "颜色", "形状", "候选名", "确认状态"]
  },
  {
    title: "记录模板",
    count: "让内容持续",
    description: "每次买花都按同一套问题记录，慢慢形成自己的花束语言。",
    fields: ["第一眼", "为什么买", "喜欢哪里", "像什么", "下次想试"]
  }
];

const entryTemplate = [
  { label: "花束名字", value: "给这束花一个你自己会记住的名字" },
  { label: "买花时间 / 场景", value: "哪一天、为什么买、送给谁、放在哪里" },
  { label: "第一眼感觉", value: "颜色、气质、情绪，不需要专业" },
  { label: "已认识花材", value: "能确认的先写，名字不确定就标注大概确定" },
  { label: "待认识花材", value: "未知花材 A / B / C，附上颜色、形状和位置" },
  { label: "我赋予它的意义", value: "一句话也可以，比如：不是惊喜，是我一直在" }
];

const storageKey = "flower-cabinet-bouquets";
let bouquets = [];
let flowers = [];
let unknowns = [];

async function loadJson(path, fallback = []) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Cannot load ${path}`);
    return await response.json();
  } catch (error) {
    console.warn(error);
    return fallback;
  }
}

async function loadData() {
  const [loadedBouquets, loadedFlowers, loadedUnknowns] = await Promise.all([
    loadJson("data/bouquets.json"),
    loadJson("data/flowers.json"),
    loadJson("data/unknowns.json")
  ]);
  bouquets = loadedBouquets;
  flowers = loadedFlowers;
  unknowns = loadedUnknowns;
}

function renderFramework() {
  const grid = document.querySelector("#frameworkGrid");
  if (!grid) return;
  grid.innerHTML = framework.map((item) => `
    <article class="framework-card">
      <div class="framework-card-top">
        <h3>${item.title}</h3>
        <span>${item.count}</span>
      </div>
      <p>${item.description}</p>
      <div class="meta">${item.fields.map((field) => `<span class="pill">${field}</span>`).join("")}</div>
    </article>
  `).join("");
}

function renderBouquets() {
  const grid = document.querySelector("#bouquetGrid");
  if (!grid) return;
  const savedBouquets = loadSavedBouquets().map((item, index) => ({ ...item, savedIndex: index }));
  const allBouquets = [...savedBouquets, ...bouquets];
  grid.innerHTML = allBouquets.map((item) => renderBouquetCard(item, Number.isInteger(item.savedIndex))).join("");
  setupDeleteButtons(grid);
}

function renderAdminBouquets() {
  const grid = document.querySelector("#adminBouquetGrid");
  if (!grid) return;
  const savedBouquets = loadSavedBouquets().map((item, index) => ({ ...item, savedIndex: index }));
  if (!savedBouquets.length) {
    grid.innerHTML = `<article class="empty-card"><h3>还没有本地草稿</h3><p>从上面的录入表单保存第一束真实遇见过的花。</p></article>`;
    return;
  }

  grid.innerHTML = savedBouquets.map((item) => renderBouquetCard(item, true)).join("");
  setupDeleteButtons(grid);
}

function renderBouquetCard(item, canDelete) {
  return `
    <article class="bouquet-card">
      ${renderBouquetVisual(item)}
      <div class="card-body">
        <p class="section-label">${item.date}</p>
        <h3>${item.title}</h3>
        <p>${item.feeling}</p>
        <div class="meta">${item.flowers.map((flower) => `<span class="pill">${flower}</span>`).join("")}</div>
        ${canDelete ? `<button class="text-button" type="button" data-delete-bouquet="${item.savedIndex}">删除这条本地草稿</button>` : ""}
      </div>
    </article>
  `;
}

function setupDeleteButtons(root) {
  root.querySelectorAll("[data-delete-bouquet]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteSavedBouquet(Number(button.dataset.deleteBouquet));
      renderBouquets();
      renderAdminBouquets();
    });
  });
}

function renderBouquetVisual(item) {
  if (item.photo) {
    return `<img class="bouquet-photo" src="${item.photo}" alt="${item.title}">`;
  }

  return `<div class="bouquet-art" style="--base:${item.palette[3]};--c1:${item.palette[0]};--c2:${item.palette[1]};--c3:${item.palette[2]}"></div>`;
}

function loadSavedBouquets() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function saveBouquet(entry) {
  const savedBouquets = loadSavedBouquets();
  localStorage.setItem(storageKey, JSON.stringify([entry, ...savedBouquets]));
}

function deleteSavedBouquet(index) {
  const savedBouquets = loadSavedBouquets();
  savedBouquets.splice(index, 1);
  localStorage.setItem(storageKey, JSON.stringify(savedBouquets));
}

function splitList(value) {
  return value
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderFlowers() {
  const list = document.querySelector("#flowerList");
  if (!list) return;
  list.innerHTML = flowers.map((item) => `
    <article class="flower-card">
      <div class="flower-swatch" style="--tone:${item.tone}"></div>
      <div class="card-body">
        <h3>${item.name}</h3>
        <p>${item.seen}</p>
        <p>${item.note}</p>
        <span class="pill">${item.meaning}</span>
      </div>
    </article>
  `).join("");
}

function renderUnknowns() {
  const grid = document.querySelector("#unknownGrid");
  if (!grid) return;
  grid.innerHTML = unknowns.map((item) => `
    <article class="unknown-card">
      <div class="unknown-top">
        <span class="unknown-dot" style="--tone:${item.tone}"></span>
        <h3>${item.name}</h3>
      </div>
      <p>${item.description}</p>
      <span class="pill">待确认</span>
    </article>
  `).join("");
}

function renderTemplate() {
  const grid = document.querySelector("#templateGrid");
  if (!grid) return;
  grid.innerHTML = entryTemplate.map((item) => `
    <div class="template-item">
      <span>${item.label}</span>
      <p>${item.value}</p>
    </div>
  `).join("");
}

function setupBouquetForm() {
  const form = document.querySelector("#bouquetForm");
  const note = document.querySelector("#formNote");
  if (!form || !note) return;
  const photoInput = form.elements.photo;
  const imagePreview = document.querySelector("#imagePreview");
  let selectedPhoto = "";

  if (photoInput && imagePreview) {
    photoInput.addEventListener("change", async () => {
      const file = photoInput.files[0];
      if (!file) {
        selectedPhoto = "";
        imagePreview.textContent = "选择照片后会在这里预览";
        imagePreview.style.backgroundImage = "";
        return;
      }

      selectedPhoto = await resizeImage(file, 1200);
      imagePreview.textContent = "";
      imagePreview.style.backgroundImage = `url(${selectedPhoto})`;
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const bouquetFlowers = splitList(formData.get("flowers") || "");
    const colors = splitList(formData.get("colors") || "");
    const entry = {
      title: formData.get("title").trim(),
      date: formData.get("date").trim() || "待补充",
      feeling: formData.get("feeling").trim(),
      flowers: bouquetFlowers.length ? bouquetFlowers : ["待补充花材"],
      palette: paletteFromColors(colors),
      photo: selectedPhoto
    };

    saveBouquet(entry);
    renderBouquets();
    renderAdminBouquets();
    form.reset();
    selectedPhoto = "";
    if (imagePreview) {
      imagePreview.textContent = "选择照片后会在这里预览";
      imagePreview.style.backgroundImage = "";
    }
    note.textContent = "已保存为本地草稿。正式上线前请导出 JSON 并提交到 GitHub。";
    window.location.hash = "local-bouquets";
  });
}

function setupExport() {
  const exportButton = document.querySelector("#exportBouquets");
  if (!exportButton) return;
  exportButton.addEventListener("click", () => {
    const merged = [...loadSavedBouquets(), ...bouquets];
    const blob = new Blob([`${JSON.stringify(merged, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bouquets.json";
    link.click();
    URL.revokeObjectURL(url);
  });
}

function resizeImage(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function paletteFromColors(colors) {
  const colorMap = {
    "粉色": "#f5d7d8",
    "白色": "#f5f1e8",
    "浅绿色": "#cfd7c5",
    "绿色": "#9fac98",
    "红色": "#d66f7e",
    "酒红色": "#8f3f50",
    "紫色": "#b3a4c7",
    "黄色": "#f1d15e",
    "橙色": "#d9876a",
    "蓝色": "#9db8ca",
    "黑色": "#2f252d"
  };
  const picked = colors.map((color) => colorMap[color]).filter(Boolean);
  return [
    picked[0] || "#f5d7d8",
    picked[1] || "#d66f7e",
    picked[2] || "#eef0df",
    picked[3] || "#cfd7c5"
  ];
}

async function init() {
  await loadData();
  renderFramework();
  renderBouquets();
  renderAdminBouquets();
  renderFlowers();
  renderUnknowns();
  renderTemplate();
  setupBouquetForm();
  setupExport();
}

init();
