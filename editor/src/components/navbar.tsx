"use client";

import React from "react";
import Link from "next/link";
import { LogoIcons } from "@/components/shared/logos";
import { UserMenu } from "@/components/user-menu";

const Navbar = () => {
  return (
    <header
      id="nd-nav"
      className="border-b w-full bg-card/80 backdrop-blur-md sticky top-0 z-50 px-4"
      aria-label="Main"
    >
      <div className="max-w-7xl mx-auto h-16 flex items-center px-4">
        {/* Desktop Navigation */}
        <div className="hidden md:grid grid-cols-3 w-full items-center">
          {/* Left: Logo */}
          <div className="flex justify-start">
            <Link
              className="inline-flex items-center gap-2.5 font-bold tracking-tight shrink-0"
              href="/"
            >
              <LogoIcons.scenify className="size-5" />
              <span>OpenVideo</span>
            </Link>
          </div>

          {/* Center: Empty space */}
          <div className="flex justify-center">{/* Navigation removed */}</div>

          {/* Right: UserMenu */}
          <div className="flex justify-end">
            <UserMenu />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex w-full items-center justify-between">
          <Link className="inline-flex items-center gap-2.5 font-bold tracking-tight" href="/">
            <LogoIcons.scenify className="text-primary size-5" />
            <span>OpenVideo</span>
          </Link>

          <UserMenu />
        </div>
      </div>

      {/* Mobile menu removed */}
    </header>
  );
};

export default Navbar;
