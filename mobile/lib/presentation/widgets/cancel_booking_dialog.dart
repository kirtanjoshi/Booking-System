import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../data/models/booking.dart';
import '../../base/theme/app_theme.dart';

class CancelBookingDialog extends StatefulWidget {
  final Booking booking;
  final Future<void> Function(String reason) onConfirm;

  const CancelBookingDialog({
    super.key,
    required this.booking,
    required this.onConfirm,
  });

  @override
  State<CancelBookingDialog> createState() => _CancelBookingDialogState();
}

class _CancelBookingDialogState extends State<CancelBookingDialog> {
  final _reasonController =
      TextEditingController(text: 'Personal emergency / schedule conflict');
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    final clientName =
        widget.booking.client.name ?? widget.booking.client.phoneNumber;
    final dateStr =
        DateFormat('EEE, MMM d, hh:mm a').format(widget.booking.scheduledStart);

    final previewMsg =
        'Namaste $clientName, your consultation for $dateStr (${widget.booking.sessionType.name}) has been cancelled. Reason: ${_reasonController.text}. Reply "book" if you wish to reschedule.';

    return AlertDialog(
      backgroundColor: AppTheme.surfaceInk,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: const BorderSide(color: Colors.redAccent, width: 0.8),
      ),
      title: const Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 22),
          SizedBox(width: 8),
          Text(
            'Cancel Consultation',
            style: TextStyle(color: Colors.redAccent, fontSize: 16),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Cancel appointment with $clientName?',
              style: const TextStyle(color: AppTheme.textLight, fontSize: 13),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _reasonController,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                labelText: 'Reason for Cancellation',
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'OUTGOING WHATSAPP PREVIEW',
              style: TextStyle(
                color: AppTheme.warmBrass,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppTheme.midnightBg,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppTheme.hairlineBorder),
              ),
              child: Text(
                '"$previewMsg"',
                style: const TextStyle(
                  color: AppTheme.textLight,
                  fontSize: 11,
                  fontStyle: FontStyle.italic,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.pop(context),
          child: const Text('Dismiss', style: TextStyle(color: AppTheme.textDim)),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red.shade800,
            foregroundColor: Colors.white,
          ),
          onPressed: _isLoading
              ? null
              : () async {
                  setState(() => _isLoading = true);
                  try {
                    await widget.onConfirm(_reasonController.text);
                    if (context.mounted) Navigator.pop(context);
                  } finally {
                    if (mounted) setState(() => _isLoading = false);
                  }
                },
          child: _isLoading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Text('Confirm Cancel'),
        ),
      ],
    );
  }
}
