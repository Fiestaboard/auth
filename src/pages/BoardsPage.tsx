/**
 * oauth/boards.html: the boards this browser passes sign-ins to without
 * asking, and the way to take one back off that list.
 */
import { Button, CardContent, CardFooter, Code, EmptyState, Flex, List, ListItem, Stack, Text } from "../ui";
import { BookmarkCheck, Check, Inbox } from "lucide-react";
import { useEffect, useState } from "react";

import { forgetBoard, parseRemembered } from "../lib/board-address.js";
import { readRemembered, writeRemembered } from "../lib/storage";
import { PageHeading, Shell } from "./Shell";

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
    <Shell>
      <PageHeading
        icon={<BookmarkCheck />}
        description="Sign-ins from these boards are passed straight back to them. Any other board is shown to you first."
      >
        Remembered boards
      </PageHeading>

      <CardContent>
        <Stack gap="4">
          {boards !== null && boards.length === 0 && (
            <EmptyState
              icon={Inbox}
              title="No boards remembered yet"
              description="A board is added when you connect an account from it and leave “remember this board” ticked."
              className="py-4"
            />
          )}

          {boards !== null && boards.length > 0 && (
            <List gap="0" className="divide-y rounded-lg border">
              {boards.map((address) => (
                <ListItem key={address}>
                  <Flex align="center" justify="between" gap="3" className="px-3 py-2.5">
                    <Code className="min-w-0 bg-transparent px-0 py-0 text-sm break-all">{address}</Code>
                    <Button variant="outline" size="sm" onClick={() => forget(address)}>
                      Forget<span className="sr-only"> {address}</span>
                    </Button>
                  </Flex>
                </ListItem>
              ))}
            </List>
          )}

          {/* Mounted for the page's whole life so the change is announced. */}
          <Text role="status" aria-live="polite" tone={status ? "success" : "default"} weight="medium">
            {status && (
              <>
                <Check aria-hidden="true" className="mr-1.5 inline size-4 align-text-bottom" />
                {status}
              </>
            )}
          </Text>
        </Stack>
      </CardContent>

      <CardFooter>
        <Text size="xs" tone="muted">
          Boards are remembered in this browser only; nothing is stored on a server.
        </Text>
      </CardFooter>
    </Shell>
  );
}
