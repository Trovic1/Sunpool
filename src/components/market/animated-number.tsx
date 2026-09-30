"use client"

import { animate, useReducedMotion } from "framer-motion"
import { useEffect, useRef } from "react"

type AnimatedNumberProps = {
  value: number
  format: (value: number) => string
  className?: string
}

/** Counts up to `value` on change. Renders the final value instantly under reduced motion. */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const previous = useRef(value)
  const reduced = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const from = previous.current
    previous.current = value
    if (reduced || from === value) {
      node.textContent = format(value)
      return
    }
    const controls = animate(from, value, {
      type: "spring",
      duration: 0.6,
      bounce: 0,
      onUpdate: (latest) => {
        node.textContent = format(latest)
      },
    })
    return () => controls.stop()
  }, [value, format, reduced])

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  )
}
