import Link from "next/link";
import { GithubLogo } from "@phosphor-icons/react/dist/ssr";

export function Footer() {
  return (
    <footer className="border-t border-border-subtle py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-text-muted">
            Built for system design interviews
          </p>
          <Link
            href="https://github.com/saurabh-sol/Idempotent-Payment-Order-System-Saga-Pattern-"
            target="_blank"
            className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <GithubLogo weight="fill" className="h-4 w-4" />
            View on GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}
