package com.easybmt.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN
            }
        ),
        @Permission(
            alias = "bluetooth12",
            strings = {
                "android.permission.BLUETOOTH_SCAN",
                "android.permission.BLUETOOTH_CONNECT"
            }
        ),
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "camera",
            strings = {
                Manifest.permission.CAMERA
            }
        )
    }
)
public class BluetoothPrinterPlugin extends Plugin {
    private static final String TAG = "BluetoothPrinterPlugin";
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB"); // Standard Serial Port Profile UUID
    private final ExecutorService executorService = Executors.newFixedThreadPool(2);

    @PluginMethod
    public void checkBluetoothPermission(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = hasPermission();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBluetoothPermission(PluginCall call) {
        if (hasPermission()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            requestPermissionForAlias("bluetooth12", call, "permissionCallback");
        } else {
            requestPermissionForAlias("location", call, "permissionCallback");
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasPermission());
        call.resolve(ret);
    }

    private boolean hasPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return getPermissionState("bluetooth12") == PermissionState.GRANTED;
        } else {
            return getPermissionState("location") == PermissionState.GRANTED;
        }
    }

    @PluginMethod
    public void getPairedDevices(PluginCall call) {
        if (!hasPermission()) {
            call.reject("Permission denied. Bluetooth Connect permission is required.");
            return;
        }

        executorService.execute(() -> {
            try {
                BluetoothAdapter bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
                if (bluetoothAdapter == null) {
                    call.reject("Bluetooth is not supported on this device.");
                    return;
                }

                if (!bluetoothAdapter.isEnabled()) {
                    call.reject("Bluetooth is currently turned OFF. Please enable it in Settings.");
                    return;
                }

                Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
                JSArray devicesArray = new JSArray();

                for (BluetoothDevice device : pairedDevices) {
                    JSObject devObj = new JSObject();
                    try {
                        devObj.put("name", device.getName());
                        devObj.put("address", device.getAddress());
                        devicesArray.put(devObj);
                    } catch (SecurityException e) {
                        Log.e(TAG, "SecurityException reading device info", e);
                    }
                }

                JSObject ret = new JSObject();
                ret.put("devices", devicesArray);
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "Error listing paired devices", e);
                call.reject("Failed to list paired devices: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void printRawData(PluginCall call) {
        if (!hasPermission()) {
            call.reject("Permission denied. Bluetooth Connect permission is required to print.");
            return;
        }

        String address = call.getString("address");
        String base64Data = call.getString("data");

        if (address == null || address.isEmpty()) {
            call.reject("Printer MAC address parameter is missing.");
            return;
        }

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Print data payload is empty.");
            return;
        }

        executorService.execute(() -> {
            BluetoothSocket socket = null;
            OutputStream outputStream = null;
            try {
                BluetoothAdapter bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
                if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
                    call.reject("Bluetooth adapter unavailable or disabled.");
                    return;
                }

                BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
                byte[] data = Base64.decode(base64Data, Base64.DEFAULT);

                Log.d(TAG, "Connecting to printer MAC: " + address);
                socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();
                Log.d(TAG, "Bluetooth socket connected. Streaming raw ESC/POS payload...");

                outputStream = socket.getOutputStream();
                
                // Write data in standard chunks to avoid buffer overruns on older thermal printers
                int chunkSize = 256;
                for (int i = 0; i < data.length; i += chunkSize) {
                    int length = Math.min(chunkSize, data.length - i);
                    outputStream.write(data, i, length);
                    outputStream.flush();
                }
                
                // Extra safety: flush socket
                outputStream.flush();
                
                // Wait briefly for buffer to clear before closing socket
                try {
                    Thread.sleep(250);
                } catch (InterruptedException ignored) {}

                Log.d(TAG, "Print job completed successfully!");
                call.resolve();

            } catch (Exception e) {
                Log.e(TAG, "Bluetooth printing error", e);
                call.reject("Bluetooth Print Failed: " + e.getMessage());
            } finally {
                try {
                    if (outputStream != null) outputStream.close();
                } catch (IOException ignored) {}
                try {
                    if (socket != null) socket.close();
                } catch (IOException ignored) {}
            }
        });
    }

    @PluginMethod
    public void setupPermissionsAndHardware(PluginCall call) {
        boolean hasCamera = getPermissionState("camera") == PermissionState.GRANTED;
        boolean hasBluetooth;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            hasBluetooth = getPermissionState("bluetooth12") == PermissionState.GRANTED;
        } else {
            hasBluetooth = getPermissionState("location") == PermissionState.GRANTED;
        }

        if (!hasCamera || !hasBluetooth) {
            String[] aliasesToRequest;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                aliasesToRequest = new String[]{"camera", "bluetooth12"};
            } else {
                aliasesToRequest = new String[]{"camera", "location"};
            }
            requestPermissionForAliases(aliasesToRequest, call, "hardwareStatusCallback");
        } else {
            checkHardwareStatus(call);
        }
    }

    @PermissionCallback
    private void hardwareStatusCallback(PluginCall call) {
        checkHardwareStatus(call);
    }

    private void checkHardwareStatus(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                // Check GPS Status
                android.location.LocationManager locationManager = (android.location.LocationManager) getContext().getSystemService(android.content.Context.LOCATION_SERVICE);
                boolean isGpsEnabled = locationManager != null && locationManager.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER);
                
                // Check Bluetooth Status
                BluetoothAdapter bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
                boolean isBtEnabled = bluetoothAdapter != null && bluetoothAdapter.isEnabled();

                JSObject result = new JSObject();
                result.put("gpsEnabled", isGpsEnabled);
                result.put("bluetoothEnabled", isBtEnabled);
                result.put("cameraGranted", getPermissionState("camera") == PermissionState.GRANTED);
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    result.put("bluetoothGranted", getPermissionState("bluetooth12") == PermissionState.GRANTED);
                } else {
                    result.put("bluetoothGranted", getPermissionState("location") == PermissionState.GRANTED);
                }

                // If GPS is disabled, prompt user with clear explanation and direct Settings intent
                if (!isGpsEnabled) {
                    new android.app.AlertDialog.Builder(getActivity())
                        .setTitle("Location Services (GPS) Required")
                        .setMessage("Location service (GPS) is turned OFF on your device. Please turn it ON to scan for local devices and print.")
                        .setPositiveButton("Turn ON GPS", (dialog, which) -> {
                            android.content.Intent intent = new android.content.Intent(android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS);
                            getContext().startActivity(intent);
                        })
                        .setNegativeButton("Cancel", null)
                        .show();
                }

                // If Bluetooth is disabled, prompt user with clear explanation and direct Settings intent
                if (!isBtEnabled && bluetoothAdapter != null) {
                    new android.app.AlertDialog.Builder(getActivity())
                        .setTitle("Bluetooth Required")
                        .setMessage("Bluetooth is turned OFF on your device. Please enable it to connect to your thermal printer.")
                        .setPositiveButton("Turn ON Bluetooth", (dialog, which) -> {
                            android.content.Intent intent = new android.content.Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS);
                            getContext().startActivity(intent);
                        })
                        .setNegativeButton("Cancel", null)
                        .show();
                }

                call.resolve(result);
            } catch (Exception e) {
                Log.e(TAG, "Error checking hardware status", e);
                call.reject("Hardware check failed: " + e.getMessage());
            }
        });
    }
}

