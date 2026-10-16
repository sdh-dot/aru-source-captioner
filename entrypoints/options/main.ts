import { installFirefoxOptions } from "../../docs/source/platform/firefox/options.mjs";
import { installWhaleOptions } from "../../docs/source/platform/whale/options.mjs";
const install = import.meta.env.FIREFOX
  ? installFirefoxOptions
  : installWhaleOptions;
install({ environment: globalThis });
