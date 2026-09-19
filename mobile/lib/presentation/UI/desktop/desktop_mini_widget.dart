import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:window_manager/window_manager.dart';
import '../../../base/theme/app_theme.dart';
import '../../provider/booking_provider.dart';
import '../../widgets/status_update_dialog.dart';

class DesktopMiniWidget extends StatefulWidget {
  final VoidCallback onExpandToFull;

  const DesktopMiniWidget({
    super.key,
    required this.onExpandToFull,
  });

  @override
  State<DesktopMiniWidget> createState() => _DesktopMiniWidgetState();
}

class _DesktopMiniWidgetState extends State<DesktopMiniWidget> {
  bool _isAlwaysOnTop = true;

  @override
  void initState() {
    super.initState();
    _applyMiniWindowState();
  }

  Future<void> _applyMiniWindowState() async {
    if (!kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux)) {
      await windowManager.setSize(const Size(380, 220));
      await windowManager.setAlwaysOnTop(_isAlwaysOnTop);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = context.watch<BookingProvider>();
    final next = bookingProvider.nextUpcomingBooking;

    return Scaffold(
      backgroundColor: AppTheme.midnightBg,
      body: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          border: Border.all(color: AppTheme.warmBrass, width: 1.2),
          borderRadius: BorderRadius.circular(10),
          color: AppTheme.surfaceInk,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.explore_outlined, color: AppTheme.warmBrass, size: 16),
                    SizedBox(width: 6),
                    Text(
                      'NEXT CONSULTATION',
                      style: TextStyle(
                        color: AppTheme.warmBrass,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    IconButton(
                      icon: Icon(
                        _isAlwaysOnTop ? Icons.push_pin : Icons.push_pin_outlined,
                        size: 16,
                        color: _isAlwaysOnTop ? AppTheme.warmBrass : AppTheme.textDim,
                      ),
                      tooltip: 'Toggle Always-on-top',
                      onPressed: () async {
                        setState(() => _isAlwaysOnTop = !_isAlwaysOnTop);
                        if (!kIsWeb && Platform.isWindows) {
                          await windowManager.setAlwaysOnTop(_isAlwaysOnTop);
                        }
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.open_in_full, size: 16, color: AppTheme.textDim),
                      tooltip: 'Expand Full App',
                      onPressed: widget.onExpandToFull,
                    ),
                  ],
                ),
              ],
            ),
            const Divider(color: AppTheme.hairlineBorder, height: 12),
            if (next == null)
              const Expanded(
                child: Center(
                  child: Text(
                    'No upcoming appointments today',
                    style: TextStyle(color: AppTheme.textDim, fontSize: 12),
                  ),
                ),
              )
            else ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    next.client.name ?? next.client.phoneNumber,
                    style: const TextStyle(
                      color: AppTheme.textLight,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    DateFormat('hh:mm a').format(next.scheduledStart),
                    style: const TextStyle(
                      color: AppTheme.warmBrass,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                '${next.sessionType.name} (${next.sessionType.durationMinutes} min)',
                style: const TextStyle(color: AppTheme.textDim, fontSize: 11),
              ),
            ],
            const Spacer(),
            SizedBox(
              width: double.infinity,
              height: 36,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.cell_tower, size: 16),
                label: const Text('Broadcast Delay Notice', style: TextStyle(fontSize: 12)),
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (_) => const StatusUpdateDialog(),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
