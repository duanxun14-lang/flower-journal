# 花材小柜子数据目录

这里以后用来存放花束、花材、待识别花材的数据文件。

目前网站前台会读取这里的 JSON 文件。后台录入内容会先保存在浏览器 Local Storage 里作为草稿，并可以导出成 `bouquets.json`。

```text
bouquets.json
flowers.json
unknowns.json
```

照片文件建议放在 `assets/photos/` 下面，数据里只保存照片路径。
