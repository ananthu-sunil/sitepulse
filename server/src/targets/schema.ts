import { z } from "zod";

export const createTargetSchema = z.object({
  url: z
    .url()
    .refine(
      (url) => url.startsWith("http://") || url.startsWith("https://"),
      {
        message: "URL must use HTTP or HTTPS",
      }
    ),
});

export type CreateTargetInput = z.infer<typeof createTargetSchema>;