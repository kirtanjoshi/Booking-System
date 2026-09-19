import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:window_manager/window_manager.dart';
import '../../base/theme/app_theme.dart';
import '../provider/auth_provider.dart';
import 'bookings/bookings_page.dart';
import 'availability/availability_page.dart';
import 'clients/clients_page.dart';
import '../widgets/status_update_dialog.dart';
import 'desktop/desktop_mini_widget.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;
  bool _isMiniWidgetMode = false;

  final List<Widget> _pages = const [
    BookingsPage(),
    AvailabilityPage(),
    ClientsPage(),
  ];

  Future<void> _switchToFullWindow() async {
    setState(() => _isMiniWidgetMode = false);
    if (!kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux)) {
      await windowManager.setSize(const Size(1000, 700));
      await windowManager.setAlwaysOnTop(false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isMiniWidgetMode) {
      return DesktopMiniWidget(onExpandToFull: _switchToFullWindow);
    }

    final isDesktop = !kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux);

    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.explore_outlined, color: AppTheme.warmBrass, size: 20),
            SizedBox(width: 8),
            Text('VEDIC PRACTICE'),
          ],
        ),
        actions: [
          // Quick Status Update button
          IconButton(
            icon: const Icon(Icons.cell_tower, color: AppTheme.warmBrass),
            tooltip: 'Send Status Update',
            onPressed: () {
              showDialog(
                context: context,
                builder: (_) => const StatusUpdateDialog(),
              );
            },
          ),
          if (isDesktop)
            IconButton(
              icon: const Icon(Icons.picture_in_picture_alt, color: AppTheme.textDim),
              tooltip: 'Always-on-top Mini Widget View',
              onPressed: () {
                setState(() => _isMiniWidgetMode = true);
              },
            ),
          IconButton(
            icon: const Icon(Icons.logout, color: AppTheme.textDim, size: 18),
            tooltip: 'Logout',
            onPressed: () => context.read<AuthProvider>().logout(),
          ),
        ],
      ),
      body: _pages[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        backgroundColor: AppTheme.surfaceInk,
        selectedItemColor: AppTheme.warmBrass,
        unselectedItemColor: AppTheme.textDim,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.calendar_today_outlined),
            label: 'Bookings',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.access_time_outlined),
            label: 'Availability',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.people_outline),
            label: 'Clients',
          ),
        ],
      ),
    );
  }
}
