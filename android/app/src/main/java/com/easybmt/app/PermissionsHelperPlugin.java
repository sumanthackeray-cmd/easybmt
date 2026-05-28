package com.easybmt.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.bluetooth.BluetoothAdapter;
import android.os.Build;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "PermissionsHelper",
    permissions = {
        @Permission(
            alias = "camera",
            strings = { Manifest.permission.CAMERA }
        ),
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        ),
        @Permission(
            alias = "contacts",
            strings = { Manifest.permission.READ_CONTACTS }
        ),
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "notifications",
            strings = { "android.permission.POST_NOTIFICATIONS" }
        ),
        @Permission(
            alias = "bluetooth",
            strings = {
                "android.permission.BLUETOOTH_SCAN",
                "android.permission.BLUETOOTH_CONNECT"
            }
        ),
        @Permission(
            alias = "files13",
            strings = {
                "android.permission.READ_MEDIA_IMAGES",
                "android.permission.READ_MEDIA_VIDEO",
                "android.permission.READ_MEDIA_AUDIO"
            }
        ),
        @Permission(
            alias = "filesLegacy",
            strings = {
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            }
        )
    }
)
public class PermissionsHelperPlugin extends Plugin {
    private static final String TAG = "PermissionsHelperPlugin";
    private static final String PREFS_NAME = "PermissionsHelperPrefs";
    private PluginCall locationCall;

