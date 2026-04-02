import Link from "next/link";

const Footer = () => {
  return (
    <footer className="border-t py-8">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Excalidraw Clone. All rights reserved.</p>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="#" className="text-muted-foreground hover:text-foreground">Privacy</Link>
          <Link href="#" className="text-muted-foreground hover:text-foreground">Terms</Link>
          <Link href="#" className="text-muted-foreground hover:text-foreground">Contact</Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;