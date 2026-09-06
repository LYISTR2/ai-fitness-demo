# 健身计划 Android 版

当前版本 1.1.0。升级与新增功能详见 UPDATE-1.1.md。

本版本基于 https://github.com/LYISTR2/ai-fitness-demo 制作。保留原项目的建档、器械库、规则生成计划、训练执行、替代动作、记录和统计。Android 原生容器通过 AndroidX WebViewAssetLoader 加载 APK 内置页面，无服务器依赖、无联网权限，不需要 API Key。计划由本地规则生成，不是大模型对话服务。

## 使用

安装测试 APK 后，阅读首次使用提示，填写档案，选择器械，在「计划」中生成一周计划，然后开始训练。最低 Android 8.0。数据存储于应用专用 WebView 本地存储，关闭重开可继续；卸载或清除应用数据会删除记录。网页版本的数据不会自动迁移到 App。

## 安卓适配

- 原创矢量哑铃图标、手机触控尺寸和输入字号、深浅主题。
- 状态栏与系统导航区域避让、键盘调整、返回首页与退出确认。
- 使用期间保持屏幕亮起，切到后台后不再保持亮屏。
- 休息计时按实际经过时间计算；暂停期间不累计。后台不提供系统通知或可靠提示音；回到前台后校正剩余时间。系统杀进程后保留已记录训练组，休息倒计时不恢复。
- 禁止页面访问本地文件和外部网络，不申请相机、定位、联系人或存储权限。

## 构建

安装 JDK 17、Android SDK Platform 35 / Build Tools 35.0.0，配置 JAVA_HOME 和 ANDROID_HOME。Android Studio 可以打开 android 文件夹。

Windows：在 android 目录执行 `gradlew.bat assembleDebug`。

macOS / Linux：在 android 目录执行 `sh gradlew assembleDebug`。

安装包位于 android/app/build/outputs/apk/debug/app-debug.apk。源页面会在构建时自动同步到 assets。也可以使用 Gradle 8.11.1 执行 `gradle -p android assembleDebug`。GitHub Actions 工作流支持手动生成测试 APK。

当前交付使用调试签名，供侧载体验；上架前需使用开发者自己的正式签名并进行真机测试。

## 验证与素材

已执行原项目计划引擎测试和统计测试，以及手机浏览器中的建档、生成计划、逐组记录、暂停/继续、经过时间校正、重开恢复和 360/393/430 像素宽度检查。预览图来自手机尺寸浏览器；首页示例图展示的是明确标注的模拟数据，不是真实训练历史。没有连接安卓设备，不声称已完成真机验证。

界面 SVG 图标来自原项目；新增启动图标为本次编写的矢量图形，无第三方照片和外部素材链接。AndroidX WebKit 遵循 Apache-2.0，其余依赖保留各自许可。原项目未提供 LICENSE，本交付保留来源信息，不额外授予原项目代码许可。
