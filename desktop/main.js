const { app, BrowserWindow, Menu, dialog } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("disable-features", "AudioServiceOutOfProcess");

const PORT = 47321;
let serverProcess = null;
let mainWindow = null;
let quitting = false;

function serverDirectory() {
  if (app.isPackaged) return path.join(process.resourcesPath, "app");
  return path.join(__dirname, "bundle");
}

function waitForServer(port, timeoutMs = 90000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get({ hostname: "127.0.0.1", port, path: "/", timeout: 2000 }, (response) => {
        response.resume();
        resolve();
      });
      request.on("error", () => {
        if (Date.now() - started > timeoutMs) reject(new Error("server-timeout"));
        else setTimeout(attempt, 400);
      });
      request.on("timeout", () => request.destroy());
    };
    attempt();
  });
}

function startServer() {
  const directory = serverDirectory();
  const serverFile = path.join(directory, "server.js");
  if (!fs.existsSync(serverFile)) {
    throw new Error("missing-server");
  }
  const logPath = path.join(app.getPath("userData"), "server.log");
  const log = fs.createWriteStream(logPath, { flags: "a" });
  serverProcess = spawn(process.execPath, [serverFile], {
    cwd: directory,
    windowsHide: true,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
    },
  });
  serverProcess.stdout.pipe(log);
  serverProcess.stderr.pipe(log);
  serverProcess.on("exit", (code) => {
    if (!quitting && code) {
      dialog.showErrorBox("نظام النداء", "توقف التطبيق. أغلقه ثم افتحه مرة أخرى.");
    }
  });
}

function stopServer() {
  if (!serverProcess || serverProcess.killed) return;
  serverProcess.kill();
  serverProcess = null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: "نظام النداء",
    backgroundColor: "#f7f6f3",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
}

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: "النظام",
          submenu: [
            { label: "إعادة تحميل", role: "reload" },
            { label: "ملء الشاشة", accelerator: "F11", role: "togglefullscreen" },
            { type: "separator" },
            { label: "خروج", role: "quit" },
          ],
        },
      ]),
    );

    try {
      startServer();
      await waitForServer(PORT);
      createWindow();
    } catch (err) {
      dialog.showErrorBox("نظام النداء", "تعذر فتح التطبيق. أعد تشغيله بعد إغلاق أي نسخة مفتوحة.");
      app.quit();
    }
  });
}

app.on("before-quit", () => {
  quitting = true;
  stopServer();
});

app.on("window-all-closed", () => {
  quitting = true;
  stopServer();
  app.quit();
});
