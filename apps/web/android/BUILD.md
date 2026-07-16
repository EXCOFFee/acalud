# Build de la APK firmada (5.3 §3)

Proceso 100 % local, $0, sin store. Requisitos: **JDK 17** y el **Android SDK**
(`platform-tools`, `build-tools;34`, `platforms;android-34`).

## 1. Keystore (una sola vez — es un secreto, NO va al repo)

```bash
keytool -genkeypair -v -keystore acalud-release.keystore \
  -alias acalud -keyalg RSA -keysize 2048 -validity 10000
```

Crear `apps/web/android/keystore.properties` (gitignoreado):

```properties
storeFile=/ruta/absoluta/acalud-release.keystore
storePassword=********
keyAlias=acalud
keyPassword=********
```

## 2. Build

Desde la raíz del repo (con `JAVA_HOME` apuntando al JDK 17 y `ANDROID_HOME` al SDK):

```bash
# 2.1 · bundle web apuntando a la API de producción (la APK usa Bearer, ADR-004)
NEXT_PUBLIC_API_BASE=https://acalud-api.onrender.com pnpm --filter @acalud/web build

# 2.2 · copiar el bundle al proyecto Android
pnpm --filter @acalud/web exec cap sync android

# 2.3 · APK de release firmada
cd apps/web/android && ./gradlew assembleRelease
```

APK: `apps/web/android/app/build/outputs/apk/release/app-release.apk`

## 3. Hash SHA-256 (publicar junto a la APK en el GitHub Release)

```bash
sha256sum app/build/outputs/apk/release/app-release.apk
# Windows PowerShell:  Get-FileHash app-release.apk -Algorithm SHA256
```

## 4. Verificación (manual, en dispositivo — checklist NFR-X1/X2)

Sideload en un Android (orígenes desconocidos, R-07) y recorrer el flujo:
**registro → verificar email → login → catálogo → agregar al carrito → checkout → pago
(demo) → pedido pagado**. El transporte Bearer ya está probado a nivel API (sesión dual
ADR-004); esta verificación confirma la paridad web/APK del mismo bundle.
