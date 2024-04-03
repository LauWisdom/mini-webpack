function loader2(sourceCode) {
  console.log("join loader2");
  return sourceCode + `\nconst loader2 = 'loader 2'`;
}

module.exports = loader2;
