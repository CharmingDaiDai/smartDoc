# 智能文档系统 (SmartDoc)

一个基于 RAG (Retrieval-Augmented Generation) 技术的智能文档问答系统，支持多种文档格式上传、智能索引构建和自然语言查询。

## ✨ 功能特性

- 📄 **多格式文档支持**: 支持 PDF、Word、Markdown 等多种文档格式
- 🔍 **智能检索**: 基于向量数据库的语义检索，支持多种 RAG 策略
- 🤖 **多模型支持**: 集成 GLM、OpenAI、Gemini 等多种大语言模型
- 💬 **流式对话**: 实时流式响应，提供流畅的对话体验
- 🔐 **安全认证**: GitHub OAuth 登录，JWT 令牌管理
- 📊 **可视化界面**: 现代化的 React 前端界面
- 🐳 **容器化部署**: 支持 Docker 和 Docker Compose 部署

## 🚀 快速开始

### 环境要求

- Java 17+
- Node.js 16+
- MySQL 8.0+
- Docker (可选)

### 1. 克隆项目

```bash
git clone https://github.com/CharmingDaiDai/smartDoc.git
cd smartDoc
```

### 2. 环境配置

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的配置信息。

**⚠️ 重要安全提醒**:

- 请勿将包含真实密钥的 `.env` 文件提交到版本控制系统
- 生产环境请使用强密码和安全的密钥
- 定期轮换 API 密钥和访问令牌

### 3. 启动服务

#### 手动启动

```bash
# 后端
mvn clean package
java -jar target/smart-doc-*.jar

# 前端
cd frontend
npm install
npm start
```

### 4. 访问应用

- 前端界面: http://localhost:3000
- 后端 API: http://localhost:8080
- API 文档: http://localhost:8080/swagger-ui.html

## 📚 详细文档

- [📋 部署指南](DEPLOYMENT.md) - 完整的部署说明和配置指南
- [🔒 安全配置](SECURITY.md) - 安全最佳实践和配置建议
- [📖 API 文档](http://localhost:8080/swagger-ui.html) - 完整的 API 接口文档

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   React 前端    │◄──►│  Spring Boot    │◄──►│     MySQL       │
│                 │    │      后端       │    │     数据库      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │                 │
                       │     MinIO       │
                       │    文件存储     │
                       │                 │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │                 │
                       │     Milvus      │
                       │    向量数据库   │
                       │                 │
                       └─────────────────┘
```

## 🛠️ 开发进度

### 核心功能

* [X] 判断问题是否需要进行检索
* [ ] 添加文档的元数据信息
* [ ] 多轮对话
* [ ] 对话历史保存
* [ ] 对话结果导出

### Naive RAG

* [X] 问题重写
* [ ] 问题分解
* [X] 删除索引
* [ ] 删除单个文件
* [X] HyDE 假设文档嵌入

### HiSem RAG

* [X] 问题重写
* [ ] 问题分解
* [X] 删除索引
* [ ] 删除单个文件
* [ ] HyDE 假设文档嵌入

### HiSem-Tree RAG

* [ ] JSON 索引保存
* [ ] 索引恢复
* [ ] 层级检索
* [ ] 问题重写
* [ ] 问题分解
* [ ] HyDE 假设文档嵌入

### 前端界面

* [X] 显示出处（相关文档、基于 Ant Design）
* [ ] 出处显示文档名称
* [X] 重构流式渲染 Markdown
* [X] 公式渲染
* [X] 图片渲染
* [X] 代码语法高亮
* [ ] 聊天界面支持选择不同大模型
