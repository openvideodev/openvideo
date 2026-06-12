"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <div className="w-full flex justify-start">
      <section className="relative flex flex-col items-start gap-4 md:gap-5 px-6 md:px-12 py-6 md:py-16 pt-12 md:pt-16 text-left max-w-4xl">
        <div className="flex flex-col gap-4">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-5xl font-medium tracking-tight max-w-3xl leading-[1.15] bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Multimodal AI that edits your videos
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            OpenVideo analyzes your footage, transcripts, and assets to orchestrate and edit
            timelines automatically—while keeping everything manually adjustable.
          </p>
        </div>

        <div className="flex items-center gap-3.5 flex-wrap pt-2">
          <Button
            asChild
            className="h-11 px-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            size="lg"
          >
            <Link href="/signin" className="flex items-center gap-2 text-sm">
              Get Started for Free
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-11 px-6 font-medium border-border/50 hover:border-border hover:bg-muted/50 transition-all duration-200"
          >
            <Link
              href="https://docs.openvideo.dev/core/00-getting-started"
              target="_blank"
              className="text-sm"
            >
              Read Documentation
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Hero;
