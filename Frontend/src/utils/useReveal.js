import { useEffect, useRef, useState } from 'react'

/**
 * Lightweight scroll-reveal hook backed by IntersectionObserver.
 * Adds zero dependencies and observes a single element, disconnecting
 * as soon as it has been revealed once (cheap, fire-and-forget).
 *
 * Usage:
 *   const [ref, visible] = useReveal()
 *   <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''}`} />
 */
export default function useReveal({ threshold = 0.15, rootMargin = '0px 0px -10% 0px' } = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined

    // Fallback for very old browsers / SSR — just show the content.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold, rootMargin }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return [ref, visible]
}
