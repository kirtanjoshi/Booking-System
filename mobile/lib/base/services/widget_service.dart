import 'package:home_widget/home_widget.dart';
import '../../data/models/booking.dart';

class WidgetService {
  static const String appGroupId = 'group.com.astrologer.booking';
  static const String androidWidgetName = 'AstrologerAppWidget';

  static Future<void> updateNextBookingWidget(Booking? nextBooking) async {
    try {
      if (nextBooking != null) {
        final clientName = nextBooking.client.name ?? nextBooking.client.phoneNumber;
        final timeStr =
            '${nextBooking.scheduledStart.hour.toString().padLeft(2, '0')}:${nextBooking.scheduledStart.minute.toString().padLeft(2, '0')}';

        await HomeWidget.saveWidgetData<String>('client_name', clientName);
        await HomeWidget.saveWidgetData<String>('session_time', timeStr);
        await HomeWidget.saveWidgetData<String>('session_type', nextBooking.sessionType.name);
        await HomeWidget.saveWidgetData<String>('booking_id', nextBooking.id);
      } else {
        await HomeWidget.saveWidgetData<String>('client_name', 'No upcoming booking');
        await HomeWidget.saveWidgetData<String>('session_time', '--:--');
        await HomeWidget.saveWidgetData<String>('session_type', 'Resting / Free');
      }

      await HomeWidget.updateWidget(
        name: androidWidgetName,
        iOSName: 'AstrologerWidget',
      );
    } catch (_) {
      // Graceful fallback on unsupported platforms
    }
  }
}
