# ARSM - Appointment and Resource Scheduling Management

![.NET](https://img.shields.io/badge/Backend-.NET_10-512BD4?style=flat&logo=dotnet&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Aspire](https://img.shields.io/badge/Orchestration-.NET_Aspire-512BD4?style=flat&logo=dotnet&logoColor=white)

Az ARSM autószervizeknek készült ütemező és műhelykezelő alkalmazás: a szerelők és az adminok egy reszponzív
felületen kezelik az időpontokat, vállalják a munkákat, áraznak és árajánlatot küldenek.

English version: [README.md](README.md)

## Funkciók

- Időpont-felvétel, havi naptár és napi nézet, munka vállalása és kiosztása, élő frissítés (SSE)
- Ügyfelek és járművek javítási előzményekkel
- Alkatrész- és munkadíj-katalógus ÁFA-tudatos nettó és bruttó árral
- Árajánlat járművenként: alkatrész- és munkadíjtételek, Piszkozat -> Elküldve -> Elfogadva/Elutasítva, PDF, e-mail az ügyfélnek
- Cégeredmény évre és hónapra
- Szerelő és admin szerepkör, admin jelszó-visszaállítás, fiókzárolás, CSRF-védelem és kéréskorlátok

## Technológia

| Réteg | Technológiák |
| ----- | ------------ |
| Backend | .NET 10, ASP.NET Core, EF Core, ASP.NET Core Identity, JWT sütik, QuestPDF |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Adatok | PostgreSQL (helyben 18, élesben 17), S3-kompatibilis objektumtár (helyben RustFS, élesben Azure Blob) |
| Orkesztráció | .NET Aspire (`app/AutoService.AppHost`) |

## A repó felépítése

| Útvonal | Tartalom |
| ------- | -------- |
| `app/AutoService.ApiService` | API, doménmodell, EF Core, hitelesítés |
| `app/AutoService.WebUI` | React frontend és a Playwright E2E tesztjei |
| `app/AutoService.AppHost`, `app/AutoService.ServiceDefaults` | Aspire orkesztráció és közös szolgáltatás-alapbeállítások |
| `tests` | HTTP- (`tests/API`), SQL- (`tests/Database`), xUnit- (`tests/AutoService.UnitTests`) és szkripttesztek |
| `scripts` | `validate.py` kapu, `pre-push.py`, helyi tesztfuttató, `deploy-azure.py` |
| `deploy` | Az Azure éles csomag, a helyi tesztpéldány csomagja, a tokenkapu; leírások a `deploy/docs` mappában |

## Helyi futtatás

Előfeltételek: .NET 10 SDK, Node.js 24+, Python 3.11+, Docker Desktop.

1. Másold az `app/AutoService.ApiService/appsettings.Local.template.json` fájlt `appsettings.Local.json` néven (gitignore-olt),
   és töltsd ki: `JwtSettings.Secret`, `ConnectionStrings.AutoServiceDb`, `CompanyProfile.*` (az árajánlat fejlécének
   kezdőértéke), opcionálisan `Bootstrap.Admin.*` (az első admin üres adatbázison; más adatot az API nem tölt be).
2. Az objektumtár titkait egyszer kell beállítani az `app/AutoService.AppHost` mappában:
   `dotnet user-secrets set "Parameters:minio-user" "<felhasználó>"` és `"Parameters:minio-password" "<jelszó>"`.
3. Telepítés és indítás:

```bash
dotnet tool restore --tool-manifest dotnet-tools.json
cd app/AutoService.WebUI && npm install && cd ../..
cd app && dotnet run --project AutoService.AppHost
```

Az AppHost elindítja a PostgreSQL-t, a RustFS-t, az API-t és a Vite fejlesztői szervert a beinjektált `VITE_API_URL`-lel.

## Ellenőrzések és tesztek

| Mit | Parancs |
| --- | ------- |
| Gyors kapu a módosított fájlokon (típusellenőrzés, lint, build, méretkorlátok, árnyékmentesség) | `python scripts/validate.py` |
| Push előtti kapu, a CI-vel azonos lépések (telepítés egyszer: `git config core.hooksPath .githooks`) | `python scripts/pre-push.py` |
| Helyi tesztcsomagok futó AppHost ellen | `python scripts/run-local-test-suite.py [playwright\|http\|sql]` |
| Unit tesztek | `dotnet test` az `app/` mappában |

Minden push lefuttatja a push előtti kaput; a GitHub Actions megismétli (`.github/workflows/`), a nehéz jobokat csak
azokra az útvonalakra, amelyeket a változás érint. A tesztjelentések szűrt formában a `tests/.artifacts/` mappába kerülnek.

## Környezetek és kiadás

A helyi tesztpéldányt 2026-11-13-án erőforrás-takarékosságból eltávolítottuk; a csomagja a `deploy/local-test`
mappában marad, újbóli felállítását a `deploy/docs/deployment-local-test.md` írja le. Addig az alábbi 2. lépés a
pusszal véget ér.

| | `https://arsm.hu` (éles) |
| --- | --- |
| Hol fut | Azure Container Apps, PostgreSQL Flexible Server, Blob Storage |
| Frissítés | Kézzel, egy kiválasztott commitból |
| Adatok | Külön éles adatbázis |
| Hozzáférés | Tokenkapu oldalkonténerként (`ARSM_PROD_GATE_TOKEN`) |

Így jut ki egy változás:

1. **Fejlesztés és ellenőrzés.** Helyi ágon dolgozol, lefuttatod a `python scripts/validate.py`-t, beírod a
   `CHANGELOG.md` bejegyzést, majd a commit a `main`-re kerül. A távoli repóban csak a `main` létezik.
2. **Push = tesztkiadás.** A `git push origin main` előbb lefuttatja a push előtti kaput (validate, backend, frontend,
   E2E, HTTP- és SQL-tesztek eldobható konténereken). A push után a tesztcsomag ütemezett feladata
   (`deploy/local-test/deploy.py`, 5 percenként) észreveszi az új commitot, menti a tesztadatbázist, a commitból
   (`git archive`) megépíti az API- és a webes képet, újraindítja a két alkalmazáskonténert, és megvárja, hogy a `/` és
   az `/alive` válaszoljon. Az új migrációkat az API induláskor alkalmazza, így pár percen belül az új verzió fut a
   tesztpéldányon.
3. **Éles kiadás.** Ha minden rendben (a tesztpéldányon ellenőrizve, ha van felállítva), abból a klónból, amelyben az éles `.env` van (előtte
   `az login`): `python scripts/deploy-azure.py release --commit <sha>`. Megépíti és feltölti a commit szerint
   címkézett három képet, lefuttatja az `arsm-migrate` jobot (migrációk és az `arsm_app` szerepkör), és csak ennek
   sikere után állítja át az `arsm-api` és `arsm-web` alkalmazást új revízióra. Ha a migráció elbukik, a kiadás
   megáll, és a régi verzió szolgál tovább. Ellenőrzés: `curl -sS -o /dev/null -w "%{http_code}\n" https://arsm.hu/alive`
   (token nélkül a kapu 401-et ad), utána bejelentkezés és egy árajánlat-PDF letöltése.

A függőségeket kézzel, a `.claude/skills/dependency-upgrade/SKILL.md` szerint frissítjük, ugyanezen az úton.

Részletek: [deploy/docs/deployment-local-test.md](deploy/docs/deployment-local-test.md) (a tesztpéldány be- és
kikapcsolása, mentések) és [deploy/docs/deployment-azure.md](deploy/docs/deployment-azure.md) (a `.env` kulcsai, első
beállítás, riasztások, üzemeltetés).

## Konfiguráció és titkok

- Titok nem kerül gitbe: az API-beállítások az `appsettings.Local.json`-ban, a tesztértékek a `tests/.env`-ben és a
  `.secrets`-ben, a telepítési és MCP-értékek a gyökér `.env`-ben vannak; mindegyikhez van követett sablon
  (`*.template.json`, `*.example`).
- Élesben kötelező a valódi `AllowedHosts` és `Cors:AllowedOrigins`, a HTTPS és a `Deployment:RateLimiterTopology=SingleInstance`
  (a kéréskorlátok, a kitiltások és a munkamenet-határidők folyamaton belüliek).
- Az AI SQL-eszközei a csak olvasó `ai_agent_test_user` felhasználót használják (csak `SELECT`).

## MI-támogatott fejlesztés

A repót Claude Code-dal fejlesztjük. A szabályok a `CLAUDE.md` és a területi `CLAUDE.md` fájlokban vannak; a nagyobb
feladatok az `arsm-chain` munkafolyamaton (`.claude/workflows/arsm-chain.js`) futnak: egy orchestrator munkacsomagokra
bontja a feladatot, az ágensek párhuzamosan implementálják és átnézik őket a trirouter által választott modelleken,
majd lefut a `validate.py` kapu és a diffhez illő tesztek.

## Licenc

A repó nem MIT-licences. Lásd [LICENSE.md](LICENSE.md): egyedi szerzői jogi nyilatkozat és akadémiai felhasználási szabályzat.
