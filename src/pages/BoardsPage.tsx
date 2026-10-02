/**
 * oauth/boards.html: the boards this browser passes sign-ins to without
 * asking, and the way to take one back off that list.
 */
import { Button, Card, Code, Stack, Text } from "../ui";
import { useEffect, useState } from "react";

import { forgetBoard, parseRemembered } from "../lib/board-address.js";
import { readRemembered, writeRemembered } from "../lib/storage";
import { PageTitle, Shell } from "./Shell";

export function BoardsPage() {
  // null until the effect has read storage, so prerendered HTML and the first
  // client render agree.
  const [boards, setBoards] = useState<string[] | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setBoards(parseRemembered(readRemembered()));
  }, []);

  function forget(address: string) {
    const next = forgetBoard(readRemembered(), address);
    writeRemembered(next);
    setBoards(parseRemembered(next));
    setStatus(`Forgotten. Sign-ins for ${address} will ask before continuing.`);
  }

  return (
    <Shell footer="Boards are remembered in this browser only; nothing is stored on a server.">
      <Stack gap="4">
        <PageTitle>Boards this browser remembers</PageTitle>
        <Text>
          When you connect an account from one of these boards, the sign-in is passed straight back to it. For any
          other board you are asked first.
        </Text>

        {boards !== null && boards.length === 0 && (
          <Text tone="muted">
            None yet. A board is added when you connect an account from it and choose to remember it.
          </Text>
        )}

        {boards !== null && boards.length > 0 && (
          <ul className="flex flex-col gap-2">
            {boards.map((address) => (
              <li key={address}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <Code className="break-all">{address}</Code>
                  <Button variant="outline" size="sm" onClick={() => forget(address)}>
                    Forget<span className="sr-only"> {address}</span>
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <Text size="sm" weight="medium" role="status" aria-live="polite">
          {status}
        </Text>
      </Stack>
    </Shell>
  );
}
