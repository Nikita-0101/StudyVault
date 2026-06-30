import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /*
     * Backend выполняется в Node.js,
     * поэтому браузерная среда нам не нужна.
     */
    environment: 'node',

    /*
     * Vitest будет искать тесты
     * только в папке tests.
     */
    include: [
      'tests/**/*.test.ts',
    ],

    /*
     * Этот файл выполняется перед тестами
     * и создаёт безопасные тестовые env-переменные.
     */
    setupFiles: [
      './tests/setup-env.ts',
    ],

    /*
     * Очищаем сведения о вызовах mock-функций
     * между отдельными тестами.
     */
    clearMocks: true,

    /*
     * Возвращаем функции, заменённые через
     * vi.spyOn(), в исходное состояние.
     */
    restoreMocks: true,
  },
});