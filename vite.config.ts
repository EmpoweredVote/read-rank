import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const localEvUi = path.resolve(__dirname, '../ev-ui/dist')
const useLocalEvUi = fs.existsSync(localEvUi)

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: useLocalEvUi ? { '@chrisandrewsedu/ev-ui': localEvUi } : {},
    dedupe: ['react', 'react-dom', '@react-spring/web'],
  },
})
