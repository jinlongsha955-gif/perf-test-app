# perf-test-app — Render / Railway 免费档性能测试应用

零依赖 Node 应用（只用 `http` / `os` 内置模块），不用 `npm install`，启动命令就是 `node server.js`（或 `npm start`）。

## 接口

| 路径 | 用途 |
|---|---|
| `GET /` 或 `/info` | 返回平台、主机名、运行时间、内存、CPU 核数 |
| `GET /health` | 返回 `ok`，最轻量的存活检查 |
| `GET /compute?n=200000` | CPU 密集：筛法求 n 以内质数个数，返回耗时 ms（n 限制在 1k–2M，防止卡死小实例） |
| `GET /env` | 只返回平台识别变量的有无，不泄露任何密钥值 |

## 部署步骤（给浏览器任务）

### 前置：先把代码推到 GitHub
在 GitHub 账号 `jinlongsha955-gif` 下新建公开仓库（例如 `perf-test-app`），把本目录的 4 个文件推上去。
两个平台都是从 GitHub 仓库部署。

### Render（免费 Hobby，$0/月）
1. 打开 https://dashboard.render.com ，进工作区 `jinlong's workspace`
2. New → Web Service → 连接 GitHub 仓库 `jinlongsha955-gif/perf-test-app`
3. Name 填 `perf-test-app`，Region 选离中国近的（Singapore），Branch 选 `main`
4. Build Command 留空（无依赖，不用构建）；Start Command 填 `node server.js`
5. Instance Type 选 **Free**（不到 1 核、512 MB 内存）
6. Create Web Service，等部署完成，记下给的 `https://perf-test-app.onrender.com` 这类地址
7. 注意：免费 Web 服务 15 分钟没人访问会自动休眠，首次唤醒约 1 分钟；每月 750 小时免费时长

### Railway（试用版，剩 30 天 / $5.00）
1. 打开 https://railway.app ，进 `jinlong sha's Projects`
2. New Project → Deploy from GitHub repo → 选 `jinlongsha955-gif/perf-test-app`
3. Railway 会自动识别 Node 并用 `npm start` 启动；等部署完成
4. 在服务 Settings → Networking 里点 **Generate Domain**，拿到公开地址（形如 `https://perf-test-app-production.up.railway.app`）
5. 注意：试用版代码部署有网络限制，页面提示“连接 GitHub 或添加付款方式可解锁完整网络访问”——如果部署失败，先在 Railway 里连接 GitHub 账号；**不要添加付款方式/信用卡**
6. 注意：试用期 30 天或 $5 额度用完即结束

## 测速清单（部署完成后执行）

对每个平台的公开地址（记为 `$URL`），跑下面命令并记录结果：

```bash
# 1. 预热 + 测首字节（Render 免费档第一次可能正在唤醒，会慢 30-60 秒，属正常）
curl -s -o /dev/null -w "first: %{time_total}s http=%{http_code}\n" $URL/health

# 2. 热态响应：连跑 5 次 /health，取每次 time_total
for i in 1 2 3 4 5; do curl -s -o /dev/null -w "warm $i: %{time_total}s\n" $URL/health; done

# 3. 看实例信息（平台、内存、核数、已运行多久）
curl -s $URL/ | head -40

# 4. CPU 对比：同样 n=200000 各跑 3 次，记 ms（数值越小 CPU 越强）
for i in 1 2 3; do curl -s "$URL/compute?n=200000" | grep -E '"ms"|"n"'; done

# 5. 稳定性：部署后隔 20 分钟再 curl 一次 /health
#    - Render：若 15 分钟无人访问会休眠，这次会明显变慢（唤醒中），说明休眠机制在生效
#    - Railway：试用版不休眠，应一直快
```

## 记录模板（把结果填这里）

| 项目 | Render | Railway |
|---|---|---|
| 公开地址 | | |
| 首次访问耗时（含唤醒） | | |
| 热态 /health 平均耗时 | | |
| /compute?n=200000 平均 ms | | |
| 实例内存 / CPU 核数 | | |
| 20 分钟后再次访问是否变慢 | | |
| 备注 | | |

## 依据规格的预判（待实测验证）

- **Render 免费档**：适合静态网站、轻量 API、个人小项目、Webhook 接收；短板是 15 分钟无访问就休眠（首次访问慢）、无持久化硬盘、每月 750 小时上限、不适合需要 7×24 随时响应的服务。
- **Railway 试用版**：单服务 2 vCPU / 0.5–1 GB 内存，比 Render 免费档强，不休眠，适合跑个小 API、聊天机器人、定时任务；短板是只有 30 天 / $5，试用一过就得付费（Hobby 每月最少 $5），且试用版网络受限。
- 两者都不适合：大内存应用、视频转码、长期大流量、需要持久化存储且不能丢数据的场景。
