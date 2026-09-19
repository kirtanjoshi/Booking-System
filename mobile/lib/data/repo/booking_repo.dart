import '../models/booking.dart';
import '../source/api_client.dart';

class BookingRepo {
  Future<List<Booking>> getBookings({String? date, bool? upcomingOnly}) async {
    String query = '';
    if (date != null) {
      query = '?date=$date';
    } else if (upcomingOnly == true) {
      query = '?upcomingOnly=true';
    }

    final res = await ApiClient.get('/bookings$query') as List<dynamic>;
    return res.map((item) => Booking.fromJson(item)).toList();
  }

  Future<void> cancelBooking(String id, String reason) async {
    await ApiClient.patch('/bookings/$id/cancel', {
      'cancelledReason': reason,
    });
  }

  Future<Map<String, dynamic>> sendStatusUpdate(String adminId, String message) async {
    final res = await ApiClient.post('/admins/$adminId/status-update', {
      'message': message,
    });
    return res as Map<String, dynamic>;
  }
}
