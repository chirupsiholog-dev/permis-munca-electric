import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

let bodyScrollLockCount = 0
let savedBodyOverflow = ''

export default function Modal({ isOpen, onClose, label, labelledBy, children }) {
  const containerRef = useRef(null)
  const previousFocusedRef = useRef(null)

  if (!label && !labelledBy) {
    throw new Error('Modal requires either a label or labelledBy prop for accessibility.')
  }

  useEffect(() => {
    if (!isOpen) return

    previousFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusId = requestAnimationFrame(() => {
      containerRef.current?.focus()
    })

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key !== 'Tab') return

      const container = containerRef.current
      if (!container) return

      const focusableElements = Array.from(
        container.querySelectorAll(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [contenteditable], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element instanceof HTMLElement && !element.hasAttribute('disabled'))

      if (focusableElements.length === 0) {
        e.preventDefault()
        container.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (!container.contains(activeElement)) {
        e.preventDefault()
        ;(e.shiftKey ? lastElement : firstElement).focus()
        return
      }

      if (e.shiftKey) {
        if (activeElement === firstElement || activeElement === container) {
          e.preventDefault()
          lastElement.focus()
        }
        return
      }

      if (activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    if (bodyScrollLockCount === 0) {
      savedBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    bodyScrollLockCount += 1

    return () => {
      cancelAnimationFrame(focusId)
      document.removeEventListener('keydown', onKeyDown)

      bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1)
      if (bodyScrollLockCount === 0) {
        document.body.style.overflow = savedBodyOverflow
      }

      if (previousFocusedRef.current?.isConnected) {
        previousFocusedRef.current.focus()
      }
    }
  }, [isOpen, onClose])

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20, 26, 33, 0.45)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            overflowY: 'auto',
            padding: '48px 24px',
          }}
        >
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label={labelledBy ? undefined : label}
            aria-labelledby={labelledBy}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '760px' }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}