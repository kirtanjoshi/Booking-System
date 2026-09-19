import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../base/theme/app_theme.dart';
import '../../provider/availability_provider.dart';
import '../../widgets/clock_dial_widget.dart';

class AvailabilityPage extends StatefulWidget {
  const AvailabilityPage({super.key});

  @override
  State<AvailabilityPage> createState() => _AvailabilityPageState();
}

class _AvailabilityPageState extends State<AvailabilityPage> {
  final List<String> _dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  final List<String> _fullDayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AvailabilityProvider>().loadRules();
    });
  }

  void _showAddBlockDialog() {
    String start = '10:00';
    String end = '13:00';

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: AppTheme.surfaceInk,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
            side: const BorderSide(color: AppTheme.hairlineBorder),
          ),
          title: Text(
            'Add Block to ${_fullDayNames[context.read<AvailabilityProvider>().selectedDay]}',
            style: const TextStyle(color: AppTheme.warmBrass, fontSize: 16),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                decoration: const InputDecoration(labelText: 'Start Time (e.g. 10:00)'),
                controller: TextEditingController(text: start),
                onChanged: (v) => start = v,
              ),
              const SizedBox(height: 12),
              TextField(
                decoration: const InputDecoration(labelText: 'End Time (e.g. 13:00)'),
                controller: TextEditingController(text: end),
                onChanged: (v) => end = v,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: AppTheme.textDim)),
            ),
            ElevatedButton(
              onPressed: () async {
                await context.read<AvailabilityProvider>().addBlock(start, end);
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Save Block'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AvailabilityProvider>();
    final currentRules = provider.currentDayRules;

    return Scaffold(
      appBar: AppBar(
        title: const Text('WEEKLY AVAILABILITY'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: () => provider.loadRules(),
          ),
        ],
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.warmBrass))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Day Selector Row
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: List.generate(7, (idx) {
                        final isSelected = provider.selectedDay == idx;
                        final count = provider.rules.where((r) => r.dayOfWeek == idx && r.isActive).length;

                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ChoiceChip(
                            label: Text(
                              '${_dayNames[idx]} ($count)',
                              style: TextStyle(
                                fontSize: 11,
                                color: isSelected ? Colors.black : AppTheme.textDim,
                              ),
                            ),
                            selected: isSelected,
                            selectedColor: AppTheme.warmBrass,
                            backgroundColor: AppTheme.surfaceInk,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                            onSelected: (_) => provider.selectDay(idx),
                          ),
                        );
                      }),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Radial Clock Instrument
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                      child: Column(
                        children: [
                          Text(
                            _fullDayNames[provider.selectedDay],
                            style: const TextStyle(
                              color: AppTheme.textLight,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            '24-Hour Circular Dial View',
                            style: TextStyle(color: AppTheme.textDim, fontSize: 11),
                          ),
                          const SizedBox(height: 16),
                          ClockDialWidget(rules: currentRules, size: 220),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Blocks List
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Time Blocks',
                                style: TextStyle(
                                  color: AppTheme.warmBrass,
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.add_circle_outline, color: AppTheme.warmBrass, size: 20),
                                onPressed: _showAddBlockDialog,
                              ),
                            ],
                          ),
                          const Divider(color: AppTheme.hairlineBorder),
                          if (currentRules.isEmpty)
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 16.0),
                              child: Center(
                                child: Text(
                                  'No availability set for this day (Closed)',
                                  style: TextStyle(color: AppTheme.textDim, fontSize: 12),
                                ),
                              ),
                            )
                          else
                            ...currentRules.map((r) {
                              return Padding(
                                padding: const EdgeInsets.symmetric(vertical: 6),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: const BoxDecoration(
                                            color: AppTheme.warmBrass,
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          '${r.startTime} — ${r.endTime}',
                                          style: const TextStyle(color: AppTheme.textLight, fontSize: 13),
                                        ),
                                      ],
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 18),
                                      onPressed: () => provider.removeBlock(r.id),
                                    ),
                                  ],
                                ),
                              );
                            }),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
