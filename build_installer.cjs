const electronInstaller = require('electron-winstaller');
const path = require('path');

async function createInstaller() {
  try {
    console.log('Building EasyBMT Windows Installer...');
    await electronInstaller.createWindowsInstaller({
      appDirectory: 'C:\\temp\\dist-electron-clean\\EasyBMT-win32-x64',
      outputDirectory: path.join(__dirname, 'dist-setup'),
      authors: 'EasyBMT',
      exe: 'EasyBMT.exe',
      setupExe: 'EasyBMT_Setup.exe',
      description: 'EasyBMT - GST Billing & POS Software',
      noMsi: true,
      setupIcon: path.join(__dirname, 'public', 'favicon.ico')
    });
    console.log('It worked! EasyBMT_Setup.exe created successfully.');
  } catch (e) {
    console.log(`No dice: ${e.message}`);
  }
}

createInstaller();
