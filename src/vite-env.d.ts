/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Real backend base URL; when absent the mock server is used. */
  readonly VITE_API_URL?: string;
  /** Set to 'false' to attempt the real backend first. Default: mock only. */
  readonly VITE_USE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
