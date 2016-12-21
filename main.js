const electron = require('electron');
const {Menu} = require('electron');
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
// Module for the dialogs
const dialog = electron.dialog;
// Module for the file system
const fileSystem = require('fs');
// Settings
const settings = require('electron-settings');
// ipcMain
const {ipcMain} = require('electron');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  global.shared = { codeWasChanged: false };
  global.filepath = "";
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1024, height: 600})

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/demos/simple/index.html`)

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  app.on('before-quit', function(event) {
    if (global.shared.codeWasChanged) {
      var buttonIndex = dialog.showMessageBox({ type: "question", message: "Do you really want to quit? You have unsaved changes.", buttons: [ "Ok", "Cancel" ] });
      if (buttonIndex == 1) {
        event.preventDefault();
      }
    }
  });

  setLastKnownFilePath();

  mainWindow.webContents.on('did-finish-load', function() {
    openLastFile();
  })

  ipcMain.on('saveCanvasData', (event, image) => {
    dialog.showSaveDialog(function(fileName) {
      if (fileName === undefined) {
        console.log("No Name defined");
        return;
      }

      writeFileData(fileName, image);
    });
  })

  // https://github.com/electron/electron/blob/master/docs/api/menu.md
  // Create the Application's main menu
    const template = [{
        label: "File",
        submenu: [
            // New File
            { label: "New File", accelerator: "CmdOrCtrl+N", click: function() { openNewFile(); } },
            { label: "Open File", accelerator: "CmdOrCtrl+O", click: function() { openFileDialog(); } },
            { type: "separator" },
            { label: "Save", accelerator: "CmdOrCtrl+S", click: function() { saveFile(); } },
            { label: "Save As...", accelerator: "Shift+CmdOrCtrl+S", click: function() { saveFileAs(); } },
            { type: "separator" },
            { label: "Save Canvas As...", click: function() { saveCanvasAs(); } },
            { type: "separator" },
            { label: "Quit", accelerator: "CmdOrCtrl+Q", click: function() { app.quit(); }}
        ]}, {
        label: "Edit",
        submenu: [
            { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
            { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
            { type: "separator" },
            { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
            { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
            { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
            { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" },
            { type: "separator" },
            { label: "Toggle Developer Tools", click: function() { mainWindow.webContents.toggleDevTools(); } }
        ]}, {
          role: 'window',
          submenu: [{
              role: 'minimize'
            }, {
              role: 'close'
            }]
          }
    ];

if (process.platform === 'darwin') {
  const name = app.getName()
  template.unshift({
    label: name,
    submenu: [
      {
        role: 'about',
        label: 'About ' + app.getName()
      },
      {
        type: 'separator'
      },
      {
        role: 'services',
        submenu: [],
        label: 'Services'
      },
      {
        type: 'separator'
      },
      {
        role: 'hide',
        label: 'Hide ' + app.getName()
      },
      {
        role: 'hideothers',
        label: 'Hide Others'
      },
      {
        role: 'unhide',
        label: 'Show All'
      },
      {
        type: 'separator'
      },
      {
        role: 'quit',
        label: 'Quit'
      }
    ]
  })
  // Window menu.
  template[3].label = 'Window';
  template[3].submenu = [
    {
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      role: 'close'
    },
    {
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    },
    {
      label: 'Zoom',
      role: 'zoom'
    }, {
      type: 'separator'
    }, {
      label: 'Bring All to Front',
      role: 'front'
    }]
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function saveFile() {
  settings.get('files.lastFile').then(lastFile => {
    if (lastFile === undefined) {
      console.log("Error: No last file selected");
      saveFileAs();
      return;
    }
    writeFile(lastFile, true);
  })
};

function saveFileAs() {
  dialog.showSaveDialog({ filters: [

     { name: 'JavaScript', extensions: ['js'] }

    ]},function(fileName) {
    if (fileName === undefined) {
      console.log("No Name defined");
      return;
    }

    writeFile(fileName, true);
  });
};

function saveCanvasAs() {
  mainWindow.webContents.send('saveCanvas');
}

function writeFile(fileName, showDialog) {
  mainWindow.webContents.executeJavaScript('window.liveEditor.editor.text();', (data) => {
    fileSystem.writeFile(fileName, data, function(err) {
      if(err) {
        dialog.showMessageBox({ type: "error", buttons: [], title: "Error", message: "An error occured writing the file: " + err.message });
      }

      mainWindow.setTitle(fileName);
      settings.set('files', { lastFile: fileName });
      mainWindow.webContents.send('fileSaved', data);
      if (showDialog) {
        dialog.showMessageBox({ type: "info", buttons: [], title: "Succes", message: "The file has been succesfully saved" });
      }
    })
  });
};

function writeFileData(fileName, data) {
  fileSystem.writeFile(fileName, data, function(err) {
    if(err) {
      dialog.showMessageBox({ type: "error", buttons: [], title: "Error", message: "An error occured writing the file: " + err.message });
    }

    dialog.showMessageBox({ type: "info", buttons: [], title: "Succes", message: "The file has been succesfully saved" });
  })
};

function openNewFile() {
  dialog.showSaveDialog(function(fileName) {
    if (fileName === undefined) {
      console.log("No Name defined");
      return;
    }

    mainWindow.webContents.send('openFile', "");
    writeFile(fileName, false);
  });
};

function openFileDialog() {
  dialog.showOpenDialog(function (fileNames){
    if(fileNames === undefined) {
      console.log("No file selected.");
    } else {
      settings.set('files', { lastFile: fileNames[0] });
      readFile(fileNames[0]);
    }
  });
};

function readFile(filepath) {
  fileSystem.readFile(filepath, 'utf-8', function(err, data) {
    if(err) {
      alert("An error ocurred reading the file: " + err.message);
      return;
    }

    var safeFilepath = filepath.replace('/\\/g', '/');
    let position = safeFilepath.lastIndexOf("\\");
    global.filepath = safeFilepath.substring(0, position+1);
    mainWindow.setTitle(filepath);
    mainWindow.webContents.send('openFile', data);
  });
};

function setLastKnownFilePath() {
  settings.get('files.lastFile').then(lastFile => {
    if (lastFile === undefined) {
      return;
    }
    let position = lastFile.lastIndexOf("/");
    global.filepath = lastFile.substring(0, position+1);
  })
};

function openLastFile() {
  settings.get('files.lastFile').then(lastFile => {
    if (lastFile === undefined) {
      return;
    }
    readFile(lastFile);
  })
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
