const path = require("path");
const TestRunPlugin = require("../plugins/test-run-plugin");
const TestEmitPlugin = require("../plugins/test-emit-plugin");
const TestDonePlugin = require("../plugins/test-done-plugin");

module.exports = {
  mode: "development",
  entry: {
    main: path.resolve(__dirname, "./src/entry1.js"),
    second: path.resolve(__dirname, "./src/entry2.js"),
  },
  devtool: false,
  // 基础目录，绝对路径
  context: process.cwd(),
  output: {
    path: path.resolve(__dirname, "./build"),
    filename: "[name].js",
  },
  plugins: [new TestRunPlugin(), new TestEmitPlugin(), new TestDonePlugin()],
  resolve: {
    extensions: [".js", ".ts"],
  },
  module: {
    rules: [
      {
        test: /\.js/,
        use: [
          path.resolve(__dirname, "../loaders/test-loader-1.js"),
          path.resolve(__dirname, "../loaders/test-loader-2.js"),
        ],
      },
    ],
  },
};
