export default function safePromise<R>(promise: () => Promise<R>, awaited: (d: R) => void) {
  let destroy = false
  promise().then((data) => {
    if (destroy) return
    awaited(data)
  })
  return () => {
    destroy = true
  }
}
