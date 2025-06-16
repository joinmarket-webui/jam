import type { ClientOptions } from "./generated/client/types.gen";
import {
  createClient as __createClient,
  createConfig,
} from "@hey-api/client-fetch";

export const createClient = (options: ClientOptions) =>
  __createClient(createConfig<ClientOptions>(options));
