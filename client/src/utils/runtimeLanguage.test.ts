import assert from "node:assert/strict"
import test from "node:test"
import { resolveRuntimeLanguage } from "./runtimeLanguage.ts"

test("maps JavaScript files to the JavaScript runtime", () => {
    const runtimes = [
        {
            language: "JavaScript",
            version: "18.15.0",
            aliases: ["javascript", "js", "node"],
        },
    ]

    const result = resolveRuntimeLanguage("app.js", runtimes)

    assert.equal(result?.language, "JavaScript")
})

test("maps C# files to the C# runtime", () => {
    const runtimes = [
        {
            language: "C#",
            version: "10.0.0",
            aliases: ["csharp", "cs"],
        },
    ]

    const result = resolveRuntimeLanguage("Program.cs", runtimes)

    assert.equal(result?.language, "C#")
})

test("falls back to the first runtime when the extension is unknown", () => {
    const runtimes = [
        {
            language: "Python",
            version: "3.10.0",
            aliases: ["python", "py"],
        },
    ]

    const result = resolveRuntimeLanguage("notes.xyz", runtimes)

    assert.equal(result?.language, "Python")
})
