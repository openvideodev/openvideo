import React, { useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AdjusmentBasic,
  AdjusmentCurves,
  AdjusmentHsl,
} from "./color-adjusment";
import useLayoutStore from "../store/use-layout-store";

const ColorAdjustment = () => {
    const { setFloatingControl } = useLayoutStore();

    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (
          containerRef.current &&
          !containerRef.current.contains(target) &&
          !target.closest("[data-radix-portal]") &&
          !target.closest("[data-radix-popper-content-wrapper]")
        ) {
          setFloatingControl("");
        }
      };
  
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [setFloatingControl]);
  
  return (
    <div ref={containerRef} className="absolute left-full top-0 z-200 ml-2 w-72 border bg-background p-0">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="w-full rounded-none">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="hsl">HSL</TabsTrigger>
          <TabsTrigger value="curves">Curves</TabsTrigger>
        </TabsList>
        <TabsContent value="basic">
          <AdjusmentBasic />
        </TabsContent>
        <TabsContent value="hsl">
          <AdjusmentHsl />
        </TabsContent>
        <TabsContent value="curves">
          <AdjusmentCurves />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ColorAdjustment;
