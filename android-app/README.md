# Android APK

Нативная Android-обёртка для приложения «Цена под контролем». Она открывает локальный сервер на ноутбуке по адресу `http://192.168.0.152:8787`; телефон и ноутбук должны быть в одной Wi-Fi сети, а сервер должен быть запущен.

## Облачная сборка без Android Studio

1. Создайте пустой репозиторий на GitHub.
2. Загрузите содержимое этой папки в корень репозитория, включая `.github/workflows/build-apk.yml`.
3. На GitHub откройте **Actions → Build Android APK → Run workflow**.
4. После успешной сборки скачайте артефакт `price-watch-debug-apk`; внутри будет `app-debug.apk`.

GitHub Actions скачает JDK, Android SDK и Gradle на временный облачный компьютер, а готовый APK не требует Android Studio на телефоне.

После установки Android Studio локальная альтернатива: откройте эту папку как проект и выберите **Build → Build APK(s)**. Отладочный установщик появится в `app/build/outputs/apk/debug/app-debug.apk`.

Если IP ноутбука изменится, обновите константу `SERVER_URL` в `app/src/main/java/ru/pricewatch/app/MainActivity.java` и пересоберите APK.
