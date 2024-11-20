import { invoke } from "@tauri-apps/api/core"
import { useState } from "react"
import type { FileDropItem } from "react-aria"
import { Text } from "react-aria-components"
import { DropZone } from "./ui/dropzone"

export function DropFile() {
  const [file, setFiles] = useState<File | null>(null)
  const [rename, setRename] = useState<string | undefined>()

  const handleSave = async () => {
    if (file) {
      const arrayBuffer = await file.arrayBuffer()
      const fileData = new Uint8Array(arrayBuffer)

      try {
        await invoke("save_file", {
          fileName: rename,
          fileData: Array.from(fileData),
        })
        setFiles(null)
        setRename(undefined)
        alert("File saved successfully!")
      } catch (error) {
        console.error("Error saving file:", error)
        alert("Failed to save file.")
      }
    }
  }

  return (
    <div className="p-4 bg-gray-100 w-fit rounded-lg shadow-md">
      <DropZone
        onDrop={async (e) => {
          const files = e.items.filter(
            (file) => file.kind === "file",
          ) as FileDropItem[]

          const file = await files[0].getFile()

          setFiles(file)
          setRename(file.name)
        }}
      >
        <Text slot="label" style={{ display: "block" }}>
          {file?.name || "Drop files here"}
        </Text>
      </DropZone>
      {rename ? (
        <div>
          <input
            value={rename}
            onChange={(e) => setRename(e.target.value)}
            className="mt-4 p-2 border border-gray-300 rounded w-full"
          />
          <button
            type="button"
            onClick={handleSave}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      ) : null}
    </div>
  )
}
