// Geometric lettering drawn as vectors so the mark looks the same on every device.
export default function BrandLogo({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 390 64" role="img" aria-label="Lifegram" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <g stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M4 6v52h29 M52 6v52 M76 58V6h30 M76 31h25 M126 6h30 M126 6v52h30 M126 31h25" />
      <path d="M212 14a26 26 0 1 0 0 36V33h-22" />
      <path d="M236 58V6h16a13 13 0 0 1 0 26h-16 M252 32l21 26" />
      <path d="M286 58l22-52 22 52 M294 40h28" />
      <path d="M349 58V6l18 29 18-29v52" />
    </g>
  </svg>;
}
