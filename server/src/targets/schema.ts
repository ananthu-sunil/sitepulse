import { z } from "zod";
import { isSafeTargetUrl } from "./url-safety.js";

export const createTargetSchema = z.object({
  url: z
    .url()
    .refine(
      (url) => url.startsWith("http://") || url.startsWith("https://"),
      {
        message: "URL must use HTTP or HTTPS",
      },
    )
    .refine(
      (url) => {
        try {
          return isSafeTargetUrl(new URL(url));
        } catch {
          return false;
        }
    },
    {
      message: "URL targets a private or local address",
    },
  )
});

export const updateTargetSchema = z.object({
  active: z.boolean(),
});

export type CreateTargetInput = z.infer<typeof createTargetSchema>;
export type UpdateTargetInput = z.infer<typeof updateTargetSchema>;