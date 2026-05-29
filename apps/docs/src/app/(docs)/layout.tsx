import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      tabs={[
        {
          title: "core",
          description: "Headless video editor",
          url: "/core",
        },
        {
          title: "engine-pixi",
          description: "Pixijs video engine",
          url: "/engine-pixi",
        },
      ]}
      {...baseOptions()}
    >
      {children}
    </DocsLayout>
  );
}
