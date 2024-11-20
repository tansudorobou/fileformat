import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { useState } from "react"
import { DropFile } from "./components/dropFile"

type Selection = {
  [key: string]: string[]
}

type FileFormat = {
  rule: string
  selection: Selection
  date?: string
}

type Config = {
  format: FileFormat
  name: string
  extension: string
  keys: string[]
}

function App() {
  const [filePath, setFilePath] = useState<string | null>(null)
  const [formData, setFormData] = useState<{ [key: string]: string }>({})
  const [config, setConfig] = useState<Config>()
  const [error, setError] = useState<unknown>()

  const handleChange = (key: string, value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      [key]: value,
    }))
  }

  const openDialog = async () => {
    const f = await open({
      multiple: false,
      directory: false,
    })
    setFilePath(f)
    try {
      const { format, name, extension, keys }: Config = await invoke(
        "get_file_format",
        { filePath: f },
      )
      setConfig({ format, name, extension, keys })

      const initialFormData = keys.reduce(
        (acc: { [key: string]: string }, key) => {
          acc[key] = ""
          return acc
        },
        {},
      )
      setFormData(initialFormData)
    } catch (e) {
      setError(e)
      console.error("Failed to fetch file format", error)
    }
  }

  const renameFile = async (file: string | null) => {
    if (file != null) {
      try {
        const selection = {
          rule: config?.format.rule,
          extends: config?.extension,
          ...formData,
        }
        await invoke("rename_file", {
          filePath: file,
          selection,
        })
        importRest()
        console.log("File renamed successfully")
      } catch (e) {
        setError(e)
        console.error(e)
      }
    }
  }

  const importRest = () => {
    setFilePath(null)
    setFilePath(null)
    setConfig(undefined)
    setError(undefined)
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-stone-400 mb-4">
        ファイルフォーマットAPP
      </h1>
      <DropFile />
      <div className="text-lg text-blue-500 mt-4">{filePath}</div>
      <div className="mt-2">{config?.name}</div>
      <div className="mt-2">{config?.extension}</div>
      {config?.format ? (
        <>
          {config?.keys.map((key) => {
            const inputId = `input-${key}`

            if (key === "date") {
              return (
                <input
                  id="date"
                  name="date"
                  type="date"
                  onChange={(e) => handleChange(key, e.target.value)}
                />
              )
            }

            return (
              <div key={key} className="mb-4">
                <label
                  htmlFor={inputId}
                  className="block text-sm font-medium text-gray-700"
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}:
                  {Array.isArray(config.format?.selection[key]) ? (
                    <select
                      id={inputId}
                      value={formData[key]}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-100 border-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      {config.format?.selection[key].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={inputId}
                      type="text"
                      value={formData[key]}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-100 border-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    />
                  )}
                </label>
              </div>
            )
          })}
          <button
            type="button"
            onClick={importRest}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => renameFile(filePath)}
            className="mt-2 ml-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700"
          >
            RenameFile
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={openDialog}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
        >
          Open Dialog
        </button>
      )}
      {error ? <div className="text-red-500">{String(error)}</div> : null}
    </main>
  )
}

export default App
