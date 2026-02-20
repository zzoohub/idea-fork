export function Footer() {
  return (
    <footer className="hidden sm:block border-t py-6 mt-auto">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <p className="text-xs text-muted-foreground text-center">
          &copy; {new Date().getFullYear()} idea-fork
        </p>
      </div>
    </footer>
  );
}
