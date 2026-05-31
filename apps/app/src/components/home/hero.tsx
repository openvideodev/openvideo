"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Sparkles, Play } from "lucide-react";

const Hero = () => {
  return (
    <div>
      <section className="relative flex flex-col items-center justify-center gap-8 md:gap-10 px-4 md:px-10 text-center py-8 md:py-16 pt-16 md:pt-24">
        <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium">
          <Sparkles className="w-3 h-3 mr-1.5" />
          AI-Powered Video Editor
        </Badge>

        <div className="flex items-center justify-center gap-4 flex-col">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight">
            Edit Videos at the Speed of Thought
          </h1>
          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl px-4 leading-relaxed">
            Transform your creative vision into stunning videos with intelligent editing tools that
            understand your workflow.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button
            asChild
            className="h-11 px-5 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            size="lg"
          >
            <Link href="/spaces" className="flex items-center gap-2 text-sm">
              <Play className="w-4 h-4" />
              Start Creating
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-11 px-5 font-medium border-border/50 hover:border-border hover:bg-muted/50 transition-all duration-200"
          >
            <Link
              href="https://docs.openvideo.dev/core/00-getting-started"
              target="_blank"
              className="text-sm"
            >
              Learn More
            </Link>
          </Button>
        </div>
      </section>

      {/* <div className="relative w-full overflow-hidden">
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
        <div className="relative z-10 w-full px-6 md:px-10 pt-12 md:pt-16">
          <div
            className="relative w-full rounded-xl border border-border/40 overflow-hidden shadow-2xl hover:border-border/60 transition-all duration-300 mx-auto max-w-5xl"
            style={{ paddingBottom: "56.25%" }}
          >
            <Image
              src="/preview.png"
              alt="Video Editor Preview"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default Hero;
