/**
 * Expo SDK 54 (Kotlin 2.1) 向けに play-services-ads を 24.5.0 に固定する。
 * 25.x は Kotlin 2.3 metadata のため compileDebugKotlin が失敗する。
 * （react-native-google-mobile-ads の AgeRestrictedTreatment 参照は patch-package で除去）
 */
const { withProjectBuildGradle } = require('expo/config-plugins');

const FORCE_SNIPPET = `force 'com.google.android.gms:play-services-ads:24.5.0'`;

const FORCE_BLOCK = `
  // Expo SDK 54 (Kotlin 2.1) は play-services-ads 25.x (Kotlin 2.3 metadata) と非互換
  configurations.all {
    resolutionStrategy {
      force 'com.google.android.gms:play-services-ads:24.5.0'
    }
  }
`;

function withPlayServicesAdsPin(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }

    let contents = config.modResults.contents;
    if (contents.includes(FORCE_SNIPPET)) {
      return config;
    }

    if (!contents.includes('allprojects {')) {
      contents += `\nallprojects {\n${FORCE_BLOCK}\n}\n`;
    } else {
      contents = contents.replace(
        /allprojects \{/,
        `allprojects {\n${FORCE_BLOCK}`,
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withPlayServicesAdsPin;
