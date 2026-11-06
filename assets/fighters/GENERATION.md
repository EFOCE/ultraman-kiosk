# 全身素材生成记录

2026-11-07；使用内置 image_gen（未使用 CLI/API key）。16 张透明 PNG 均复制到本目录，旧附件保留。每个角色独立生成，没有用联络表充当素材。

运行时依照 fighter-art.mjs 中的 alpha 有效边界统一缩放、落脚，保留原始像素文件。模型生成属于参考原作的风格化重绘，非官方模型。附件角色保留面容、年龄特征和装甲。

## 官方角色提示词

每张使用下列模板，其中 DESC 逐项替换为表后列出的角色描述：

```text
Single full-body game sprite, DESC Premium finely detailed tokusatsu 3D game art with polished brushed metal, crisp suit seams and physically coherent highlights. Faithful identifiable canonical costume, no human face. Natural athletic 7-head adult proportions, same consistent proportions across roster, not chibi. Upright combat-ready three-quarter stance facing screen RIGHT. Entire head, hands, both legs and both boots visible, planted at same level. Character height occupies 90% of a portrait frame with 5% margin. Isolated character on TRUE TRANSPARENT alpha background. NO background gradient, NO studio, NO glow cloud, NO ground, NO vignette, NO text, NO watermark, NO other figures.
```

- ruebe.png: Ultraman Ruebe / R/B fusion: canonical black under-suit, ornate silver armor and warm gold breast/shoulder plates, red and blue accent lines, circular blue chest timer, two large angular head crests, luminous pale eyes.
- seven.png: Ultraseven: classic red suit, silver studded segmented shoulder yoke, silver armored helmet with a single removable center Eye Slugger and green forehead beam lamp, pale yellow almond eyes. No blue circular chest timer.
- zero.png: Ultraman Zero: canonical red lower suit and blue upper torso panels, silver segmented shoulder armor, TWO removable head sluggers, small green forehead gem, blue chest timer, sharp yellow eyes.
- geed.png: Ultraman Geed Primitive: black under-suit with red and silver streamlined bands, distinctive enormous slanted blue-white eyes, silver central head crest and crescent chest timer.
- mebius.png: Ultraman Mebius: red and silver suit with distinctive intersecting silver chest bands, central blue timer, swept silver central helmet crest, oval pale gold eyes, Mebius Brace on left forearm.
- nexus.png: Ultraman Nexus Junis red form: canonical maroon red and silver suit, angular layered silver chest armor and blue oval chest core, long streamlined silver helmet with dark facial slots and pale luminous eyes, silver forearm blades.
- tregear.png: Ultraman Tregear: canonical blue-black-silver suit, black eye mask with bright yellow narrow eyes, silver-blue pointed head horns, sealed dark chest with crossed gold harness, clawlike dark hands.
- noa.png: Ultraman Noa: canonical metallic silver sculpted suit, red curved chest marking with blue oval center, tall single silver head crest, pale eyes, two long swept rigid silver Noa Aegis wings rising behind shoulders. Wings wholly within image.
- taro.png: Ultraman Taro: canonical red suit and silver torso and shoulders, rows of metal studs across the silver shoulder yoke, blue chest timer, silver head with pair of characteristic large side horns and central crest, yellow eyes.

## 自创角色提示词

对 xingxing、zhuqingqing、jiangshuyan、choumo、shumo 分别引用 assets/portraits/ID.png，transparent_background=true：

```text
Edit target: provided ID portrait. Complete this SAME person and SAME armor into a head-to-toe full-body transparent PNG game sprite. Preserve the face, hairstyle, apparent age, helmet design, and armor colors from the reference. Reconstruct BOTH LEGS and BOTH BOOTS completely. All body parts inside the frame with 5% clear margin. Upright ready stance, three-quarter facing screen RIGHT, hands apart from torso. Natural age-appropriate proportions, premium detailed tokusatsu 3D character art with crisp polished armor and controlled highlights. Figure fills 90% height. ISOLATED CUTOUT: background must be fully transparent alpha, with absolutely NO black background, NO gradient, NO studio background, NO floor, NO vignette, NO shadow outside figure, NO floating glow cloud. No text or frame. Single figure only.
```

Boss 引用 assets/portraits/boss.png：

```text
Edit target: provided Boss portrait. Create ONE full-body game character sprite of this same person in this exact armor, preserve his recognizable face, glasses, hairstyle, silver-blue-red armor and cyan chest light. Reconstruct complete legs, armored boots and both hands. Premium detailed tokusatsu 3D game art, crisp metal panel edges, studio lighting, coherent anatomy. Upright three-quarter battle-ready stance facing screen right, arms slightly separated, both feet fully visible planted at same ground level. Entire helmet to boots inside frame with 5% margin, figure occupies 90% image height. Transparent background with true alpha, no text, no floor, no border, no extra people, no giant energy cloud. Body proportions natural and consistent for a playable adult hero, not chibi. Image is a single standalone character.
```

贝利亚补生成：

```text
Single full-body standalone game character sprite of Ultraman Belial, original evil form: faithful black suit with crimson clawlike curved markings, slightly hunched ready posture, elongated sharply upturned amber eyes, black fin-shaped helmet crest, clawed hands and complete feet. No human face. Premium finely detailed polished tokusatsu 3D art, crisp metal and suit textures. Natural 7-head adult proportions matching other Ultraman game fighters. Three-quarter facing screen RIGHT. Entire head, both hands, legs and boots visible inside portrait frame, figure 90% height. Genuine transparent alpha background, no studio background, no gradient, no ground, no vignette, no text. Empty hands. No extra figure.
```

## 输出对应

- boss.png ← exec-08c4bc81-5998-4f20-9e7b-ed14eee899f5.png
- xingxing.png ← exec-d5bd42d8-06e7-4843-877d-42bffb39f14c.png
- zhuqingqing.png ← exec-c690dab6-e8f5-4b8c-a035-5bdcfa76ac71.png
- jiangshuyan.png ← exec-97749d75-3eab-4667-b589-69a6a19720c6.png
- choumo.png ← exec-75440f04-32b8-4058-b833-122bb0925f3f.png
- shumo.png ← exec-3f1ee64e-a4e4-40b8-b2ec-7dac2ed8065f.png
- ruebe.png ← exec-dac5aba5-65d2-43ed-ad7e-a6a545d35868.png
- seven.png ← exec-42b7aaea-bd0f-4973-9468-2e9e548c9a6f.png
- zero.png ← exec-18f2a671-b754-451e-9a8e-3485a208a9dd.png
- geed.png ← exec-bf9b4c43-7a79-40f1-bb0c-50663cd2189b.png
- mebius.png ← exec-c991b931-2921-4ce5-830a-913d6dad466c.png
- nexus.png ← exec-8fd6a75b-32bb-4bcf-ab7c-24bf898d558f.png
- tregear.png ← exec-eccd2048-fe78-48fa-bf47-a2891c139482.png
- noa.png ← exec-28ded720-255b-4388-87dd-96b03d408e1d.png
- taro.png ← exec-9dc700d8-261a-4fa2-b2f9-1c3d9eb83726.png
- belial.png ← exec-cc649fc8-9779-433b-af4c-79742fbeaa8a.png
