"use client"

import { usePostHog } from 'posthog-js/react'

export function FractalWidget() {
  const posthog = usePostHog()

  const handleExternalLinkClick = (linkType: string, url: string) => {
    posthog?.capture('external_link_clicked', {
      link_type: linkType,
      url: url,
      source: 'fractal_widget'
    })
  }

  return (
    <>
      {/* Mobile Always-Visible Widget */}
      <div className="fixed bottom-4 right-4 z-50 sm:hidden">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md">
          <p className="text-white/70 text-xs whitespace-nowrap">
            Built by{" "}
            <a
              href="https://pabloar.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleExternalLinkClick('portfolio', 'https://pabloar.com')}
              className="underline underline-offset-2 hover:text-white transition-colors"
            >
              Pablo
            </a>
          </p>
        </div>
      </div>

      {/* Desktop Always-Visible Widget */}
      <div className="hidden sm:block fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Subtle glow effect */}
          <div
            className="absolute top-0 left-0 w-full h-full rounded-lg opacity-30 blur-[4px] scale-105 shadow-lg shadow-black/50"
            // style={{
            //   background: "linear-gradient(270deg, rgb(255, 59, 48) 0%, rgb(255, 149, 0) 100%)",
            // }}
          />
          
          {/* Widget Content */}
          <div className="relative bg-black/40 shadow-lg shadow-black/50 backdrop-blur-sm rounded-lg px-6 py-3 ">
            <p className="text-white/90 text-sm whitespace-nowrap">
              Built by{" "}
              <a
                href="https://pabloar.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleExternalLinkClick('portfolio', 'https://pabloar.com')}
                className="underline underline-offset-2 hover:text-white transition-colors"
              >
                Pablo Ramirez
              </a>{" "}
              at{" "}
              <a
                href="https://fractalbootcamp.com/fractal-tech-hub"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleExternalLinkClick('fractal_tech', 'https://fractalbootcamp.com/fractal-tech-hub')}
                className="underline underline-offset-2 hover:text-white transition-colors"
              >
                Fractal Tech
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}