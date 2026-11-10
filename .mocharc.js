module.exports = {
    timeout: 20000, // Set timeout to 20 seconds (good for slow test setups)
    require: 'test/setup-local.js',
    recursive: true, // Run tests in subdirectories
    exclude: ['test/cypress/**/*.js','test/folder-reset.js'],
  };
