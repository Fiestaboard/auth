import { Stack, Text, TextLink } from "../ui";

import { PageTitle, Shell } from "./Shell";

export function HomePage() {
  return (
    <Shell footer={<TextLink href="https://fiestaboard.app">fiestaboard.app</TextLink>}>
      <Stack gap="4">
        <PageTitle>Sign-in relay for FiestaBoard</PageTitle>
        <Text>
          FiestaBoard runs on your own network, where the services you connect to it can't reach it directly. When you
          connect an account, the service sends you here, and this site passes you on to your board. It is a few static
          pages: nothing is stored on a server and there is no tracking.
        </Text>
        <Text>
          <TextLink href="oauth/boards.html">See the boards this browser remembers</TextLink>
        </Text>
      </Stack>
    </Shell>
  );
}
