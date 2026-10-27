import Image from "next/image";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-6">
        <Image src="/brand/vanova-wordmark.png" alt="VANOVA" width={143} height={28} priority className="mb-6" />
        {children}
      </div>
    </main>
  );
}
