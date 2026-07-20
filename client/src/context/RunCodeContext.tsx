/* eslint-disable react-refresh/only-export-components */
import axiosInstance from "@/api/pistonApi"
import { Language, RunContext as RunContextType } from "@/types/run"
import { resolveRuntimeLanguage } from "@/utils/runtimeLanguage"
import {
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react"
import toast from "react-hot-toast"
import { useFileSystem } from "./FileContext"

const RunCodeContext = createContext<RunContextType | null>(null)

const isAxiosError = (
    error: unknown,
): error is { response?: { data?: unknown } } =>
    typeof error === "object" && error !== null && "response" in error

export const useRunCode = () => {
    const context = useContext(RunCodeContext)
    if (context === null) {
        throw new Error(
            "useRunCode must be used within a RunCodeContextProvider",
        )
    }
    return context
}

const RunCodeContextProvider = ({ children }: { children: ReactNode }) => {
    const { activeFile } = useFileSystem()
    const [input, setInput] = useState<string>("")
    const [output, setOutput] = useState<string>("")
    const [isRunning, setIsRunning] = useState<boolean>(false)
    const [supportedLanguages, setSupportedLanguages] = useState<Language[]>([])
    const [selectedLanguage, setSelectedLanguage] = useState<Language>({
        language: "",
        version: "",
        aliases: [],
    })

    useEffect(() => {
        const fetchSupportedLanguages = async () => {
            try {
                const languages = await axiosInstance.get("/runtimes")
                const runtimes = Array.isArray(languages.data)
                    ? languages.data
                    : []
                setSupportedLanguages(runtimes)

                if (activeFile?.name) {
                    const detectedLanguage = resolveRuntimeLanguage(
                        activeFile.name,
                        runtimes,
                    )
                    if (detectedLanguage) {
                        setSelectedLanguage(detectedLanguage)
                    }
                }
            } catch (error: unknown) {
                setSupportedLanguages([])
                setSelectedLanguage({ language: "", version: "", aliases: [] })
                setOutput(
                    "Code execution is unavailable because the runner endpoint is unreachable. Set VITE_PISTON_API_URL to a working Piston service if you want live execution.",
                )
                toast.error("Code execution is unavailable")
                if (isAxiosError(error) && error.response?.data)
                    console.error(error.response.data)
                else console.error(error)
            }
        }

        fetchSupportedLanguages()
    }, [activeFile?.name])

    useEffect(() => {
        if (supportedLanguages.length === 0 || !activeFile?.name) return

        const detectedLanguage = resolveRuntimeLanguage(
            activeFile.name,
            supportedLanguages,
        )
        if (detectedLanguage) {
            setSelectedLanguage(detectedLanguage)
        }
    }, [activeFile?.name, supportedLanguages])

    const runCode = async () => {
        try {
            if (!selectedLanguage?.language) {
                return toast.error("Please select a language to run the code")
            } else if (!activeFile) {
                return toast.error("Please open a file to run the code")
            }

            setIsRunning(true)
            toast.loading("Running code...")
            const { language, version } = selectedLanguage

            const response = await axiosInstance.post("/execute", {
                language,
                version,
                files: [{ name: activeFile.name, content: activeFile.content }],
                stdin: input,
            })

            const runResult = response?.data?.run
            const stderr = runResult?.stderr?.trim()
            const stdout = runResult?.stdout?.trim()
            setOutput(stderr || stdout || "No output generated.")
            setIsRunning(false)
            toast.dismiss()
            toast.success("Code executed successfully")
        } catch (error: unknown) {
            const isObject = (v: unknown): v is Record<string, unknown> =>
                typeof v === "object" && v !== null

            if (isAxiosError(error) && isObject(error.response?.data)) {
                console.error(error.response.data)
                if ("error" in error.response.data)
                    console.error(
                        (error.response.data as Record<string, unknown>).error,
                    )
            } else {
                console.error(error)
            }

            setIsRunning(false)
            toast.dismiss()
            toast.error(
                "Execution failed because the runner service is unavailable or blocked. Configure VITE_PISTON_API_URL with a reachable Piston endpoint.",
            )
        }
    }

    return (
        <RunCodeContext.Provider
            value={{
                setInput,
                output,
                isRunning,
                supportedLanguages,
                selectedLanguage,
                setSelectedLanguage,
                runCode,
            }}
        >
            {children}
        </RunCodeContext.Provider>
    )
}

export { RunCodeContextProvider }
export default RunCodeContext
