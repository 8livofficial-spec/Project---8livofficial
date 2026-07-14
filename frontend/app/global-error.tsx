'use client'

export default function GlobalError() {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-[#F5F0EB] px-6 text-[#1A1F36]">
          <div className="max-w-lg text-center">
            <p className="text-xs font-black uppercase tracking-widest text-[#C4622D]">Error</p>
            <h1 className="mt-3 text-3xl font-black">Something went wrong</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#40516A]">
              We could not load this page. No private health details are shown in this error state.
            </p>
          </div>
        </main>
      </body>
    </html>
  )
}
