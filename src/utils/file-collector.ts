import fg from 'fast-glob'

export async function collectFiles() {
  return fg(['**/*.vue'], {
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nuxt/**',
      '**/coverage/**'
    ]
  })
}