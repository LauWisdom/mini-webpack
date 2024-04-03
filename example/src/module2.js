const { add } = require("./module3");

const test = () => {
  return add(1, 2);
};

module.exports = {
  test,
};
