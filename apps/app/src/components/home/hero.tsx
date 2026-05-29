"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "../ui/button";
import { DotOrbit } from "@paper-design/shaders-react";

const Hero = () => {
  return (
    <div>
      <section className="relative flex flex-col items-center justify-center gap-8 md:gap-12 px-4 md:px-10 text-center py-8 md:py-16 pt-16 md:pt-24">
        <div className="flex items-center justify-center gap-4 flex-col">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight">
            Edit Videos at the Speed of Thought
          </h1>
          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl px-4">
            Transform your creative vision into stunning videos with intelligent editing tools that
            understand your workflow.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button
            asChild
            className="h-10 md:h-12 px-4 md:px-6 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            size="lg"
          >
            <Link href="/projects" className="font-normal text-sm">
              Start Creating
            </Link>
          </Button>
        </div>
      </section>
      <div className="relative w-full overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
          <DotOrbit
            width="100%"
            height="100%"
            colors={["#333333", "#555555"]}
            colorBack="#111111"
            stepsPerColor={4}
            size={1}
            sizeRange={0.12}
            spreading={1}
            speed={0}
            scale={0.05}
          />
        </div>
        <div className="relative z-10 w-full px-8 pt-16">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <Image
              src="/preview.png"
              alt="Video Editor Preview"
              fill
              className="rounded-lg shadow-2xl object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
