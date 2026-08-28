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

export const updateTargetSchema = z.object({
  active: z.boolean(),
});

export type CreateTargetInput = z.infer<typeof createTargetSchema>;
export type UpdateTargetInput = z.infer<typeof updateTargetSchema>;