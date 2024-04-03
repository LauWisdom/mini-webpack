const path = require("path");
const fs = require("fs");
const { SyncHook } = require("tapable");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;
const t = require("@babel/types");
const { toUnixPath, tryExtensions, generateSourceCode } = require("./utils");

class Compiler {
  constructor(options) {
    this.options = options;
    this.rootPath = this.options.context || toUnixPath(process.cwd());

    // plugin 绑定的钩子
    this.hooks = {
      // 编译开始时执行的钩子
      run: new SyncHook(),
      // 输出 asset 到 output 之前执行的钩子
      emit: new SyncHook(),
      // 编译完成时执行的钩子
      done: new SyncHook(),
    };

    // 保存所有入口模块对象
    this.entries = new Set();

    // 保存所有依赖模块对象
    this.modules = new Map();

    // 所有的代码块对象
    this.chunks = new Set();

    // 存放本次产出的文件对象
    this.assets = new Map();

    // 存放本次编译所有产出的文件名
    this.files = new Set();
  }

  // 启动编译
  run(callback) {
    this.hooks.run.call();
    const entry = this.getEntry();
    this.buildEntryModule(entry);
    this.exportFile(callback);
  }

  getEntry() {
    let entry = Object.create(null);
    const { entry: optionsEntry } = this.options;
    if (typeof optionsEntry === "string") {
      entry["main"] = optionsEntry;
    } else {
      entry = optionsEntry;
    }

    Object.keys(entry).forEach((key) => {
      const value = entry[key];
      if (!path.isAbsolute(value)) {
        // 转化为绝对路径
        entry[key] = toUnixPath(path.join(this.rootPath, value));
      }
    });
    return entry;
  }

  buildEntryModule(entry) {
    Object.keys(entry).forEach((entryName) => {
      const entryPath = entry[entryName];
      const entryModule = this.buildModule(entryName, entryPath);
      this.entries.add(entryModule);
      this.buildChunk(entryName, entryModule);
    });
  }

  buildModule(moduleName, modulePath) {
    // 1. 读取原始代码
    const originSourceCode = fs.readFileSync(modulePath, "utf-8");
    this.moduleCode = originSourceCode;
    // 2. 调用 option.loaders 处理原始代码
    this.handleLoader(modulePath);
    // 3. 编译模块，获得最终的 module 对象
    const module = this.handleWebpackCompiler(moduleName, modulePath);
    return module;
  }

  handleLoader(modulePath) {
    const matchLoaders = [];
    const rules = this.options.module.rules;
    rules.forEach((loader) => {
      const testRule = loader.test;
      // 这里是不是需要拼接 option.resolve.extensions
      if (testRule.test(modulePath)) {
        if (loader.loader) {
          matchLoaders.push(loader.loader);
        } else {
          matchLoaders.push(...loader.use);
        }
      }
    });
    // TODO: 待实现洋葱模型
    for (let i = matchLoaders.length - 1; i >= 0; i--) {
      const loaderFn = require(matchLoaders[i]);
      this.moduleCode = loaderFn(this.moduleCode);
    }
  }

  handleWebpackCompiler(moduleName, modulePath) {
    const moduleId = "./" + path.posix.relative(this.rootPath, modulePath);
    const module = {
      id: moduleId,
      dependencies: new Set(),
      name: [moduleName],
    };
    const ast = parser.parse(this.moduleCode, {
      sourceType: "module",
    });
    traverse(ast, {
      CallExpression: (nodePath) => {
        const { node } = nodePath;
        if (node.callee.name === "require") {
          const requirePath = node.arguments[0].value;
          const moduleDirName = path.posix.dirname(modulePath);
          const absolutePath = tryExtensions(
            path.posix.join(moduleDirName, requirePath),
            this.options.resolve.extensions,
            requirePath,
            moduleDirName
          );
          const requireModuleId =
            "./" + path.posix.relative(this.rootPath, absolutePath);
          // 通过 babel 修改源代码中的 require 变成 __webpack_require__ 语句
          node.callee = t.identifier("__webpack_require__");
          // 修改源代码中 require 语句引入的模块，全部修改变为相对于根路径来处理
          node.arguments = [t.stringLiteral(requireModuleId)];
          // 把当前模块所依赖的模块，加入到依赖项
          module.dependencies.add(requireModuleId);
        }
      },
    });
    const { code } = generator(ast);
    module._source = code;
    module.dependencies.forEach((dependency) => {
      const depModule = this.modules.get(dependency);
      if (depModule) {
        depModule.name.push(moduleName);
      } else {
        const depModule = this.buildModule(moduleName, dependency);
        this.modules.set(dependency, depModule);
      }
    });
    return module;
  }

  buildChunk(entryName, entryObj) {
    const chunk = {
      name: entryName, // 每一个入口文件作为一个chunk
      entryModule: entryObj, // entry 文件模块
      modules: [...this.modules.values()].filter((m) =>
        m.name.includes(entryName)
      ), // 收集当前 entry 文件有关的所有 module
    };
    this.chunks.add(chunk);
  }

  exportFile(callback) {
    const output = this.options.output;
    this.chunks.forEach((chunk) => {
      const parseFileName = output.filename.replace("[name]", chunk.name);
      this.assets[parseFileName] = generateSourceCode(chunk);
    });

    this.hooks.emit.call();
    if (!fs.existsSync(output.path)) {
      fs.mkdirSync(output.path);
    }

    this.files = Object.keys(this.assets);
    // 把 assets 中的内容打包成文件，输出到目标目录中
    Object.keys(this.assets).forEach((fileName) => {
      const filePath = path.join(output.path, fileName);
      fs.writeFileSync(filePath, this.assets[fileName]);
    });
    this.hooks.done.call();
    callback(null, {
      toJson: () => {
        return {
          entries: this.entries,
          modules: this.modules,
          files: this.files,
          chunks: this.chunks,
          assets: this.assets,
        };
      },
    });
  }
}

module.exports = Compiler;
