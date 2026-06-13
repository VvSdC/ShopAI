export function growTextarea(element, maxHeight) {
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`
}

export function resetTextareaHeight(element) {
  if (!element) return
  element.style.height = 'auto'
}
