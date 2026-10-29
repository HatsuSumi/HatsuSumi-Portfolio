# HatsuSumi Personal Archive

HatsuSumi 的个人作品集网站，集中展示美术作品、创作过程和编程项目。站点使用 Vite 与原生 TypeScript 构建，不依赖前端 UI 框架。

## 技术栈

- **语言**：TypeScript
- **构建工具与开发服务器**：Vite
- **界面**：原生 DOM API、HTML5、CSS3
- **架构**：无前端 UI 框架的单页应用（SPA）
- **静态资源**：通过 Vite `public/` 目录提供图像、视频和其他媒体

## 环境要求

- Node.js 20 或更高版本
- npm

## 开始开发

```bash
npm install
npm run dev
```

Vite 会在终端输出本地开发地址。

## 构建与预览

```bash
npm run build
npm run preview
```

`npm run build` 会先执行 TypeScript 检查，再生成生产文件到 `dist/`。

## 项目结构

```text
public/
  assets/             头像、作品图像、视频及其他静态资源
src/
  data/
    artworks.ts       美术作品数据
    projects.ts       编程项目数据
  main.ts             页面结构与交互逻辑
  styles.css          页面样式与响应式布局
  types.ts            共享数据类型
  vite-env.d.ts       Vite 客户端类型声明
index.html            HTML 入口
```

## 更新内容

新增或修改美术作品时编辑 `src/data/artworks.ts`，并将对应媒体资源放入 `public/assets/`。新增或修改项目时编辑 `src/data/projects.ts`。`public/` 下的资源以根路径引用，例如 `public/assets/avatar.jpg` 对应 `/assets/avatar.jpg`。
