export type GtEnvironment = "development" | "stage" | "production"

export const ENVIRONMENT_HOSTS: Record<GtEnvironment, string> = {
  development: "https://localhost:3000",
  stage: "https://guidedtrack-stage.herokuapp.com",
  production: "https://www.guidedtrack.com",
}

export interface Credentials {
  email: string
  password: string
}

export interface ProgramRef {
  file: string | { src: string; dist: string }
  id: number
}

/**
 * The file `gt pull` writes to. For a split entry this is `dist`, never `src`:
 * `src` is a template, and overwriting it with the server's rendered output
 * would destroy it.
 */
export function getPullFile(ref: ProgramRef): string {
  return typeof ref.file === "string" ? ref.file : ref.file.dist
}

export function getPushFile(ref: ProgramRef): string {
  return typeof ref.file === "string" ? ref.file : ref.file.dist
}

export interface GtConfig {
  email?: string
  password?: string
  programs?: Record<string, ProgramRef>
}

export interface Program {
  id: number
  name: string
  key: string
  description?: string
  contents?: string
  updated_at?: string
  /**
   * Names of programs this one references via `*program`. The list endpoint
   * returns an array; the single-program endpoint returns the same array as
   * a JSON string. Use `parseRelatedPrograms` from lib/mirror.ts.
   */
  related_programs?: string[] | string
}

export interface Job {
  id: number
  status: "running" | "completed" | "failed"
}

export interface EmbedInfo {
  run_id: number
  access_key: string
}
