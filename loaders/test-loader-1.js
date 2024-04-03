function loader1(sourceCode) {
  console.log("in loader1");
  return (
    sourceCode + `\nconst loader1 = 'loader 1';\nconsole.log(loader1, loader2)`
  );
}

module.exports = loader1;
