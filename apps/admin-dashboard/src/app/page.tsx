import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#020617] font-sans text-slate-200">
      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 shadow-2xl shadow-blue-600/20">
          <span className="text-3xl font-black italic text-white">D</span>
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          DTMS <span className="text-blue-500">Enforcement</span>
        </h1>

        <p className="mb-12 max-w-lg text-lg text-slate-400">
          Delhi Traffic Management System — Central Administration & Arbitration Portal.
          Monitor real-time violations and manage evidence verification.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/arbitration"
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20"
          >
            Enter Arbitration Vault
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </Link>

          <button className="flex h-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50 px-8 text-sm font-bold uppercase tracking-widest text-slate-400 transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200">
            System Analytics
          </button>
        </div>
      </main>

      <footer className="flex h-20 items-center justify-center border-t border-slate-800/50 px-8 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600">
        DTMS v1.0.4 {/* Unified Enforcement Interface */}
      </footer>
    </div>
  );
}
