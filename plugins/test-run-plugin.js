class TestRunPlugin {
  apply(compiler) {
    compiler.hooks.run.tap("Plugin 1", () => {
      console.log("Plugin 1 execute success at run stage");
    });
  }
}

module.exports = TestRunPlugin;
