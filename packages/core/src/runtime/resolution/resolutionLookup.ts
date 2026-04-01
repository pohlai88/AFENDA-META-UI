import { resolutions } from "../../generated/resolutions.js";

export type GeneratedResolutionRecord = (typeof resolutions)[number];

export function getResolutionByRef(resolutionRef: string): GeneratedResolutionRecord {
  const resolution = resolutions.find((entry) => {
    return (
      entry.key === resolutionRef ||
      entry.resolutionId === resolutionRef
    );
  });

  if (!resolution) {
    throw new Error(`Unknown resolutionRef: ${resolutionRef}`);
  }

  return resolution;
}
