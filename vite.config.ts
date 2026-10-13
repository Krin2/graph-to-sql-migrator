import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://krin2.github.io/graph-to-sql-migrator/ -> la base debe coincidir con el nombre del repositorio
export default defineConfig({
  base: '/graph-to-sql-migrator/',
  plugins: [react(), tailwindcss()],
  test: {
    // La logica de migracion corre en node; los tests de componentes declaran jsdom en el archivo
    environment: 'node',
    globals: true,
  },
})
