import { FiestaLogo, headingVariants, Stack, Text, TextLink } from "../ui";
import type { ReactNode, Ref } from "react";

const README_URL = "https://github.com/Fiestaboard/auth#readme";

export function Shell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <Stack gap="6">
        <FiestaLogo size="md" />
        {children}
        <footer className="border-t pt-4">
          <Text size="sm" tone="muted">
            {footer} <TextLink href={README_URL}>How this works</TextLink>
          </Text>
        </footer>
      </Stack>
    </main>
  );
}

/** The page's one h1. Focusable so a view change can move focus to it. */
export function PageTitle({ children, ref }: { children: ReactNode; ref?: Ref<HTMLHeadingElement> }) {
  return (
    <h1 ref={ref} tabIndex={-1} className={headingVariants({ size: "xl", className: "text-balance outline-none" })}>
      {children}
    </h1>
  );
}
