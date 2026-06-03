"use client";

import React from "react";
import Link from "next/link";
import { LogoIcons } from "@/components/shared/logos";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { FullWidthBorder } from "./full-width-border";

const navLinks = [
  {
    name: "Changelog",
    href: "https://docs.openvideo.dev/core/00-getting-started",
    external: false,
  },
  { name: "Discord", href: "https://discord.gg/SCfMrQx8kr", external: true },
  { name: "GitHub", href: "https://github.com/openvideodev/openvideo", external: true },
];

const Navbar = () => {
  const { data: session } = authClient.useSession();

  return (
    <header
      id="nd-nav"
      className="w-full sticky top-0 z-50 bg-card/60 backdrop-blur-sm"
      aria-label="Main"
    >
      <div className="max-w-7xl border-x border-dashed px-4 mx-auto h-14 flex items-center">
        {/* Desktop Navigation */}
        <div className="hidden md:grid grid-cols-3 w-full items-center">
          {/* Left: Logo */}
          <div className="flex justify-start">
            <Link
              className="inline-flex items-center gap-2.5 font-semi tracking-tight shrink-0"
              href="/"
            >
              <LogoIcons.scenify className="size-5" />
              <span>OpenVideo</span>
            </Link>
          </div>

          {/* Center: Nav Links */}
          <div className="flex justify-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right: Auth button */}
          <div className="flex justify-end">
            {session ? (
              <Button asChild size="sm">
                <Link href="/spaces">Go to app</Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/signin">Get Started</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex w-full items-center justify-between">
          <Link className="inline-flex items-center gap-2.5 font-bold tracking-tight" href="/">
            <LogoIcons.scenify className="text-primary size-5" />
            <span>OpenVideo</span>
          </Link>

          {session ? (
            <Button asChild size="sm">
              <Link href="/spaces">Go to app</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/signin">Get Started</Link>
            </Button>
          )}
        </div>
      </div>
      <div className="w-full h-px relative">
        <FullWidthBorder className="top-0" />
      </div>
    </header>
  );
};

export default Navbar;
