package com.easybmt.app;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BluetoothPrinterPlugin.class);
        registerPlugin(PermissionsHelperPlugin.class);
        super.onCreate(savedInstanceState);

        // Custom WebChromeClient to automatically grant resource/permission requests in WebView
        // Since we already check/prompt native permissions at startup, this bypasses secondary WebView-level prompt dialogs
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            this.getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(this.getBridge()) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                request.grant(request.getResources());
                            } catch (Exception e) {
                                android.util.Log.e("MainActivity", "Error granting WebView permission", e);
                            }
                        }
                    });
                }
            });
        }
    }
}

