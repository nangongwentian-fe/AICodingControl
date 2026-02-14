const { setupFileIpcHandlers } = require('./file.cjs');
const { setupDirIpcHandlers } = require('./dir.cjs');
const { setupAppIpcHandlers } = require('./app.cjs');
const { setupShellIpcHandlers } = require('./shell.cjs');
const { setupSymlinkIpcHandlers } = require('./symlink.cjs');

function setupIpcHandlers() {
  setupFileIpcHandlers();
  setupDirIpcHandlers();
  setupAppIpcHandlers();
  setupShellIpcHandlers();
  setupSymlinkIpcHandlers();
}

module.exports = { setupIpcHandlers };
