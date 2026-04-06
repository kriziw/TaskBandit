plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val repositoryVersionFile = rootProject.file("../../version.txt")
val resolvedReleaseVersion =
    System.getenv("TASKBANDIT_RELEASE_VERSION")
        ?.takeIf { it.isNotBlank() }
        ?: repositoryVersionFile.takeIf { it.exists() }?.readText()?.trim()
        ?: "0.0.0-dev"
val resolvedBuildNumber =
    System.getenv("TASKBANDIT_BUILD_NUMBER")
        ?.toIntOrNull()
        ?.takeIf { it > 0 }
        ?: 1
val resolvedCommitSha = System.getenv("TASKBANDIT_COMMIT_SHA")?.takeIf { it.isNotBlank() } ?: "local"
val releaseKeystorePath = System.getenv("TASKBANDIT_ANDROID_KEYSTORE_PATH")
val releaseKeystorePassword = System.getenv("TASKBANDIT_ANDROID_KEYSTORE_PASSWORD")
val releaseKeyAlias = System.getenv("TASKBANDIT_ANDROID_KEY_ALIAS")
val releaseKeyPassword = System.getenv("TASKBANDIT_ANDROID_KEY_PASSWORD")
val hasReleaseSigning =
    !releaseKeystorePath.isNullOrBlank() &&
        !releaseKeystorePassword.isNullOrBlank() &&
        !releaseKeyAlias.isNullOrBlank() &&
        !releaseKeyPassword.isNullOrBlank()

android {
    namespace = "com.taskbandit.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.taskbandit.app"
        minSdk = 26
        targetSdk = 34
        versionCode = resolvedBuildNumber
        versionName = resolvedReleaseVersion
        buildConfigField("String", "TASKBANDIT_RELEASE_VERSION", "\"$resolvedReleaseVersion\"")
        buildConfigField("String", "TASKBANDIT_BUILD_NUMBER", "\"$resolvedBuildNumber\"")
        buildConfigField("String", "TASKBANDIT_COMMIT_SHA", "\"$resolvedCommitSha\"")
        buildConfigField(
            "String",
            "TASKBANDIT_FIREBASE_APP_ID",
            "\"${System.getenv("TASKBANDIT_FIREBASE_APP_ID") ?: ""}\""
        )
        buildConfigField(
            "String",
            "TASKBANDIT_FIREBASE_API_KEY",
            "\"${System.getenv("TASKBANDIT_FIREBASE_API_KEY") ?: ""}\""
        )
        buildConfigField(
            "String",
            "TASKBANDIT_FIREBASE_PROJECT_ID",
            "\"${System.getenv("TASKBANDIT_FIREBASE_PROJECT_ID") ?: ""}\""
        )
        buildConfigField(
            "String",
            "TASKBANDIT_FIREBASE_SENDER_ID",
            "\"${System.getenv("TASKBANDIT_FIREBASE_SENDER_ID") ?: ""}\""
        )

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    if (hasReleaseSigning) {
        signingConfigs {
            create("release") {
                storeFile = file(requireNotNull(releaseKeystorePath))
                storePassword = releaseKeystorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.15"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.09.02")

    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.6")
    implementation("androidx.core:core:1.13.1")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("com.google.android.material:material:1.12.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:okhttp-sse:4.12.0")
    implementation("com.google.firebase:firebase-messaging-ktx:24.0.3")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
