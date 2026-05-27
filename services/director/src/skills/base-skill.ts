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
}
