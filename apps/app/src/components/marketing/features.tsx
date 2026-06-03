"use client";
import React from "react";
import {
  IconSparkles,
  IconWand,
  IconArrowLeftRight,
  IconMovie,
  IconPalette,
  IconBolt,
  IconLayersOff,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";

const FeatureCard = ({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) => {
  return (
    <div className="group flex items-center justify-center flex-col gap-4 p-6 rounded-lg hover:bg-muted/30 transition-all duration-200">
      <div className="size-12 rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center group-hover:border-border/60 group-hover:bg-muted transition-all duration-200">
        {icon}
      </div>
      <h3 className="font-medium text-base">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{description}</p>
    </div>
  );
};

const Features = () => {
  const features = [
    {
      title: "Intelligent Assistant",
      description:
        "AI-powered editing suggestions that learn your style and automate repetitive tasks.",
      icon: <IconSparkles className="size-5 text-amber-500/90" />,
    },
    {
      title: "Instant Preview",
      description:
        "Real-time rendering with zero lag, so you can see changes instantly as you work.",
      icon: <IconBolt className="size-5 text-yellow-500/90" />,
    },
    {
      title: "Smart Backgrounds",
      description: "Remove or replace backgrounds automatically with advanced AI detection.",
      icon: <IconLayersOff className="size-5 text-blue-500/90" />,
    },
    {
      title: "Cinema Grade",
      description: "Professional color grading and LUTs to give your videos that Hollywood look.",
      icon: <IconPalette className="size-5 text-purple-500/90" />,
    },
    {
      title: "Seamless Flow",
      description:
        "Intelligent scene detection and automatic transitions for perfect storytelling.",
      icon: <IconArrowLeftRight className="size-5 text-emerald-500/90" />,
    },
    {
      title: "Motion Magic",
      description: "Advanced keyframing and motion tracking for dynamic, professional animations.",
      icon: <IconMovie className="size-5 text-rose-500/90" />,
    },
  ];

  return (
    <section
      id="features"
      className="flex flex-col items-center justify-center gap-12 py-24 px-4 w-full border-t"
    >
      <div className="flex items-center justify-center gap-5 flex-col max-w-2xl text-center">
        <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium">
          Capabilities
        </Badge>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
          First cut to final cut. No grind.
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed">
          Intelligent automation meets creative control. Professional-grade tools that adapt to your
          workflow and accelerate your storytelling.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl w-full">
        {features.map((feature, index) => (
          <div key={index} className="p-4 relative">
            <FeatureCard
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
            />
            {/* Faded bottom border */}
            {index < features.length - 1 && (
              <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-border/60 to-transparent sm:hidden" />
            )}
            {index < features.length - 2 && (
              <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-border/60 to-transparent hidden sm:block lg:hidden" />
            )}
            {index < 3 && (
              <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-border/60 to-transparent hidden lg:block" />
            )}
            {index >= 3 && index < 6 && (
              <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-border/60 to-transparent hidden lg:block" />
            )}
            {/* Faded right border */}
            {index % 2 === 0 && index < features.length - 1 && (
              <div className="absolute right-0 top-4 bottom-4 w-[1px] bg-gradient-to-b from-transparent via-border/60 to-transparent hidden sm:block lg:hidden" />
            )}
            {index % 3 !== 2 && (
              <div className="absolute right-0 top-4 bottom-4 w-[1px] bg-gradient-to-b from-transparent via-border/60 to-transparent hidden lg:block" />
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground text-center max-w-lg">
        Transform your creative vision into compelling stories with tools that work as fast as you
        think.
      </p>
    </section>
  );
};

export default Features;
