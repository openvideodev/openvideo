import Hero from "@/components/home/hero";
import Features from "@/components/home/features";
import Footer from "@/components/home/footer";
import { DiagonalStripes } from "@/components/shared/diagonal-stripes";
// import { Hero } from "@/components/home/vercel-hero";

export default function HomePage() {
  return (
    <main className="flex h-full flex-col justify-center text-center w-full max-w-6xl mx-auto border-l border-r">
      <DiagonalStripes />

      <Hero />
      <DiagonalStripes />

      <Features />
      <DiagonalStripes />

      <Footer />
    </main>
  );
}
