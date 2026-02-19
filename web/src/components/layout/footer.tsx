export function Footer() {
  return (
    <footer className="border-t py-6 mt-auto">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <p className="text-xs text-muted-foreground text-center">
          &copy; {new Date().getFullYear()} Mealio. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
