package com.aethertrack.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "AetherTrack";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleDeepLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLink(intent);
    }

    private void handleDeepLink(Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        Uri data = intent.getData();

        if (Intent.ACTION_VIEW.equals(action) && data != null) {
            String url = data.toString();
            Log.d(TAG, "Deep link received: " + url);

            // Wait for the bridge to be ready before firing JS
            getBridge().getWebView().post(() -> {
                String js = "window.dispatchEvent(new CustomEvent('capacitorDeepLink', { detail: { url: '" + url.replace("'", "\\'") + "' } }))";
                getBridge().eval(js, value -> {});
            });
        }
    }
}

