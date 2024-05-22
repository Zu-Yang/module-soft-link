#!/usr/bin/env node
var co = require("co");
const os = require("os");
const fs = require("fs");
const prompt = require("co-prompt");
const program = require("commander");
const path = require("path");
const { exec } = require("child_process"); // 调用 cmd 执行命令行
const iconv = require("iconv-lite"); // 轻量级的字符编码转换库

process.stdout.setEncoding("utf8"); // 输出编码为utf8
let newP = path.join(os.homedir(), ".soft-link"); // 将操作系统中用户的主目录和.soft-link文件夹的路径连接, 可以用于创建、操作或删除.soft-link文件夹
// let pcUrl = os.homedir(); // 获取操作系统中用户的主目录URL
// let files = fs.readdirSync(pcUrl); // 从指定路径（pcUrl）中读取目录中的所有文件
// let record = false; // 是否存在.soft-link文件夹
// files.forEach(function (itm, index) {
//   if (itm == ".soft-link") {
//     record = true;
//   }
// });

program
  .version("1.0.0")
  .arguments("<command>", "自定义命令", "pc")
  .option("-p, --pc <path>", "设置pc依赖包node_modules路径")
  .option("-w, --wap <path>", "设置wap依赖包node_modules路径")
  .option("-r, --remove <path>", "移除软链接")
  .command("reset", "重置用户信息")
  .description("create node_modules soft link")
  // 自定义命令执行后的回调函数。
  .action(function (arg) {
    if (arg == "pc" || arg == "wap") {
      let pcPath = "";
      let wapPath = "";
      let info = getInfo();

      if (info) {
        info = eval("(" + info + ")"); // 将字符串转换为对象
        pcPath = info.pc;
        wapPath = info.wap;
        createSoftLink(); // 创建软链接
      } else {
        co(function* () {
          pcPath = yield prompt("\x1B[36m pc端node_modules模板路径: \x1B[0m");
          if (!pcPath) {
            console.error("\x1B[31m%s\x1B[0m", "路径不能为空！");
            process.exit(1);
          }
          wapPath = yield prompt("\x1B[36m wap端node_modules模板路径: \x1B[0m");
          if (!pcPath) {
            console.error("\x1B[31m%s\x1B[0m", "路径不能为空！");
            process.exit(1);
          }
          // 判断用户输入的路径是否正确
          if (fs.existsSync(pcPath) && fs.existsSync(wapPath)) {
            pcPath = pcPath.replace(/\\/g, "\\\\"); // 禁止路径发生转义
            wapPath = wapPath.replace(/\\/g, "\\\\"); // 禁止路径发生转义
            return { pc: pcPath, wap: wapPath };
          } else {
            console.error("\x1B[31m%s\x1B[0m", "路径不存在, 请检查！");
            process.exit(1);
          }
        }).then(
          function (data) {
            createSoftLink(); // 创建软链接
            savePathInfo(data); // 保存用户输入的路径
          },
          function (err) {
            throw Error(err);
          }
        );
      }

      // 创建软链接
      function createSoftLink() {
        // 获取当前工作区路径
        const node_modules_path = process.cwd() + "\\node_modules";
        // 检查当前路径下是否存在node_modules文件夹
        if (fs.existsSync(node_modules_path)) {
          console.error(
            `\n> \x1B[36m${node_modules_path}\x1B[0m 已存在, 无法创建！`
          );
          process.exit(1);
        }
        // 目标路径
        const target = "mklink /d " + node_modules_path + " ";
        // 源路径
        const source = arg == "pc" ? pcPath : wapPath;
        // 创建软链接的命令行
        const mklink = target + source; // 创建软链接的命令行
        // 执行命令行
        if (mklink) {
          executeCommand(mklink);
        }
      }
    } else if (arg == "remove") {
      // 获取当前工作区路径
      const node_modules_path = process.cwd() + "\\node_modules";
      // 检查当前路径下是否存在node_modules文件夹
      if (!fs.existsSync(node_modules_path))
        return console.error(
          `\n> 路径: \x1B[36m${node_modules_path}\x1B[0m 不存在`
        );
      // 判断node_modules文件夹是否为软链接
      if (fs.lstatSync(node_modules_path).isSymbolicLink()) {
        // 移除软链接的命令行
        const rmdir = "rmdir %cd%\\node_modules";
        executeCommand(rmdir);
      } else {
        console.error(
          `\n> \x1B[36m${node_modules_path}\x1B[0m 非软链接无法移除`
        );
      }
    } else {
      console.error("\x1B[31m%s\x1B[0m", "请输入正确命令！");
    }
    // 命令执行函数
    function executeCommand(command) {
      exec(command, { encoding: "buffer" }, (error, stdout, stderr) => {
        // 如果命令执行失败, 则抛出错误
        if (error) {
          throw Error(iconv.decode(error, 'GBK'));
        }
        // 如果命令执行成功, 则输出结果
        if (stdout) {
          console.log("\x1B[36m%s\x1B[0m", iconv.decode(stdout, 'GBK'));
        }
        // // 如果命令执行成功, 则继续执行
        // if (stderr) {
        //   console.log(iconv.decode(stderr, 'GBK'));
        // }
      });
    }
  })
  // 监听reset命令,不走action()函数
  .on("command:reset", function (obj) {
    try {
      deleteall(newP);
      console.log("\x1B[36m%s\x1B[0m", "重置成功！");
    } catch (err) {
      console.log("\x1B[31m%s\x1B[0m", `重置失败\n${err}`);
    }
  })
  .parse(process.argv); // 解析命令行参数,放最后

// 获取信息
function getInfo() {
  let fpath = path.join(newP, "soft-link"); // 定位到文件
  let data = null;
  try {
    data = fs.readFileSync(fpath, "utf-8");
    return data;
  } catch (err) {
    // console.error("\x1B[31m%s\x1B[0m", `${fpath} 不存在!`);
    return data; // null
  }
}
// 保存用户信息在操作系统中用户的主目录
function savePathInfo(data) {
  // 创建与修改文件
  let fpath = path.join(newP, "soft-link");
  // 检查是否存在.soft-link文件, 存在则删除.soft-link文件
  if (fs.existsSync(newP)) {
    // fs.unlinkSync(newP);
    deleteall(newP);
  }
  // 创建新目录,目录已存在时无法创建
  fs.mkdirSync(newP);
  // 写入文件
  fs.writeFile(fpath, `{pc:'${data.pc}',wap:'${data.wap}'}`, function (err) {
    if (err) {
      console.error("\x1B[31m%s\x1B[0m", err);
    }
  });
}
// 删除操作系统中用户的主目录.soft-link文件
function deleteall(path) {
  let files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach(function (file, index) {
      // console.log(file);
      let curPath = path + "/" + file;
      if (fs.statSync(curPath).isDirectory()) {
        // recurse
        deleteall(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

// 监听Ctrl+C事件
process.on("SIGINT", function () {
  console.error("\x1B[31m%s\x1B[0m", "\n你已终止操作");
  process.exit(); // 立即终止node.js应用程序
});

// 全局捕获throw抛出的错误
process.on("uncaughtException", (error) => {
  // 打印错误信息
  console.error("\x1B[31m%s\x1B[0m", error);
  // 退出进程
  process.exit();
});
