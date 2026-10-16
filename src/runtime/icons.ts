import {
  defaultEnvironment,
  type RuntimeOptions,
  type DynamicApi,
} from "./contracts.ts";
// 실행 영역별 공개 의존성을 정적 import로 조립한다. 외부 namespace는 호환 entry에서만 등록한다.
import { createIconsRegistry } from "../ruliweb-icons/registry.ts";
import { createIconsCatalog } from "../ruliweb-icons/catalog.ts";
import { createIconsDesignSystem } from "../ruliweb-icons/design-system.ts";
import { createIconsLibrarySearch } from "../ruliweb-icons/library-search.ts";
import { createIconsLibraryReader } from "../ruliweb-icons/library-reader.ts";
import { createIconsUiPreferences } from "../ruliweb-icons/ui-preferences.ts";
import { createIconsPicker } from "../ruliweb-icons/picker.ts";
import { createIconsFeature } from "../ruliweb-icons/feature.ts";
import { createMetadataInterface } from "../icon-metadata/interface.ts";
import { createBundleCore } from "../bundle-generator/core.ts";
import { createBundleBridge } from "../bundle-generator/bridge.ts";
import { createBundleClient } from "../bundle-generator/client.ts";
import { createBundleSearch } from "../bundle-generator/search.ts";
import { createBundleSearchUi } from "../bundle-generator/search-ui.ts";
import { createBundleUi } from "../bundle-generator/ui.ts";
import { createBundleController } from "../bundle-generator/controller.ts";
import * as search from "../ruliweb-icons/core.ts";
import * as tags from "../icon-metadata/tag-codec.ts";
import { plan, Selection } from "../icon-metadata/tag-edit-model.ts";
import { createMetadata } from "../ruliweb-icons/metadata.ts";
import { createBrowserAdapter } from "../ruliweb-icons/browser-adapter.ts";
import { createSiteAdapter } from "../ruliweb-icons/site-adapter.ts";
import { createComposerAdapter } from "../ruliweb-icons/composer-adapter.ts";
import type { RuntimeEnvironment } from "./contracts.ts";
function createIconBase(environment?: RuntimeEnvironment | undefined) {
  const icons: DynamicApi = {
    ...search,
    ...createMetadata({ environment }),
    AttributeTags: Object.freeze({
      PREFIX: tags.PREFIX,
      FIXED: tags.FIXED,
      normalize: tags.normalize,
      decode: tags.decode,
      encode: tags.encode,
    }),
    BrowserAdapter: createBrowserAdapter(environment),
  };
  icons.SiteAdapter = createSiteAdapter({
    environment,
    metadata: icons.Metadata,
  });
  return icons;
}
/** @param {{ environment?: typeof globalThis, metrics?: ReturnType<typeof import("../performance/metrics.mjs").createPerformanceMetrics> | null }} options */
function createIconReader({
  environment = defaultEnvironment,
  metrics = null,
}: RuntimeOptions = {}) {
  const icons = createIconBase(environment);
  let part;
  part = createIconsRegistry();
  Object.assign(icons, part.icons);
  part = createIconsCatalog({
    environment,
    dependencies: {
      icons: {
        packRegistry: () => icons["packRegistry"],
        SiteAdapter: () => icons["SiteAdapter"],
        SearchIndex: () => icons["SearchIndex"],
        DesignSystem: () => icons["DesignSystem"],
        Catalog: () => icons["Catalog"],
        CatalogView: () => icons["CatalogView"],
        MediaBudget: () => icons["MediaBudget"],
        CatalogSources: () => icons["CatalogSources"],
      },
    },
  });
  Object.assign(icons, part.icons);
  part = createIconsDesignSystem({
    environment,
    dependencies: { icons: { DesignSystem: () => icons["DesignSystem"] } },
  });
  Object.assign(icons, part.icons);
  part = createIconsLibrarySearch({
    environment,
    metrics,
    dependencies: {
      icons: {
        normalize: () => icons["normalize"],
        CatalogSources: () => icons["CatalogSources"],
        queryTokens: () => icons["queryTokens"],
        LibrarySearchEngine: () => icons["LibrarySearchEngine"],
        libraryIconIdentity: () => icons["libraryIconIdentity"],
        libraryFixedTags: () => icons["libraryFixedTags"],
      },
    },
  });
  Object.assign(icons, part.icons);
  part = createIconsLibraryReader({
    environment,
    metrics,
    dependencies: {
      icons: {
        SiteAdapter: () => icons["SiteAdapter"],
        BrowserAdapter: () => icons["BrowserAdapter"],
        feature: () => icons["feature"],
        Metadata: () => icons["Metadata"],
        LibraryPackReader: () => icons["LibraryPackReader"],
      },
    },
  });
  Object.assign(icons, part.icons);
  part = createIconsUiPreferences({
    environment,
    dependencies: {
      icons: {
        createUiPreferences: () => icons["createUiPreferences"],
        UiPreferences: () => icons["UiPreferences"],
      },
    },
  });
  Object.assign(icons, part.icons);
  part = createIconsPicker({
    environment,
    dependencies: {
      icons: {
        isMouseDoubleClick: () => icons["isMouseDoubleClick"],
        iconTagLabels: () => icons["iconTagLabels"],
        Metadata: () => icons["Metadata"],
        createPicker: () => icons["createPicker"],
        SearchIndex: () => icons["SearchIndex"],
        FoldState: () => icons["FoldState"],
        DesignSystem: () => icons["DesignSystem"],
        CatalogView: () => icons["CatalogView"],
        UiPreferences: () => icons["UiPreferences"],
        MediaBudget: () => icons["MediaBudget"],
        ComposerAdapter: () => icons["ComposerAdapter"],
        libraryFixedTags: () => icons["libraryFixedTags"],
      },
    },
  });
  Object.assign(icons, part.icons);
  Object.assign(
    icons,
    createComposerAdapter({
      environment,
      site: icons.SiteAdapter,
      getDesignSystem: () => icons.DesignSystem,
    }),
  );
  part = createIconsFeature({
    environment,
    dependencies: {
      icons: {
        SiteAdapter: () => icons["SiteAdapter"],
        BrowserAdapter: () => icons["BrowserAdapter"],
        createPicker: () => icons["createPicker"],
        ComposerController: () => icons["ComposerController"],
        ComposerAdapter: () => icons["ComposerAdapter"],
        CatalogSources: () => icons["CatalogSources"],
        LibrarySearchEngine: () => icons["LibrarySearchEngine"],
        LibraryPackReader: () => icons["LibraryPackReader"],
        Metadata: () => icons["Metadata"],
        IconFeature: () => icons["IconFeature"],
        feature: () => icons["feature"],
      },
    },
  });
  Object.assign(icons, part.icons);
  return icons;
}
function createMetadataUi({
  environment = defaultEnvironment,
  initialIcons = {},
  initialMetadata = {},
}: RuntimeOptions = {}) {
  const icons: DynamicApi = { ...initialIcons },
    metadata: DynamicApi = { ...initialMetadata, ...tags, plan, Selection };
  let part;
  if (!icons.DesignSystem) {
    part = createIconsDesignSystem({
      environment,
      dependencies: { icons: { DesignSystem: () => icons["DesignSystem"] } },
    });
    Object.assign(icons, part.icons);
  }
  part = createMetadataInterface({
    environment,
    dependencies: {
      metadata: {
        Selection: () => metadata["Selection"],
        FIXED: () => metadata["FIXED"],
        normalize: () => metadata["normalize"],
        Panel: () => metadata["Panel"],
        Browser: () => metadata["Browser"],
        Client: () => metadata["Client"],
      },
      icons: { DesignSystem: () => icons["DesignSystem"] },
    },
  });
  Object.assign(metadata, part.metadata);
  return { icons, metadata };
}
function createBundleMain({
  environment = defaultEnvironment,
  initialIcons = {},
  initialBundle = {},
}: RuntimeOptions = {}) {
  const icons = { ...initialIcons },
    bundle = { ...initialBundle };
  let part;
  // 기존 인스턴스를 재사용해야 MetadataError의 클래스 식별성이 바뀌지 않는다.
  if (!icons.Metadata?.supportsUnboundV1) {
    Object.assign(icons, createMetadata({ environment }));
  }
  part = createBundleCore({
    environment,
    dependencies: {
      bundle: {},
      icons: {
        Metadata: () => icons["Metadata"],
        SiteAdapter: () => icons["SiteAdapter"],
      },
    },
  });
  Object.assign(bundle, part.bundle);
  part = createBundleBridge({
    environment,
    dependencies: {
      bundle: {
        fail: () => bundle["fail"],
        existing: () => bundle["existing"],
        validate: () => bundle["validate"],
        preserveUnknown: () => bundle["preserveUnknown"],
      },
      icons: { Metadata: () => icons["Metadata"] },
    },
  });
  return { icons, bundle };
}
function createBundleUiRuntime({
  environment = defaultEnvironment,
  initialIcons = {},
  initialBundle = {},
}: RuntimeOptions = {}) {
  const icons = { ...initialIcons },
    bundle = { ...initialBundle };
  let part;
  if (!icons.Metadata?.supportsUnboundV1) {
    Object.assign(icons, createMetadata({ environment }));
  }
  if (!icons.SearchIndex) {
    Object.assign(icons, search);
  }
  if (!icons.AttributeTags) {
    icons.AttributeTags = Object.freeze({
      PREFIX: tags.PREFIX,
      FIXED: tags.FIXED,
      normalize: tags.normalize,
      decode: tags.decode,
      encode: tags.encode,
    });
  }
  if (!icons.SiteAdapter) {
    icons.SiteAdapter = createSiteAdapter({
      environment,
      metadata: icons.Metadata,
    });
  }
  if (!icons.DesignSystem) {
    part = createIconsDesignSystem({
      environment,
      dependencies: { icons: { DesignSystem: () => icons["DesignSystem"] } },
    });
    Object.assign(icons, part.icons);
  }
  part = createBundleCore({
    environment,
    dependencies: {
      bundle: {},
      icons: {
        Metadata: () => icons["Metadata"],
        SiteAdapter: () => icons["SiteAdapter"],
      },
    },
  });
  Object.assign(bundle, part.bundle);
  part = createBundleClient({
    environment,
    dependencies: {
      bundle: { fail: () => bundle["fail"], Draft: () => bundle["Draft"] },
    },
  });
  Object.assign(bundle, part.bundle);
  part = createBundleSearch({
    environment,
    dependencies: {
      bundle: {
        fail: () => bundle["fail"],
        articleUrl: () => bundle["articleUrl"],
        clone: () => bundle["clone"],
      },
      icons: { Metadata: () => icons["Metadata"] },
    },
  });
  Object.assign(bundle, part.bundle);
  part = createBundleSearchUi({
    environment,
    dependencies: {
      bundle: {
        BoardSearch: () => bundle["BoardSearch"],
        SearchSelection: () => bundle["SearchSelection"],
        fail: () => bundle["fail"],
      },
    },
  });
  Object.assign(bundle, part.bundle);
  part = createBundleUi({
    environment,
    dependencies: {
      bundle: {
        Browser: () => bundle["Browser"],
        SourceReader: () => bundle["SourceReader"],
        Draft: () => bundle["Draft"],
        SearchPanel: () => bundle["SearchPanel"],
        articleUrl: () => bundle["articleUrl"],
        fail: () => bundle["fail"],
        encode: () => bundle["encode"],
        clone: () => bundle["clone"],
      },
      icons: {
        DesignSystem: () => icons["DesignSystem"],
        Metadata: () => icons["Metadata"],
      },
    },
  });
  Object.assign(bundle, part.bundle);
  part = createBundleController({
    environment,
    dependencies: {
      bundle: {
        Browser: () => bundle["Browser"],
        Client: () => bundle["Client"],
        Panel: () => bundle["Panel"],
      },
      icons: { DesignSystem: () => icons["DesignSystem"] },
    },
  });
  Object.assign(bundle, part.bundle);
  return { icons, bundle };
}
export {
  createBundleMain,
  createBundleUiRuntime,
  createIconReader,
  createMetadataUi,
};
