import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F0EB] px-6 text-[#1A1F36]">
      <div className="max-w-lg text-center">
        <p className="text-xs font-black uppercase tracking-widest text-[#C4622D]">404</p>
        <h1 className="mt-3 text-3xl font-black">Page not found</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#40516A]">
          The page you are looking for is unavailable. Continue to 8liv public care information or sign in from the homepage.
        </p>
        <Link href="/" className="mt-6 inline-flex rounded-xl bg-[#1A1F36] px-5 py-3 text-sm font-black text-white">
          Go to homepage
        </Link>
      </div>
    </main>
  )
}
