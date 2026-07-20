import { ChangeEvent } from "react"
import { PiCaretDownBold } from "react-icons/pi"

interface SelectProps {
    onChange: (e: ChangeEvent<HTMLSelectElement>) => void
    value: string
    options: string[]
    title: string
}

function Select({ onChange, value, options, title }: SelectProps) {
    const uniqueOptions = Array.from(new Set(options))

    return (
        <div className="relative w-full">
            <label className="mb-2">{title}</label>
            <select
                className="w-full rounded-md border-none bg-darkHover px-4 py-2 text-white outline-none"
                value={value}
                onChange={onChange}
            >
                {uniqueOptions
                    .slice()
                    .sort()
                    .map((option, index) => {
                        const optionValue = option
                        const optionLabel =
                            option.charAt(0).toUpperCase() + option.slice(1)

                        return (
                            <option
                                key={`${title}-${optionValue}-${index}`}
                                value={optionValue}
                            >
                                {optionLabel}
                            </option>
                        )
                    })}
            </select>
            <PiCaretDownBold
                size={16}
                className="absolute bottom-3 right-4 z-10 text-white"
            />
        </div>
    )
}

export default Select
