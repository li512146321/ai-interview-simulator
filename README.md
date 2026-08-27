# AI面试模拟器

基于 Vue 3 + Vite + Naive UI + GLM-4.7-Flash API 的智能面试模拟系统

## 技术栈

- **前端框架**: Vue 3 + Vite
- **UI组件库**: Naive UI
- **状态管理**: Pinia
- **路由**: Vue Router
- **HTTP客户端**: Axios
- **AI模型**: GLM-4.7-Flash (智谱AI)
- **部署平台**: Vercel

## 功能特性

- 📄 简历上传与解析
- 💼 多岗位选择（Java、前端）
- 🤖 AI智能面试对话
- 📊 自动评分报告
- 💳 套餐购买与付费解锁
- 📋 面试历史记录
- 👤 用户个人中心
- 🎤 语音输入支持

## 本地运行

### 1. 克隆项目

```bash
git clone <repository-url>
cd ai-interview-simulator
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并配置 GLM API Key：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```
GLM_API_KEY=your_actual_api_key_here
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173`

## 部署到 Vercel

### 1. 安装 Vercel CLI（可选）

```bash
npm install -g vercel
```

### 2. 部署

```bash
vercel
```

或通过 Vercel 网页界面连接 GitHub 仓库进行自动部署。

### 3. 配置环境变量

在 Vercel 项目设置中添加环境变量：

- `GLM_API_KEY`: 你的智谱AI API密钥

### 4. 部署配置

项目已包含 `vercel.json` 配置文件，包含：

- API函数配置（内存512MB，最大执行时间30秒）
- SPA路由重定向配置

## 项目结构

```
ai-interview-simulator/
├── api/                    # Vercel Serverless Functions
│   └── ai.js              # AI API代理
├── src/
│   ├── api/               # API接口
│   │   └── interview.js   # 面试相关API
│   ├── components/        # 组件
│   │   ├── Header.vue     # 头部导航
│   │   └── PayModal.vue   # 付费弹窗
│   ├── router/            # 路由配置
│   │   └── index.js
│   ├── stores/            # Pinia状态管理
│   │   ├── interview.js   # 面试状态
│   │   └── user.js        # 用户状态
│   ├── utils/             # 工具函数
│   │   └── request.js     # Axios封装
│   ├── views/             # 页面组件
│   │   ├── HomeView.vue   # 首页
│   │   ├── RoomView.vue   # 面试房间
│   │   ├── ResultView.vue # 结果页面
│   │   ├── ProfileView.vue # 个人中心
│   │   └── HistoryView.vue # 历史记录
│   ├── App.vue            # 根组件
│   └── main.js            # 入口文件
├── .env.example           # 环境变量示例
├── vercel.json            # Vercel配置
├── vite.config.js         # Vite配置
└── package.json           # 项目依赖
```

## 使用说明

1. **登录**: 输入昵称登录系统
2. **上传简历**: 支持 .pdf、.docx、.txt 格式
3. **解析简历**: 点击解析按钮提取简历内容
4. **选择岗位**: 选择Java或前端开发岗位
5. **开始面试**: 进入面试房间，与AI进行面试对话
6. **查看报告**: 面试结束后查看评分报告（付费解锁完整内容）
7. **历史记录**: 查看所有面试历史记录

## 套餐说明

| 套餐 | 价格 | 内容 |
|------|------|------|
| 免费体验 | ¥0 | 每天1次，限前3题 |
| 单次体验 | ¥4.9 | 完整面试1次 |
| 5次卡 | ¥19.9 | 5次完整面试 |
| 月卡 | ¥29.9 | 30天不限次 |

## 注意事项

- 本项目为演示项目，支付功能为模拟
- PDF和DOCX文件解析需要额外的库支持，当前版本仅支持TXT文件完整解析
- 历史记录数据暂存于内存，刷新页面会丢失
- 请确保 GLM API Key 配置正确

## 许可证

MIT License