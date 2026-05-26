export function shouldEnableNativePointerByDefault(search = window.location.search) {
  return new URLSearchParams(search).get('desktop') === '1'
}
