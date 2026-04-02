import Link from "next/link";
import Image from "next/image";
import { Button } from "@repo/ui/button";
import { Pencil, Users, Github } from "lucide-react";
// import PointerSpotlight from "./PointerSpotlight";

const Hero = () => {
  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-60">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-20%,hsl(var(--brand-1)/0.15),transparent)]" />
      </div>
      {/* <PointerSpotlight /> */}

      <nav className="container mx-auto flex items-center justify-between py-6">
        <Link href="#" className="flex items-center gap-2 font-semibold">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-card shadow-sm">
            <Pencil className="opacity-80" />
          </span>
          <span className="sr-only">Home</span>
          <span className="hidden sm:inline">Excalidraw Clone</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Button  variant="outline">
            <Link href="https://github.com" aria-label="GitHub">
              <Github className="mr-2" /> GitHub
            </Link>
          </Button>
        </div>
      </nav>

      <div className="container mx-auto grid gap-10 pb-16 pt-8 md:grid-cols-2 md:gap-12 md:pb-24 md:pt-10">
        <div className="flex flex-col items-start justify-center text-left">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            <span className="text-gradient-primary">Excalidraw Clone</span>
            <br />
            Collaborative Whiteboard
          </h1>
          <p className="mt-5 max-w-prose text-lg text-muted-foreground">
            Sketch ideas, diagrams, and wireframes together in real-time. A fast,
            clean, Excalidraw-style editor for teams and makers.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" >
              <Link href="#get-started">Launch Editor</Link>
            </Button>
            <Button size="lg" variant="secondary" >
              <Link href="#features">See Features</Link>
            </Button>
          </div>
          <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-card text-[10px]">JT</span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-card text-[10px]">AD</span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-card text-[10px]">MK</span>
            </div>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Live collaboration
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-2xl bg-[conic-gradient(from_140deg_at_50%_50%,hsl(var(--brand-1)/0.25),hsl(var(--brand-2)/0.15),transparent_60%)] blur-2xl" />
          <Image
            src="/images/og-excalidraw.png"
            alt="Hero illustration of a collaborative whiteboard app with sketches and cursors"
            width={1600}
            height={900}
            priority
            className="w-full rounded-xl border bg-card shadow-elegant"
          />
        </div>
      </div>
    </header>
  );
};

export default Hero;