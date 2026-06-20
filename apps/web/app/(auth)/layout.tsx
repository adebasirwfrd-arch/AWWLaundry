export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-[#FAFAF8] px-4 py-10">
      {/* Subtle laundry icon pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%231E3A6E' fill-opacity='1'%3E%3Cpath d='M30 8c-2 0-4 2-4 4v6h8v-6c0-2-2-4-4-4zm-6 12v28c0 2 2 4 6 4s6-2 6-4V20H24z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
