/**
 * What a person sees at oauth/redirect.html.
 *
 * Usually nothing: when the sign-in is for a board this browser has approved
 * before, src/entries/redirect.ts sends the browser on before this component
 * is even loaded. It renders for the cases that need a person: a board this
 * browser has not seen, or a response that cannot be passed on.
 *
 * The prerendered HTML is the "forward" view, so the first client render must
 * be that too; the real view is chosen in an effect.
 */
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  Button,
  CardContent,
  Checkbox,
  Code,
  Flex,
  Label,
  Spinner,
  Stack,
  Text,
  TextLink,
} from "../ui";
import { CircleHelp, Frame, Inbox, ShieldAlert, ShieldX } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { planRedirect, rememberBoard } from "../lib/board-address.js";
import { isFramed, readRemembered, writeRemembered } from "../lib/storage";
import { PageHeading, Shell } from "./Shell";

type View =
  | { action: "forward" }
  | { action: "confirm"; address: string; url: string }
  | { action: "refused"; reason: string }
  | { action: "unknown" }
  | { action: "nothing" }
  | { action: "framed" };

const TITLES: Record<View["action"], string> = {
  forward: "Returning to your board…",
  confirm: "Finish connecting to your board?",
  refused: "This sign-in can't be passed on",
  unknown: "This sign-in doesn't say which board it's for",
  nothing: "Nothing to do here",
  framed: "This page can't be used inside another page",
};

const REFUSED_REASONS: Record<string, string> = {
  public:
    "It asks to be sent to an address on the public internet. Sign-ins are only ever passed to a board on your own network.",
  credentials: "It asks to be sent to an address with a username or password in it.",
  scheme: "It asks to be sent somewhere that is not a web address.",
};

/** Decorative glyphs beside the title; the title text is the accessible name. */
const ICONS: Partial<Record<View["action"], ReactNode>> = {
  forward: <Spinner size="lg" label={null} />,
  refused: <ShieldX className="text-destructive" />,
  unknown: <CircleHelp />,
  nothing: <Inbox />,
  framed: <Frame />,
};

const DESCRIPTIONS: Partial<Record<View["action"], string>> = {
  confirm: "Sign-in worked. The last step is to hand it to your board, at the address below.",
};

export function RedirectPage() {
  const [view, setView] = useState<View>({ action: "forward" });
  const [remember, setRemember] = useState(true);
  const title = useRef<HTMLHeadingElement>(null);
  const rememberId = useId();
  const rememberHintId = useId();

  useEffect(() => {
    // Framed, the Continue button below could be clicked by trickery. GitHub
    // Pages cannot send frame-ancestors, so the check is made here.
    const next: View = isFramed()
      ? { action: "framed" }
      : planRedirect(readRemembered(), window.location.search);
    setView(next);
    document.title = `${TITLES[next.action]} · FiestaBoard`;
    if (next.action !== "forward") title.current?.focus();
  }, []);

  function continueToBoard(address: string, url: string) {
    if (remember) writeRemembered(rememberBoard(readRemembered(), address));
    // replace(), not assign(): the URL carrying the authorization code must
    // not stay in this tab's history.
    window.location.replace(url);
  }

  const showsBoardsLink = view.action !== "confirm" && view.action !== "forward";

  return (
    <Shell links={showsBoardsLink ? <TextLink href="boards.html">Boards this browser remembers</TextLink> : null}>
      {/* One heading element for every view, so the focus the effect moves to
          it survives the switch from the prerendered "forward" view. */}
      <PageHeading ref={title} icon={ICONS[view.action]} description={DESCRIPTIONS[view.action]}>
        {TITLES[view.action]}
      </PageHeading>

      <CardContent>
        {view.action === "forward" && (
          <Text tone="muted">
            If nothing happens, your board may be switched off or on a different network from this device. Check it,
            then start the connection again from your board.
          </Text>
        )}

        {view.action === "confirm" && (
          <Stack gap="5">
            <Box className="rounded-lg border bg-muted/50 px-4 py-3">
              <Text as="span" size="xs" tone="muted" weight="medium" className="block uppercase tracking-wide">
                Board address
              </Text>
              <Code
                data-testid="board-address"
                className="mt-1 block bg-transparent px-0 py-0 text-base font-semibold leading-snug break-all sm:text-lg"
              >
                {view.address}
              </Code>
            </Box>

            <Alert variant="warning" politeness="polite">
              <ShieldAlert aria-hidden="true" />
              <AlertTitle>Only continue if you just pressed Connect on this board</AlertTitle>
              <AlertDescription>
                If you got here from a link someone sent you, or you don't recognise the address, close this page.
              </AlertDescription>
            </Alert>

            <Flex align="start" gap="3">
              <Checkbox
                id={rememberId}
                className="mt-0.5"
                checked={remember}
                aria-describedby={rememberHintId}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <Stack gap="1">
                <Label htmlFor={rememberId} className="cursor-pointer">
                  Remember this board in this browser
                </Label>
                <Text id={rememberHintId} size="xs" tone="muted">
                  Future sign-ins for this address go straight through without asking.
                </Text>
              </Stack>
            </Flex>

            <Button variant="brand" size="lg" className="w-full" onClick={() => continueToBoard(view.address, view.url)}>
              Continue to my board
            </Button>
          </Stack>
        )}

        {view.action === "refused" && (
          <Alert variant="destructive">
            <AlertTitle>Nothing was sent anywhere</AlertTitle>
            <AlertDescription>
              {REFUSED_REASONS[view.reason] ?? "The board address it carries is not one this site can use."} If you
              reach your board through a public address, open it by its local address (like{" "}
              <Code>http://192.168.1.50:4420</Code>) and connect from there.
            </AlertDescription>
          </Alert>
        )}

        {view.action === "unknown" && (
          <Text>
            The board that started it may be running an older version of FiestaBoard. Update the board, then start the
            connection again.
          </Text>
        )}

        {view.action === "nothing" && (
          <Text>
            This page finishes connecting an account to a FiestaBoard. It only works when a sign-in sends you here, so
            start from the Connect button on your board.
          </Text>
        )}

        {view.action === "framed" && <Text>Open it in its own tab and start the connection again from your board.</Text>}
      </CardContent>
    </Shell>
  );
}
