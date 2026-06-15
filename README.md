# 花材小柜子

一个用 Astro + Decap CMS 搭建的私人花束与花材档案网站。

## 本地预览

```bash
npm install
npm run dev
```

然后打开：

- 前台：`http://localhost:4321/flower-journal/`
- 后台：`http://localhost:4321/flower-journal/admin/`

## 内容结构

- `src/content/bouquets/`：花束记录
- `src/content/flowers/`：已认识花材
- `src/content/unknowns/`：待识别花材
- `public/uploads/bouquets/`：整束花照片
- `public/uploads/flowers/`：已认识花材照片
- `public/uploads/unknowns/`：待识别花材照片

## 后台说明

后台使用 Decap CMS，配置文件在 `public/admin/config.yml`。

部署到 GitHub Pages 后，后台地址是：

```text
https://duanxun14-lang.github.io/flower-journal/admin/
```

如果后台登录提示 GitHub 授权配置问题，需要补 GitHub OAuth/Decap 认证配置。

## GitHub Pages

这个项目使用 GitHub Actions 构建 Astro，并部署 `dist/`。

在仓库 `Settings -> Pages` 里选择：

```text
Source: GitHub Actions
```
