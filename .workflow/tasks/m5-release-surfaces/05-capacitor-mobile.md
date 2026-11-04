# 05: Certify Capacitor mobile on physical devices

**Effort:** m5-release-surfaces
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Signed Android and iOS release artifacts, installed on named physical devices, that pair with a Host, run a canonical chat, reconnect after a network drop, recover an approval or question, route a push-click to the right session, and queue a message sent offline. Mobile stays in the supported matrix, but no release row passes until this device evidence exists.

**Blocked by:** 01
**Files:** `.github/workflows/mobile-release.yml`; `.github/workflows/mobile-ci.yml`; `packages/mobile/scripts/` (`with-mobile-env.mjs`, `android-device.mjs`, `ios-sim.mjs`); `packages/mobile/android/`; `packages/mobile/ios/`; shared mobile UI/reconnect code under `packages/ui/src/`; Host push/pairing routes under `packages/web/server/`; `packages/mobile/README.md`; mobile product docs.

**Read first:** `.workflow/specs/m5-release-surfaces.md` matrix, R6 and "Mobile"; `decisions.md: 2026-10-24 - Keep Capacitor mobile in the M5 release matrix`; `packages/mobile/HANDOFF.md` (device quirks, push architecture, CI gap); archived task 24's docs labels; `.workflow/omp-migration/scope.md` `SCOPE-2.4`.
**Covers:** R6

**Check:** First update `.github/workflows/mobile-release.yml`: pin Bun 1.4.2 with `oven-sh/setup-bun`, install or verify Android SDK platform 35 and build-tools 35.0.0 in the Android job, record `sdkmanager --list_installed`, and assert `xcodebuild -version` reports Xcode 26.x in the iOS job. Then dispatch it to build the signed Android APK/AAB on `blacksmith-4vcpu-ubuntu-2404` with Temurin JDK 21, and the signed iOS IPA on `blacksmith-6vcpu-macos-26` with Xcode 26. Install the APK on a physical Pixel 8 running Android 15/API 35 arm64-v8a through `adb` from the same machine; install the IPA through TestFlight on a physical iPhone running iOS 26. For each device: pair with a Host, send a canonical prompt and see the streamed reply, toggle the network off and back on, send while offline and observe the queued message deliver after reconnect, resolve an approval and a question after reconnect, and tap a push notification and land in its session. Record `adb shell getprop ro.build.version.sdk`, the iPhone model/iOS build, TestFlight build number, Host commit and every result. Emulator or simulator output is a stand-in and does not close the row; without the two devices the task is blocked with the exact device request, not passed.

**Done when**

- [ ] `.github/workflows/mobile-release.yml` pins Bun 1.4.2, installs or verifies Android SDK platform 35 and build-tools 35.0.0, and asserts Xcode 26.x before building; the installed versions are in the receipt.
- [ ] The signed artifacts use the bundle identifiers, versions and provisioning profiles in `HANDOFF.md`, and the release workflow pins the named toolchains.
- [ ] The Android build installs and runs on the physical Pixel 8 (Android 15/API 35, arm64-v8a), and the iOS build installs through TestFlight on the physical iPhone (iOS 26; exact model and OS build recorded).
- [ ] Each device completes pairing, canonical chat, reconnect, offline queue, approval/question recovery and push-click routing against the same Host commit.
- [ ] No simulator, emulator or hosted-mobile result is reported as a device result; an unavailable device is recorded as `not run` and the release row stays blocked.
- [ ] The mobile matrix row and docs say certified only after both devices pass; otherwise they say which device evidence is missing.
- [ ] The receipt names the exact devices, OS builds, toolchains, artifact hashes and every not-run or stand-in result.
