package com.lyistr2.lianlian;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.graphics.Color;
import android.view.WindowManager;
import android.webkit.*;
import android.widget.FrameLayout;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;

public class MainActivity extends Activity {
    private WebView web;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(9,9,11));
        getWindow().setNavigationBarColor(Color.rgb(9,9,11));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(9,9,11));
        FrameLayout frame = new FrameLayout(this);
        frame.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(frame);
        frame.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse local = loader.shouldInterceptRequest(request.getUrl());
                return local != null ? local : new WebResourceResponse("text/plain", "UTF-8", 404,
                    "Not Found", null, new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !"appassets.androidplatform.net".equals(request.getUrl().getHost())
                    || !"https".equals(request.getUrl().getScheme());
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message)
                    .setPositiveButton("确定", (d,w) -> result.confirm())
                    .setNegativeButton("取消", (d,w) -> result.cancel())
                    .setOnCancelListener(d -> result.cancel()).show();
                return true;
            }
        });
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("(function(){if(document.querySelector('.rest-overlay') || location.hash==='#/train'){return 'training';}if(location.hash && location.hash!=='#/dashboard'){location.hash='/dashboard';return 'home';}return 'exit';})()", result -> {
            if (!"\"home\"".equals(result)) {
                new AlertDialog.Builder(this).setTitle("退出健身计划？")
                    .setMessage("训练记录已保存在本机，可以下次继续。")
                    .setPositiveButton("退出", (d,w) -> finish())
                    .setNegativeButton("继续使用", null).show();
            }
        });
    }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) { web.onResume(); }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
    @Override protected void onPause() {
        if (web != null) { web.onPause(); }
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        super.onPause();
    }
    @Override protected void onDestroy() {
        if (web != null) { web.destroy(); }
        super.onDestroy();
    }
}
