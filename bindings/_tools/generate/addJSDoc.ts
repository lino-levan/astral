import type { JSDocable } from "./getProtocol.ts";

export function addJSDoc(obj: JSDocable) {
  let result = "";
  if (obj.description || obj.deprecated || obj.experimental) {
    result += "/**\n";
    if (obj.experimental) {
      result += ` * @experimental\n`;
    }
    if (obj.deprecated) {
      result += ` * @deprecated\n`;
    }
    if (obj.description) {
      result += ` * ${obj.description.split("\n").join("\n * ")}\n`;
    }
    result += " */\n";
  }

  return result;
}
