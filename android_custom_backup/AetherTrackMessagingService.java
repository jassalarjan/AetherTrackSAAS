package com.aethertrack.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * AetherTrackMessagingService
 *
 * Handles FCM messages when the app is in background or killed.
 * When the app is in foreground, Capacitor PushNotifications plugin
 * fires the pushNotificationReceived JS event instead.
 */
public class AetherTrackMessagingService extends FirebaseMessagingService {

    private static final String TAG         = "AetherTrackFCM";
    private static final String CHANNEL_ID  = "aethertrack_default";
    private static final String CHANNEL_NAME = "AetherTrack Notifications";

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "FCM token refreshed: " + token);
        // Send token to your backend
        sendTokenToBackend(token);
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "FCM message from: " + remoteMessage.getFrom());

        String title = "AetherTrack";
        String body  = "";
        String deepLink = null;

        // Notification payload
        if (remoteMessage.getNotification() != null) {
            RemoteMessage.Notification notif = remoteMessage.getNotification();
            if (notif.getTitle() != null) title    = notif.getTitle();
            if (notif.getBody()  != null) body     = notif.getBody();
        }

        // Data payload (overrides notification fields if present)
        if (!remoteMessage.getData().isEmpty()) {
            if (remoteMessage.getData().containsKey("title"))    title    = remoteMessage.getData().get("title");
            if (remoteMessage.getData().containsKey("body"))     body     = remoteMessage.getData().get("body");
            if (remoteMessage.getData().containsKey("deepLink")) deepLink = remoteMessage.getData().get("deepLink");
        }

        showNotification(title, body, deepLink);
    }

    private void showNotification(String title, String body, String deepLink) {
        NotificationManager manager =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // Create channel for Android 8+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH
            );
            channel.enableLights(true);
            channel.enableVibration(true);
            manager.createNotificationChannel(channel);
        }

        // Tap intent — deep link or just open app
        Intent intent;
        if (deepLink != null) {
            intent = new Intent(Intent.ACTION_VIEW, Uri.parse(deepLink));
        } else {
            intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_icon)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setSound(soundUri)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setColor(0xFFD4905A);   // AetherTrack orange accent

        manager.notify((int) System.currentTimeMillis(), builder.build());
    }

    private void sendTokenToBackend(String token) {
        // Persist token locally so JS layer can send it after auth
        getSharedPreferences("AetherTrackFCM", Context.MODE_PRIVATE)
            .edit()
            .putString("fcm_token", token)
            .apply();
    }
}