    @PluginMethod
    public void checkPermissionStatus(PluginCall call) {
        String alias = call.getString("name");
        if (alias == null) {
            call.reject("Permission name is required");
            return;
        }
        JSObject result = getPermissionStatusObject(alias);
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        String alias = call.getString("name");
        if (alias == null) {
            call.reject("Permission name is required");
            return;
        }

        // Save that we have requested this permission at least once
        SharedPreferences sharedPrefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        sharedPrefs.edit().putBoolean(alias, true).apply();

        String targetAlias = alias;
        if (alias.equals("files")) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                targetAlias = "files13";
            } else {
                targetAlias = "filesLegacy";
            }
        }

        if (alias.equals("notifications") && Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject ret = new JSObject();
            ret.put("status", "granted");
            call.resolve(ret);
            return;
        }

        requestPermissionForAlias(targetAlias, call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        String alias = call.getString("name");
        if (alias == null) {
            call.resolve();
            return;
        }
        JSObject result = getPermissionStatusObject(alias);
        call.resolve(result);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            android.net.Uri uri = android.net.Uri.fromParts("package", getContext().getPackageName(), null);
            intent.setData(uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void enableBluetooth(PluginCall call) {
        try {
            BluetoothAdapter ba = BluetoothAdapter.getDefaultAdapter();
            if (ba == null) {
                call.reject("Bluetooth not supported on this device");
                return;
            }
            if (ba.isEnabled()) {
                JSObject ret = new JSObject();
                ret.put("enabled", true);
                call.resolve(ret);
                return;
            }

            Intent intent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            startActivityForResult(call, intent, "bluetoothEnableResult");
        } catch (SecurityException se) {
            call.reject("Security exception requesting Bluetooth activation: " + se.getMessage());
        } catch (Exception e) {
            call.reject("Failed to request Bluetooth activation: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void bluetoothEnableResult(PluginCall call, androidx.activity.result.ActivityResult result) {
        BluetoothAdapter ba = BluetoothAdapter.getDefaultAdapter();
        boolean isEnabled = ba != null && ba.isEnabled();
        JSObject ret = new JSObject();
        ret.put("enabled", isEnabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void enableLocation(PluginCall call) {
        // First check if already enabled
        LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        boolean isGpsEnabled = lm != null && (lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER));
        if (isGpsEnabled) {
            JSObject ret = new JSObject();
            ret.put("enabled", true);
            call.resolve(ret);
            return;
        }

        try {
            this.locationCall = call;
            
            // Build LocationSettingsRequest to trigger Play Services native location turn-on dialog
            com.google.android.gms.location.LocationRequest locationRequest = new com.google.android.gms.location.LocationRequest.Builder(
                com.google.android.gms.location.Priority.PRIORITY_HIGH_ACCURACY, 1000
            ).build();

            com.google.android.gms.location.LocationSettingsRequest.Builder builder = new com.google.android.gms.location.LocationSettingsRequest.Builder()
                .addLocationRequest(locationRequest)
                .setAlwaysShow(true);

            com.google.android.gms.location.SettingsClient client = com.google.android.gms.location.LocationServices.getSettingsClient(getActivity());
            com.google.android.gms.tasks.Task<com.google.android.gms.location.LocationSettingsResponse> task = client.checkLocationSettings(builder.build());

            task.addOnCompleteListener(new com.google.android.gms.tasks.OnCompleteListener<com.google.android.gms.location.LocationSettingsResponse>() {
                @Override
                public void onComplete(com.google.android.gms.tasks.Task<com.google.android.gms.location.LocationSettingsResponse> t) {
                    try {
                        com.google.android.gms.location.LocationSettingsResponse response = t.getResult(Exception.class);
                        JSObject ret = new JSObject();
                        ret.put("enabled", true);
                        if (locationCall != null) {
                            locationCall.resolve(ret);
                            locationCall = null;
                        }
                    } catch (Exception exception) {
                        if (exception instanceof com.google.android.gms.common.api.ResolvableApiException) {
                            try {
                                com.google.android.gms.common.api.ResolvableApiException resolvable = (com.google.android.gms.common.api.ResolvableApiException) exception;
                                resolvable.startResolutionForResult(getActivity(), 101);
                            } catch (Exception e) {
                                openLocationSettingsFallback(locationCall);
                            }
                        } else {
                            openLocationSettingsFallback(locationCall);
                        }
                    }
                }
            });
        } catch (Exception e) {
            openLocationSettingsFallback(call);
        }
    }

    private void openLocationSettingsFallback(PluginCall call) {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS);
            startActivityForResult(call, intent, "locationSettingsResult");
        } catch (Exception e) {
            if (call != null) {
                call.reject("Could not enable location services: " + e.getMessage());
            }
        }
    }

    @ActivityCallback
    private void locationSettingsResult(PluginCall call, androidx.activity.result.ActivityResult result) {
        LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        boolean isGpsEnabled = lm != null && lm.isProviderEnabled(LocationManager.GPS_PROVIDER);
        JSObject ret = new JSObject();
        ret.put("enabled", isGpsEnabled);
        call.resolve(ret);
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        if (requestCode == 101) {
            LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            boolean enabled = lm != null && (lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER));
            if (locationCall != null) {
                JSObject ret = new JSObject();
                ret.put("enabled", enabled);
                locationCall.resolve(ret);
                locationCall = null;
            }
        }
    }

    private JSObject getPermissionStatusObject(String alias) {
        JSObject ret = new JSObject();

        String[] manifestPermissions;
        boolean isHardwareSupported = true;
        boolean isHardwareEnabled = true;

        if (alias.equals("camera")) {
            manifestPermissions = new String[]{ Manifest.permission.CAMERA };
        } else if (alias.equals("microphone")) {
            manifestPermissions = new String[]{ Manifest.permission.RECORD_AUDIO };
        } else if (alias.equals("contacts")) {
            manifestPermissions = new String[]{ Manifest.permission.READ_CONTACTS };
        } else if (alias.equals("location")) {
            manifestPermissions = new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            };
            LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            isHardwareEnabled = lm != null && (lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER));
        } else if (alias.equals("bluetooth")) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                manifestPermissions = new String[]{
                    Manifest.permission.BLUETOOTH_SCAN,
                    Manifest.permission.BLUETOOTH_CONNECT
                };
            } else {
                manifestPermissions = new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION
                };
            }
            BluetoothAdapter ba = BluetoothAdapter.getDefaultAdapter();
            isHardwareSupported = ba != null;
            isHardwareEnabled = ba != null && ba.isEnabled();
        } else if (alias.equals("notifications")) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                manifestPermissions = new String[]{ Manifest.permission.POST_NOTIFICATIONS };
            } else {
                manifestPermissions = new String[]{};
            }
        } else if (alias.equals("files")) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                manifestPermissions = new String[]{
                    Manifest.permission.READ_MEDIA_IMAGES,
                    Manifest.permission.READ_MEDIA_VIDEO,
                    Manifest.permission.READ_MEDIA_AUDIO
                };
            } else {
                manifestPermissions = new String[]{
                    Manifest.permission.READ_EXTERNAL_STORAGE,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
                };
            }
        } else {
            ret.put("status", "unknown");
            return ret;
        }

        // Check permission state in Context
        boolean allGranted = true;
        boolean anyPermanentlyDenied = false;

        SharedPreferences sharedPrefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean hasRequestedBefore = sharedPrefs.getBoolean(alias, false);

        for (String perm : manifestPermissions) {
            int check = ContextCompat.checkSelfPermission(getContext(), perm);
            if (check != PackageManager.PERMISSION_GRANTED) {
                allGranted = false;
                if (hasRequestedBefore) {
                    boolean showRationale = ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), perm);
                    if (!showRationale) {
                        anyPermanentlyDenied = true;
                    }
                }
            }
        }

        String status = "denied";
        if (allGranted) {
            status = "granted";
        } else if (anyPermanentlyDenied) {
            status = "permanently_denied";
        }

        ret.put("status", status);
        ret.put("hardwareSupported", isHardwareSupported);
        ret.put("serviceEnabled", isHardwareEnabled);
        return ret;
    }
}
