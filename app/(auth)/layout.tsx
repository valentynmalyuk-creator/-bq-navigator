export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 bg-zinc-950"
      style={{
        backgroundImage: [
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.15) 0%, transparent 60%)",
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
        ].join(", "),
        backgroundSize: "auto, 28px 28px",
      }}
    >
      {children}
    </div>
  );
}
