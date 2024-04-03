class TestDonePlugin {
  apply(compiler) {
    compiler.hooks.done.tap("Plugin 1", () => {
      console.log("Plugin 1 execute success at done stage");
    });
  }
}

module.exports = TestDonePlugin;
