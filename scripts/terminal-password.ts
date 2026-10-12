import { StringDecoder } from "node:string_decoder";

/** Read a password only from an interactive terminal, without echo or history. */
export async function askPassword(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Administrator passwords require an interactive terminal.");
  }
  return new Promise((resolve, reject) => {
    let value = "";
    const decoder = new StringDecoder("utf8");
    const wasRaw = process.stdin.isRaw;
    function finish(error?: Error) {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error); else resolve(value);
      value = "";
    }
    function onData(chunk: Buffer) {
      for (const character of decoder.write(chunk)) {
        if (character === "\u0003" || character === "\u0004") {
          finish(new Error("Administrator creation cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") { finish(); return; }
        if (character === "\u007f" || character === "\b") value = [...value].slice(0, -1).join("");
        else if (character.codePointAt(0)! >= 32) {
          value += character;
          if (value.length > 128) { finish(new Error("Password is too long.")); return; }
        }
      }
    }
    // Raw mode must be enabled before printing the prompt, so input never echoes.
    process.stdin.setRawMode(true);
    process.stdin.on("data", onData);
    process.stdin.resume();
    process.stdout.write(prompt);
  });
}
