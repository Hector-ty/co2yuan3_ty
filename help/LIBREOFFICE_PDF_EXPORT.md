# 碳排放报告 PDF 导出：LibreOffice 配置说明

导出「碳排放报告」为 PDF 时，后端需要本机已安装 **LibreOffice**（用于将 DOCX 转为 PDF）。  
按你的运行方式选择其一即可。

**若报错「source file could not be loaded」**：镜像已加入 `libreoffice-core` 并支持 DOCX→ODT→PDF 两段式转换，请**无缓存重建**后端镜像后再试（见下）。

---

## 一、使用 Docker 运行后端（推荐）

后端镜像里已安装 LibreOffice（含 libreoffice-core）。若报错「PDF 导出需要服务器安装 LibreOffice」或「source file could not be loaded」：

1. **重新构建并启动后端**（务必使用 `--no-cache` 以拉取新依赖）：
   ```bash
   docker compose build --no-cache backend
   docker compose up -d backend
   ```
   若使用 `docker-compose` 旧版命令：
   ```bash
   docker-compose build --no-cache backend
   docker-compose up -d backend
   ```

2. **确认容器内已安装 LibreOffice**：
   ```bash
   docker compose exec backend which soffice
   ```
   应输出类似：`/usr/bin/soffice`。

3. 再在前端点击「导出 PDF」重试。

---

## 二、在 Windows 本机运行后端（未用 Docker）

在 Windows 上直接运行 `npm start` 时，需在本机安装 LibreOffice 并让系统能找到 `soffice`。

### 1. 下载并安装 LibreOffice

- 打开：<https://www.libreoffice.org/download/download/>
- 选择 **Windows x64**，下载安装包并安装（建议使用默认安装路径）。

### 2. 将 LibreOffice 加入系统 PATH

安装完成后，`soffice.exe` 通常在：

- `C:\Program Files\LibreOffice\program\soffice.exe`

**方式 A：通过“环境变量”添加（推荐）**

1. 按 `Win + R`，输入 `sysdm.cpl` 回车，打开“系统属性”。
2. 切到「高级」→「环境变量」。
3. 在「系统变量」里选中 `Path` →「编辑」→「新建」。
4. 添加：
   ```
   C:\Program Files\LibreOffice\program
   ```
   （若安装到其他盘，请改为实际路径，例如 `D:\Program Files\LibreOffice\program`。）
5. 确定保存后，**关闭并重新打开** 运行后端的终端（或 IDE），再执行 `npm start`。

**方式 B：在当前终端临时生效**

在启动后端前执行（PowerShell）：

```powershell
$env:Path += ";C:\Program Files\LibreOffice\program"
cd server
npm start
```

### 3. 验证

新开一个终端执行：

```powershell
soffice --version
```

若有版本输出，说明 PATH 已生效。再在前端点击「导出 PDF」重试。

---

## 三、仍报错时的排查

- **Docker**：确认已按上面步骤 **无缓存重建** `backend` 并重启；再执行 `docker compose exec backend which soffice` 确认存在。
- **Windows 本机**：确认已重启终端或 IDE，并能在该终端中执行 `soffice --version`。
- 若错误信息中有“超时”或“转换失败”，可能是文档过大或 AI 生成内容过多，可先尝试「导出 DOCX」确认功能正常，再重试 PDF。

### 报错「source file could not be loaded」时怎么查

该错误表示 LibreOffice（soffice）无法加载传给它的 DOCX 文件。后端会做多种方式重试（相对路径、绝对路径、Shell、file:// URL），若仍失败会在控制台打印一行诊断信息，例如：

```text
[PDF] soffice 无法加载源文件。inputPath= ... tempDir= ... exists= true/false size= ... platform= ...
```

- **exists=false**：临时文件没写好或已被删，属后端写文件/权限问题。
- **exists=true, size>0**：文件存在且非空。后端会用**同一方式**尝试转换「模板 templete.docx」：
  - 若提示 **「当前报告内容无法被 LibreOffice 加载」**：说明模板可转、仅**生成的报告 DOCX** 在无头环境下无法加载（同一文件在本机 Word/LibreOffice 往往能打开）。后端已做：仅清理 `<w:t>` 内碎片、不做 XML 解析重建、用 docxtemplater 的 zip 直接生成（不重新套模板壳）、字体与 `--norestore`。若仍失败，请先导出 DOCX 在本机另存为 PDF。
- 若提示 **「本环境 LibreOffice 无法将 DOCX 转为 PDF（模板也无法转换）」**：说明本环境下任意 DOCX 都转不了，可尝试安装 **libreoffice-writer** 及 **libreoffice-core**、字体包（如 fonts-noto-cjk、fonts-crosextra-carlito/caladea），或先导出 DOCX 在本机另存为 PDF。
- **Docker**：按下面「手动测试」也可区分是环境问题还是报告内容问题。

### Docker 下「source file could not be loaded」时的手动测试

在容器内用**项目自带的模板**测试 LibreOffice 是否能转 PDF（需先起虚拟显示再执行）：

```bash
docker compose exec backend sh -c 'mkdir -p /tmp/lo_test && cp /app/templete.docx /tmp/lo_test/source.docx && Xvfb :99 -screen 0 1024x768x24 & sleep 3 && DISPLAY=:99 LD_LIBRARY_PATH=/usr/lib/libreoffice/program /usr/lib/libreoffice/program/soffice.bin --headless --convert-to pdf --outdir /tmp/lo_test /tmp/lo_test/source.docx; ls -la /tmp/lo_test'
```

- 若输出中出现 `source.pdf`，说明环境可转 PDF，问题多半在**报告生成出的 DOCX 内容**，可先导出 DOCX 后在本机另存为 PDF。
- 若仍无 `source.pdf` 且报错，说明容器内 LibreOffice 无法做 DOCX→PDF，需检查镜像或改用本机导出 DOCX 再转 PDF。
