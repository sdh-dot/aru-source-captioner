import type { UserManifest } from "wxt"

export const manifest:UserManifest = {
  name: "Aru Source Captioner",
  version: "0.1.2",
  description:
    "루리웹 글쓰기 페이지에서 이미지 메타데이터의 출처 URL을 읽어 자동으로 출처 캡션을 삽입합니다.",
  permissions: ["storage", "downloads", "nativeMessaging", "contextMenus"],
  host_permissions: [
    "https://bbs.ruliweb.com/community/board/300143/*",
    "https://bbs.ruliweb.com/community/board/*/read/*",
    "https://i1.ruliweb.com/*",
    "https://i2.ruliweb.com/*",
    "https://i3.ruliweb.com/*",
    "https://bbs.ruliweb.com/community/board/*/write*",
    "https://bbs.ruliweb.com/community/board/*/modify*",
  ],
  icons: {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
  action: {
    default_title: "Aru Source Captioner",
    default_icon: {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
  },
  web_accessible_resources: [
    {
      resources: [
        "assets/fonts/PretendardVariable.woff2",
        "assets/icons/aru-main-64.png",
        "assets/icons/editor-select-20.png",
        "assets/icons/editor-bundle-20.png",
        "assets/icons/editor-tags-20.png",
        "assets/icons/modal-select-256.png",
        "assets/icons/modal-bundle-256.png",
        "assets/icons/modal-tags-256.png",
      ],
      matches: ["https://bbs.ruliweb.com/*"],
    },
  ],
}