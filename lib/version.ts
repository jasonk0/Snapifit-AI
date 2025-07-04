// 版本管理工具
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";
export const BUILD_TIME =
  process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();

// 检查是否有新版本
export function checkForUpdates(): boolean {
  if (typeof window === "undefined") return false;

  const storedVersion = localStorage.getItem("app_version");
  const storedBuildTime = localStorage.getItem("app_build_time");
  const dismissedVersion = localStorage.getItem("dismissed_version");
  const refreshedVersion = localStorage.getItem("refreshed_version");

  // 如果用户已经刷新过这个版本，不再显示提示
  if (refreshedVersion === `${APP_VERSION}-${BUILD_TIME}`) {
    return false;
  }

  // 如果用户已经忽略了这个版本，不再显示提示
  if (dismissedVersion === `${APP_VERSION}-${BUILD_TIME}`) {
    return false;
  }

  // 检查版本是否有变化
  const hasVersionChange = storedVersion && storedVersion !== APP_VERSION;
  // const hasBuildTimeChange = !storedBuildTime || storedBuildTime !== BUILD_TIME;

  if (hasVersionChange) {
    // 更新存储的版本信息
    localStorage.setItem("app_version", APP_VERSION);
    localStorage.setItem("app_build_time", BUILD_TIME);
    return true;
  }

  return false;
}

// 标记用户已忽略此版本的更新提示
export function dismissUpdate(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("dismissed_version", `${APP_VERSION}-${BUILD_TIME}`);
}

// 强制刷新应用
export function forceRefresh(): void {
  if (typeof window === "undefined") return;

  // 清除所有缓存
  if ("caches" in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name);
      });
    });
  }

  localStorage.clear();

  // 标记用户已刷新此版本
  localStorage.setItem("refreshed_version", `${APP_VERSION}-${BUILD_TIME}`);
  // 强制刷新页面
  window.location.reload();
}

// 获取版本信息
export function getVersionInfo() {
  return {
    version: APP_VERSION,
    buildTime: BUILD_TIME,
    userAgent:
      typeof window !== "undefined" ? window.navigator.userAgent : "Unknown",
  };
}

// 清除所有版本跟踪信息（用于测试或重置）
export function clearVersionTracking(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("app_version");
  localStorage.removeItem("app_build_time");
  localStorage.removeItem("dismissed_version");
  localStorage.removeItem("refreshed_version");
}

// 获取当前版本跟踪状态（用于调试）
export function getVersionTrackingStatus() {
  if (typeof window === "undefined") return null;

  return {
    storedVersion: localStorage.getItem("app_version"),
    storedBuildTime: localStorage.getItem("app_build_time"),
    dismissedVersion: localStorage.getItem("dismissed_version"),
    refreshedVersion: localStorage.getItem("refreshed_version"),
    currentVersion: APP_VERSION,
    currentBuildTime: BUILD_TIME,
  };
}
