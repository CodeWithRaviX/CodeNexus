import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import process from "process";

export interface ExecutionFile {
  name: string;
  content: string;
}

export interface ExecutionRequest {
  language: string;
  version?: string;
  files: ExecutionFile[];
  stdin?: string;
}

export interface RuntimeDefinition {
  language: string;
  version: string;
  aliases: string[];
}

export interface ExecutionResult {
  run: {
    stdout: string;
    stderr: string;
    code: number;
  };
}

const DEFAULT_TIMEOUT_MS = 10000;

export const resolveExecutionBackend = (
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const configuredUrl = env.PISTON_API_URL || env.VITE_PISTON_API_URL;
  if (configuredUrl) return configuredUrl;

  if (env.DOCKER_CONTAINER || env.ENVIRONMENT === "production") {
    return "http://piston:2000";
  }

  return "http://localhost:2000";
};

const runtimeDefinitions: RuntimeDefinition[] = [
  {
    language: "python",
    version: "3.13.0",
    aliases: ["py", "python", "python3"],
  },
  {
    language: "javascript",
    version: "18.x",
    aliases: ["js", "javascript", "node", "nodejs"],
  },
];

const getRuntimeCommand = (language: string) => {
  const normalizedLanguage = language.toLowerCase().trim();

  if (
    normalizedLanguage === "python" ||
    normalizedLanguage === "py" ||
    normalizedLanguage === "python3"
  ) {
    return {
      command: process.platform === "win32" ? "python" : "python3",
      extension: "py",
    };
  }

  if (
    normalizedLanguage === "javascript" ||
    normalizedLanguage === "js" ||
    normalizedLanguage === "node" ||
    normalizedLanguage === "nodejs"
  ) {
    return {
      command: process.platform === "win32" ? "node.exe" : "node",
      extension: "js",
    };
  }

  return null;
};

export const getSupportedRuntimes = (): RuntimeDefinition[] =>
  runtimeDefinitions;

const runViaPiston = async (
  request: ExecutionRequest,
): Promise<ExecutionResult> => {
  const backendUrl = resolveExecutionBackend();
  const response = await fetch(`${backendUrl}/api/v2/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      language: request.language,
      version: request.version,
      files: request.files,
      stdin: request.stdin ?? "",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Piston execution failed (${response.status}): ${errorText || "unknown error"}`,
    );
  }

  const data = (await response.json()) as {
    run?: { stdout?: string; stderr?: string; code?: number };
  };

  return {
    run: {
      stdout: data.run?.stdout ?? "",
      stderr: data.run?.stderr ?? "",
      code: data.run?.code ?? 0,
    },
  };
};

export const runCode = async (
  request: ExecutionRequest,
): Promise<ExecutionResult> => {
  try {
    return await runViaPiston(request);
  } catch (pistonError) {
    const fallbackMessage =
      pistonError instanceof Error ? pistonError.message : "Piston unavailable";

    if (process.env.PISTON_API_URL || process.env.VITE_PISTON_API_URL) {
      throw new Error(`Piston execution failed: ${fallbackMessage}`);
    }

    const runtime = getRuntimeCommand(request.language);

    if (!runtime) {
      throw new Error(
        `Unsupported language: ${request.language}. Supported runtimes: python, javascript.`,
      );
    }

    const file = request.files?.[0];
    if (!file?.name || !file.content) {
      throw new Error("A file with content is required for execution.");
    }

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "code-sync-"));
    const fileName = file.name.includes(".")
      ? file.name
      : `main.${runtime.extension}`;
    const filePath = path.join(workDir, fileName);

    try {
      await fs.writeFile(filePath, file.content, "utf8");

      const child = spawn(runtime.command, [filePath], {
        cwd: workDir,
        env: {
          ...process.env,
          NODE_NO_WARNINGS: "1",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });

      child.stdin.write(request.stdin ?? "");
      child.stdin.end();

      const exitCode = await new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => {
          child.kill("SIGKILL");
        }, DEFAULT_TIMEOUT_MS);

        child.on("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        child.on("close", (code) => {
          clearTimeout(timeout);
          resolve(code ?? 1);
        });
      });

      return {
        run: {
          stdout,
          stderr,
          code: exitCode,
        },
      };
    } finally {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  }
};
