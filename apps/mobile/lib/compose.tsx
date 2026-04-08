import React, { ReactElement } from "react";

interface ComposeProps {
  providers: Array<React.JSXElementConstructor<React.PropsWithChildren<any>>>;
  children: ReactElement;
}

/**
 * Flattens a nested tree of providers.
 * The first provider in the list will be the outermost.
 */
export function Compose({ providers, children }: ComposeProps) {
  return (
    <>
      {providers.reduceRight<ReactElement>((acc, Provider) => {
        return <Provider>{acc}</Provider>;
      }, children)}
    </>
  );
}
