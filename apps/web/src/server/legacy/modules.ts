import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const validator = require("./services/validator.js");
export const excelGenerator = require("./services/excelGenerator.js");
export const validationEngine = require("./validation/validationEngine.js");
