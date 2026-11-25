// Ajustes nativos aplicados ao projeto Android gerado pelo Capacitor:
// tela sempre ligada, modo imersivo, brilho automático pelo sensor de luz e tema escuro.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
const pkg = cfg.appId;
const javaDir = path.join(root, 'android/app/src/main/java', ...pkg.split('.'));
if (!fs.existsSync(javaDir)) throw new Error('Pasta Java não encontrada: ' + javaDir);

const mainActivity = `package ${pkg};

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private SensorManager sensorManager;
    private Sensor lightSensor;
    private volatile boolean autoBrightness = true;
    private float smoothed = -1f;
    private long lastApply = 0L;

    private final SensorEventListener luxListener = new SensorEventListener() {
        @Override
        public void onSensorChanged(SensorEvent event) {
            if (!autoBrightness) return;
            float v = event.values[0];
            smoothed = smoothed < 0 ? v : smoothed * 0.8f + v * 0.2f;
            long now = System.currentTimeMillis();
            if (now - lastApply < 1500) return;
            lastApply = now;
            double b = 0.04 + Math.log10(1.0 + smoothed) * 0.3;
            applyBrightness((float) Math.max(0.08, Math.min(1.0, b)));
        }

        @Override
        public void onAccuracyChanged(Sensor sensor, int accuracy) {}
    };

    /** Ponte exposta à página como window.RelogioNative. */
    private class NativeBridge {
        /** Nível de bateria e se está carregando, no formato "87,1" (vazio se indisponível). */
        @JavascriptInterface
        public String getBattery() {
            Intent i = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            if (i == null) return "";
            int level = i.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = i.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            int status = i.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
            boolean charging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL;
            if (level < 0 || scale <= 0) return "";
            return Math.round(level * 100f / scale) + "," + (charging ? 1 : 0);
        }

        @JavascriptInterface
        public void setAutoBrightness(final boolean on) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    autoBrightness = on;
                    if (!on) applyBrightness(WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE);
                }
            });
        }
    }

    private void applyBrightness(float b) {
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        lp.screenBrightness = b;
        getWindow().setAttributes(lp);
    }

    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = Build.VERSION.SDK_INT >= 30
                ? WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                : WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        hideSystemBars();
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        lightSensor = sensorManager != null ? sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT) : null;
        getBridge().getWebView().addJavascriptInterface(new NativeBridge(), "RelogioNative");
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemBars();
        if (sensorManager != null && lightSensor != null) {
            sensorManager.registerListener(luxListener, lightSensor, SensorManager.SENSOR_DELAY_NORMAL);
        }
    }

    @Override
    public void onPause() {
        if (sensorManager != null) sensorManager.unregisterListener(luxListener);
        super.onPause();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }
}
`;
fs.writeFileSync(path.join(javaDir, 'MainActivity.java'), mainActivity);

const styles = `<?xml version="1.0" encoding="utf-8"?>
<resources>

    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
        <item name="android:windowBackground">@android:color/black</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">#000000</item>
        <item name="android:background">@android:color/black</item>
    </style>
</resources>
`;
fs.writeFileSync(path.join(root, 'android/app/src/main/res/values/styles.xml'), styles);
console.log('Android patch aplicado em', javaDir);
