declare module '*.webp' {
  const url: string;
  export default url;
}

interface ImportMeta {
  glob<T>(pattern: string, options: { eager: true; import: 'default' }): Record<string, T>;
}
