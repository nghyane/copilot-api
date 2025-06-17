import { state } from "./state"

const FALLBACK = "1.98.1"

async function fetchVSCodeVersion() {
  try {
    const response = await fetch(
      "https://aur.archlinux.org/cgit/aur.git/plain/PKGBUILD?h=visual-studio-code-bin",
    )
    const pkgbuild = await response.text()
    const pkgverRegex = /pkgver=([0-9.]+)/
    const match = pkgbuild.match(pkgverRegex)
    return match?.[1] || FALLBACK
  } catch {
    return FALLBACK
  }
}

export const cacheVSCodeVersion = async () => {
  state.vsCodeVersion = await fetchVSCodeVersion()
}
