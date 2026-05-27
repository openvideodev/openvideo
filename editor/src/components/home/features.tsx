"use client";
import React from "react";
import { Sparkles, Wand2, ArrowRightLeft, Move } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";
import { IconSparkles2 } from "@tabler/icons-react";

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
    <div className="flex items-center justify-center flex-col gap-4 p-4">
      <div className="icon">{icon}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
};

const Features = () => {
  const features = [
    {
      title: "Intelligent Assistant",
      description:
        "AI-powered editing suggestions that learn your style and automate repetitive tasks.",
      icon: <IconSparkles2 size={18} />,
    },
    {
      title: "Instant Preview",
      description:
        "Real-time rendering with zero lag, so you can see changes instantly as you work.",
      icon: <Icons.video size={18} />,
    },
    {
      title: "Smart Backgrounds",
      description: "Remove or replace backgrounds automatically with advanced AI detection.",
      icon: <Sparkles size={18} />,
    },
    {
      title: "Cinema Grade",
      description: "Professional color grading and LUTs to give your videos that Hollywood look.",
      icon: <Wand2 size={18} />,
    },
    {
      title: "Seamless Flow",
      description:
        "Intelligent scene detection and automatic transitions for perfect storytelling.",
      icon: <ArrowRightLeft size={18} />,
    },
    {
      title: "Motion Magic",
      description: "Advanced keyframing and motion tracking for dynamic, professional animations.",
      icon: <Move size={18} />,
    },
  ];

  return (
    <>
      {" "}
      <section className="flex flex-col items-center justify-center gap-16 py-28 p-8 text-center px-4 w-full border-t">
        <div className="flex items-center justify-center gap-6 flex-col">
          <Badge variant="secondary" className="px-4 py-2">
            Capabilities
          </Badge>{" "}
          <h2 className="text-4xl font-medium tracking-tight">First cut to final cut. No grind.</h2>
          <p className="max-w-2xl mx-auto max-sm:text-sm text-muted-foreground text-lg">
            Intelligent automation meets creative control. Professional-grade tools that adapt to
            your workflow and accelerate your storytelling.
          </p>
        </div>{" "}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div key={index} className="p-8 relative">
              <FeatureCard
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
              />
              {/* Faded bottom border */}
              {index < features.length - 1 && (
                <div className="absolute bottom-0 left-4 right-4 h-[1.5px] bg-linear-to-r from-transparent via-border to-transparent sm:hidden" />
              )}
              {index < features.length - 2 && (
                <div className="absolute bottom-0 left-4 right-4 h-[1.5px] bg-linear-to-r from-transparent via-border to-transparent hidden sm:block lg:hidden" />
              )}
              {index < 3 && (
                <div className="absolute bottom-0 left-4 right-4 h-[1.5px] bg-linear-to-r from-transparent via-border to-transparent hidden lg:block" />
              )}
              {index >= 3 && index < 6 && (
                <div className="absolute bottom-0 left-4 right-4 h-[1.5px] bg-linear-to-r from-transparent via-border to-transparent hidden lg:block" />
              )}
              {/* Faded right border */}
              {index % 2 === 0 && index < features.length - 1 && (
                <div className="absolute right-0 top-4 bottom-4 w-[1.5px] bg-linear-to-b from-transparent via-border to-transparent hidden sm:block lg:hidden" />
              )}
              {index % 3 !== 2 && (
                <div className="absolute right-0 top-4 bottom-4 w-[1.5px] bg-linear-to-b from-transparent via-border to-transparent hidden lg:block" />
              )}{" "}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Transform your creative vision into compelling stories with tools that work as fast as you
          think.
        </p>
      </section>
    </>
  );
};

export default Features;
