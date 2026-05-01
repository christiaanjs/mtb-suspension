"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 items-center">
      <Link
        href="/"
        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          pathname === "/"
            ? "bg-blue-600 text-white"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        Analyzer
      </Link>
      <Link
        href="/linkage"
        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          pathname === "/linkage"
            ? "bg-blue-600 text-white"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        Linkage
      </Link>
    </nav>
  );
}
