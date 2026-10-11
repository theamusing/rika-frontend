# Rika AI — AI Pixel Art Animation Generator

[Rika AI](https://rika-ai.com/en/) is a browser-based AI toolkit for creating pixel art assets and turning static pixel art into animated sprite sheets. It is designed for game developers, pixel artists, and creators who need character sprites, items, maps, or frame-by-frame animation assets.

## What Rika AI can create

- **Pixel art animations:** upload a pixel-art character or object, describe an action, and export the result as a PNG sprite sheet or GIF.
- **Complex sprite actions:** Animation V2 supports custom, multi-stage movements with 16, 20, 24, or 32 output frames.
- **Pixel art characters and items:** generate reusable game assets from text and optional image references.
- **Pixel art maps:** create environments from a structure reference and an optional style reference.
- **Sprite editing:** preview frames, adjust playback speed, reorder or exclude frames, edit pixels, remove backgrounds, and export the final asset.
- **Generation API:** integrate Rika AI image and animation workflows into game tools and production pipelines.

Rika AI accepts animation source images at logical pixel resolutions of 32×32, 64×64, 128×128, and 256×256. An animation can use a start image, start and end images, or start, middle, and end references.

## Official links

- [Rika AI in English](https://rika-ai.com/en/)
- [Rika AI 中文站](https://rika-ai.com/zh/)
- [Pixel art animation generator](https://rika-ai.com/en/pixel-art-animation-generator/)
- [Sprite sheet generator](https://rika-ai.com/en/sprite-sheet-generator/)
- [Documentation](https://rika-ai.com/en/docs/)
- [API documentation](https://rika-ai.com/en/api/)
- [How to animate pixel art](https://rika-ai.com/en/guides/how-to-animate-pixel-art/)
- [Pixel art animation prompt guide](https://rika-ai.com/en/guides/pixel-art-animation-prompts/)

## Animation workflow

1. Upload or generate a pixel-art source image.
2. Select the logical pixel size and output frame count.
3. Describe the movement, including the action order when the motion has several stages.
4. Generate and review the result in Player.
5. Clean up individual frames if needed, then export a sprite sheet or GIF.

See the [Rika AI documentation](https://rika-ai.com/en/docs/) for current controls, pricing, output behavior, and commercial-use guidance.

## 中文简介

[Rika AI](https://rika-ai.com/zh/) 是面向游戏开发者和像素画创作者的 AI 像素画工具。它可以生成像素角色、道具和地图，也可以将上传的静态像素图转换成多帧动画，并导出 PNG 序列帧或 GIF。动画 V2 支持复杂、多阶段动作，以及 16、20、24、32 帧输出。

详细使用方法请参阅[中文文档](https://rika-ai.com/zh/docs/)与[像素动画制作指南](https://rika-ai.com/zh/guides/how-to-animate-pixel-art/)。

## Development

```bash
npm install
npm run dev
```

Production verification:

```bash
npm run lint
npm run build
```

The production build generates localized static routes, structured data, `sitemap.xml`, `sitemap.txt`, `robots.txt`, and AI-readable product summaries.
