export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <h1 className="text-3xl font-bold mb-4">Welcome to the Home Page</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-lg text-[0.7rem] sm:text-base">
        This is the home page of the application. You can add your content here.
      </p>
    </div>
  );
}