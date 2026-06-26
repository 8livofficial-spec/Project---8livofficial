'use client'

import { useEffect } from 'react'

const PATCH_FLAG = '__8livSafeReleasePointerCapture'

type PatchedWindow = Window & {
  [PATCH_FLAG]?: boolean
}

export default function PointerCaptureGuard() {
  useEffect(() => {
    const patchedWindow = window as PatchedWindow
    if (patchedWindow[PATCH_FLAG]) return

    const originalReleasePointerCapture = Element.prototype.releasePointerCapture
    Element.prototype.releasePointerCapture = function safeReleasePointerCapture(pointerId: number) {
      try {
        if (typeof this.hasPointerCapture === 'function' && !this.hasPointerCapture(pointerId)) {
          return
        }
        return originalReleasePointerCapture.call(this, pointerId)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'NotFoundError') {
          return
        }
        throw error
      }
    }

    patchedWindow[PATCH_FLAG] = true
  }, [])

  return null
}
