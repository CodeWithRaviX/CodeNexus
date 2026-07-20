import { Language } from "@/types/run"
import langMap from "lang-map"

const customMapping: Record<string, string> = {
    php: "php",
    cs: "csharp",
    js: "javascript",
    ts: "typescript",
    py: "python",
    rb: "ruby",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    rs: "rust",
    swift: "swift",
    kt: "kotlin",
}

export const resolveRuntimeLanguage = (
    fileName: string,
    supportedLanguages: Language[],
): Language | null => {
    if (!supportedLanguages.length) return null

    const extension = fileName.split(".").pop()?.toLowerCase()
    const fileNameWithoutExtension = fileName.split(".")[0]?.toLowerCase()

    if (!extension && !fileNameWithoutExtension) {
        return supportedLanguages[0]
    }

    const candidates = new Set<string>()

    if (extension) {
        candidates.add(extension)
        const mapped = customMapping[extension]
        if (mapped) candidates.add(mapped)

        const langNames = langMap.languages(extension)
        langNames.forEach((name) => candidates.add(name.toLowerCase()))
    }

    if (fileNameWithoutExtension) {
        candidates.add(fileNameWithoutExtension)
    }

    const normalizedCandidates = Array.from(candidates)

    const matchedLanguage = supportedLanguages.find((language) => {
        const aliases = language.aliases.map((alias) => alias.toLowerCase())
        const languageName = language.language.toLowerCase()
        return normalizedCandidates.some(
            (candidate) =>
                aliases.includes(candidate) ||
                languageName === candidate ||
                languageName.includes(candidate) ||
                candidate.includes(languageName),
        )
    })

    return matchedLanguage ?? supportedLanguages[0] ?? null
}
