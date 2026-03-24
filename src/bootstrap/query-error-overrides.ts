import { registerQueryErrorPresentationOverrides } from "~/lib/query-client";

let isRegistered = false;

export function registerAppQueryErrorOverrides() {
  if (isRegistered) {
    return;
  }

  registerQueryErrorPresentationOverrides({
    query: {
      auth: {
        message: "You do not have permission to view this data.",
      },
    },
    mutation: {
      auth: {
        message: "You do not have permission to make this change.",
      },
      validation: {
        message: "Please review the entered values and try again.",
      },
    },
  });

  isRegistered = true;
}
