import '../../data/models/booking.dart';

abstract class BookingRepo {
  Future<List<Booking>> getTodayBookings(String adminId);
  Future<Booking> cancelBooking(String bookingId, String reason);
  Future<Map<String, dynamic>> sendStatusUpdate(String adminId, String message);
}
