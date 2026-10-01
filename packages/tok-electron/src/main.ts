import { app, BrowserWindow, dialog, Menu } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440, height: 940, minWidth: 800, minHeight: 600,
    title: 'TypesetOK — כתיבה ועימוד', backgroundColor: '#f2f3ef',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow = window;
  // The lightweight editor needs no privileged IPC or arbitrary filesystem access.
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'קובץ', submenu: [{ role: 'quit', label: 'יציאה' }] },
    { label: 'עריכה', submenu: [{ role: 'cut', label: 'גזור' }, { role: 'copy', label: 'העתק' }, { role: 'paste', label: 'הדבק' }, { role: 'selectAll', label: 'בחירת הכול' }] },
    { label: 'תצוגה', submenu: [{ role: 'togglefullscreen', label: 'מסך מלא' }] },
  ]));
  window.loadFile(path.join(__dirname, '../../tok-ui/dist/TypesetOK.html')).catch(() => {
    dialog.showErrorBox('TypesetOK', 'הממשק לא נבנה. הריצי npm run build:desktop לפני הפעלת התוכנה.');
    window.destroy();
  });
  window.on('closed', () => { mainWindow = null; });
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!mainWindow) createWindow(); });
