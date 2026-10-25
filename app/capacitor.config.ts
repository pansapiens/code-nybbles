import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.github.pansapiens.codenybbles',
  appName: 'Code Nybbles',
  webDir: 'dist',
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      // viewport-fit=cover is in index.html. Hinting it here lets the first frame use the system insets.
      initialViewportFitValueHint: 'cover',
    },
  },
}

export default config
