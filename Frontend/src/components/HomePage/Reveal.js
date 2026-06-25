import useReveal from '../../utils/useReveal'

/**
 * Wraps children in a scroll-revealed container. Uses CSS classes defined in
 * index.css (`.reveal` / `.is-visible`) so the animation is GPU-friendly and
 * fully disabled under prefers-reduced-motion.
 */
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const [ref, visible] = useReveal()

  return (
    <Tag
      ref={ref}
      style={delay ? { '--reveal-delay': `${delay}ms` } : undefined}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}
