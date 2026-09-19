import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../base/theme/app_theme.dart';
import '../provider/auth_provider.dart';
import '../provider/booking_provider.dart';

class StatusUpdateDialog extends StatefulWidget {
  const StatusUpdateDialog({super.key});

  @override
  State<StatusUpdateDialog> createState() => _StatusUpdateDialogState();
}

class _StatusUpdateDialogState extends State<StatusUpdateDialog> {
  final _messageController = TextEditingController(
    text: 'I am running approximately 15 minutes behind schedule.',
  );
  bool _isLoading = false;
  String? _statusResult;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final adminId = context.read<AuthProvider>().admin?['id'];

    return AlertDialog(
      backgroundColor: AppTheme.surfaceInk,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: const BorderSide(color: AppTheme.hairlineBorder),
      ),
      title: const Row(
        children: [
          Icon(Icons.cell_tower, color: AppTheme.warmBrass, size: 22),
          SizedBox(width: 8),
          Text(
            'Broadcast Delay Notice',
            style: TextStyle(color: AppTheme.warmBrass, fontSize: 16),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Dispatches to the next upcoming confirmed client today via WhatsApp (using 24h window rules).',
              style: TextStyle(color: AppTheme.textDim, fontSize: 11),
            ),
            const SizedBox(height: 12),
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 11)),
              const SizedBox(height: 8),
            ],
            if (_statusResult != null) ...[
              Text(_statusResult!, style: const TextStyle(color: Colors.greenAccent, fontSize: 11)),
              const SizedBox(height: 8),
            ],
            TextField(
              controller: _messageController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Message Text',
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.pop(context),
          child: const Text('Cancel', style: TextStyle(color: AppTheme.textDim)),
        ),
        ElevatedButton(
          onPressed: (_isLoading || adminId == null)
              ? null
              : () async {
                  setState(() {
                    _isLoading = true;
                    _error = null;
                    _statusResult = null;
                  });

                  try {
                    final res = await context
                        .read<BookingProvider>()
                        .sendStatusUpdate(adminId, _messageController.text);

                    setState(() {
                      _statusResult = 'Sent to ${res['recipient']?['name'] ?? 'Client'}';
                    });

                    Future.delayed(const Duration(milliseconds: 1200), () {
                      if (context.mounted) Navigator.pop(context);
                    });
                  } catch (e) {
                    setState(() {
                      _error = e.toString().replaceAll('Exception: ', '');
                    });
                  } finally {
                    if (mounted) setState(() => _isLoading = false);
                  }
                },
          child: _isLoading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                )
              : const Text('Send Notice'),
        ),
      ],
    );
  }
}
