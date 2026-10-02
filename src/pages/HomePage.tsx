import { CardContent, CardFooter, List, ListItem, Stack, Text, TextLink } from "../ui";

import { PageHeading, Shell } from "./Shell";

export function HomePage() {
  return (
    <Shell links={<TextLink href="https://fiestaboard.app">fiestaboard.app</TextLink>}>
      <PageHeading description="The fixed address that services send you back to when you connect an account to a FiestaBoard.">
        Sign-in relay for FiestaBoard
      </PageHeading>

      <CardContent>
        <Stack gap="4">
          <Text>
            A FiestaBoard runs on your own network, where the services you connect to it can't reach it directly. So
            the hand-off goes through here:
          </Text>
          <List as="ol" marker="decimal" gap="2" className="text-sm">
            <ListItem>You press Connect on your board and sign in with the service.</ListItem>
            <ListItem>The service sends you to this site.</ListItem>
            <ListItem>This site passes you on to your board, which finishes the connection.</ListItem>
          </List>
          <Text>
            It is a few static pages. Nothing is stored on a server, there is no tracking, and only an address on your
            own network is ever used.
          </Text>
        </Stack>
      </CardContent>

      <CardFooter>
        <Text size="xs" tone="muted">
          <TextLink href="oauth/boards.html">See the boards this browser remembers</TextLink>
        </Text>
      </CardFooter>
    </Shell>
  );
}
