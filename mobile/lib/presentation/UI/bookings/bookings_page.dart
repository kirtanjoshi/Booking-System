import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../base/theme/app_theme.dart';
import '../../provider/booking_provider.dart';
import '../../widgets/cancel_booking_dialog.dart';

class BookingsPage extends StatefulWidget {
  const BookingsPage({super.key});

  @override
  State<BookingsPage> createState() => _BookingsPageState();
}

class _BookingsPageState extends State<BookingsPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BookingProvider>().loadBookings();
    });
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'CONFIRMED':
        return Colors.greenAccent;
      case 'PENDING':
        return Colors.amberAccent;
      case 'CANCELLED':
        return Colors.redAccent;
      case 'COMPLETED':
        return Colors.lightBlueAccent;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<BookingProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('CONSULTATIONS'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: () => provider.loadBookings(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Row(
              children: [
                _buildFilterChip('Today', 'today', provider),
                const SizedBox(width: 8),
                _buildFilterChip('Upcoming', 'upcoming', provider),
                const SizedBox(width: 8),
                _buildFilterChip('All', 'all', provider),
              ],
            ),
          ),
          Expanded(
            child: provider.isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppTheme.warmBrass),
                  )
                : provider.bookings.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.calendar_today_outlined,
                                size: 48,
                                color: AppTheme.warmBrass.withValues(alpha: 0.5),
                              ),
                              const SizedBox(height: 12),
                              const Text(
                                'No consultations found',
                                style: TextStyle(
                                  color: AppTheme.textLight,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Check that weekly availability blocks are open or invite clients via WhatsApp.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: AppTheme.textDim, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => provider.loadBookings(),
                        color: AppTheme.warmBrass,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: provider.bookings.length,
                          itemBuilder: (context, index) {
                            final booking = provider.bookings[index];
                            final timeStr = DateFormat('hh:mm a').format(booking.scheduledStart);
                            final dateStr = DateFormat('EEE, MMM d').format(booking.scheduledStart);

                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          children: [
                                            const Icon(Icons.access_time, size: 14, color: AppTheme.warmBrass),
                                            const SizedBox(width: 6),
                                            Text(
                                              '$dateStr • $timeStr',
                                              style: const TextStyle(
                                                color: AppTheme.warmBrass,
                                                fontWeight: FontWeight.w600,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: _getStatusColor(booking.status).withValues(alpha: 0.12),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            booking.status,
                                            style: TextStyle(
                                              color: _getStatusColor(booking.status),
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      booking.client.name ?? 'Client',
                                      style: const TextStyle(
                                        color: AppTheme.textLight,
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${booking.sessionType.name} (${booking.sessionType.durationMinutes} min)',
                                      style: const TextStyle(color: AppTheme.textDim, fontSize: 12),
                                    ),
                                    const Divider(color: AppTheme.hairlineBorder, height: 20),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          children: [
                                            Icon(
                                              booking.source == 'WHATSAPP' ? Icons.chat : Icons.admin_panel_settings,
                                              size: 13,
                                              color: booking.source == 'WHATSAPP' ? Colors.tealAccent : Colors.grey,
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              booking.source,
                                              style: const TextStyle(color: AppTheme.textDim, fontSize: 11),
                                            ),
                                          ],
                                        ),
                                        if (booking.status != 'CANCELLED' && booking.status != 'COMPLETED')
                                          TextButton(
                                            style: TextButton.styleFrom(
                                              foregroundColor: Colors.redAccent,
                                              padding: EdgeInsets.zero,
                                              visualDensity: VisualDensity.compact,
                                            ),
                                            onPressed: () {
                                              showDialog(
                                                context: context,
                                                builder: (_) => CancelBookingDialog(
                                                  booking: booking,
                                                  onConfirm: (reason) =>
                                                      provider.cancelBooking(booking.id, reason),
                                                ),
                                              );
                                            },
                                            child: const Text('Cancel', style: TextStyle(fontSize: 12)),
                                          ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value, BookingProvider provider) {
    final isSelected = provider.filter == value;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11, color: isSelected ? Colors.black : AppTheme.textDim)),
      selected: isSelected,
      selectedColor: AppTheme.warmBrass,
      backgroundColor: AppTheme.surfaceInk,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      onSelected: (_) => provider.loadBookings(filterType: value),
    );
  }
}
