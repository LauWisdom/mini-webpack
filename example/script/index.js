const webpack = require("../../core/webpack");
const config = require("../webpack.config");

const compiler = webpack(config);

compiler.run((err, stats) => {
  if (err) {
    console.log(err, "err");
  }
});
