import { useEffect, useRef, useState, type DragEvent } from 'react'

const MAX_BYTES = 5 * 1024 * 1024

function hasFiles(dataTransfer: DataTransfer | null) {
  return !!dataTransfer && Array.from(dataTransfer.types).includes('Files')
}

// Lets a textarea accept a dropped file, reading its contents as text.
export function useFileDrop(
  onText: (text: string) => void,
  onError: (message: string) => void,
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
        file
          .text()
          .then((text) => {
            if (readId === latestRead.current) onText(text)
          })
          .catch(() => {
            if (readId === latestRead.current) onError(`Could not read ${file.name}`)
          })
      },
    },
  }
}
