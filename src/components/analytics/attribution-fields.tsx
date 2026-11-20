"use client";

import { useSyncExternalStore } from "react";

import { ATTRIBUTION_KEYS } from "@/lib/attribution";
import { readAttribution, type StoredAttribution } from "@/lib/attribution-client";

/**
 * The campaign a visitor arrived from, as hidden fields.
 *
 * Put inside any form and its submission carries `utm_*`, `fbclid` and the first
 * page seen, which the server stores and shows to sales. Empty for a visitor who
 * did not come from a tagged link. Read from the browser through
 * `useSyncExternalStore`, whose server snapshot is empty, because the server
 * cannot know what is in somebody's tab and hydration has to agree with it.
 */
const subscribe = () => () => {};
const snapshot = () => JSON.stringify(readAttribution());
const serverSnapshot = () => "{}";

export function AttributionFields() {
  const stored = JSON.parse(useSyncExternalStore(subscribe, snapshot, serverSnapshot)) as StoredAttribution;

  return (
    <>
      {ATTRIBUTION_KEYS.map((key) => (
        <input key={key} type="hidden" name={key} value={stored[key] ?? ""} readOnly />
      ))}
    </>
  );
}
