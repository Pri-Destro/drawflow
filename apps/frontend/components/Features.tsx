import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Layers, Users, Share2, Zap, Cloud, PenTool } from "lucide-react";

const features = [
  { title: "Hand-drawn look", Icon: PenTool, desc: "Crisp, sketchy strokes and shapes for wireframes, diagrams, and notes." },
  { title: "Real-time collab", Icon: Users, desc: "Multi-cursor presence with low-latency updates for seamless teamwork." },
  { title: "Layers & grouping", Icon: Layers, desc: "Organize complex drawings with grouping, ordering, and alignment." },
  { title: "Share anywhere", Icon: Share2, desc: "Export to PNG/SVG, or share links to collaborate instantly." },
  { title: "Fast & lightweight", Icon: Zap, desc: "Built for speed—snappy interactions and smooth drawing." },
  { title: "Cloud-friendly", Icon: Cloud, desc: "Ready to hook into storage and auth when you need it." },
];

const Features = () => {
  return (
    <section id="features" className="container mx-auto py-16 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to sketch together</h2>
        <p className="mt-3 text-muted-foreground">Designed to feel instant and intuitive, with just the right tools.</p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ title, desc, Icon }) => (
          <Card key={title} className="h-full">
            <CardHeader className="flex-row items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-card">
                <Icon className="h-5 w-5" />
              </span>
              <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default Features;