# Dungeon & Copilot

Dungeon & Copilot is a gamified workshop designed to let users experience Copilot's features in an easy and fun way. Initially, it was planned as an offline hands-on workshop, but as the version evolved, it has developed into a web-based online campaign that users can enjoy on their own.

The development of this project follows several principles:

- It should be designed so users can enjoy it easily and have fun.
- It must be adaptable to specific customer events with minimal modifications.
- It should be built as a static HTML-based website without complex server modules.
- Although the content is currently planned in Korean, it should be easily portable to other languages.

## Getting Started (Start Here)

Open the latest workshop directly in your browser — no installation required:

**▶ https://microsoft.github.io/DungeonCopilot/dnc2026_k/**

1. Open the link above. The workshop starts at Stage 0 and unlocks the next stage each time you press **다음 → (Next)**.
2. On the data stage, pick your region — **서울시 / 거제시 / 인천시**. The download file and sample prompts change to match the region you choose.
3. To jump straight into a specific region, use one of the direct links below.
4. To reset your progress and start over from Stage 0, add `?reset=true` to the URL (e.g. `…/dnc2026_k/?reset=true`).

| Start option | URL |
| --- | --- |
| Workshop home (default: 서울시) | https://microsoft.github.io/DungeonCopilot/dnc2026_k/ |
| 서울시 데이터로 바로 시작 | https://microsoft.github.io/DungeonCopilot/dnc2026_k/?dataset=seoul |
| 거제시 데이터로 바로 시작 | https://microsoft.github.io/DungeonCopilot/dnc2026_k/?dataset=geoje |
| 인천시 데이터로 바로 시작 | https://microsoft.github.io/DungeonCopilot/dnc2026_k/?dataset=incheon |

For customer environments where external URLs are blocked, use the [offline package](#offline-package-for-network-restricted-environments) instead.

## June 2026 Update

A new Korean workshop version, `dnc2026_k`, was added in June 2026. This version is a Microsoft 365 Copilot hands-on game where participants design a restaurant using Copilot Chat, Excel, Word, and PowerPoint scenarios.

This version was used for a Hanwha Ocean session on June 9, 2026.

The 2026 Korean version includes a dataset selector so facilitators can run the same workshop with Seoul commercial district data, Geoje City public data, or Incheon public data. You can also open a specific dataset directly by adding a query string to the URL: `?dataset=seoul`, `?dataset=geoje`, or `?dataset=incheon`.

## New Version (Working)

| Folder | Description | Language | URL |
| --- | --- | --- | --- |
| dnc5_k | New game for M365 Copilot Chat | Korean | https://microsoft.github.io/DungeonCopilot/dnc5_k/ |
| dnc6_k | New game for M365 Copilot | Korean | https://microsoft.github.io/DungeonCopilot/dnc6_k/ |
| dnc2026_k | Latest Korean restaurant workshop with Seoul/Geoje/Incheon dataset selection | Korean | https://microsoft.github.io/DungeonCopilot/dnc2026_k/ |

### Direct dataset links

| Dataset | URL |
| --- | --- |
| Seoul | https://microsoft.github.io/DungeonCopilot/dnc2026_k/?dataset=seoul |
| Geoje | https://microsoft.github.io/DungeonCopilot/dnc2026_k/?dataset=geoje |
| Incheon | https://microsoft.github.io/DungeonCopilot/dnc2026_k/?dataset=incheon |

## Offline Package for Network-Restricted Environments

Use the offline package when a customer environment blocks external URLs, including GitHub Pages or other external download links. Download the package below and deliver the ZIP file directly to the customer.

| Package | Use case | File |
| --- | --- | --- |
| dnc2026_k offline package | Network-restricted customer environments where external URLs are blocked | [offline_packages/dnc2026_k_offline_package.zip](offline_packages/dnc2026_k_offline_package.zip) |

---

If you'd like to contribute to this project, feel free to reach out anytime at jechoi@microsoft.com or suminlee@microsoft.com.
