import { IProject, Command } from "@openvideo/core";

export interface ProjectContext {
  project: IProject;
  videoClipIds: string[];
  audioClipIds: string[];
  allClipIds: string[];
  trackIds: string[];
  firstVideoClipId: string | null;
}

export interface EditingSkill {
  name: string;
  description: string;
  tags: string[];
  isAsync: boolean;
  resolve(context: ProjectContext, params?: Record<string, any>): Promise<Command[]> | Command[];
  /** Optional: dynamically append content to the loaded SKILL.md before it is served to the agent */
  enrichDoc?(doc: string): string;
}
