'use client';

import { IconMicrophone } from '@tabler/icons-react';

export default function PanelVoiceovers() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 gap-4">
      <IconMicrophone className="size-7 text-muted-foreground" stroke={1.5} />
      <div className="flex flex-col gap-2 text-center">
        <p className=" font-semibold text-white">No Voiceover Assets</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Start building your collection by clicking the generate button below
        </p>
      </div>
    </div>
  );
}
