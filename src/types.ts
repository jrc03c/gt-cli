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
  id: number
  key: string
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
  contents?: string
}

export interface Job {
  id: number
  status: "running" | "completed" | "failed"
}

export interface EmbedInfo {
  run_id: number
  access_key: string
}
