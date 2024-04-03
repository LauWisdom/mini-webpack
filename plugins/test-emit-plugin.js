class TestEmitPlugin {
  apply(compiler) {
    compiler.hooks.emit.tap("Plugin 1", () => {
      console.log("Plugin 1 execute success at emit stage");
    });
  }
}

module.exports = TestEmitPlugin;
