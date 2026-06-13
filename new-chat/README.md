# 花材小柜子

一个私人花束与花材档案网站。

## 本地预览

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

然后打开：

- 前台：`http://127.0.0.1:4173/`
- 后台：`http://127.0.0.1:4173/admin.html`

## 内容结构

- `data/bouquets.json`：花束记录
- `data/flowers.json`：已认识花材
- `data/unknowns.json`：待识别花材
- `assets/photos/bouquets/`：整束花照片
- `assets/photos/flowers/`：已认识花材照片
- `assets/photos/unknowns/`：待识别花材照片

## 后台说明

GitHub Pages 是静态网站，不能直接把后台录入内容写回仓库。

当前后台会把新增内容先保存为浏览器本地草稿，并提供 `导出 bouquets.json`。正式发布时，把导出的内容合并到 `data/bouquets.json`，再提交到 GitHub。

