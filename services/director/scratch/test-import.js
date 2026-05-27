const core = require("@openvideo/core");
console.log("Keys:", Object.keys(core));
console.log("createProjectStore type:", typeof core.createProjectStore);
if (core.default) {
  console.log("Default keys:", Object.keys(core.default));
}
