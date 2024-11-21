import { CaretSortIcon, Cross1Icon } from "@radix-ui/react-icons"
import { invoke } from "@tauri-apps/api/core"
import { message, open } from "@tauri-apps/plugin-dialog"
import { format as fnsFormat } from "date-fns"
import { useState } from "react"
import type { DropEvent, FileDropItem } from "react-aria"
import { Text } from "react-aria-components"
import { Datepicker } from "./components/datePicker"
import { Button } from "./components/ui/button"
import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxListBox,
  ComboboxPopover,
} from "./components/ui/combobox"
import { DropZone } from "./components/ui/dropzone"
import { FieldGroup, Label } from "./components/ui/field"
import { Input, TextField } from "./components/ui/textfield"

type Selection = {
  [key: string]: string[] | string
}

type FileFormat = {
  rule: string
  selection?: Selection
  date?: string
}

type Config = {
  format: FileFormat
  keys: string[]
}

// key: stringだった場合は、そのkeyに対応する日付フォーマットを返す
const generateInitialFormData = (keys: string[], format: FileFormat) => {
  return keys.reduce((acc: { [key: string]: string }, key) => {
    if (typeof format.selection?.[key] === "string") {
      acc[key] = fnsFormat(new Date(), format.selection[key])
      return acc
    }
    acc[key] = ""
    return acc
  }, {})
}

function hookLoader() {
  // state
  const [config, setConfig] = useState<Config | undefined>(() => {
    const savedConfig = localStorage.getItem("config")
    return savedConfig ? JSON.parse(savedConfig) : undefined
  })

  const [formData, setFormData] = useState<{ [key: string]: string }>(() => {
    if (config) {
      return generateInitialFormData(config.keys, config.format)
    }
    return {}
  })

  const [dropedFile, setDropedFile] = useState<File | null>(null)

  const [fileExtension, setFileExtension] = useState<string | null>(null)

  // function

  const setFile = (file: File) => {
    setDropedFile(file)
    const extension = file.name.split(".").pop()
    setFileExtension(extension || null)
  }

  const onDrop = async (e: DropEvent) => {
    const files = e.items.filter(
      (file) => file.kind === "file",
    ) as FileDropItem[]
    const file = await files[0].getFile()
    setFile(file)
  }

  const handleInputChange = (key: string, value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      [key]: value,
    }))
  }

  const openSettingFileDialog = async () => {
    const openOptions = {
      multiple: false,
      directory: false,
      filters: [
        {
          name: "Json",
          extensions: ["json"],
        },
      ],
    }

    try {
      const filePath = await open(openOptions)
      if (!filePath) {
        message("ファイルが指定されてません", {
          title: "設定ファイルの読み込み",
          kind: "error",
        })
        return null
      }

      const { format, keys }: Config = await invoke("get_file_format", {
        filePath,
      })

      // Configの保存
      setConfig({ format, keys })
      localStorage.setItem("config", JSON.stringify({ format, keys }))

      // Formの初期化
      const initialFormData = generateInitialFormData(keys, format)

      setFormData(initialFormData)
    } catch (error) {
      alert(error)
    }
  }

  const handleSaveFile = async () => {
    if (dropedFile) {
      const arrayBuffer = await dropedFile.arrayBuffer()
      const fileData = new Uint8Array(arrayBuffer)

      const allFieldsFilled = Object.values(formData).every(
        (value) => value !== "",
      )
      if (!allFieldsFilled) {
        alert("全ての項目を入力してください")
        return
      }

      try {
        const selection = {
          rule: config?.format.rule,
          extension: fileExtension,
          ...formData,
        }

        await invoke("save_file", {
          selection,
          fileData: Array.from(fileData),
        })
        resetFile()

        message("ファイルの保存が完了しました", {
          title: "ファイルの保存",
          kind: "info",
        })
      } catch (error) {
        message(String(error), {
          title: "ファイルの保存に失敗しました",
          kind: "error",
        })
      }
    }
  }

  const handleEnterKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveFile()
    }
  }

  function generateFileName(
    config: Config,
    formData: { [key: string]: string },
  ): string {
    const { rule } = config.format
    const regex = /\{(\w+)\}/g

    const fileName = rule.replace(
      regex,
      (_, key) => formData[key] || `{${key}}`,
    )

    return `${fileName}.${fileExtension ? fileExtension : "etc"}`
  }

  const resetFile = () => {
    setDropedFile(null)
    setFileExtension(null)
  }

  const resetConfig = () => {
    setConfig(undefined)
  }

  return {
    config,
    formData,
    dropedFile,
    fileExtension,
    onDrop,
    handleInputChange,
    openSettingFileDialog,
    handleSaveFile,
    generateFileName,
    resetConfig,
    resetFile,
    handleEnterKeyPress,
  }
}

