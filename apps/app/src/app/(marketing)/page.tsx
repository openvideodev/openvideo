import Hero from "@/components/marketing/hero";
import Features from "@/components/marketing/features";
import Footer from "@/components/marketing/footer";
import { DiagonalStripes } from "@/components/shared/diagonal-stripes";
import { FullWidthBorder } from "@/components/full-width-border";
import { BrowserWithBackground } from "@/components/browser-with-background";
import { FakeEditor } from "@/components/fake-editor";
// import { Hero } from "@/components/home/vercel-hero";

export default function HomePage() {
  return (
    <main className="flex h-full flex-col justify-center text-center w-full max-w-7xl mx-auto border-dashed border-l border-r">
      <Hero />
      <div className="relative  w-full h-[600px] md:h-[700px] lg:h-[850px]">
        {/* <FullWidthBorder className="top-0" /> */}
        <BrowserWithBackground containerClassName="h-full w-full">
          <FakeEditor />
        </BrowserWithBackground>
        {/* <FullWidthBorder className="bottom-0" /> */}
      </div>{" "}
      <div className="w-full h-px relative">
        <FullWidthBorder className="top-0" />
      </div>
      <Features />
      <div className="w-full h-px relative">
        <FullWidthBorder className="top-0" />
      </div>
      <Footer />
    </main>
  );
}
