"use client"

export function FractalWidget() {

  return (
    <>
      {/* Desktop Always-Visible Widget */}
      <div className="hidden xl:block fixed bottom-6 right-6 z-50">
        <div className="flex h-[30px] items-center rounded-[12px] border border-white/40 bg-white/55 px-3 text-xs font-medium text-[#3c3931] shadow-sm backdrop-blur-[12px]">
            <p className="whitespace-nowrap">
              Built by{" "}
              <a
                href="https://pabloar.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-colors hover:text-[#0f1524]"
              >
                Pablo Ramirez
              </a>{" "}
              at{" "}
              <a
                href="https://fractalbootcamp.com/fractal-tech-hub"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-colors hover:text-[#0f1524]"
              >
                Fractal Tech
              </a>
            </p>
        </div>
      </div>
    </>
  )
}
