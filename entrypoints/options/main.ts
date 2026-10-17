import { defaultEnvironment } from "../../src/runtime/contracts.ts";
import { installFirefoxOptions } from "../../src/platform/firefox/options.ts";
import { installWhaleOptions } from "../../src/platform/whale/options.ts";
const install = import.meta.env.FIREFOX
  ? installFirefoxOptions
  : installWhaleOptions;
install({ environment: defaultEnvironment });
