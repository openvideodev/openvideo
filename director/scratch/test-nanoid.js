try {
  const nanoid = require("nanoid");
  console.log("nanoid type:", typeof nanoid.nanoid);
} catch (e) {
  console.log("nanoid require failed:", e.message);
}
const core = require("@openvideo/core");
console.log("Core Keys:", Object.keys(core));
