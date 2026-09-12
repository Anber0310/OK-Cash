import { createServerFn } from "@tanstack/react-start";
import type { NessieRawPayload } from "./nessie.server";

/**
 * Puente seguro entre la interfaz y Nessie.
 * La llave vive solo en el servidor; el navegador solo recibe datos ya limpios.
 */
export const getNessieRaw = createServerFn({ method: "POST" })
  .inputValidator((input: { accountId?: string } | undefined) => ({ accountId: input?.accountId }))
  .handler(async ({ data }): Promise<NessieRawPayload> => {
    const { fetchNessieRaw } = await import("./nessie.server");
    return fetchNessieRaw(data.accountId);
  });