export default function App() {
  const {
    config,
    formData,
    dropedFile,
    onDrop,
    handleInputChange,
    openSettingFileDialog,
    handleSaveFile,
    generateFileName,
    resetConfig,
    resetFile,
    handleEnterKeyPress,
  } = hookLoader()

  return (
    <main className="container mx-auto p-4">
      <DropZone onDrop={onDrop}>
        {!dropedFile && (
          <Text
            className="xs:text-base sm:text-2xl text-sm"
            slot="label"
            style={{ display: "block" }}
          >
            ファイルをドロップしてください
          </Text>
        )}
        {dropedFile && (
          <div className="flex flex-col gap-2 items-center xs:flex-row mt-6 xs:mt-0">
            <Text
              className="xs:text-base sm:text-2xl text-sm"
              slot="label"
              style={{ display: "block" }}
            >
              {dropedFile?.name}
            </Text>
            <Button type="button" variant="icon" onPress={resetFile}>
              <Cross1Icon />
            </Button>
          </div>
        )}
      </DropZone>
      <div className="my-3">
        {config && (
          <>
            <div className="w-full">
              <div className="my-2 px-2 py-1 bg-slate-100 rounded-lg hidden xs:block">
                {generateFileName(config, formData)}
              </div>
            </div>
            <FileNameForm
              config={config}
              formData={formData}
              handleInputChange={handleInputChange}
              handleEnterKeyPress={handleEnterKeyPress}
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                onPress={resetConfig}
                variant={"destructive"}
              >
                リセット
              </Button>
              {dropedFile && (
                <Button
                  type="button"
                  onPress={handleSaveFile}
                  variant={"outline"}
                >
                  ファイルコピー
                </Button>
              )}
            </div>
          </>
        )}
        {!config && (
          <div className="flex justify-center">
            <Button
              type="button"
              onPress={openSettingFileDialog}
              variant={"outline"}
            >
              設定ファイルを開く
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}

function FileNameForm({
  config,
  formData,
  handleInputChange,
  handleEnterKeyPress,
}: {
  config: Config
  formData: { [key: string]: string }
  handleInputChange: (key: string, value: string) => void
  handleEnterKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <>
      {config?.keys.map((key) => {
        const inputId = `input-${key}`

        const hasKey =
          (config.format?.selection && key in config.format.selection) || false

        if (hasKey === false) {
          return (
            <div key={key} className="mb-4">
              <TextField>
                <Label>{key.charAt(0).toUpperCase() + key.slice(1)}:</Label>
                <Input
                  id={inputId}
                  value={formData[key]}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  onKeyDown={handleEnterKeyPress}
                />
              </TextField>
            </div>
          )
        }

        if (typeof config.format?.selection?.[key] === "string") {
          return (
            <div key={key} className="mb-4">
              <Datepicker
                jsonKey={key}
                value={formData[key]}
                parseFormat={config.format.selection[key]}
                handleInputChange={handleInputChange}
              />
            </div>
          )
        }

        const conboxItems =
          hasKey === true
            ? (config.format?.selection?.[key] ?? []).map((option, index) => ({
                id: index,
                name: option,
              }))
            : []

        return (
          <div key={key} className="mb-4">
            <Combobox
              defaultItems={conboxItems}
              allowsCustomValue
              name={key}
              onInputChange={(e) => {
                handleInputChange(key, e)
              }}
              onSelectionChange={(k) => {
                if (k !== null) {
                  const selectedItem = conboxItems.find((item) => item.id === k)
                  if (selectedItem) {
                    handleInputChange(key, selectedItem.name)
                  }
                }
              }}
              onKeyDown={handleEnterKeyPress}
            >
              <Label>{key.charAt(0).toUpperCase() + key.slice(1)}:</Label>
              <FieldGroup className="p-0">
                <ComboboxInput />
                <Button variant="ghost" size="icon" className="mr-1 size-6 p-1">
                  <CaretSortIcon
                    aria-hidden="true"
                    className="size-4 opacity-50"
                  />
                </Button>
              </FieldGroup>
              <ComboboxPopover>
                <ComboboxListBox<(typeof conboxItems)[number]>>
                  {(item) => <ComboboxItem>{item.name}</ComboboxItem>}
                </ComboboxListBox>
              </ComboboxPopover>
            </Combobox>
          </div>
        )
      })}
    </>
  )
}
