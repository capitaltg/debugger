import { useEffect, useRef, useState, type DragEvent } from 'react'

const MAX_BYTES = 5 * 1024 * 1024

function hasFiles(dataTransfer: DataTransfer | null) {
  return !!dataTransfer && Array.from(dataTransfer.types).includes('Files')
}

function readText(file: File): Promise<string> {
  return file.text().catch(() => {
    throw new Error(`Could not read ${file.name}`)
  })
}

// Lets a textarea accept a dropped file, reading its contents as text (or via
// `read`, for files that need converting first). If reading rejects, the
// Error's message is shown to the user.
export function useFileDrop(
  onText: (text: string) => void,
  onError: (message: string) => void,
  read: (file: File) => Promise<string> = readText,
) {
  const [dragging, setDragging] = useState(false)
  const latestRead = useRef(0)

  // Stop the browser from navigating to a file dropped just outside the box.
  useEffect(() => {
    function block(e: globalThis.DragEvent) {
      if (hasFiles(e.dataTransfer)) e.preventDefault()
    }
    window.addEventListener('dragover', block)
    window.addEventListener('drop', block)
    return () => {
      window.removeEventListener('dragover', block)
      window.removeEventListener('drop', block)
    }
  }, [])

  return {
    dragging,
    dropProps: {
      onDragOver(e: DragEvent<HTMLTextAreaElement>) {
        if (!hasFiles(e.dataTransfer)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        setDragging(true)
      },
      onDragLeave() {
        setDragging(false)
      },
      onDrop(e: DragEvent<HTMLTextAreaElement>) {
        if (!hasFiles(e.dataTransfer)) return
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (!file) return
        if (file.size > MAX_BYTES) {
          onError(`${file.name} is too large (limit is 5 MB)`)
          return
        }
        const readId = ++latestRead.current
        read(file)
          .then((text) => {
            if (readId === latestRead.current) onText(text)
          })
          .catch((e: unknown) => {
            if (readId !== latestRead.current) return
            onError(e instanceof Error ? e.message : `Could not read ${file.name}`)
          })
      },
    },
  }
}
