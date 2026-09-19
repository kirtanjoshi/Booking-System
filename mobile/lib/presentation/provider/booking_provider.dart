import 'package:flutter/material.dart';
import '../../data/models/booking.dart';
import '../../data/repo/booking_repo.dart';
import '../../base/services/widget_service.dart';

class BookingProvider extends ChangeNotifier {
  final BookingRepo _bookingRepo = BookingRepo();
  List<Booking> _bookings = [];
  bool _isLoading = false;
  String _filter = 'today';

  List<Booking> get bookings => _bookings;
  bool get isLoading => _isLoading;
  String get filter => _filter;

  Booking? get nextUpcomingBooking {
    final confirmed = _bookings.where((b) => b.status == 'CONFIRMED').toList();
    if (confirmed.isEmpty) return null;
    confirmed.sort((a, b) => a.scheduledStart.compareTo(b.scheduledStart));
    return confirmed.first;
  }

  Future<void> loadBookings({String? filterType}) async {
    _isLoading = true;
    if (filterType != null) _filter = filterType;
    notifyListeners();

    try {
      String? date;
      bool? upcomingOnly;

      if (_filter == 'today') {
        final now = DateTime.now();
        date = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
      } else if (_filter == 'upcoming') {
        upcomingOnly = true;
      }

      _bookings = await _bookingRepo.getBookings(date: date, upcomingOnly: upcomingOnly);

      // Update home-screen widget data
      await WidgetService.updateNextBookingWidget(nextUpcomingBooking);
    } catch (e) {
      _bookings = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> cancelBooking(String id, String reason) async {
    await _bookingRepo.cancelBooking(id, reason);
    await loadBookings();
  }

  Future<Map<String, dynamic>> sendStatusUpdate(String adminId, String message) async {
    final res = await _bookingRepo.sendStatusUpdate(adminId, message);
    await loadBookings();
    return res;
  }
}
