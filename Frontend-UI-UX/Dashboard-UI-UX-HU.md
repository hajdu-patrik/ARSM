# Dashboard UI/UX Tervezési Folyamat (HU)

![UI/UX](https://img.shields.io/badge/Fókusz-UI%2FUX_Tervezés-8B5CF6?style=flat)
![AI](https://img.shields.io/badge/Módszer-AI_Támogatott-7C3AED?style=flat)
![MCP](https://img.shields.io/badge/Integráció-MCP_Szerver-4C1D95?style=flat)
![Pencil](https://img.shields.io/badge/Eszköz-Pencil_Designer-A78BFA?style=flat)

Ez a dokumentum röviden összefoglalja, hogyan készült el az AutoService dashboard UI/UX terve AI támogatással, MCP vezérléssel és a Pencil design környezetben.

---

## Nyelv

- Magyar: ez a fájl
- Angol: [Dashboard-UI-UX-EN.md](https://github.com/hajdu-patrik/Onallo-laboratorium/blob/main/Frontend-UI-UX/Dashboard-UI-UX-EN.md)

---

## Rövid összefoglaló

A cél egy tiszta, jól használható dashboard kialakítása volt, amely frontend oldalon is könnyen implementálható. A tervezés fókusza a vizuális minőség mellett a következetes struktúra volt.

Az AI a tervezési iterációkat gyorsította, az MCP pedig pontos, node-szintű szerkesztést tett lehetővé. Ez rövid idő alatt több finomítási ciklust biztosított.

---

## Módszertan

### 1) Prompt alapú tervezés

Természetes nyelvű specifikáció alapján meghatározásra kerültek:

- milyen képernyők legyenek,
- hol legyenek az elemek,
- milyen színek és témák kellenek,
- milyen nyelvi verziók készüljenek.

### 2) MCP alapú vezérlés

Az MCP kapcsolta össze a tervezési utasításokat és a design fájlt. Ennek segítségével lehetővé vált:

- olvasni a jelenlegi állapotot,
- batch-ben módosítani,
- pontosan javítani egyes elemeket,
- ugyanazt a logikát több képernyőre átvinni.

### 3) Kivitelezés Pencilben

A Pencil környezetben történt az összes variáns felépítése és finomítása:

- Login,
- 404,
- Dashboard,
- Naptár nézet,
- EN/HU és Light/Dark variánsok.

---

## Zárás

Az AI + MCP + Pencil kombináció a projekt során gyors, pontos és konzisztens eredményt adott. A workflow különösen hatékony olyan helyzetekben, ahol designer érzék/tudás hiányában szeretnénk még is magas minőségű UI tervet előállítani.
